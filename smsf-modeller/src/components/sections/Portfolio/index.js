import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X } from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useApp } from '../../../context/AppContext';
import SectionHeader from '../../shared/SectionHeader';
import InputField from '../../shared/InputField';
import SliderInput from '../../shared/SliderInput';
import MetricCard from '../../shared/MetricCard';
import {
  formatCurrency, formatPercent, futureValue, availableEquity,
  calcStampDuty, generateAmortisationSchedule,
} from '../../../utils/calculations';

const PROPERTY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6'];
const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

export default function Portfolio() {
  const { state, addProperty, updateAdditionalProperty, removeAdditionalProperty, updateProjections } = useApp();
  const { property, additionalProperties, projections } = state;
  const [showModal, setShowModal] = useState(false);

  const allProperties = useMemo(() => {
    const props = [{ ...property, id: 'primary', targetYear: 0, label: 'Property 1 (Primary)' }];
    additionalProperties.forEach((p, i) => {
      props.push({ ...p, label: `Property ${i + 2}` });
    });
    return props;
  }, [property, additionalProperties]);

  // Portfolio projections
  const portfolioData = useMemo(() => {
    const years = projections.projectionYears;
    const rows = [];

    for (let yr = 1; yr <= years; yr++) {
      let totalValue = 0, totalEquity = 0, totalLoan = 0, totalRent = 0;

      allProperties.forEach((p) => {
        const yearsHeld = yr - (p.targetYear || 0);
        if (yearsHeld <= 0) return;

        const propValue = futureValue(p.purchasePrice, projections.capitalGrowthRate, yearsHeld);
        const loanAmount = (p.purchasePrice || 0) * ((p.lvr || 0) / 100);
        const amort = generateAmortisationSchedule(loanAmount, p.interestRate, p.loanTerm, p.repaymentType === 'IO' ? (p.ioPeriod || 5) : 0);
        const loanBal = yearsHeld <= amort.length ? amort[yearsHeld - 1].closingBalance : 0;
        const annualRent = futureValue((p.weeklyRent || 0) * 52, projections.rentGrowthRate, yearsHeld);

        totalValue += propValue;
        totalLoan += loanBal;
        totalRent += annualRent;
      });

      totalEquity = totalValue - totalLoan;
      const portfolioLVR = totalValue > 0 ? (totalLoan / totalValue) * 100 : 0;

      rows.push({
        year: yr,
        totalValue: Math.round(totalValue),
        totalEquity: Math.round(totalEquity),
        totalLoan: Math.round(totalLoan),
        totalRent: Math.round(totalRent),
        portfolioLVR: Math.round(portfolioLVR * 10) / 10,
      });
    }

    return rows;
  }, [allProperties, projections]);

  // Stacked area data per property
  const stackedData = useMemo(() => {
    const years = projections.projectionYears;
    const rows = [];
    for (let yr = 1; yr <= years; yr++) {
      const row = { year: yr };
      allProperties.forEach((p, i) => {
        const yearsHeld = yr - (p.targetYear || 0);
        if (yearsHeld <= 0) { row[`prop${i}`] = 0; return; }
        row[`prop${i}`] = Math.round(futureValue(p.purchasePrice, projections.capitalGrowthRate, yearsHeld));
      });
      rows.push(row);
    }
    return rows;
  }, [allProperties, projections]);

  // Equity available from primary property
  const equityAvailable = useMemo(() => {
    const p = property;
    const loanAmount = p.purchasePrice * (p.lvr / 100);
    const results = [];
    for (let yr = 1; yr <= 20; yr++) {
      const val = futureValue(p.purchasePrice, projections.capitalGrowthRate, yr);
      const amort = generateAmortisationSchedule(loanAmount, p.interestRate, p.loanTerm, p.repaymentType === 'IO' ? (p.ioPeriod || 5) : 0);
      const bal = yr <= amort.length ? amort[yr - 1].closingBalance : 0;
      results.push({ year: yr, value: Math.round(val), loan: Math.round(bal), equity60: Math.round(availableEquity(val, 60, bal)), equity70: Math.round(availableEquity(val, 70, bal)) });
    }
    return results;
  }, [property, projections.capitalGrowthRate]);

  const tooltipStyle = { background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 };

  return (
    <div>
      <SectionHeader
        title="Multi-Property Portfolio Builder"
        subtitle="Model adding additional properties as equity builds"
        tooltip="Plan a multi-property portfolio by leveraging equity from existing properties to fund new acquisitions."
      >
        <button onClick={() => { addProperty(); }} className="btn-primary flex items-center gap-2">
          <Plus size={14} />
          Add Property
        </button>
      </SectionHeader>

      {/* Property Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {allProperties.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card"
            style={{ borderLeft: `3px solid ${PROPERTY_COLORS[i % PROPERTY_COLORS.length]}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-heading font-semibold text-white text-sm">{p.label}</h4>
              {p.id !== 'primary' && (
                <button onClick={() => removeAdditionalProperty(p.id)} className="text-gray-500 hover:text-rose transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            {p.id !== 'primary' ? (
              <div className="space-y-3">
                <SliderInput label="Target Purchase Year" value={p.targetYear || 5} onChange={(v) => updateAdditionalProperty(p.id, { targetYear: v })} min={1} max={20} step={1} suffix="" />
                <InputField label="Purchase Price" value={p.purchasePrice} onChange={(v) => updateAdditionalProperty(p.id, { purchasePrice: v })} type="number" prefix="$" />
                <InputField label="State" value={p.state} onChange={(v) => updateAdditionalProperty(p.id, { state: v })} options={STATES} />
                <SliderInput label="LVR" value={p.lvr} onChange={(v) => updateAdditionalProperty(p.id, { lvr: v })} min={0} max={80} step={1} suffix="%" />
                <InputField label="Interest Rate" value={p.interestRate} onChange={(v) => updateAdditionalProperty(p.id, { interestRate: v })} type="number" step={0.1} suffix="%" />
                <InputField label="Weekly Rent" value={p.weeklyRent} onChange={(v) => updateAdditionalProperty(p.id, { weeklyRent: v })} type="number" prefix="$" />
                <InputField
                  label="Funding Source"
                  value={p.fundingSource || 'equity'}
                  onChange={(v) => updateAdditionalProperty(p.id, { fundingSource: v })}
                  options={[
                    { value: 'equity', label: 'Use Accumulated Equity' },
                    { value: 'contributions', label: 'Additional Contributions' },
                    { value: 'sell', label: 'Sell Existing Assets' },
                  ]}
                />
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Price</span><span className="font-mono">{formatCurrency(p.purchasePrice)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">LVR</span><span className="font-mono">{p.lvr}%</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Weekly Rent</span><span className="font-mono">${p.weeklyRent}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">State</span><span className="font-mono">{p.state}</span></div>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-400">
              Stamp Duty: <span className="font-mono text-amber">{formatCurrency(calcStampDuty(p.purchasePrice, p.state))}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Equity Release Table */}
      <div className="card mb-6">
        <h3 className="font-heading font-semibold text-white mb-4">Available Equity from Primary Property</h3>
        <p className="text-xs text-gray-400 mb-4">Shows equity available for release at 60% and 70% target LVR as property value grows.</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityAvailable}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Area type="monotone" dataKey="equity70" fill="#10B981" fillOpacity={0.1} stroke="#10B981" name="Equity @ 70% LVR" />
              <Area type="monotone" dataKey="equity60" fill="#3B82F6" fillOpacity={0.1} stroke="#3B82F6" name="Equity @ 60% LVR" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Portfolio Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Portfolio Value by Property</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stackedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Legend />
                {allProperties.map((p, i) => (
                  <Area key={i} type="monotone" dataKey={`prop${i}`} stackId="1" fill={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} fillOpacity={0.3} stroke={PROPERTY_COLORS[i % PROPERTY_COLORS.length]} name={p.label} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Portfolio Equity & Loans</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Area type="monotone" dataKey="totalValue" fill="#3B82F6" fillOpacity={0.05} stroke="#3B82F6" name="Total Value" />
                <Area type="monotone" dataKey="totalEquity" fill="#10B981" fillOpacity={0.1} stroke="#10B981" name="Total Equity" />
                <Area type="monotone" dataKey="totalLoan" fill="#F43F5E" fillOpacity={0.1} stroke="#F43F5E" name="Total Loans" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <MetricCard label="Properties" value={allProperties.length} color="text-electric" />
        <MetricCard
          label="Total Portfolio Value"
          value={portfolioData.length > 0 ? formatCurrency(portfolioData[portfolioData.length - 1].totalValue) : '$0'}
          color="text-emerald"
          subtext={`Year ${projections.projectionYears}`}
        />
        <MetricCard
          label="Total Equity"
          value={portfolioData.length > 0 ? formatCurrency(portfolioData[portfolioData.length - 1].totalEquity) : '$0'}
          color="text-electric"
        />
        <MetricCard
          label="Total Loans"
          value={portfolioData.length > 0 ? formatCurrency(portfolioData[portfolioData.length - 1].totalLoan) : '$0'}
          color="text-rose"
        />
        <MetricCard
          label="Portfolio LVR"
          value={portfolioData.length > 0 ? formatPercent(portfolioData[portfolioData.length - 1].portfolioLVR) : '0%'}
          color="text-amber"
        />
      </div>

      {/* Comparison Table */}
      {allProperties.length > 1 && (
        <div className="card">
          <h3 className="font-heading font-semibold text-white mb-4">Property Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-2 px-3 text-left text-gray-400">Metric</th>
                  {allProperties.map((p, i) => (
                    <th key={i} className="py-2 px-3 text-right" style={{ color: PROPERTY_COLORS[i % PROPERTY_COLORS.length] }}>{p.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Purchase Price', fn: (p) => formatCurrency(p.purchasePrice) },
                  { label: 'LVR', fn: (p) => `${p.lvr}%` },
                  { label: 'Weekly Rent', fn: (p) => `$${p.weeklyRent}` },
                  { label: 'Gross Yield', fn: (p) => formatPercent(p.purchasePrice > 0 ? ((p.weeklyRent * 52) / p.purchasePrice) * 100 : 0) },
                  { label: 'Stamp Duty', fn: (p) => formatCurrency(calcStampDuty(p.purchasePrice, p.state)) },
                  { label: 'Target Year', fn: (p) => p.targetYear === 0 ? 'Now' : `Year ${p.targetYear}` },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-1.5 px-3 text-gray-400">{row.label}</td>
                    {allProperties.map((p, i) => (
                      <td key={i} className="py-1.5 px-3 text-right font-mono text-white">{row.fn(p)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
