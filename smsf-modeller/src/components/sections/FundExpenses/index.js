import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useApp } from '../../../context/AppContext';
import SectionHeader from '../../shared/SectionHeader';
import InputField from '../../shared/InputField';
import MetricCard from '../../shared/MetricCard';
import { formatCurrency, formatPercent } from '../../../utils/calculations';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#A855F7'];

const EXPENSE_FIELDS = [
  { key: 'administration', label: 'Administration/Platform Fee', default: '$3,000-5,000', tooltip: 'Annual admin and platform fees charged by your SMSF provider' },
  { key: 'audit', label: 'Annual Audit Fee', default: '$1,200-2,000', tooltip: 'SMSFs must be audited annually by an approved auditor' },
  { key: 'accounting', label: 'Accounting/Tax Return', default: '$2,000-3,500', tooltip: 'Preparation of annual financial statements and tax return' },
  { key: 'asicFee', label: 'ASIC Annual Review Fee', default: '$63', tooltip: 'Annual fee for corporate trustees registered with ASIC' },
  { key: 'atoLevy', label: 'ATO Supervisory Levy', default: '$259', tooltip: 'Annual levy charged by the ATO for regulating your SMSF' },
  { key: 'investmentMgmt', label: 'Investment Management Fees', default: 'Varies', tooltip: 'Fees paid to investment managers or platforms for managing fund assets' },
  { key: 'legalAdvisory', label: 'Legal/Advisory Retainer', default: 'Varies', tooltip: 'Ongoing legal or advisory fees' },
  { key: 'bankFees', label: 'Bank Fees', default: '$100-300', tooltip: 'SMSF bank account fees' },
  { key: 'other', label: 'Other Expenses', default: 'Varies', tooltip: 'Any other fund-level expenses' },
];

const AVG_SMSF_COST = 15000;

export default function FundExpenses() {
  const { state, updateExpenses } = useApp();
  const { expenses, fund } = state;

  const totalInsurance = useMemo(() =>
    fund.members.reduce((sum, m) => sum + (m.insuranceDeath || 0) + (m.insuranceTPD || 0) + (m.insuranceIP || 0), 0),
    [fund.members]);

  const totalExpenses = useMemo(() =>
    Object.values(expenses).reduce((a, b) => a + (Number(b) || 0), 0) + totalInsurance,
    [expenses, totalInsurance]);

  const expenseRatio = useMemo(() =>
    fund.currentBalance > 0 ? (totalExpenses / fund.currentBalance) * 100 : 0,
    [totalExpenses, fund.currentBalance]);

  const pieData = useMemo(() => {
    const items = EXPENSE_FIELDS.map((f, i) => ({
      name: f.label.split('/')[0].split(' ')[0],
      value: Number(expenses[f.key]) || 0,
      color: COLORS[i % COLORS.length],
    })).filter(d => d.value > 0);
    if (totalInsurance > 0) items.push({ name: 'Insurance', value: totalInsurance, color: '#EC4899' });
    return items;
  }, [expenses, totalInsurance]);

  return (
    <div>
      <SectionHeader
        title="Fund Expenses"
        subtitle="Model all ongoing fund costs"
        tooltip="Track all annual expenses associated with running your SMSF. These costs reduce your fund's investable surplus."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Inputs */}
        <div className="lg:col-span-2 card">
          <h3 className="font-heading font-semibold text-white mb-4">Annual Expenses</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXPENSE_FIELDS.map((field) => (
              <InputField
                key={field.key}
                label={field.label}
                value={expenses[field.key]}
                onChange={(v) => updateExpenses({ [field.key]: v })}
                type="number"
                prefix="$"
                helper={`Typical: ${field.default}`}
                tooltip={field.tooltip}
              />
            ))}
          </div>
          {totalInsurance > 0 && (
            <div className="mt-4 p-3 bg-navy-900/50 rounded-lg">
              <span className="text-xs text-gray-400">Member Insurance Premiums (from Fund Setup): </span>
              <span className="font-mono text-sm text-white">{formatCurrency(totalInsurance)}</span>
            </div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Expense Breakdown</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(v) => formatCurrency(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-3">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-gray-400">{d.name}</span>
                </div>
                <span className="font-mono text-white">{formatCurrency(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <MetricCard label="Total Annual Expenses" value={formatCurrency(totalExpenses)} color="text-rose" />
        <MetricCard
          label="Expense Ratio"
          value={formatPercent(expenseRatio)}
          color={expenseRatio > 2 ? 'text-rose' : expenseRatio > 1 ? 'text-amber' : 'text-emerald'}
          tooltip="Total expenses as a percentage of fund balance"
        />
        <MetricCard
          label="vs Average SMSF"
          value={formatCurrency(totalExpenses - AVG_SMSF_COST)}
          color={totalExpenses > AVG_SMSF_COST ? 'text-rose' : 'text-emerald'}
          subtext={`Average SMSF costs ~${formatCurrency(AVG_SMSF_COST)}/year`}
        />
        <MetricCard label="Monthly Expenses" value={formatCurrency(totalExpenses / 12)} color="text-amber" />
      </div>
    </div>
  );
}
