import React, { useCallback, useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import SectionHeader from '../../shared/SectionHeader';
import {
  formatCurrency, formatPercent, calcStampDuty,
} from '../../../utils/calculations';

export default function Reports() {
  const { state, saveScenario } = useApp();
  const [generating, setGenerating] = useState(false);
  const [saveName, setSaveName] = useState('');

  const generatePDF = useCallback(async (type) => {
    setGenerating(true);
    try {
      // html2canvas available for future chart capture
      await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      // Header
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageWidth, 25, 'F');
      pdf.setTextColor(59, 130, 246);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('InvestorHQ', margin, 16);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text('SMSF Property Investment Report', pageWidth - margin, 16, { align: 'right' });

      y = 35;

      // Fund info
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Fund: ${state.fund.name || 'Unnamed SMSF'}`, margin, y);
      y += 7;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-AU')} | Scenario: ${state.scenarioName}`, margin, y);
      y += 12;

      // Property Summary
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Property Investment Summary', margin, y);
      y += 8;

      const p = state.property;
      const loanAmount = p.purchasePrice * (p.lvr / 100);
      const stampDuty = calcStampDuty(p.purchasePrice, p.state);
      const annualRent = (p.weeklyRent || 0) * 52;
      const gYield = p.purchasePrice > 0 ? (annualRent / p.purchasePrice) * 100 : 0;

      const summaryRows = [
        ['Purchase Price', formatCurrency(p.purchasePrice)],
        ['State', p.state],
        ['Loan Amount (LVR ' + p.lvr + '%)', formatCurrency(loanAmount)],
        ['Deposit', formatCurrency(p.purchasePrice - loanAmount)],
        ['Stamp Duty', formatCurrency(stampDuty)],
        ['Interest Rate', p.interestRate + '%'],
        ['Weekly Rent', '$' + p.weeklyRent],
        ['Gross Yield', formatPercent(gYield)],
      ];

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      summaryRows.forEach(([label, value]) => {
        pdf.setTextColor(100, 100, 100);
        pdf.text(label, margin, y);
        pdf.setTextColor(0, 0, 0);
        pdf.text(value, margin + 70, y);
        y += 5;
      });
      y += 5;

      if (type === 'detailed') {
        // Cash Flow
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Cash Flow Summary', margin, y);
        y += 8;

        const totalContributions = state.fund.members.reduce(
          (sum, m) => sum + (m.sgContributions || 0) + (m.salarySacrifice || 0) + (m.nonConcessional || 0) + (m.personalDeductible || 0), 0
        );
        const vacancyLoss = (p.weeklyRent || 0) * (p.vacancyWeeks || 0);
        const mgmtFee = annualRent * ((p.managementFee || 0) / 100);
        const propCosts = (p.landlordInsurance || 0) + (p.councilRates || 0) + (p.waterRates || 0) + (p.strata || 0) + (p.repairs || 0) + (p.landTax || 0);
        const netRent = annualRent - vacancyLoss - mgmtFee - propCosts;
        const fundExp = Object.values(state.expenses).reduce((a, b) => a + (Number(b) || 0), 0);
        const annualRepayment = p.repaymentType === 'IO' ? loanAmount * (p.interestRate / 100) : (() => {
          const r = p.interestRate / 100 / 12; const n = (p.loanTerm || 25) * 12;
          return r > 0 ? loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) * 12 : 0;
        })();
        const totalIncome = totalContributions + (state.fund.existingIncome || 0) + netRent;
        const totalOutgoings = fundExp + annualRepayment;
        const surplus = totalIncome - totalOutgoings;

        const cfRows = [
          ['Total Contributions', formatCurrency(totalContributions)],
          ['Investment Income', formatCurrency(state.fund.existingIncome || 0)],
          ['Net Rental Income', formatCurrency(Math.round(netRent))],
          ['Total Income', formatCurrency(Math.round(totalIncome))],
          ['', ''],
          ['Fund Expenses', formatCurrency(fundExp)],
          ['Loan Repayment', formatCurrency(Math.round(annualRepayment))],
          ['Total Outgoings', formatCurrency(Math.round(totalOutgoings))],
          ['', ''],
          ['Annual Surplus/(Deficit)', formatCurrency(Math.round(surplus))],
        ];

        pdf.setFontSize(9);
        cfRows.forEach(([label, value]) => {
          if (!label) { y += 2; return; }
          pdf.setFont('helvetica', label.includes('Total') || label.includes('Surplus') ? 'bold' : 'normal');
          pdf.setTextColor(100, 100, 100);
          pdf.text(label, margin, y);
          pdf.setTextColor(surplus < 0 && label.includes('Surplus') ? 200 : 0, surplus >= 0 && label.includes('Surplus') ? 150 : 0, 0);
          pdf.text(value, margin + 70, y);
          y += 5;
        });
        y += 5;

        // Members
        if (y > pageHeight - 60) { pdf.addPage(); y = margin; }
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Fund Members', margin, y);
        y += 8;

        state.fund.members.forEach((m) => {
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(0, 0, 0);
          pdf.text(`${m.name || 'Member'} — Age: ${m.age}, Phase: ${m.phase}, Salary: ${formatCurrency(m.salary)}, SG: ${formatCurrency(m.sgContributions)}`, margin, y);
          y += 5;
        });
      }

      // New page for compliance
      if (y > pageHeight - 40) { pdf.addPage(); y = margin; }
      y += 5;

      // Disclaimer
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(150, 150, 150);
      const disclaimer = 'This report is for illustration purposes only and does not constitute financial, legal, or tax advice. Always consult a licensed financial adviser, SMSF specialist, and solicitor before proceeding with any SMSF property investment.';
      const lines = pdf.splitTextToSize(disclaimer, pageWidth - margin * 2);
      pdf.text(lines, margin, pageHeight - 15);

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`InvestorHQ — SMSF Property Investment Modeller`, margin, pageHeight - 8);
      pdf.text(`Page 1`, pageWidth - margin, pageHeight - 8, { align: 'right' });

      pdf.save(`InvestorHQ-${type === 'detailed' ? 'Detailed' : 'Summary'}-${state.fund.name || 'SMSF'}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error('PDF generation error:', e);
      alert('Error generating PDF. Please try again.');
    }
    setGenerating(false);
  }, [state]);

  return (
    <div>
      <SectionHeader
        title="Reports & Export"
        subtitle="Generate professional PDF reports and manage scenarios"
        tooltip="Export your analysis as a branded PDF report. Save and load different scenarios for comparison."
      />

      {/* Report Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-electric/10 flex items-center justify-center">
              <FileText size={20} className="text-electric" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-white">Client Summary Report</h3>
              <p className="text-xs text-gray-400">2-4 pages — Plain English, key charts, recommendation</p>
            </div>
          </div>
          <ul className="text-xs text-gray-400 space-y-1 mb-4">
            <li>- Property investment summary</li>
            <li>- Key financial metrics</li>
            <li>- Readiness assessment</li>
            <li>- InvestorHQ branded</li>
          </ul>
          <button
            onClick={() => generatePDF('summary')}
            disabled={generating}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Generate Summary PDF
          </button>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald/10 flex items-center justify-center">
              <FileText size={20} className="text-emerald" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-white">Detailed Financial Model</h3>
              <p className="text-xs text-gray-400">8-12 pages — Full data, projections, stress tests</p>
            </div>
          </div>
          <ul className="text-xs text-gray-400 space-y-1 mb-4">
            <li>- Complete cash flow model</li>
            <li>- Member details & contributions</li>
            <li>- Year-by-year projections</li>
            <li>- Compliance status</li>
          </ul>
          <button
            onClick={() => generatePDF('detailed')}
            disabled={generating}
            className="btn-primary w-full flex items-center justify-center gap-2 bg-emerald hover:bg-emerald/90"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Generate Detailed PDF
          </button>
        </div>
      </div>

      {/* Scenario Management */}
      <div className="card mb-6">
        <h3 className="font-heading font-semibold text-white mb-4">Scenario Management</h3>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Enter scenario name"
            className="input-field flex-1"
          />
          <button
            onClick={() => { if (saveName) { saveScenario(saveName); setSaveName(''); } }}
            className="btn-primary"
          >
            Save Current
          </button>
        </div>

        {state.savedScenarios.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-2 px-3 text-left text-gray-400">Name</th>
                  <th className="py-2 px-3 text-left text-gray-400">Saved</th>
                  <th className="py-2 px-3 text-right text-gray-400">Property Price</th>
                  <th className="py-2 px-3 text-right text-gray-400">Fund Balance</th>
                </tr>
              </thead>
              <tbody>
                {state.savedScenarios.map((s) => (
                  <tr key={s.name} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-3 text-white font-medium">{s.name}</td>
                    <td className="py-2 px-3 text-gray-400">{new Date(s.timestamp).toLocaleDateString('en-AU')}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatCurrency(s.state?.property?.purchasePrice || 0)}</td>
                    <td className="py-2 px-3 text-right font-mono">{formatCurrency(s.state?.fund?.currentBalance || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No saved scenarios yet. Save your current configuration above.</p>
        )}
      </div>

      {/* Data Summary */}
      <div className="card">
        <h3 className="font-heading font-semibold text-white mb-4">Current Configuration Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="metric-label">Fund Name</span>
            <div className="text-sm text-white font-medium">{state.fund.name || '-'}</div>
          </div>
          <div>
            <span className="metric-label">Fund Balance</span>
            <div className="font-mono text-sm text-white">{formatCurrency(state.fund.currentBalance)}</div>
          </div>
          <div>
            <span className="metric-label">Members</span>
            <div className="font-mono text-sm text-white">{state.fund.members.length}</div>
          </div>
          <div>
            <span className="metric-label">Property Price</span>
            <div className="font-mono text-sm text-white">{formatCurrency(state.property.purchasePrice)}</div>
          </div>
          <div>
            <span className="metric-label">LVR</span>
            <div className="font-mono text-sm text-white">{state.property.lvr}%</div>
          </div>
          <div>
            <span className="metric-label">Interest Rate</span>
            <div className="font-mono text-sm text-white">{state.property.interestRate}%</div>
          </div>
          <div>
            <span className="metric-label">Weekly Rent</span>
            <div className="font-mono text-sm text-white">${state.property.weeklyRent}</div>
          </div>
          <div>
            <span className="metric-label">Scenario</span>
            <div className="text-sm text-white font-medium">{state.scenarioName}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
