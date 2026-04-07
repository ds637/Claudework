import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import SectionHeader from '../../shared/SectionHeader';
import MetricCard from '../../shared/MetricCard';
import { formatPercent } from '../../../utils/calculations';

const COMPLIANCE_SECTIONS = [
  {
    key: 'trustDeed',
    title: 'Trust Deed',
    items: [
      'Trust deed permits borrowing under an LRBA',
      'Trust deed permits investment in real property',
      'Trust deed is current and up to date',
      'Trust deed has been reviewed by an SMSF specialist lawyer',
      'Trust deed allows for a corporate trustee (if applicable)',
      'Trust deed includes adequate powers for trustee decisions',
      'Bare trust deed has been prepared for the LRBA',
      'Trust deed complies with SIS Act requirements',
    ],
  },
  {
    key: 'investmentStrategy',
    title: 'Investment Strategy',
    items: [
      'Investment strategy has been updated to include property investment',
      'Strategy documents risk vs return considerations',
      'Strategy addresses diversification requirements',
      'Strategy considers liquidity needs of the fund',
      'Strategy addresses ability to pay benefits when due',
      'Strategy considers insurance needs of members',
      'Strategy documents the LRBA and its terms',
      'Strategy has been reviewed and signed by all trustees',
      'Strategy addresses the single acquirable asset rule',
    ],
  },
  {
    key: 'solePurpose',
    title: 'Sole Purpose Test & Related Party',
    items: [
      'Property will be used solely for investment purposes',
      'No member or related party will reside in or use the property',
      'Property is not being acquired from a related party (unless business real property)',
      'Arms-length rental terms will be applied',
      'Property will not be leased to a related party (unless business real property)',
      'No personal use of the property by members or relatives',
      'Fund will not make improvements to the property using LRBA funds',
      'Single acquirable asset rule is understood and will be complied with',
    ],
  },
  {
    key: 'memberUnderstanding',
    title: 'Member Understanding',
    items: [
      'All members understand the risks of property investment in SMSF',
      'All members understand LRBA structure and limited recourse nature',
      'All members understand the impact on fund liquidity',
      'All members understand contribution requirements to service the loan',
      'All members are aware of the restrictions on property use',
      'All members understand the tax implications',
      'All members agree to the investment decision',
      'All members have been provided with appropriate advice',
    ],
  },
  {
    key: 'professionalAdvice',
    title: 'Professional Advice',
    items: [
      'Licensed financial adviser has provided Statement of Advice (SOA)',
      'SMSF specialist accountant has reviewed the structure',
      'SMSF specialist lawyer has reviewed legal documents',
    ],
  },
];

const RISK_MAP = { yes: 'low', no: 'high', unsure: 'medium' };

