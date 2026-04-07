import React from 'react';
import HelpTooltip from './HelpTooltip';

export default function SliderInput({
  label, value, onChange, min = 0, max = 100, step = 1,
  suffix = '', prefix = '', tooltip, formatValue, className = '',
}) {
  const display = formatValue ? formatValue(value) : `${prefix}${value}${suffix}`;
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <label className="input-label mb-0">{label}</label>
          {tooltip && <HelpTooltip text={tooltip} />}
        </div>
        <span className="font-mono text-sm text-electric">{display}</span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full h-1.5 bg-navy-700 rounded-lg appearance-none cursor-pointer accent-electric"
      />
      <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
        <span>{prefix}{min}{suffix}</span>
        <span>{prefix}{max}{suffix}</span>
      </div>
    </div>
  );
}
