import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export default function HelpTooltip({ text, className = '' }) {
  const [show, setShow] = useState(false);
  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        className="text-gray-500 hover:text-gray-300 transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
      >
        <HelpCircle size={14} />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-navy-700 text-gray-200 text-xs rounded-lg px-3 py-2 shadow-xl border border-white/10 max-w-xs whitespace-normal min-w-[200px]">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-navy-700" />
        </div>
      )}
    </span>
  );
}