export default function Compliance() {
  const { state, updateCompliance } = useApp();
  const { compliance } = state;

  const toggleItem = (section, index, value) => {
    const items = [...compliance[section]];
    items[index] = value;
    updateCompliance({ [section]: items });
  };

  const scores = useMemo(() => {
    const sectionScores = {};
    let totalYes = 0, totalItems = 0;

    COMPLIANCE_SECTIONS.forEach((section) => {
      const items = compliance[section.key] || [];
      const yes = items.filter((i) => i === 'yes').length;
      const total = items.length;
      sectionScores[section.key] = total > 0 ? (yes / total) * 100 : 0;
      totalYes += yes;
      totalItems += total;
    });

    const overall = totalItems > 0 ? (totalYes / totalItems) * 100 : 0;
    return { sectionScores, overall, totalYes, totalItems };
  }, [compliance]);

  const criticalBlockers = useMemo(() => {
    const blockers = [];
    COMPLIANCE_SECTIONS.forEach((section) => {
      (compliance[section.key] || []).forEach((val, i) => {
        if (val === 'no') {
          blockers.push({ section: section.title, item: section.items[i] });
        }
      });
    });
    return blockers;
  }, [compliance]);

  const outstandingItems = useMemo(() => {
    const items = [];
    COMPLIANCE_SECTIONS.forEach((section) => {
      (compliance[section.key] || []).forEach((val, i) => {
        if (val !== 'yes') {
          items.push({ section: section.title, item: section.items[i], status: val, risk: RISK_MAP[val] });
        }
      });
    });
    return items.sort((a, b) => (a.risk === 'high' ? -1 : a.risk === 'medium' ? 0 : 1) - (b.risk === 'high' ? -1 : b.risk === 'medium' ? 0 : 1));
  }, [compliance]);

  const scoreColor = scores.overall >= 80 ? 'text-emerald' : scores.overall >= 60 ? 'text-amber' : 'text-rose';

  return (
    <div>
      <SectionHeader
        title="Compliance Checklist"
        subtitle="Interactive compliance tracker for SMSF property investment"
        tooltip="Work through each compliance requirement. All critical items must be YES before proceeding with property acquisition."
      />

      {/* Progress Ring & Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card flex flex-col items-center justify-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                stroke={scores.overall >= 80 ? '#10B981' : scores.overall >= 60 ? '#F59E0B' : '#F43F5E'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(scores.overall / 100) * 314.16} 314.16`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-mono font-bold text-3xl ${scoreColor}`}>{Math.round(scores.overall)}%</span>
              <span className="text-xs text-gray-400">Complete</span>
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-400">{scores.totalYes} of {scores.totalItems} items confirmed</p>
        </div>

        {/* Section Breakdown */}
        <div className="card lg:col-span-2">
          <h3 className="font-heading font-semibold text-white mb-4">Section Breakdown</h3>
          <div className="space-y-3">
            {COMPLIANCE_SECTIONS.map((section) => {
              const pct = scores.sectionScores[section.key] || 0;
              const color = pct >= 80 ? 'bg-emerald' : pct >= 60 ? 'bg-amber' : 'bg-rose';
              return (
                <div key={section.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{section.title}</span>
                    <span className="font-mono text-white">{Math.round(pct)}%</span>
                  </div>
                  <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      className={`h-full rounded-full ${color}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical Blockers */}
      {criticalBlockers.length > 0 && (
        <div className="card border border-rose/20 bg-rose/5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-rose" />
            <h3 className="font-heading font-semibold text-rose">Critical Blockers ({criticalBlockers.length})</h3>
          </div>
          <p className="text-xs text-gray-400 mb-3">These items are marked as "No" and must be resolved before proceeding.</p>
          <div className="space-y-2">
            {criticalBlockers.map((b, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-rose mt-0.5">x</span>
                <div>
                  <span className="text-gray-400">{b.section}: </span>
                  <span className="text-white">{b.item}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist Sections */}
      <div className="space-y-4">
        {COMPLIANCE_SECTIONS.map((section) => (
          <div key={section.key} className="card">
            <h3 className="font-heading font-semibold text-white mb-4">{section.title}</h3>
            <div className="space-y-2">
              {section.items.map((item, i) => {
                const value = (compliance[section.key] || [])[i] || 'unsure';
                return (
                  <div key={i} className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                    value === 'yes' ? 'bg-emerald/5' : value === 'no' ? 'bg-rose/5' : 'bg-white/[0.02]'
                  }`}>
                    <span className="text-sm text-gray-300 flex-1 mr-4">{item}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      {['yes', 'no', 'unsure'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => toggleItem(section.key, i, opt)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                            value === opt
                              ? opt === 'yes' ? 'bg-emerald text-white' : opt === 'no' ? 'bg-rose text-white' : 'bg-amber text-white'
                              : 'bg-white/5 text-gray-500 hover:bg-white/10'
                          }`}
                        >
                          {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'Unsure'}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Outstanding Items */}
      {outstandingItems.length > 0 && (
        <div className="card mt-6">
          <h3 className="font-heading font-semibold text-white mb-4">Outstanding Items ({outstandingItems.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-2 px-3 text-left text-gray-400">Priority</th>
                  <th className="py-2 px-3 text-left text-gray-400">Section</th>
                  <th className="py-2 px-3 text-left text-gray-400">Item</th>
                  <th className="py-2 px-3 text-center text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {outstandingItems.slice(0, 20).map((item, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-1.5 px-3">
                      <span className={item.risk === 'high' ? 'badge-red' : 'badge-amber'}>
                        {item.risk === 'high' ? 'High' : 'Medium'}
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-gray-400">{item.section}</td>
                    <td className="py-1.5 px-3 text-white">{item.item}</td>
                    <td className="py-1.5 px-3 text-center">
                      <span className={item.status === 'no' ? 'text-rose' : 'text-amber'}>{item.status}</span>
                    </td>
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
