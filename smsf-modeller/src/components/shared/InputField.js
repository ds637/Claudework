import React from 'react';
import HelpTooltip from './HelpTooltip';

export default function InputField({
  label, value, onChange, type = 'text', prefix, suffix, helper, tooltip,
  min, max, step, options, placeholder, disabled, className = '',
}) {
  const handleChange = (e) => {
    const val = type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value;
    onChange(val);
  };

  if (options) {
    return (
      <div className={className}>
        <div className="flex items-center gap-1 mb-1">
          <label className="input-label mb-0">{label}</label>
          {tooltip && <HelpTooltip text={tooltip} />}
        </div>
        <select value={value} onChange={handleChange} className="input-field" disabled={disabled}>
          {options.map((o) => (
            <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
              {typeof o === 'string' ? o : o.label}
            </option>
          ))}
        </select>
        {helper && <p className="text-[10px] text-gray-500 mt-0.5">{helper}</p>}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-1 mb-1">
        <label className="input-label mb-0">{label}</label>
        {tooltip && <HelpTooltip text={tooltip} />}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-mono">{prefix}</span>
        )}
        <input
          type={type}
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          className={`input-field ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-mono">{suffix}</span>
        )}
      </div>
      {helper && <p className="text-[10px] text-gray-500 mt-0.5">{helper}</p>}
    </div>
  );
}
