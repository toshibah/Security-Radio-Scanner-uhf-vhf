import React, { useMemo, useState } from 'react';
import { SignalDetection } from '../types';
import { 
  History, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  MapPin, 
  Activity,
  FileText,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryViewProps {
  detections: SignalDetection[];
  onClear: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ detections, onClear }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'continuous' | 'burst' | 'pattern'>('all');

  const filteredDetections = useMemo(() => {
    return detections.filter(d => {
      const matchesSearch = 
        d.label?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.frequency.toFixed(3).includes(searchTerm);
      const matchesType = typeFilter === 'all' || d.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [detections, searchTerm, typeFilter]);

  const stats = useMemo(() => {
    const now = Date.now();
    const last24h = detections.filter(d => now - d.timestamp < 24 * 60 * 60 * 1000).length;
    const vhf = detections.filter(d => d.frequency < 300).length;
    const uhf = detections.filter(d => d.frequency >= 300).length;
    return { last24h, vhf, uhf, total: detections.length };
  }, [detections]);

  const downloadReport = () => {
    const csvContent = [
      ['Timestamp', 'Frequency (MHz)', 'Strength (dBm)', 'Type', 'Latitude', 'Longitude', 'Label'],
      ...detections.map(d => [
        new Date(d.timestamp).toISOString(),
        d.frequency.toFixed(3),
        d.strength.toFixed(1),
        d.type,
        d.latitude.toFixed(6),
        d.longitude.toFixed(6),
        d.label || ''
      ])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `spectrum_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatBox label="Total Detections" value={stats.total.toString()} icon={<History className="w-4 h-4 text-emerald-500" />} />
        <StatBox label="Last 24 Hours" value={stats.last24h.toString()} icon={<Clock className="w-4 h-4 text-blue-500" />} />
        <StatBox label="VHF Signals" value={stats.vhf.toString()} icon={<Activity className="w-4 h-4 text-emerald-400" />} />
        <StatBox label="UHF Signals" value={stats.uhf.toString()} icon={<Activity className="w-4 h-4 text-amber-400" />} />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search frequency or label..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
            {(['all', 'continuous', 'burst'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
                  typeFilter === type ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={downloadReport}
            className="flex items-center gap-2 bg-zinc-100 text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-white transition-colors"
          >
            <Download className="w-4 h-4" /> Download CSV
          </button>
          <button 
            onClick={onClear}
            className="flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear History
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-hidden bg-zinc-900/30 border border-zinc-800 rounded-xl flex flex-col">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800 text-[10px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-950/50">
          <div className="col-span-3">Timestamp</div>
          <div className="col-span-2">Frequency</div>
          <div className="col-span-1 text-center">Strength</div>
          <div className="col-span-1 text-center">Type</div>
          <div className="col-span-4">Label</div>
          <div className="col-span-1 text-right">Action</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {filteredDetections.length > 0 ? (
              filteredDetections.map((d) => (
                <motion.div 
                  key={d.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-800/50 items-center hover:bg-zinc-800/30 transition-colors group"
                >
                  <div className="col-span-3 flex items-center gap-2 text-xs text-zinc-400">
                    <Calendar className="w-3 h-3 opacity-50" />
                    {new Date(d.timestamp).toLocaleString()}
                  </div>
                  <div className="col-span-2 font-mono font-bold text-sm text-zinc-100">
                    {d.frequency.toFixed(3)} MHz
                  </div>
                  <div className="col-span-1 text-center font-mono text-xs text-zinc-400">
                    {d.strength.toFixed(1)} dBm
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter border ${
                      d.type === 'continuous' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {d.type}
                    </span>
                  </div>
                  <div className="col-span-4 text-xs text-zinc-300 truncate italic">
                    {d.label || 'No label'}
                  </div>
                  <div className="col-span-1 text-right">
                    <button className="p-1.5 hover:bg-zinc-700 rounded-md transition-colors text-zinc-500 hover:text-zinc-100">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
                <FileText className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm font-mono">No historical records found</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
    <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800">
      {icon}
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
      <span className="text-xl font-mono font-bold text-zinc-100">{value}</span>
    </div>
  </div>
);
