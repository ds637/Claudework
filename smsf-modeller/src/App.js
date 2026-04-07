import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import FundSetup from './components/sections/FundSetup';
import FundExpenses from './components/sections/FundExpenses';
import PropertyAnalyser from './components/sections/PropertyAnalyser';
import CashFlow from './components/sections/CashFlow';
import Projections from './components/sections/Projections';
import Portfolio from './components/sections/Portfolio';
import Scenarios from './components/sections/Scenarios';
import Compliance from './components/sections/Compliance';
import Assessment from './components/sections/Assessment';
import Reports from './components/sections/Reports';

const SECTIONS = {
  'fund-setup': FundSetup,
  'fund-expenses': FundExpenses,
  'property-analyser': PropertyAnalyser,
  'cash-flow': CashFlow,
  'projections': Projections,
  'portfolio': Portfolio,
  'scenarios': Scenarios,
  'compliance': Compliance,
  'assessment': Assessment,
  'reports': Reports,
};

function AppContent() {
  const { state } = useApp();
  const Section = SECTIONS[state.activeSection] || FundSetup;

  return (
    <div className={`min-h-screen ${state.darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-navy-900 text-gray-100">
        <Sidebar />
        <div
          className="transition-all duration-200"
          style={{ marginLeft: state.sidebarCollapsed ? 64 : 240 }}
        >
          <Header />
          <main className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={state.activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Section />
              </motion.div>
            </AnimatePresence>

            {/* Disclaimer Footer */}
            <div className="mt-12 pt-6 border-t border-white/5">
              <p className="text-[10px] text-gray-600 text-center max-w-4xl mx-auto">
                This tool is for educational and illustrative purposes only. It does not constitute financial, legal, or tax advice.
                Always consult a licensed financial adviser, SMSF specialist, and solicitor before proceeding with any SMSF property investment.
                InvestorHQ accepts no responsibility for decisions made based on this tool.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
