import React, { useMemo } from 'react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell, Line,
} from 'recharts';
import { useApp } from '../../../context/AppContext';
import SectionHeader from '../../shared/SectionHeader';
import SliderInput from '../../shared/SliderInput';
import MetricCard from '../../shared/MetricCard';
import { formatCurrency, futureValue, generateAmortisationSchedule } from '../../../utils/calculations';

function calcScenarioSurplus(state, overrides = {}) {
  const { fund, expenses, property } = state;
  const ir = overrides.interestRate ?? property.interestRate;
  const vacancy = overrides.vacancyWeeks ?? property.vacancyWeeks;
  const rentReduction = overrides.rentalReduction ?? 0;
  const contribReduction = overrides.contributionReduction ?? 0;
  const expenseIncrease = overrides.expenseIncrease ?? 0;

  const totalContributions = fund.members.reduce(
    (sum, m) => sum + (m.sgContributions || 0) + (m.salarySacrifice || 0) + (m.nonConcessional || 0) + (m.personalDeductible || 0), 0
  ) * (1 - contribReduction / 100);

  const annualRent = (property.weeklyRent || 0) * 52 * (1 - rentReduction / 100);
  const vacancyLoss = (property.weeklyRent || 0) * vacancy;
  const mgmtFee = annualRent * ((property.managementFee || 0) / 100);
  const propCosts = (property.landlordInsurance || 0) + (property.councilRates || 0) + (property.waterRates || 0) + (property.strata || 0) + (property.repairs || 0) + (property.landTax || 0);
  const netRent = annualRent - vacancyLoss - mgmtFee - propCosts;

  const fundExp = Object.values(expenses).reduce((a, b) => a + (Number(b) || 0), 0) * (1 + expenseIncrease / 100);
  const insurance = fund.members.reduce((sum, m) => sum + (m.insuranceDeath || 0) + (m.insuranceTPD || 0) + (m.insuranceIP || 0), 0);

  const loanAmount = (property.purchasePrice || 0) * ((property.lvr || 0) / 100);
  let annualRepayment;
  if (property.repaymentType === 'IO') {
    annualRepayment = loanAmount * (ir / 100);
  } else {
    const r = ir / 100 / 12;
    const n = (property.loanTerm || 25) * 12;
    annualRepayment = r > 0 ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) * 12 : 0;
  }

  const totalIncome = totalContributions + (fund.existingIncome || 0) + netRent;
  const totalOutgoings = fundExp + insurance + annualRepayment;
  return { surplus: totalIncome - totalOutgoings, totalIncome, totalOutgoings, annualRepayment, netRent };
}

