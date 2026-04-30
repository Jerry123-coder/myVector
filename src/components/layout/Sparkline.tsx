import React from 'react';

interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({ data, color, width = 100, height = 30 }) => {
  if (data.length === 0) return null;

  const max = Math.max(...data, 1);
  const step = width / (data.length - 1);
  
  const points = data.map((val, i) => {
    const x = i * step;
    const y = height - (val / max) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" className={color} />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" className={color} />
        </linearGradient>
      </defs>
      {/* Area */}
      <polyline
        fill={`url(#grad-${color})`}
        stroke="none"
        points={`${data.map((_, i) => i * step).at(0)},${height} ${points} ${data.map((_, i) => i * step).at(-1)},${height}`}
      />
      {/* Line */}
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className={`${color} transition-all duration-1000`}
      />
    </svg>
  );
};
