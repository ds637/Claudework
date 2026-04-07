import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Shield } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import SectionHeader from '../../shared/SectionHeader';
import MetricCard from '../../shared/MetricCard';
import { formatCurrency, formatPercent, calcReadinessScore, getMinPensionDrawdown } from '../../../utils/calculations';

function getAssessmentStatus(score) {
  if (score >= 80) return { label: 'PASS', color: 'text-emerald', bg: 'bg-emerald/10 border-emerald/30', icon: CheckCircle2 };
  if (score >= 50) return { label: 'CONDITIONAL', color: 'text-amber', bg: 'bg-amber/10 border-amber/30', icon: AlertTriangle };
  return { label: 'FAIL', color: 'text-rose', bg: 'bg-rose/10 border-rose/30', icon: XCircle };
}

export default function Assessment() {
  const { state } = useApp();
  const { fund, expenses, property, compliance } = state;

  // Calculate all scores
  const scores = useMemo(() => {
    // Compliance
    const compItems = [
      ...compliance.trustDeed, ...compliance.investmentStrategy,
      ...compliance.solePurpose, ...compliance.memberUnderstanding, ...compliance.professionalAdvice,
    ];
    const yesCount = compItems.filter((i) => i === 'yes').length;
    const complianceScore = (yesCount / compItems.length) * 100;

    // Cash flow
    const totalContributions = fund.members.reduce(
      (sum, m) => sum + (m.sgContributions || 0) + (m.salarySacrifice || 0) + (m.nonConcessional || 0) + (m.personalDeductible || 0), 0
    );
    const annualRent = (property.weeklyRent || 0) * 52;
    const vacancyLoss = (property.weeklyRent || 0) * (property.vacancyWeeks || 0);
    const mgmtFee = annualRent * ((property.managementFee || 0) / 100);
    const propCosts = (property.landlordInsurance || 0) + (property.councilRates || 0) + (property.waterRates || 0) + (property.strata || 0) + (property.repairs || 0) + (property.landTax || 0);
    const netRent = annualRent - vacancyLoss - mgmtFee - propCosts;
    const fundExp = Object.values(expenses).reduce((a, b) => a + (Number(b) || 0), 0);
    const insurance = fund.members.reduce((sum, m) => sum + (m.insuranceDeath || 0) + (m.insuranceTPD || 0) + (m.insuranceIP || 0), 0);
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
    const totalIncome = totalContributions + (fund.existingIncome || 0) + netRent;
    const totalOutgoings = fundExp + insurance + annualRepayment + pensionDrawdowns;
    const surplus = totalIncome - totalOutgoings;
    const cashFlowScore = surplus > 0 ? Math.min(100, (surplus / totalIncome) * 200) : Math.max(0, 50 + (surplus / totalIncome) * 100);

    // Liquidity
    const deposit = property.purchasePrice - loanAmount;
    const stampDuty = property.purchasePrice * 0.04; // rough estimate for scoring
    const totalCashNeeded = deposit + stampDuty + 15000;
    const liquidityScore = fund.currentBalance >= totalCashNeeded ? Math.min(100, ((fund.currentBalance - totalCashNeeded) / totalCashNeeded) * 100 + 70) : Math.max(0, (fund.currentBalance / totalCashNeeded) * 60);

    // Stress test
    const stressedRate = property.interestRate + 2;
    const stressedRepayment = property.repaymentType === 'IO' ? loanAmount * (stressedRate / 100) : (() => {
      const r = stressedRate / 100 / 12; const n = (property.loanTerm || 25) * 12;
      return r > 0 ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) * 12 : 0;
    })();
    const stressedSurplus = totalIncome - (fundExp + insurance + stressedRepayment + pensionDrawdowns);
    const stressScore = stressedSurplus > 0 ? 80 : stressedSurplus > -(totalIncome * 0.1) ? 50 : 20;

    // Yield
    const gYield = property.purchasePrice > 0 ? (annualRent / property.purchasePrice) * 100 : 0;
    const yieldScore = gYield >= 5 ? 100 : gYield >= 4 ? 70 : gYield >= 3 ? 40 : 20;

    const overall = calcReadinessScore(complianceScore, cashFlowScore, liquidityScore, stressScore, yieldScore);

    return { complianceScore, cashFlowScore, liquidityScore, stressScore, yieldScore, overall, surplus, totalCashNeeded, gYield };
  }, [fund, expenses, property, compliance]);

  const assessmentAreas = [
    { label: 'Trust Deed & Legal', score: scores.complianceScore, description: 'Trust deed permits LRBA, legal structures in place' },
    { label: 'Investment Strategy', score: scores.complianceScore, description: 'Strategy updated to include property investment' },
    { label: 'Cash Flow Serviceability', score: scores.cashFlowScore, description: 'Fund income covers all outgoings with surplus' },
    { label: 'Liquidity Post-Settlement', score: scores.liquidityScore, description: 'Adequate cash reserves after property acquisition' },
    { label: 'Stress Test Resilience', score: scores.stressScore, description: 'Fund survives interest rate and vacancy shocks' },
    { label: 'Member Understanding', score: scores.yieldScore, description: 'Members understand risks and obligations' },
  ];

  // Auto-generated recommendation
  const recommendation = useMemo(() => {
    if (scores.overall >= 80) return { level: 'PROCEED', color: 'text-emerald', bg: 'bg-emerald/5 border-emerald/30', text: 'All criteria substantially met. The fund appears well-positioned to proceed with the property investment.' };
    if (scores.overall >= 60) return { level: 'PROCEED WITH CONDITIONS', color: 'text-amber', bg: 'bg-amber/5 border-amber/30', text: 'Some conditions need to be addressed before proceeding. Review outstanding items below.' };
    if (scores.overall >= 40) return { level: 'DEFER', color: 'text-amber', bg: 'bg-amber/5 border-amber/30', text: 'Significant gaps identified. Recommend deferring the investment until conditions are met.' };
    return { level: 'DO NOT PROCEED', color: 'text-rose', bg: 'bg-rose/5 border-rose/30', text: 'Critical requirements unmet. The fund is not currently in a position to proceed with this investment.' };
  }, [scores.overall]);

  // Auto-generated risks
  const risks = useMemo(() => {
    const r = [];
    if (scores.surplus < 0) r.push('Fund is projected to run at a deficit, requiring cash reserves to cover shortfalls');
    if (scores.cashFlowScore < 50) r.push('Cash flow serviceability is marginal; unexpected expenses could cause liquidity issues');
    if (scores.stressScore < 60) r.push('Fund may not survive an interest rate increase of 2% or extended vacancy');
    if (scores.gYield < 4) r.push('Gross rental yield is below 4%, indicating the property may be overpriced relative to income');
    if (scores.liquidityScore < 60) r.push('Limited cash reserves post-settlement; fund may struggle to meet unexpected expenses');
    if (scores.complianceScore < 70) r.push('Multiple compliance items remain unconfirmed; legal risk exposure is elevated');
    if (r.length === 0) r.push('No critical risks identified at this time');
    return r.slice(0, 5);
  }, [scores]);

  // Action items
  const actionItems = useMemo(() => {
    const items = [];
    if (scores.complianceScore < 100) items.push('Complete all compliance checklist items and obtain required documentation');
    if (scores.cashFlowScore < 60) items.push('Review fund cash flow and consider increasing contributions or reducing costs');
    if (scores.liquidityScore < 60) items.push('Ensure adequate cash reserves remain in the fund post-settlement');
    if (scores.stressScore < 60) items.push('Consider a lower LVR or higher deposit to improve stress test resilience');
    if (scores.gYield < 4) items.push('Re-evaluate property selection or negotiate on purchase price to improve yield');
    items.push('Obtain Statement of Advice from a licensed financial adviser');
    items.push('Engage SMSF specialist accountant and lawyer before proceeding');
    return items;
  }, [scores]);

  return (
    <div>
      <SectionHeader
        title="Assessment & Recommendation"
        subtitle="Auto-generated readiness assessment"
        tooltip="Weighted assessment based on compliance (30%), cash flow (25%), liquidity (20%), stress testing (15%), and yield (10%)."
      />

      {/* Overall Score */}
      <div className={`card border-2 ${recommendation.bg} mb-6`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                stroke={scores.overall >= 80 ? '#10B981' : scores.overall >= 60 ? '#F59E0B' : '#F43F5E'}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(scores.overall / 100) * 314.16} 314.16`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-mono font-bold text-2xl ${recommendation.color}`}>{scores.overall}%</span>
            </div>
          </div>
          <div>
            <h3 className={`font-heading font-bold text-2xl ${recommendation.color}`}>{recommendation.level}</h3>
            <p className="text-sm text-gray-400 mt-1">{recommendation.text}</p>
          </div>
        </div>
      </div>

      {/* Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {assessmentAreas.map((area) => {
          const status = getAssessmentStatus(area.score);
          const StatusIcon = status.icon;
          return (
            <motion.div
              key={area.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card border ${status.bg}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{area.label}</span>
                <div className={`flex items-center gap-1 ${status.color}`}>
                  <StatusIcon size={14} />
                  <span className="text-xs font-bold">{status.label}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">{area.description}</p>
              <div className="mt-2 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${area.score >= 80 ? 'bg-emerald' : area.score >= 50 ? 'bg-amber' : 'bg-rose'}`} style={{ width: `${area.score}%` }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Key Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-rose" />
            <h3 className="font-heading font-semibold text-white">Key Risks</h3>
          </div>
          <ul className="space-y-2">
            {risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-rose mt-0.5 flex-shrink-0">!</span>
                <span className="text-gray-300">{risk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-electric" />
            <h3 className="font-heading font-semibold text-white">Action Items</h3>
          </div>
          <ul className="space-y-2">
            {actionItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-electric mt-0.5 flex-shrink-0">{i + 1}.</span>
                <span className="text-gray-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sign-off Section */}
      <div className="card border border-white/10">
        <h3 className="font-heading font-semibold text-white mb-4">Sign-off</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="input-label">Adviser Name</label>
            <input type="text" className="input-field" placeholder="Enter adviser name" />
          </div>
          <div>
            <label className="input-label">Date</label>
            <input type="date" className="input-field" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="input-label">Client Acknowledgement</label>
            <input type="text" className="input-field" placeholder="Client name" />
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-4">
          This assessment is for illustration purposes only and does not constitute financial, legal, or tax advice.
          Always consult a licensed financial adviser, SMSF specialist, and solicitor before proceeding.
        </p>
      </div>
    </div>
  );
}
