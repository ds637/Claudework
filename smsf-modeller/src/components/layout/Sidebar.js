import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, Receipt, Home, DollarSign, TrendingUp,
  Layers, BarChart3, ClipboardCheck, Award, FileText,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const sections = [
  { id: 'fund-setup', label: 'Fund Setup', icon: Users },
  { id: 'fund-expenses', label: 'Fund Expenses', icon: Receipt },
  { id: 'property-analyser', label: 'Property Analyser', icon: Home },
  { id: 'cash-flow', label: 'Cash Flow Model', icon: DollarSign },
  { id: 'projections', label: 'Projections', icon: TrendingUp },
  { id: 'portfolio', label: 'Portfolio Builder', icon: Layers },
  { id: 'scenarios', label: 'Stress Testing', icon: BarChart3 },
  { id: 'compliance', label: 'Compliance', icon: ClipboardCheck },
  { id: 'assessment', label: 'Assessment', icon: Award },
  { id: 'reports', label: 'Reports & Export', icon: FileText },
];

export default function Sidebar() {
  const { state, setSection, toggleSidebar } = useApp();
  const { activeSection, sidebarCollapsed } = state;

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 240 }}
      transition={{ duration: 0.2 }}
      className="fixed left-0 top-0 bottom-0 z-40 bg-navy-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5">
        <Building2 size={24} className="text-electric flex-shrink-0" />
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="ml-3 overflow-hidden whitespace-nowrap"
            >
              <span className="font-heading font-bold text-white text-lg">InvestorHQ</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-1">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`w-full ${activeSection === id ? 'nav-item-active' : 'nav-item-inactive'}`}
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ))}
      </nav>

      {/* Collapse */}
      <button
        onClick={toggleSidebar}
        className="h-12 flex items-center justify-center border-t border-white/5 text-gray-500 hover:text-gray-300 transition-colors"
      >
        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </motion.aside>
  );
}
