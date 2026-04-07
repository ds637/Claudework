import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell, ComposedChart,
} from 'recharts';
import { useApp } from '../../../context/AppContext';
import SectionHeader from '../../shared/SectionHeader';
import InputField from '../../shared/InputField';
import SliderInput from '../../shared/SliderInput';
import MetricCard from '../../shared/MetricCard';
import TrafficLight from '../../shared/TrafficLight';
import {
  calcStampDuty, calcMonthlyPaymentPI, calcMonthlyPaymentIO,
  generateAmortisationSchedule, formatCurrency, formatPercent,
  grossYield, netYield, rentalCoverageRatio,
} from '../../../utils/calculations';

const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];
const PROPERTY_TYPES = ['House', 'Unit', 'Townhouse', 'Commercial'];
const TABS = [
  { id: 'details', label: 'Property Details' },
  { id: 'loan', label: 'Loan Structure' },
  { id: 'rental', label: 'Rental Income' },
  { id: 'acquisition', label: 'Acquisition Costs' },
  { id: 'summary', label: 'Summary' },
];

export default function PropertyAnalyser() {
  const { state, updateProperty } = useApp();
  const { property, fund } = state;
  const [activeTab, setActiveTab] = useState('details');
  const [showAmortisation, setShowAmortisation] = useState(false);

  const p = property;

  // Derived calculations
  const stampDuty = useMemo(() => calcStampDuty(p.purchasePrice, p.state), [p.purchasePrice, p.state]);
  const loanAmount = useMemo(() => Math.round(p.purchasePrice * (p.lvr / 100)), [p.purchasePrice, p.lvr]);
  const deposit = useMemo(() => p.purchasePrice - loanAmount, [p.purchasePrice, loanAmount]);

  const monthlyRepayment = useMemo(() => {
    if (p.repaymentType === 'IO') return calcMonthlyPaymentIO(loanAmount, p.interestRate);
    return calcMonthlyPaymentPI(loanAmount, p.interestRate, p.loanTerm);
  }, [loanAmount, p.interestRate, p.loanTerm, p.repaymentType]);

  const annualRepayment = monthlyRepayment * 12;
  const totalInterest = useMemo(() => {
    if (p.repaymentType === 'IO') return loanAmount * (p.interestRate / 100) * p.loanTerm;
    return (monthlyRepayment * 12 * p.loanTerm) - loanAmount;
  }, [loanAmount, p.interestRate, p.loanTerm, monthlyRepayment, p.repaymentType]);

  const amortisation = useMemo(() =>
    generateAmortisationSchedule(loanAmount, p.interestRate, p.loanTerm, p.repaymentType === 'IO' ? p.ioPeriod : 0),
    [loanAmount, p.interestRate, p.loanTerm, p.repaymentType, p.ioPeriod]);

  // Rental calculations
  const annualRent = (p.weeklyRent || 0) * 52;
  const vacancyLoss = (p.weeklyRent || 0) * (p.vacancyWeeks || 0);
  const mgmtFee = annualRent * ((p.managementFee || 0) / 100);
  const totalPropertyCosts = (p.landlordInsurance || 0) + (p.councilRates || 0) + (p.waterRates || 0) +
    (p.strata || 0) + (p.repairs || 0) + (p.landTax || 0);
  const netRent = annualRent - vacancyLoss - mgmtFee - totalPropertyCosts;

  const gYield = grossYield(annualRent, p.purchasePrice);
  const nYield = netYield(netRent, p.purchasePrice);
  const rcr = rentalCoverageRatio(netRent, annualRepayment);

  // Acquisition costs
  const acquisitionCosts = useMemo(() => ({
    stampDuty,
    legalConveyancing: p.legalConveyancing || 0,
    legalLRBA: p.legalLRBA || 0,
    trustDeedReview: p.trustDeedReview || 0,
    lenderAppFee: p.lenderAppFee || 0,
    valuationFee: p.valuationFee || 0,
    buildingPest: p.buildingPest || 0,
    quantitySurveyor: p.quantitySurveyor || 0,
    strataSearches: p.strataSearches || 0,
    smsfAdviserFee: p.smsfAdviserFee || 0,
    buyersAgentFee: p.buyersAgentFee || 0,
    otherAcquisition: p.otherAcquisition || 0,
  }), [stampDuty, p]);

  const totalAcquisitionCosts = Object.values(acquisitionCosts).reduce((a, b) => a + b, 0);
  const totalCashRequired = deposit + totalAcquisitionCosts;
  const canAfford = fund.currentBalance >= totalCashRequired;

  const acqBarData = useMemo(() =>
    Object.entries(acquisitionCosts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: k.replace(/([A-Z])/g, ' $1').trim(), value: v })),
    [acquisitionCosts]);

  return (
    <div>
      <SectionHeader
        title="Property Analyser"
        subtitle="Model a property acquisition with full financial analysis"
        tooltip="Configure property details, loan structure, rental income, and acquisition costs to see if your fund can afford this investment."
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-navy-900/50 p-1 rounded-lg overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-electric text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
        >
          {/* Property Details */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="font-heading font-semibold text-white mb-4">Property Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <SliderInput
                    label="Purchase Price"
                    value={p.purchasePrice}
                    onChange={(v) => updateProperty({ purchasePrice: v })}
                    min={200000} max={3000000} step={10000}
                    formatValue={(v) => formatCurrency(v)}
                    tooltip="The agreed purchase price of the property"
                  />
                  <InputField
                    label="Property Type"
                    value={p.propertyType}
                    onChange={(v) => updateProperty({ propertyType: v })}
                    options={PROPERTY_TYPES}
                  />
                  <InputField
                    label="State/Territory"
                    value={p.state}
                    onChange={(v) => updateProperty({ state: v })}
                    options={STATES}
                    tooltip="The state determines stamp duty calculations"
                  />
                  <InputField label="Suburb" value={p.suburb} onChange={(v) => updateProperty({ suburb: v })} placeholder="e.g. Parramatta" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <InputField label="Bedrooms" value={p.bedrooms} onChange={(v) => updateProperty({ bedrooms: v })} type="number" min={0} />
                  <InputField label="Bathrooms" value={p.bathrooms} onChange={(v) => updateProperty({ bathrooms: v })} type="number" min={0} />
                  <InputField label="Car Spaces" value={p.carSpaces} onChange={(v) => updateProperty({ carSpaces: v })} type="number" min={0} />
                  <InputField label="Land Size (m²)" value={p.landSize} onChange={(v) => updateProperty({ landSize: v })} type="number" />
                  <InputField label="Floor Area (m²)" value={p.floorArea} onChange={(v) => updateProperty({ floorArea: v })} type="number" />
                  <InputField label="Year Built" value={p.yearBuilt} onChange={(v) => updateProperty({ yearBuilt: v })} type="number" />
                </div>
              </div>

              {/* Stamp Duty */}
              <div className="card">
                <h3 className="font-heading font-semibold text-white mb-4">Stamp Duty Calculator — {p.state}</h3>
                <div className="flex items-center gap-8">
                  <div>
                    <span className="metric-label">Stamp Duty</span>
                    <div className="metric-value text-amber">{formatCurrency(stampDuty)}</div>
                  </div>
                  <div>
                    <span className="metric-label">% of Purchase Price</span>
                    <div className="font-mono text-lg text-gray-300">{formatPercent(p.purchasePrice > 0 ? (stampDuty / p.purchasePrice) * 100 : 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loan Structure */}
          {activeTab === 'loan' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="font-heading font-semibold text-white mb-4">Loan Structure</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <SliderInput
                      label="LVR (Loan-to-Value Ratio)"
                      value={p.lvr} onChange={(v) => updateProperty({ lvr: v })}
                      min={0} max={80} step={1} suffix="%"
                      tooltip="SMSF lenders typically cap LVR at 70-80%"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="metric-label">Loan Amount</span>
                        <div className="font-mono text-lg text-white">{formatCurrency(loanAmount)}</div>
                      </div>
                      <div>
                        <span className="metric-label">Deposit Required</span>
                        <div className="font-mono text-lg text-white">{formatCurrency(deposit)}</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <InputField
                          label="Interest Rate"
                          value={p.interestRate}
                          onChange={(v) => updateProperty({ interestRate: v })}
                          type="number" step={0.1} suffix="%"
                        />
                      </div>
                      <button onClick={() => updateProperty({ interestRate: Math.max(0, p.interestRate - 0.1) })} className="btn-secondary py-2 px-3">-0.1%</button>
                      <button onClick={() => updateProperty({ interestRate: p.interestRate + 0.1 })} className="btn-secondary py-2 px-3">+0.1%</button>
                    </div>
                    <SliderInput
                      label="Loan Term"
                      value={p.loanTerm} onChange={(v) => updateProperty({ loanTerm: v })}
                      min={5} max={30} step={1} suffix=" yrs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateProperty({ repaymentType: 'IO' })}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${p.repaymentType === 'IO' ? 'bg-electric text-white' : 'bg-white/5 text-gray-400'}`}
                      >
                        Interest Only
                      </button>
                      <button
                        onClick={() => updateProperty({ repaymentType: 'PI' })}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${p.repaymentType === 'PI' ? 'bg-electric text-white' : 'bg-white/5 text-gray-400'}`}
                      >
                        Principal & Interest
                      </button>
                    </div>
                    {p.repaymentType === 'PI' && (
                      <SliderInput
                        label="IO Period (before switching to P&I)"
                        value={p.ioPeriod} onChange={(v) => updateProperty({ ioPeriod: v })}
                        min={0} max={10} step={1} suffix=" yrs"
                      />
                    )}
                  </div>
                  <div className="space-y-4">
                    <MetricCard label="Monthly Repayment" value={formatCurrency(Math.round(monthlyRepayment))} color="text-electric" />
                    <MetricCard label="Annual Repayment" value={formatCurrency(Math.round(annualRepayment))} color="text-amber" />
                    <MetricCard label="Total Interest Over Life" value={formatCurrency(Math.round(totalInterest))} color="text-rose" />
                  </div>
                </div>
              </div>

              {/* Amortisation */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-semibold text-white">Amortisation Schedule</h3>
                  <button onClick={() => setShowAmortisation(!showAmortisation)} className="btn-secondary text-xs">
                    {showAmortisation ? 'Hide Table' : 'Show Table'}
                  </button>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={amortisation}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="year" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                        formatter={(v) => formatCurrency(v)}
                      />
                      <Area type="monotone" dataKey="closingBalance" fill="#3B82F6" fillOpacity={0.1} stroke="#3B82F6" name="Loan Balance" />
                      <Area type="monotone" dataKey="interest" fill="#F43F5E" fillOpacity={0.1} stroke="#F43F5E" name="Interest" />
                      <Area type="monotone" dataKey="principal" fill="#10B981" fillOpacity={0.1} stroke="#10B981" name="Principal" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {showAmortisation && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="py-2 px-2 text-left text-gray-400">Year</th>
                          <th className="py-2 px-2 text-right text-gray-400">Opening</th>
                          <th className="py-2 px-2 text-right text-gray-400">Payment</th>
                          <th className="py-2 px-2 text-right text-gray-400">Interest</th>
                          <th className="py-2 px-2 text-right text-gray-400">Principal</th>
                          <th className="py-2 px-2 text-right text-gray-400">Closing</th>
                          <th className="py-2 px-2 text-center text-gray-400">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {amortisation.map((row) => (
                          <tr key={row.year} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-1.5 px-2 font-mono">{row.year}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(row.openingBalance)}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(row.payment)}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-rose">{formatCurrency(row.interest)}</td>
                            <td className="py-1.5 px-2 text-right font-mono text-emerald">{formatCurrency(row.principal)}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{formatCurrency(row.closingBalance)}</td>
                            <td className="py-1.5 px-2 text-center">{row.isIO ? <span className="badge-amber">IO</span> : <span className="badge-green">P&I</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rental Income */}
          {activeTab === 'rental' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="font-heading font-semibold text-white mb-4">Rental Income & Property Costs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InputField
                    label="Weekly Rent"
                    value={p.weeklyRent}
                    onChange={(v) => updateProperty({ weeklyRent: v })}
                    type="number" prefix="$"
                    helper={`Annual: ${formatCurrency(annualRent)}`}
                    tooltip="Expected weekly rental income"
                  />
                  <SliderInput
                    label="Vacancy"
                    value={p.vacancyWeeks}
                    onChange={(v) => updateProperty({ vacancyWeeks: v })}
                    min={0} max={12} step={1} suffix=" wks"
                    tooltip="Expected weeks of vacancy per year"
                  />
                  <SliderInput
                    label="Management Fee"
                    value={p.managementFee}
                    onChange={(v) => updateProperty({ managementFee: v })}
                    min={0} max={15} step={0.5} suffix="%"
                    tooltip="Property management fee as % of rent (typical 7-10%)"
                  />
                  <InputField label="Landlord Insurance" value={p.landlordInsurance} onChange={(v) => updateProperty({ landlordInsurance: v })} type="number" prefix="$" />
                  <InputField label="Council Rates" value={p.councilRates} onChange={(v) => updateProperty({ councilRates: v })} type="number" prefix="$" />
                  <InputField label="Water Rates" value={p.waterRates} onChange={(v) => updateProperty({ waterRates: v })} type="number" prefix="$" />
                  <InputField label="Strata/Body Corp" value={p.strata} onChange={(v) => updateProperty({ strata: v })} type="number" prefix="$" />
                  <InputField label="Repairs & Maintenance" value={p.repairs} onChange={(v) => updateProperty({ repairs: v })} type="number" prefix="$" />
                  <InputField label="Land Tax" value={p.landTax} onChange={(v) => updateProperty({ landTax: v })} type="number" prefix="$" tooltip="Check your state's land tax thresholds" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Net Rental Income" value={formatCurrency(netRent)} color={netRent >= 0 ? 'text-emerald' : 'text-rose'} />
                <MetricCard label="Gross Yield" value={formatPercent(gYield)} color={gYield >= 5 ? 'text-emerald' : gYield >= 4 ? 'text-amber' : 'text-rose'} />
                <MetricCard label="Net Yield" value={formatPercent(nYield)} color={nYield >= 3 ? 'text-emerald' : nYield >= 2 ? 'text-amber' : 'text-rose'} />
                <MetricCard label="Rental Coverage" value={`${rcr.toFixed(2)}x`} color={rcr >= 1.2 ? 'text-emerald' : rcr >= 1 ? 'text-amber' : 'text-rose'} tooltip="Net rent / loan repayment. Above 1.0x means rent covers the loan." />
              </div>
            </div>
          )}

          {/* Acquisition Costs */}
          {activeTab === 'acquisition' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="font-heading font-semibold text-white mb-4">Acquisition Costs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <span className="input-label">Stamp Duty (auto-calculated)</span>
                    <div className="input-field bg-navy-700/50 cursor-not-allowed">{formatCurrency(stampDuty)}</div>
                  </div>
                  <InputField label="Legal/Conveyancing" value={p.legalConveyancing} onChange={(v) => updateProperty({ legalConveyancing: v })} type="number" prefix="$" />
                  <InputField label="LRBA & Bare Trust Setup" value={p.legalLRBA} onChange={(v) => updateProperty({ legalLRBA: v })} type="number" prefix="$" tooltip="Legal fees for setting up the LRBA and bare trust structure" />
                  <InputField label="Trust Deed Review" value={p.trustDeedReview} onChange={(v) => updateProperty({ trustDeedReview: v })} type="number" prefix="$" />
                  <InputField label="Lender Application Fee" value={p.lenderAppFee} onChange={(v) => updateProperty({ lenderAppFee: v })} type="number" prefix="$" />
                  <InputField label="Valuation Fee" value={p.valuationFee} onChange={(v) => updateProperty({ valuationFee: v })} type="number" prefix="$" />
                  <InputField label="Building & Pest Inspection" value={p.buildingPest} onChange={(v) => updateProperty({ buildingPest: v })} type="number" prefix="$" />
                  <InputField label="Quantity Surveyor" value={p.quantitySurveyor} onChange={(v) => updateProperty({ quantitySurveyor: v })} type="number" prefix="$" tooltip="For depreciation schedule" />
                  <InputField label="Strata/Title Searches" value={p.strataSearches} onChange={(v) => updateProperty({ strataSearches: v })} type="number" prefix="$" />
                  <InputField label="SMSF Adviser Fee" value={p.smsfAdviserFee} onChange={(v) => updateProperty({ smsfAdviserFee: v })} type="number" prefix="$" />
                  <InputField label="Buyer's Agent Fee" value={p.buyersAgentFee} onChange={(v) => updateProperty({ buyersAgentFee: v })} type="number" prefix="$" />
                  <InputField label="Other" value={p.otherAcquisition} onChange={(v) => updateProperty({ otherAcquisition: v })} type="number" prefix="$" />
                </div>
              </div>

              {/* Bar chart */}
              <div className="card">
                <h3 className="font-heading font-semibold text-white mb-4">Cost Composition</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={acqBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#9CA3AF', fontSize: 10 }} width={100} />
                      <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(v) => formatCurrency(v)} />
                      <Bar dataKey="value" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MetricCard label="Total Acquisition Costs" value={formatCurrency(totalAcquisitionCosts)} color="text-amber" />
                <MetricCard label="Total Cash at Settlement" value={formatCurrency(totalCashRequired)} color="text-rose" subtext="Deposit + all costs" />
                <MetricCard
                  label="Fund Can Afford?"
                  value={canAfford ? 'YES' : 'NO'}
                  color={canAfford ? 'text-emerald' : 'text-rose'}
                  subtext={`Available: ${formatCurrency(fund.currentBalance)}`}
                />
              </div>
            </div>
          )}

          {/* Summary */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="font-heading font-semibold text-white mb-4">Property Investment Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="metric-label">Purchase Price</span>
                    <div className="font-mono text-lg text-white">{formatCurrency(p.purchasePrice)}</div>
                  </div>
                  <div>
                    <span className="metric-label">Loan Amount</span>
                    <div className="font-mono text-lg text-white">{formatCurrency(loanAmount)}</div>
                  </div>
                  <div>
                    <span className="metric-label">Deposit</span>
                    <div className="font-mono text-lg text-white">{formatCurrency(deposit)}</div>
                  </div>
                  <div>
                    <span className="metric-label">Stamp Duty ({p.state})</span>
                    <div className="font-mono text-lg text-amber">{formatCurrency(stampDuty)}</div>
                  </div>
                  <div>
                    <span className="metric-label">Total Cash Needed</span>
                    <div className="font-mono text-lg text-rose">{formatCurrency(totalCashRequired)}</div>
                  </div>
                  <div>
                    <span className="metric-label">Gross Yield</span>
                    <div className="font-mono text-lg">{formatPercent(gYield)}</div>
                    <TrafficLight status={gYield >= 5 ? 'green' : gYield >= 4 ? 'amber' : 'red'} label={gYield >= 5 ? 'Strong' : gYield >= 4 ? 'Moderate' : 'Low'} />
                  </div>
                  <div>
                    <span className="metric-label">Net Yield</span>
                    <div className="font-mono text-lg">{formatPercent(nYield)}</div>
                    <TrafficLight status={nYield >= 3 ? 'green' : nYield >= 2 ? 'amber' : 'red'} label={nYield >= 3 ? 'Strong' : nYield >= 2 ? 'Moderate' : 'Low'} />
                  </div>
                  <div>
                    <span className="metric-label">Rental Coverage</span>
                    <div className="font-mono text-lg">{rcr.toFixed(2)}x</div>
                    <TrafficLight status={rcr >= 1.2 ? 'green' : rcr >= 1 ? 'amber' : 'red'} label={rcr >= 1.2 ? 'Well Covered' : rcr >= 1 ? 'Tight' : 'Shortfall'} />
                  </div>
                </div>
              </div>

              <div className={`card border-2 ${canAfford ? 'border-emerald/30 bg-emerald/5' : 'border-rose/30 bg-rose/5'}`}>
                <h3 className={`font-heading font-bold text-xl ${canAfford ? 'text-emerald' : 'text-rose'}`}>
                  {canAfford ? 'Your fund CAN afford this property' : 'Your fund CANNOT afford this property'}
                </h3>
                <p className="text-sm text-gray-400 mt-2">
                  Total cash required: {formatCurrency(totalCashRequired)} | Fund balance: {formatCurrency(fund.currentBalance)} |
                  {canAfford ? ` Surplus: ${formatCurrency(fund.currentBalance - totalCashRequired)}` : ` Shortfall: ${formatCurrency(totalCashRequired - fund.currentBalance)}`}
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
