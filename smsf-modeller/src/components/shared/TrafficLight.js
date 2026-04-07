import React from 'react';

export default function TrafficLight({ status, label }) {
  const colors = {
    green: 'bg-emerald text-emerald',
    amber: 'bg-amber text-amber',
    red: 'bg-rose text-rose',
  };
  // Color classes used via status lookup
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[status]?.split(' ')[0] || 'bg-gray-500'}`} />
      <span className={`text-xs font-medium ${colors[status]?.split(' ')[1] || 'text-gray-500'}`}>{label}</span>
    </div>
  );
}
