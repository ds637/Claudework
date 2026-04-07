import React from 'react';
import { motion } from 'framer-motion';
import HelpTooltip from './HelpTooltip';

export default function MetricCard({ label, value, subtext, color = 'text-white', icon: Icon, tooltip, onClick, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card-hover ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1">
          <span className="metric-label">{label}</span>
          {tooltip && <HelpTooltip text={tooltip} />}
        </div>
        {Icon && <Icon size={16} className="text-gray-500" />}
      </div>
      <div className={`metric-value ${color}`}>{value}</div>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </motion.div>
  );
}