export default function Scenarios() {
  const { state, updateScenarios } = useApp();
  const { scenarios, property } = state;

  // Three scenarios
  const baseCase = useMemo(() => calcScenarioSurplus(state), [state]);
  const bullCase = useMemo(() => calcScenarioSurplus(state, {
    interestRate: Math.max(0, property.interestRate - 1),
    vacancyWeeks: Math.max(0, property.vacancyWeeks - 1),
  }), [state, property]);
  const bearCase = useMemo(() => calcScenarioSurplus(state, {
    interestRate: property.interestRate + 2,
    vacancyWeeks: property.vacancyWeeks + 4,
    rentalReduction: 10,
  }), [state, property]);

  // Stress tested scenario
  const stressCase = useMemo(() => calcScenarioSurplus(state, {
    interestRate: property.interestRate + scenarios.interestRateShock,
    vacancyWeeks: property.vacancyWeeks + scenarios.extendedVacancy,
    rentalReduction: scenarios.rentalReduction,
    contributionReduction: scenarios.contributionReduction,
    expenseIncrease: scenarios.expenseIncrease,
  }), [state, scenarios, property]);

  // Worst case
  const worstCase = useMemo(() => calcScenarioSurplus(state, {
    interestRate: property.interestRate + 3,
    vacancyWeeks: property.vacancyWeeks + 12,
    rentalReduction: 30,
    contributionReduction: 50,
    expenseIncrease: 20,
  }), [state, property]);

  // Sensitivity (tornado) data
  const sensitivityData = useMemo(() => {
    const items = [
      { name: 'Interest +2%', impact: calcScenarioSurplus(state, { interestRate: property.interestRate + 2 }).surplus - baseCase.surplus },
      { name: 'Vacancy +8wks', impact: calcScenarioSurplus(state, { vacancyWeeks: property.vacancyWeeks + 8 }).surplus - baseCase.surplus },
      { name: 'Rent -20%', impact: calcScenarioSurplus(state, { rentalReduction: 20 }).surplus - baseCase.surplus },
      { name: 'Contributions -50%', impact: calcScenarioSurplus(state, { contributionReduction: 50 }).surplus - baseCase.surplus },
      { name: 'Expenses +20%', impact: calcScenarioSurplus(state, { expenseIncrease: 20 }).surplus - baseCase.surplus },
      { name: 'Interest +3%', impact: calcScenarioSurplus(state, { interestRate: property.interestRate + 3 }).surplus - baseCase.surplus },
    ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    return items;
  }, [state, baseCase, property]);

  // Monte Carlo style fan chart
  const fanData = useMemo(() => {
    const years = 20;
    const loanAmount = (property.purchasePrice || 0) * ((property.lvr || 0) / 100);
    const rows = [];
    for (let yr = 1; yr <= years; yr++) {
      const low = futureValue(property.purchasePrice, 2, yr);
      const mid = futureValue(property.purchasePrice, 5, yr);
      const high = futureValue(property.purchasePrice, 7, yr);
      const amort = generateAmortisationSchedule(loanAmount, property.interestRate, property.loanTerm, property.repaymentType === 'IO' ? (property.ioPeriod || 5) : 0);
      const loan = yr <= amort.length ? amort[yr - 1].closingBalance : 0;
      rows.push({ year: yr, low: Math.round(low), mid: Math.round(mid), high: Math.round(high), loan: Math.round(loan) });
    }
    return rows;
  }, [property]);

  // Fund survival analysis
  const survivalYears = useMemo(() => {
    if (stressCase.surplus >= 0) return Infinity;
    const annualDeficit = Math.abs(stressCase.surplus);
    const cashAvailable = state.fund.currentBalance * (state.fund.allocationCash / 100);
    return annualDeficit > 0 ? Math.floor(cashAvailable / annualDeficit) : Infinity;
  }, [stressCase, state.fund]);

  const comparisonData = [
    { name: 'Bull Case', surplus: Math.round(bullCase.surplus), income: Math.round(bullCase.totalIncome), outgoings: Math.round(bullCase.totalOutgoings) },
    { name: 'Base Case', surplus: Math.round(baseCase.surplus), income: Math.round(baseCase.totalIncome), outgoings: Math.round(baseCase.totalOutgoings) },
    { name: 'Bear Case', surplus: Math.round(bearCase.surplus), income: Math.round(bearCase.totalIncome), outgoings: Math.round(bearCase.totalOutgoings) },
    { name: 'Stress Test', surplus: Math.round(stressCase.surplus), income: Math.round(stressCase.totalIncome), outgoings: Math.round(stressCase.totalOutgoings) },
    { name: 'Worst Case', surplus: Math.round(worstCase.surplus), income: Math.round(worstCase.totalIncome), outgoings: Math.round(worstCase.totalOutgoings) },
  ];

  const tooltipStyle = { background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 };

  return (
    <div>
      <SectionHeader
        title="Scenario Analysis & Stress Testing"
        subtitle="What-if analysis with multiple scenarios"
        tooltip="Test how your fund performs under different economic conditions including interest rate shocks, vacancy, and income reductions."
      />

      {/* Stress Test Sliders */}
      <div className="card mb-6">
        <h3 className="font-heading font-semibold text-white mb-4">Stress Test Parameters</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <SliderInput label="Interest Rate Shock" value={scenarios.interestRateShock} onChange={(v) => updateScenarios({ interestRateShock: v })} min={0} max={5} step={0.5} prefix="+" suffix="%" />
          <SliderInput label="Extended Vacancy" value={scenarios.extendedVacancy} onChange={(v) => updateScenarios({ extendedVacancy: v })} min={0} max={16} step={1} prefix="+" suffix=" wks" />
          <SliderInput label="Property Decline" value={scenarios.propertyDecline} onChange={(v) => updateScenarios({ propertyDecline: v })} min={0} max={30} step={5} prefix="-" suffix="%" />
          <SliderInput label="Contribution Cut" value={scenarios.contributionReduction} onChange={(v) => updateScenarios({ contributionReduction: v })} min={0} max={100} step={25} prefix="-" suffix="%" />
          <SliderInput label="Rental Reduction" value={scenarios.rentalReduction} onChange={(v) => updateScenarios({ rentalReduction: v })} min={0} max={30} step={5} prefix="-" suffix="%" />
          <SliderInput label="Expense Increase" value={scenarios.expenseIncrease} onChange={(v) => updateScenarios({ expenseIncrease: v })} min={0} max={30} step={5} prefix="+" suffix="%" />
        </div>
      </div>

      {/* Scenario Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Scenario Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-2 px-3 text-left text-gray-400">Scenario</th>
                  <th className="py-2 px-3 text-right text-gray-400">Income</th>
                  <th className="py-2 px-3 text-right text-gray-400">Outgoings</th>
                  <th className="py-2 px-3 text-right text-gray-400">Surplus</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row) => (
                  <tr key={row.name} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-3 font-medium text-white">{row.name}</td>
                    <td className="py-2 px-3 text-right font-mono text-emerald">{formatCurrency(row.income)}</td>
                    <td className="py-2 px-3 text-right font-mono text-rose">{formatCurrency(row.outgoings)}</td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${row.surplus >= 0 ? 'text-emerald' : 'text-rose'}`}>{formatCurrency(row.surplus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Surplus comparison bars */}
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Surplus Comparison</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={80} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                <Bar dataKey="surplus" radius={[0, 4, 4, 0]}>
                  {comparisonData.map((entry, i) => (
                    <Cell key={i} fill={entry.surplus >= 0 ? '#10B981' : '#F43F5E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tornado Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Sensitivity Analysis (Tornado)</h3>
          <p className="text-xs text-gray-400 mb-4">Impact on annual surplus from each stress factor individually</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sensitivityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#9CA3AF', fontSize: 10 }} width={110} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                  {sensitivityData.map((entry, i) => (
                    <Cell key={i} fill={entry.impact >= 0 ? '#10B981' : '#F43F5E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fan Chart */}
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Property Value Range (Fan Chart)</h3>
          <p className="text-xs text-gray-400 mb-4">Growth scenarios: 2% (low), 5% (mid), 7% (high)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fanData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Area type="monotone" dataKey="high" fill="#10B981" fillOpacity={0.1} stroke="#10B981" name="High (7%)" />
                <Area type="monotone" dataKey="mid" fill="#3B82F6" fillOpacity={0.15} stroke="#3B82F6" name="Mid (5%)" />
                <Area type="monotone" dataKey="low" fill="#F59E0B" fillOpacity={0.1} stroke="#F59E0B" name="Low (2%)" />
                <Line type="monotone" dataKey="loan" stroke="#F43F5E" strokeDasharray="5 5" name="Loan Balance" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Base Case Surplus" value={formatCurrency(Math.round(baseCase.surplus))} color={baseCase.surplus >= 0 ? 'text-emerald' : 'text-rose'} />
        <MetricCard label="Stress Test Surplus" value={formatCurrency(Math.round(stressCase.surplus))} color={stressCase.surplus >= 0 ? 'text-emerald' : 'text-rose'} />
        <MetricCard label="Worst Case Surplus" value={formatCurrency(Math.round(worstCase.surplus))} color={worstCase.surplus >= 0 ? 'text-emerald' : 'text-rose'} />
        <MetricCard
          label="Fund Survival"
          value={survivalYears === Infinity ? 'Indefinite' : `${survivalYears} years`}
          color={survivalYears >= 10 || survivalYears === Infinity ? 'text-emerald' : survivalYears >= 5 ? 'text-amber' : 'text-rose'}
          tooltip="How many years the fund can sustain a deficit before running out of cash"
        />
      </div>
    </div>
  );
}
