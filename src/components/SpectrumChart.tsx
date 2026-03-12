import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SpectrumChartProps {
  data: { frequency: number; strength: number }[];
  threshold: number;
  color?: string;
}

export const SpectrumChart: React.FC<SpectrumChartProps> = ({ data, threshold, color = "#10b981" }) => {
  const gradientId = `colorStrength-${color.replace('#', '')}`;
  
  return (
    <div className="h-64 w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="frequency" 
            stroke="#71717a" 
            fontSize={10} 
            tickFormatter={(val) => `${val.toFixed(1)}`}
            label={{ value: 'Frequency (MHz)', position: 'insideBottom', offset: -5, fill: '#71717a', fontSize: 10 }}
          />
          <YAxis 
            stroke="#71717a" 
            fontSize={10} 
            domain={[-120, -20]} 
            label={{ value: 'dBm', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 10 }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: 12 }}
            itemStyle={{ color: color }}
            formatter={(value: number) => [`${value.toFixed(1)} dBm`, 'Strength']}
            labelFormatter={(label) => `${label.toFixed(3)} MHz`}
          />
          <Area 
            type="monotone" 
            dataKey="strength" 
            stroke={color} 
            fillOpacity={1} 
            fill={`url(#${gradientId})`} 
            isAnimationActive={false}
          />
          {/* Threshold Line */}
          <Area
            dataKey={() => threshold}
            stroke="#ef4444"
            strokeDasharray="5 5"
            fill="transparent"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
