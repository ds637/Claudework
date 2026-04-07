import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Trash2, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useApp } from '../../../context/AppContext';
import SectionHeader from '../../shared/SectionHeader';
import InputField from '../../shared/InputField';
import MetricCard from '../../shared/MetricCard';
import { formatCurrency, CONCESSIONAL_CAP, NON_CONCESSIONAL_CAP, SG_RATE } from '../../../utils/calculations';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#F43F5E'];

export default function FundSetup() {
  const { state, updateFund, updateMember, addMember, removeMember } = useApp();
  const { fund } = state;

  const totalContributions = useMemo(() =>
    fund.members.reduce((sum, m) =>
      sum + (m.sgContributions || 0) + (m.salarySacrifice || 0) + (m.nonConcessional || 0) + (m.personalDeductible || 0), 0
    ), [fund.members]);

  const allocationData = useMemo(() => [
    { name: 'Cash', value: fund.allocationCash, color: COLORS[0] },
    { name: 'Shares', value: fund.allocationShares, color: COLORS[1] },
    { name: 'Property', value: fund.allocationProperty, color: COLORS[2] },
    { name: 'Other', value: fund.allocationOther, color: COLORS[3] },
  ].filter(d => d.value > 0), [fund]);

  const capData = useMemo(() =>
    fund.members.map((m) => {
      const concessional = (m.sgContributions || 0) + (m.salarySacrifice || 0) + (m.personalDeductible || 0);
      return {
        name: m.name || 'Member',
        concessional,
        concessionalCap: CONCESSIONAL_CAP,
        nonConcessional: m.nonConcessional || 0,
        nonConcessionalCap: NON_CONCESSIONAL_CAP,
        concessionalOver: concessional > CONCESSIONAL_CAP,
        nonConcessionalOver: (m.nonConcessional || 0) > NON_CONCESSIONAL_CAP,
      };
    }), [fund.members]);

  return (
    <div>
      <SectionHeader
        title="Fund Setup"
        subtitle="Configure your SMSF structure and member details"
        tooltip="Set up the basic details of your Self-Managed Superannuation Fund including member contributions and current asset allocation."
      >
        <button onClick={addMember} disabled={fund.members.length >= 6} className="btn-primary flex items-center gap-2">
          <UserPlus size={14} />
          Add Member
        </button>
      </SectionHeader>

      {/* Fund Details */}
      <div className="card mb-6">
        <h3 className="font-heading font-semibold text-white mb-4">Fund Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InputField label="Fund Name" value={fund.name} onChange={(v) => updateFund({ name: v })} />
          <InputField label="ABN" value={fund.abn} onChange={(v) => updateFund({ abn: v })} placeholder="XX XXX XXX XXX" />
          <InputField label="Establishment Date" value={fund.establishmentDate} onChange={(v) => updateFund({ establishmentDate: v })} type="date" />
          <InputField
            label="Trustee Type"
            value={fund.trusteeType}
            onChange={(v) => updateFund({ trusteeType: v })}
            options={['Corporate', 'Individual']}
            tooltip="Corporate trustees provide better asset protection and easier member changes."
          />
        </div>
      </div>

      {/* Members */}
      <div className="space-y-4 mb-6">
        {fund.members.map((member, idx) => {
          const concessional = (member.sgContributions || 0) + (member.salarySacrifice || 0) + (member.personalDeductible || 0);
          const conOver = concessional > CONCESSIONAL_CAP;
          const ncOver = (member.nonConcessional || 0) > NON_CONCESSIONAL_CAP;

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-semibold text-white">Member {idx + 1}: {member.name || 'Unnamed'}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${member.phase === 'accumulation' ? 'bg-electric/10 text-electric' : 'bg-emerald/10 text-emerald'}`}>
                    {member.phase === 'accumulation' ? 'Accumulation' : 'Pension'}
                  </span>
                  {fund.members.length > 1 && (
                    <button onClick={() => removeMember(member.id)} className="text-gray-500 hover:text-rose transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <InputField label="Name" value={member.name} onChange={(v) => updateMember(member.id, { name: v })} />
                <InputField label="Age" value={member.age} onChange={(v) => updateMember(member.id, { age: v })} type="number" min={18} max={100} />
                <InputField label="Date of Birth" value={member.dob} onChange={(v) => updateMember(member.id, { dob: v })} type="date" />
                <InputField label="Gender" value={member.gender} onChange={(v) => updateMember(member.id, { gender: v })} options={['Male', 'Female', 'Other']} />
                <InputField
                  label="Phase"
                  value={member.phase}
                  onChange={(v) => updateMember(member.id, { phase: v })}
                  options={[{ value: 'accumulation', label: 'Accumulation' }, { value: 'pension', label: 'Pension' }]}
                  tooltip="Members switch to pension phase when they start drawing income from their super."
                />
                <InputField label="Years to Retirement" value={member.yearsToRetirement} onChange={(v) => updateMember(member.id, { yearsToRetirement: v })} type="number" min={0} max={50} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
                <InputField
                  label="Annual Salary"
                  value={member.salary}
                  onChange={(v) => updateMember(member.id, { salary: v })}
                  type="number"
                  prefix="$"
                  tooltip={`SG contributions auto-calculated at ${SG_RATE * 100}%`}
                />
                <InputField
                  label="SG Contributions"
                  value={member.sgContributions}
                  onChange={() => {}}
                  type="number"
                  prefix="$"
                  disabled
                  helper={`Auto: ${SG_RATE * 100}% of salary`}
                />
                <InputField
                  label="Salary Sacrifice"
                  value={member.salarySacrifice}
                  onChange={(v) => updateMember(member.id, { salarySacrifice: v })}
                  type="number"
                  prefix="$"
                  tooltip="Pre-tax contributions made from your salary"
                />
                <InputField
                  label="Non-Concessional"
                  value={member.nonConcessional}
                  onChange={(v) => updateMember(member.id, { nonConcessional: v })}
                  type="number"
                  prefix="$"
                  tooltip="After-tax contributions. Cap: $120,000/year"
                />
                <InputField
                  label="Personal Deductible"
                  value={member.personalDeductible}
                  onChange={(v) => updateMember(member.id, { personalDeductible: v })}
                  type="number"
                  prefix="$"
                  tooltip="Personal contributions you claim a tax deduction for"
                />
              </div>

              {member.phase === 'pension' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <InputField
                    label="Min Pension Drawdown %"
                    value={member.pensionDrawdownRate}
                    onChange={() => {}}
                    type="number"
                    suffix="%"
                    disabled
                    helper="Auto-calculated from age-based ATO table"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 mt-3">
                <InputField label="Death Cover (p.a.)" value={member.insuranceDeath} onChange={(v) => updateMember(member.id, { insuranceDeath: v })} type="number" prefix="$" />
                <InputField label="TPD Cover (p.a.)" value={member.insuranceTPD} onChange={(v) => updateMember(member.id, { insuranceTPD: v })} type="number" prefix="$" />
                <InputField label="Income Protection (p.a.)" value={member.insuranceIP} onChange={(v) => updateMember(member.id, { insuranceIP: v })} type="number" prefix="$" />
              </div>

              {/* Cap warnings */}
              {(conOver || ncOver) && (
                <div className="mt-3 p-3 bg-rose/5 border border-rose/20 rounded-lg flex items-start gap-2">
                  <AlertTriangle size={16} className="text-rose flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-rose">
                    {conOver && <p>Concessional contributions ({formatCurrency(concessional)}) exceed cap ({formatCurrency(CONCESSIONAL_CAP)})</p>}
                    {ncOver && <p>Non-concessional contributions ({formatCurrency(member.nonConcessional)}) exceed cap ({formatCurrency(NON_CONCESSIONAL_CAP)})</p>}
                  </div>
                </div>
              )}

              <div className="mt-3 flex gap-4 text-xs text-gray-400">
                <span>Preservation age: <span className="font-mono text-white">{member.preservationAge}</span></span>
                <span>Total contributions: <span className="font-mono text-white">{formatCurrency(concessional + (member.nonConcessional || 0))}</span></span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Fund Balance & Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Fund Balance & Income</h3>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Current Fund Balance"
              value={fund.currentBalance}
              onChange={(v) => updateFund({ currentBalance: v })}
              type="number"
              prefix="$"
              tooltip="Total net assets of the fund"
            />
            <InputField
              label="Existing Investment Income (p.a.)"
              value={fund.existingIncome}
              onChange={(v) => updateFund({ existingIncome: v })}
              type="number"
              prefix="$"
              tooltip="Annual income from existing investments (dividends, interest, etc.)"
            />
          </div>
          <h4 className="text-sm font-medium text-gray-400 mt-4 mb-3">Asset Allocation (%)</h4>
          <div className="grid grid-cols-4 gap-3">
            <InputField label="Cash" value={fund.allocationCash} onChange={(v) => updateFund({ allocationCash: v })} type="number" suffix="%" />
            <InputField label="Shares" value={fund.allocationShares} onChange={(v) => updateFund({ allocationShares: v })} type="number" suffix="%" />
            <InputField label="Property" value={fund.allocationProperty} onChange={(v) => updateFund({ allocationProperty: v })} type="number" suffix="%" />
            <InputField label="Other" value={fund.allocationOther} onChange={(v) => updateFund({ allocationOther: v })} type="number" suffix="%" />
          </div>
        </div>

        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Asset Allocation</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={2}>
                  {allocationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(v) => `${v}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {allocationData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                {d.name} ({d.value}%)
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contribution Cap Utilisation */}
      {capData.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-heading font-semibold text-white mb-4">Contribution Cap Utilisation</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#9CA3AF', fontSize: 11 }} width={80} />
                <Tooltip
                  contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={(v) => formatCurrency(v)}
                />
                <Bar dataKey="concessional" fill="#3B82F6" name="Concessional" radius={[0, 4, 4, 0]} />
                <Bar dataKey="nonConcessional" fill="#10B981" name="Non-Concessional" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Contributions" value={formatCurrency(totalContributions)} color="text-electric" tooltip="Sum of all member contributions per year" />
        <MetricCard label="Fund Balance" value={formatCurrency(fund.currentBalance)} color="text-emerald" />
        <MetricCard label="Members" value={fund.members.length} color="text-white" />
        <MetricCard label="Investment Income" value={formatCurrency(fund.existingIncome)} color="text-amber" />
      </div>
    </div>
  );
}
