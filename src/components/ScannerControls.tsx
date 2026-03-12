import React from 'react';
import { ScannerConfig } from '../types';
import { Settings, Play, Pause, Sliders, Zap } from 'lucide-react';

interface ScannerControlsProps {
  config: ScannerConfig;
  setConfig: (config: ScannerConfig) => void;
  isScanning: boolean;
  setIsScanning: (val: boolean) => void;
  viewMode: 'vhf' | 'uhf' | 'dual';
  setViewMode: (mode: 'vhf' | 'uhf' | 'dual') => void;
}

export const ScannerControls: React.FC<ScannerControlsProps> = ({ 
  config, 
  setConfig, 
  isScanning, 
  setIsScanning,
  viewMode,
  setViewMode
}) => {
  return (
    <div className="flex flex-col gap-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-500" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Scanner Config</h2>
        </div>
        <button
          onClick={() => setIsScanning(!isScanning)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
            isScanning 
              ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20' 
              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20'
          }`}
        >
          {isScanning ? <><Pause className="w-3 h-3" /> Stop Scan</> : <><Play className="w-3 h-3" /> Start Scan</>}
        </button>
      </div>

      {/* Band Selection */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Active Band Selection</label>
        <div className="grid grid-cols-3 gap-2">
          {(['vhf', 'uhf', 'dual'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`py-2 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                viewMode === mode 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' 
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
              }`}
            >
              {mode === 'dual' ? 'Dual Band' : mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className={`space-y-2 transition-opacity ${viewMode === 'uhf' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-1">VHF Band (MHz)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase text-zinc-600">Min</label>
              <input 
                type="number" 
                value={config.vhf.minFreq}
                onChange={(e) => setConfig({ ...config, vhf: { ...config.vhf, minFreq: Number(e.target.value) } })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase text-zinc-600">Max</label>
              <input 
                type="number" 
                value={config.vhf.maxFreq}
                onChange={(e) => setConfig({ ...config, vhf: { ...config.vhf, maxFreq: Number(e.target.value) } })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        </div>

        <div className={`space-y-2 transition-opacity ${viewMode === 'vhf' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-1">UHF Band (MHz)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase text-zinc-600">Min</label>
              <input 
                type="number" 
                value={config.uhf.minFreq}
                onChange={(e) => setConfig({ ...config, uhf: { ...config.uhf, minFreq: Number(e.target.value) } })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-mono uppercase text-zinc-600">Max</label>
              <input 
                type="number" 
                value={config.uhf.maxFreq}
                onChange={(e) => setConfig({ ...config, uhf: { ...config.uhf, maxFreq: Number(e.target.value) } })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-mono uppercase text-zinc-500">Detection Threshold</label>
            <span className="text-[10px] font-mono text-emerald-500">{config.threshold} dBm</span>
          </div>
          <input 
            type="range" 
            min="-120" 
            max="-20" 
            value={config.threshold}
            onChange={(e) => setConfig({ ...config, threshold: Number(e.target.value) })}
            className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-mono uppercase text-zinc-500">RF Gain</label>
            <span className="text-[10px] font-mono text-emerald-500">{config.gain} dB</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="50" 
            value={config.gain}
            onChange={(e) => setConfig({ ...config, gain: Number(e.target.value) })}
            className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-mono uppercase text-zinc-500">Detection Sensitivity</label>
            <span className="text-[10px] font-mono text-emerald-500">x{config.sensitivity.toFixed(1)}</span>
          </div>
          <input 
            type="range" 
            min="0.5" 
            max="2.0" 
            step="0.1"
            value={config.sensitivity}
            onChange={(e) => setConfig({ ...config, sensitivity: Number(e.target.value) })}
            className="w-full accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <div className="pt-2 border-t border-zinc-800">
        <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase">
          <Zap className="w-3 h-3 text-amber-500" />
          <span>SDR Status: <span className={isScanning ? "text-emerald-500" : "text-red-500"}>{isScanning ? "Connected" : "Idle"}</span></span>
        </div>
      </div>
    </div>
  );
};
