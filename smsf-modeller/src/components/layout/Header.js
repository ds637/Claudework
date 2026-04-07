import React, { useMemo, useState } from 'react';
import { Sun, Moon, Save, FolderOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calcReadinessScore } from '../../utils/calculations';

export default function Header() {
  const { state, toggleDarkMode, saveScenario, loadScenario } = useApp();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  const readinessScore = useMemo(() => {
    const compItems = [
      ...state.compliance.trustDeed,
      ...state.compliance.investmentStrategy,
      ...state.compliance.solePurpose,
      ...state.compliance.memberUnderstanding,
      ...state.compliance.professionalAdvice,
    ];
    const yesCount = compItems.filter((i) => i === 'yes').length;
    const complianceScore = (yesCount / compItems.length) * 100;

    const totalContributions = state.fund.members.reduce(
      (sum, m) => sum + (m.sgContributions || 0) + (m.salarySacrifice || 0) + (m.nonConcessional || 0) + (m.personalDeductible || 0), 0
    );
    const weeklyRent = state.property.weeklyRent || 0;
    const annualRent = weeklyRent * 52;
    const vacancyLoss = weeklyRent * (state.property.vacancyWeeks || 0);
    const mgmtFee = annualRent * ((state.property.managementFee || 0) / 100);
    const netRent = annualRent - vacancyLoss - mgmtFee -
      (state.property.landlordInsurance || 0) - (state.property.councilRates || 0) -
      (state.property.waterRates || 0) - (state.property.strata || 0) -
      (state.property.repairs || 0) - (state.property.landTax || 0);
    const totalExpenses = Object.values(state.expenses).reduce((a, b) => a + (Number(b) || 0), 0);
    const totalInsurance = state.fund.members.reduce(
      (sum, m) => sum + (m.insuranceDeath || 0) + (m.insuranceTPD || 0) + (m.insuranceIP || 0), 0
    );
    const loanAmount = (state.property.purchasePrice || 0) * ((state.property.lvr || 0) / 100);
    const annualRepayment = state.property.repaymentType === 'IO'
      ? loanAmount * ((state.property.interestRate || 0) / 100)
      : loanAmount > 0 ? (() => {
          const r = (state.property.interestRate || 0) / 100 / 12;
          const n = (state.property.loanTerm || 25) * 12;
          return r > 0 ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) * 12 : 0;
        })() : 0;
    const totalIncome = totalContributions + (state.fund.existingIncome || 0) + netRent;
    const totalOutgoings = totalExpenses + totalInsurance + annualRepayment;
    const surplus = totalIncome - totalOutgoings;
    const cashFlowScore = surplus > 0 ? Math.min(100, (surplus / totalIncome) * 200) : 0;
    const liquidityScore = state.fund.currentBalance > 0 ? Math.min(100, (state.fund.currentBalance / (state.property.purchasePrice || 1)) * 100) : 0;
    const stressScore = surplus > annualRepayment * 0.2 ? 80 : surplus > 0 ? 50 : 20;
    const annualGrossRent = weeklyRent * 52;
    const yieldPct = state.property.purchasePrice > 0 ? (annualGrossRent / state.property.purchasePrice) * 100 : 0;
    const yieldScore = yieldPct >= 5 ? 100 : yieldPct >= 4 ? 70 : yieldPct >= 3 ? 40 : 20;

    return calcReadinessScore(complianceScore, cashFlowScore, liquidityScore, stressScore, yieldScore);
  }, [state]);

  const scoreColor = readinessScore >= 80 ? 'text-emerald' : readinessScore >= 60 ? 'text-amber' : 'text-rose';
  const scoreBg = readinessScore >= 80 ? 'bg-emerald/10 border-emerald/30' : readinessScore >= 60 ? 'bg-amber/10 border-amber/30' : 'bg-rose/10 border-rose/30';

  return (
    <>
      <header className="h-16 bg-navy-900/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <h1 className="font-heading font-semibold text-white">
            {state.fund.name || 'SMSF Property Modeller'}
          </h1>
          <span className="text-xs text-gray-500">|</span>
          <span className="text-xs text-gray-400">{state.scenarioName}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Readiness Score */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${scoreBg}`}>
            <span className="text-xs text-gray-400">Readiness</span>
            <span className={`font-mono font-bold text-sm ${scoreColor}`}>{readinessScore}%</span>
          </div>

          {/* Scenario controls */}
          <button onClick={() => setShowSaveModal(true)} className="btn-secondary flex items-center gap-1.5 py-1.5 px-3">
            <Save size={14} />
            <span className="text-xs">Save</span>
          </button>

          {state.savedScenarios.length > 0 && (
            <select
              onChange={(e) => e.target.value && loadScenario(e.target.value)}
              className="input-field py-1.5 text-xs w-36"
              defaultValue=""
            >
              <option value="">Load scenario...</option>
              {state.savedScenarios.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          )}

          <button onClick={toggleDarkMode} className="p-2 text-gray-400 hover:text-white transition-colors">
            {state.darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card w-96">
            <h3 className="font-heading font-semibold text-white mb-4">Save Scenario</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Scenario name"
              className="input-field mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveModal(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={() => { saveScenario(saveName || 'Untitled'); setShowSaveModal(false); setSaveName(''); }}
                className="btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
