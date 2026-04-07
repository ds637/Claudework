import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useApp } from '../../../context/AppContext';
import SectionHeader from '../../shared/SectionHeader';
import MetricCard from '../../shared/MetricCard';
import { formatCurrency, getMinPensionDrawdown } from '../../../utils/calculations';

const INCOME_COLORS = ['#3B82F6', '#10B981', '#8B5CF6'];
const EXPENSE_COLORS = ['#F43F5E', '#F59E0B', '#EC4899'];

export default function CashFlow() {
  const { state } = useApp();
  const { fund, expenses, property } = state;

  const calcs = useMemo(() => {
    const totalContributions = fund.members.reduce(
      (sum, m) => sum + (m.sgContributions || 0) + (m.salarySacrifice || 0) + (m.nonConcessional || 0) + (m.personalDeductible || 0), 0
    );

    const annualRent = (property.weeklyRent || 0) * 52;
    const vacancyLoss = (property.weeklyRent || 0) * (property.vacancyWeeks || 0);
    const mgmtFee = annualRent * ((property.managementFee || 0) / 100);
    const propCosts = (property.landlordInsurance || 0) + (property.councilRates || 0) +
      (property.waterRates || 0) + (property.strata || 0) + (property.repairs || 0) + (property.landTax || 0);
    const netRent = annualRent - vacancyLoss - mgmtFee - propCosts;

    const totalIncome = totalContributions + (fund.existingIncome || 0) + Math.max(0, netRent);
    const fundExpenses = Object.values(expenses).reduce((a, b) => a + (Number(b) || 0), 0);
    const totalInsurance = fund.members.reduce(
      (sum, m) => sum + (m.insuranceDeath || 0) + (m.insuranceTPD || 0) + (m.insuranceIP || 0), 0
    );

    const loanAmount = (property.purchasePrice || 0) * ((property.lvr || 0) / 100);
    let annualRepayment;
    if (property.repaymentType === 'IO') {
      annualRepayment = loanAmount * ((property.interestRate || 0) / 100);
    } else {
      const r = (property.interestRate || 0) / 100 / 12;
      const n = (property.loanTerm || 25) * 12;
      annualRepayment = r > 0 ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) * 12 : 0;
    }

    const pensionDrawdowns = fund.members
      .filter(m => m.phase === 'pension')
      .reduce((sum, m) => sum + (fund.currentBalance / fund.members.length) * getMinPensionDrawdown(m.age), 0);

    const totalOutgoings = fundExpenses + totalInsurance + annualRepayment + pensionDrawdowns;
    const surplus = totalIncome - totalOutgoings;
    const cashOnCash = fund.currentBalance > 0 ? (surplus / fund.currentBalance) * 100 : 0;

    const breakEvenRent = annualRepayment + fundExpenses + totalInsurance + pensionDrawdowns - totalContributions - (fund.existingIncome || 0) + vacancyLoss + mgmtFee + propCosts;
    const breakEvenWeekly = Math.max(0, breakEvenRent / 52);

    return {
      totalContributions, netRent, totalIncome, fundExpenses, totalInsurance,
      annualRepayment, pensionDrawdowns, totalOutgoings, surplus,
      cashOnCash, breakEvenWeekly,
    };
  }, [fund, expenses, property]);

  // Waterfall data
  const waterfallData = useMemo(() => {
    const items = [
      { name: 'Contributions', value: calcs.totalContributions, fill: '#3B82F6' },
      { name: 'Invest. Income', value: fund.existingIncome || 0, fill: '#10B981' },
      { name: 'Net Rent', value: Math.max(0, calcs.netRent), fill: '#8B5CF6' },
      { name: 'Fund Expenses', value: -calcs.fundExpenses, fill: '#F43F5E' },
      { name: 'Insurance', value: -calcs.totalInsurance, fill: '#EC4899' },
      { name: 'Loan Repay', value: -calcs.annualRepayment, fill: '#F59E0B' },
      { name: 'Pensions', value: -calcs.pensionDrawdowns, fill: '#F97316' },
    ].filter(d => Math.abs(d.value) > 0);
    return items;
  }, [calcs, fund.existingIncome]);

  const incomeData = useMemo(() => [
    { name: 'Contributions', value: calcs.totalContributions },
    { name: 'Investment Income', value: fund.existingIncome || 0 },
    { name: 'Net Rent', value: Math.max(0, calcs.netRent) },
  ].filter(d => d.value > 0), [calcs, fund.existingIncome]);

  const expenseData = useMemo(() => [
    { name: 'Fund Expenses', value: calcs.fundExpenses + calcs.totalInsurance },
    { name: 'Loan Repayment', value: calcs.annualRepayment },
    { name: 'Pension Drawdowns', value: calcs.pensionDrawdowns },
  ].filter(d => d.value > 0), [calcs]);

  const surplusColor = calcs.surplus >= 0 ? 'text-emerald' : 'text-rose';
  const healthPct = calcs.totalIncome > 0 ? Math.min(100, Math.max(0, (calcs.surplus / calcs.totalIncome) * 100 + 50)) : 0;

  return (
    <div>
      <SectionHeader
        title="Cash Flow Model"
        subtitle="Complete annual fund profit & loss"
        tooltip="Shows total fund income minus all outgoings to determine your annual surplus or deficit."
      />

      {/* P&L Table and Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* P&L */}
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Annual P&L</h3>
          <div className="space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Income</div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-sm text-gray-300">Member Contributions</span>
              <span className="font-mono text-sm text-emerald">{formatCurrency(calcs.totalContributions)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-sm text-gray-300">Existing Investment Income</span>
              <span className="font-mono text-sm text-emerald">{formatCurrency(fund.existingIncome || 0)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-sm text-gray-300">Net Rental Income</span>
              <span className={`font-mono text-sm ${calcs.netRent >= 0 ? 'text-emerald' : 'text-rose'}`}>{formatCurrency(calcs.netRent)}</span>
            </div>
            <div className="flex justify-between py-2 font-semibold">
              <span className="text-sm text-white">Total Income</span>
              <span className="font-mono text-sm text-white">{formatCurrency(calcs.totalIncome)}</span>
            </div>

            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 mt-4">Outgoings</div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-sm text-gray-300">Fund Administration</span>
              <span className="font-mono text-sm text-rose">{formatCurrency(calcs.fundExpenses + calcs.totalInsurance)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/5">
              <span className="text-sm text-gray-300">Loan Repayment</span>
              <span className="font-mono text-sm text-rose">{formatCurrency(Math.round(calcs.annualRepayment))}</span>
            </div>
            {calcs.pensionDrawdowns > 0 && (
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-sm text-gray-300">Pension Drawdowns</span>
                <span className="font-mono text-sm text-rose">{formatCurrency(Math.round(calcs.pensionDrawdowns))}</span>
              </div>
            )}
            <div className="flex justify-between py-2 font-semibold">
              <span className="text-sm text-white">Total Outgoings</span>
              <span className="font-mono text-sm text-white">{formatCurrency(Math.round(calcs.totalOutgoings))}</span>
            </div>

            <div className="mt-4 pt-4 border-t-2 border-white/10">
              <div className="flex justify-between items-center">
                <span className="font-heading font-bold text-lg text-white">Annual Surplus / (Deficit)</span>
                <span className={`font-mono font-bold text-2xl ${surplusColor}`}>{formatCurrency(Math.round(calcs.surplus))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Waterfall Chart */}
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Cash Flow Waterfall</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Income vs Expense Pies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Income Composition</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={incomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                  {incomeData.map((_, i) => <Cell key={i} fill={INCOME_COLORS[i % INCOME_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {incomeData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-2 h-2 rounded-full" style={{ background: INCOME_COLORS[i % INCOME_COLORS.length] }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Expense Composition</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                  {expenseData.map((_, i) => <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {expenseData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-2 h-2 rounded-full" style={{ background: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Annual Surplus" value={formatCurrency(Math.round(calcs.surplus))} color={surplusColor} />
        <MetricCard label="Monthly Position" value={formatCurrency(Math.round(calcs.surplus / 12))} color={surplusColor} />
        <MetricCard label="Cash-on-Cash Return" value={`${calcs.cashOnCash.toFixed(1)}%`} color={calcs.cashOnCash > 0 ? 'text-emerald' : 'text-rose'} tooltip="Annual surplus as % of total fund balance" />
        <MetricCard label="Breakeven Rent" value={`$${Math.round(calcs.breakEvenWeekly)}/wk`} color="text-amber" tooltip="Minimum weekly rent needed for the fund to break even" />
      </div>

      {/* Fund Health Gauge */}
      <div className="card mt-6">
        <h3 className="font-heading font-semibold text-white mb-4">Fund Health Indicator</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-4 bg-navy-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${calcs.surplus >= 0 ? 'bg-emerald' : 'bg-rose'}`}
              style={{ width: `${healthPct}%` }}
            />
          </div>
          <span className={`font-mono font-bold text-lg ${surplusColor}`}>
            {calcs.surplus >= 0 ? 'Surplus' : 'Deficit'}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Surplus as % of income: {calcs.totalIncome > 0 ? `${((calcs.surplus / calcs.totalIncome) * 100).toFixed(1)}%` : 'N/A'}
        </p>
      </div>
    </div>
  );
}
