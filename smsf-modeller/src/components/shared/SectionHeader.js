import React from 'react';
import { motion } from 'framer-motion';
import HelpTooltip from './HelpTooltip';

export default function SectionHeader({ title, subtitle, tooltip, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start justify-between mb-6"
    >
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-heading font-bold text-white">{title}</h2>
          {tooltip && <HelpTooltip text={tooltip} />}
        </div>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </motion.div>
  );
}
