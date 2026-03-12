import React from 'react';
import { SignalDetection } from '../types';
import { Radio, MapPin, Clock, Activity, Trash2 } from 'lucide-react';

interface DetectionLogProps {
  detections: SignalDetection[];
  onClear: () => void;
}

export const DetectionLog: React.FC<DetectionLogProps> = ({ detections, onClear }) => {
  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Detection Log</h2>
        </div>
        <button 
          onClick={onClear}
          className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-red-400 transition-colors"
          title="Clear Log"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {detections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 p-8 text-center">
            <Radio className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs font-mono">No signals detected above threshold</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-zinc-900/90 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="p-2 font-medium">Frequency</th>
                <th className="p-2 font-medium">Strength</th>
                <th className="p-2 font-medium">Time</th>
                <th className="p-2 font-medium text-right">Type</th>
              </tr>
            </thead>
            <tbody className="text-xs font-mono">
              {detections.map((d) => (
                <tr key={d.id} className="border-b border-zinc-800/50 hover:bg-emerald-500/5 transition-colors group">
                  <td className="p-2">
                    <div className="flex flex-col">
                      <span className="text-emerald-400 font-bold">{d.frequency.toFixed(3)} MHz</span>
                      {d.label && <span className="text-[9px] text-zinc-500 font-sans truncate max-w-[150px]">{d.label}</span>}
                    </div>
                  </td>
                  <td className="p-2 text-zinc-300">{d.strength.toFixed(1)} dBm</td>
                  <td className="p-2 text-zinc-500">{new Date(d.timestamp).toLocaleTimeString([], { hour12: false })}</td>
                  <td className="p-2 text-right">
                    <span className={`px-1.5 py-0.5 rounded-[2px] text-[9px] uppercase font-bold ${
                      d.type === 'continuous' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {d.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
