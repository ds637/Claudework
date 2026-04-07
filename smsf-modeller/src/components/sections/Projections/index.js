import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { useApp } from '../../../context/AppContext';
import SectionHeader from '../../shared/SectionHeader';
import SliderInput from '../../shared/SliderInput';
import MetricCard from '../../shared/MetricCard';
import { formatCurrency, formatPercent, futureValue, generateAmortisationSchedule, calcMonthlyPaymentIO } from '../../../utils/calculations';

const CHART_TABS = [
  { id: 'value-equity', label: 'Value vs Equity vs Loan' },
  { id: 'cash-position', label: 'Annual Cash Position' },
  { id: 'net-position', label: 'Net Position' },
  { id: 'lvr', label: 'LVR Trajectory' },
  { id: 'equity-waterfall', label: 'Equity Build-Up' },
];

export default function Projections() {
  const { state, updateProjections } = useApp();
  const { projections: proj, property, fund, expenses } = state;
  const [chartTab, setChartTab] = useState('value-equity');

  const data = useMemo(() => {
    const p = property;
    const loanAmount = (p.purchasePrice || 0) * ((p.lvr || 0) / 100);
    const ioPeriod = p.repaymentType === 'IO' ? p.ioPeriod || 5 : 0;
    const amort = generateAmortisationSchedule(loanAmount, p.interestRate, p.loanTerm, ioPeriod);

    const annualRent = (p.weeklyRent || 0) * 52;
    const vacancyLoss = (p.weeklyRent || 0) * (p.vacancyWeeks || 0);
    const mgmtFee = annualRent * ((p.managementFee || 0) / 100);
    const propCosts = (p.landlordInsurance || 0) + (p.councilRates || 0) + (p.waterRates || 0) + (p.strata || 0) + (p.repairs || 0) + (p.landTax || 0);
    const baseNetRent = annualRent - vacancyLoss - mgmtFee - propCosts;

    const totalContributions = fund.members.reduce(
      (sum, m) => sum + (m.sgContributions || 0) + (m.salarySacrifice || 0) + (m.nonConcessional || 0) + (m.personalDeductible || 0), 0
    );
    const fundExp = Object.values(expenses).reduce((a, b) => a + (Number(b) || 0), 0);
    const insurance = fund.members.reduce((sum, m) => sum + (m.insuranceDeath || 0) + (m.insuranceTPD || 0) + (m.insuranceIP || 0), 0);

    const rows = [];
    let cumulativeCash = 0;
    let breakEvenYear = null;
    let lvr60Year = null;
    let loanPaidOffYear = null;

    for (let yr = 1; yr <= proj.projectionYears; yr++) {
      const propValue = futureValue(p.purchasePrice, proj.capitalGrowthRate, yr);
      const capitalGain = propValue - p.purchasePrice;
      const loanBalance = yr <= amort.length ? amort[yr - 1].closingBalance : 0;
      const equity = propValue - loanBalance;
      const lvr = loanBalance > 0 ? (loanBalance / propValue) * 100 : 0;

      const grossRent = futureValue(annualRent, proj.rentGrowthRate, yr);
      const yearNetRent = futureValue(baseNetRent, proj.rentGrowthRate, yr);
      const yearContributions = futureValue(totalContributions, proj.contributionGrowthRate, yr);
      const yearExpenses = futureValue(fundExp + insurance, proj.expenseInflationRate, yr);
      const yearRepayment = yr <= amort.length ? amort[yr - 1].payment : 0;

      const annualCash = yearContributions + (fund.existingIncome || 0) + yearNetRent - yearExpenses - yearRepayment;
      cumulativeCash += annualCash;

      if (breakEvenYear === null && cumulativeCash >= 0) breakEvenYear = yr;
      if (lvr60Year === null && lvr <= 60 && lvr > 0) lvr60Year = yr;
      if (loanPaidOffYear === null && loanBalance <= 0 && yr > 1) loanPaidOffYear = yr;

      rows.push({
        year: yr,
        propertyValue: Math.round(propValue),
        capitalGain: Math.round(capitalGain),
        loanBalance: Math.round(loanBalance),
        equity: Math.round(equity),
        lvr: Math.round(lvr * 10) / 10,
        grossRent: Math.round(grossRent),
        netRent: Math.round(yearNetRent),
        cashPosition: Math.round(annualCash),
        cumulativeCash: Math.round(cumulativeCash),
        netPosition: Math.round(capitalGain + cumulativeCash),
      });
    }

    return { rows, breakEvenYear, lvr60Year, loanPaidOffYear };
  }, [property, proj, fund, expenses]);

  const tooltipStyle = { background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 };

  return (
    <div>
      <SectionHeader
        title="Holding Period Projections"
        subtitle="Model long-term outcomes with interactive assumptions"
        tooltip="Project property value, equity build-up, and cash flow over 10-30 years based on growth and inflation assumptions."
      />

      {/* Assumption Sliders */}
      <div className="card mb-6">
        <h3 className="font-heading font-semibold text-white mb-4">Growth Assumptions</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <SliderInput label="Capital Growth" value={proj.capitalGrowthRate} onChange={(v) => updateProjections({ capitalGrowthRate: v })} min={0} max={10} step={0.5} suffix="% p.a." />
          <SliderInput label="Rent Growth" value={proj.rentGrowthRate} onChange={(v) => updateProjections({ rentGrowthRate: v })} min={0} max={8} step={0.5} suffix="% p.a." />
          <SliderInput label="Expense Inflation" value={proj.expenseInflationRate} onChange={(v) => updateProjections({ expenseInflationRate: v })} min={0} max={5} step={0.5} suffix="% p.a." />
          <SliderInput label="Contribution Growth" value={proj.contributionGrowthRate} onChange={(v) => updateProjections({ contributionGrowthRate: v })} min={0} max={5} step={0.5} suffix="% p.a." />
          <SliderInput label="Projection Period" value={proj.projectionYears} onChange={(v) => updateProjections({ projectionYears: v })} min={5} max={30} step={1} suffix=" yrs" />
        </div>
      </div>

      {/* Milestone Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Break-even Year" value={data.breakEvenYear ? `Year ${data.breakEvenYear}` : 'N/A'} color="text-emerald" tooltip="When cumulative cash position turns positive" />
        <MetricCard label="60% LVR Reached" value={data.lvr60Year ? `Year ${data.lvr60Year}` : 'N/A'} color="text-electric" tooltip="Potential refinance trigger point" />
        <MetricCard label="Loan Paid Off" value={data.loanPaidOffYear ? `Year ${data.loanPaidOffYear}` : 'N/A'} color="text-amber" />
        <MetricCard
          label={`Property Value (Yr ${proj.projectionYears})`}
          value={data.rows.length > 0 ? formatCurrency(data.rows[data.rows.length - 1].propertyValue) : '$0'}
          color="text-emerald"
        />
      </div>

      {/* Chart Tabs */}
      <div className="card mb-6">
        <div className="flex gap-1 mb-4 overflow-x-auto">
          {CHART_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setChartTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                chartTab === tab.id ? 'bg-electric text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartTab === 'value-equity' ? (
              <AreaChart data={data.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Area type="monotone" dataKey="propertyValue" fill="#3B82F6" fillOpacity={0.1} stroke="#3B82F6" name="Property Value" />
                <Area type="monotone" dataKey="equity" fill="#10B981" fillOpacity={0.1} stroke="#10B981" name="Equity" />
                <Area type="monotone" dataKey="loanBalance" fill="#F43F5E" fillOpacity={0.1} stroke="#F43F5E" name="Loan Balance" />
              </AreaChart>
            ) : chartTab === 'cash-position' ? (
              <ComposedChart data={data.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="cashPosition" name="Annual Cash" radius={[4, 4, 0, 0]}>
                  {data.rows.map((entry, i) => (
                    <Bar key={i} fill={entry.cashPosition >= 0 ? '#10B981' : '#F43F5E'} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="cumulativeCash" stroke="#F59E0B" strokeWidth={2} name="Cumulative" dot={false} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
              </ComposedChart>
            ) : chartTab === 'net-position' ? (
              <LineChart data={data.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="netPosition" stroke="#3B82F6" strokeWidth={2} name="Net Position" />
                <Line type="monotone" dataKey="capitalGain" stroke="#10B981" strokeWidth={2} name="Capital Gain" />
                <Line type="monotone" dataKey="cumulativeCash" stroke="#F59E0B" strokeWidth={2} name="Cumulative Cash" />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
              </LineChart>
            ) : chartTab === 'lvr' ? (
              <LineChart data={data.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <ReferenceLine y={80} stroke="#F43F5E" strokeDasharray="5 5" label={{ value: '80% LVR', fill: '#F43F5E', fontSize: 10 }} />
                <ReferenceLine y={60} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: '60% LVR', fill: '#F59E0B', fontSize: 10 }} />
                <Line type="monotone" dataKey="lvr" stroke="#3B82F6" strokeWidth={2} name="LVR" />
              </LineChart>
            ) : (
              <BarChart data={data.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="equity" fill="#10B981" name="Equity" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year-by-Year Table */}
      <div className="card">
        <h3 className="font-heading font-semibold text-white mb-4">Year-by-Year Projection</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                {['Year', 'Property Value', 'Capital Gain', 'Loan Balance', 'Equity', 'LVR', 'Gross Rent', 'Net Rent', 'Cash Position', 'Cumulative Cash', 'Net Position'].map((h) => (
                  <th key={h} className="py-2 px-2 text-right text-gray-400 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, i) => (
                <tr key={row.year} className={`border-b border-white/5 hover:bg-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                  <td className="py-1.5 px-2 text-right font-mono font-semibold">{row.year}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(row.propertyValue)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-emerald">{formatCurrency(row.capitalGain)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(row.loanBalance)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-electric">{formatCurrency(row.equity)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{row.lvr}%</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(row.grossRent)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(row.netRent)}</td>
                  <td className={`py-1.5 px-2 text-right font-mono ${row.cashPosition >= 0 ? 'text-emerald' : 'text-rose'}`}>{formatCurrency(row.cashPosition)}</td>
                  <td className={`py-1.5 px-2 text-right font-mono ${row.cumulativeCash >= 0 ? 'text-emerald' : 'text-rose'}`}>{formatCurrency(row.cumulativeCash)}</td>
                  <td className={`py-1.5 px-2 text-right font-mono font-semibold ${row.netPosition >= 0 ? 'text-emerald' : 'text-rose'}`}>{formatCurrency(row.netPosition)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
