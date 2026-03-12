import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Radio, 
  Map as MapIcon, 
  Activity, 
  LayoutDashboard, 
  History, 
  Compass, 
  Shield, 
  Menu, 
  X, 
  Maximize2, 
  Minimize2,
  Cpu,
  Signal,
  AlertCircle
} from 'lucide-react';
import { SpectrumChart } from './components/SpectrumChart';
import { Waterfall } from './components/Waterfall';
import { SignalMap } from './components/SignalMap';
import { DetectionLog } from './components/DetectionLog';
import { ScannerControls } from './components/ScannerControls';
import { HistoryView } from './components/HistoryView';
import { useScanner } from './useScanner';
import { ScannerConfig } from './types';

const App: React.FC = () => {
  const [config, setConfig] = useState<ScannerConfig>({
    vhf: { minFreq: 136, maxFreq: 174 },
    uhf: { minFreq: 400, maxFreq: 470 },
    gain: 20,
    threshold: -70,
    sensitivity: 1.0
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'history'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'vhf' | 'uhf' | 'dual'>('dual');

  const { 
    vhfData,
    uhfData,
    vhfWaterfall,
    uhfWaterfall,
    detections, 
    isScanning, 
    setIsScanning, 
    currentLocation,
    accuracy,
    setDetections
  } = useScanner(config, viewMode);

  const handleUpdateDetection = (id: string, updates: Partial<ScannerConfig | any>) => {
    setDetections(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0b] text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 64 }}
        className="flex flex-col border-r border-zinc-800 bg-zinc-950/50 backdrop-blur-xl z-50"
      >
        <div className="p-4 flex items-center gap-3 border-b border-zinc-800 overflow-hidden whitespace-nowrap">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
            <Shield className="w-5 h-5 text-black" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-sm">SpectrumIntel</span>
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                v2.5.0 {viewMode === 'dual' ? 'DUAL-BAND' : `${viewMode.toUpperCase()} ONLY`}
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-1 mt-4">
          <NavItem 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<MapIcon className="w-5 h-5" />} 
            label="Signal Map" 
            active={activeTab === 'map'} 
            onClick={() => setActiveTab('map')} 
            collapsed={!isSidebarOpen}
          />
          <NavItem 
            icon={<History className="w-5 h-5" />} 
            label="History" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            collapsed={!isSidebarOpen}
          />
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500"
          >
            {isSidebarOpen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-14 border-b border-zinc-800 bg-zinc-950/30 backdrop-blur-md flex items-center justify-between px-6 z-40">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                {isScanning ? 'System Active' : 'System Standby'}
              </span>
            </div>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-1 bg-zinc-900 rounded-md p-1 border border-zinc-800">
              {(['vhf', 'uhf', 'dual'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded transition-all ${
                    viewMode === mode ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex flex-col items-end transition-opacity ${viewMode === 'uhf' || !isScanning ? 'opacity-30' : 'opacity-100'}`}>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">VHF {isScanning && (viewMode === 'vhf' || viewMode === 'dual') ? 'Scanning' : 'Idle'}</span>
              <span className="text-sm font-mono text-emerald-500 font-bold">144.800 MHz</span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className={`flex flex-col items-end transition-opacity ${viewMode === 'vhf' || !isScanning ? 'opacity-30' : 'opacity-100'}`}>
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-tighter">UHF {isScanning && (viewMode === 'uhf' || viewMode === 'dual') ? 'Scanning' : 'Idle'}</span>
              <span className="text-sm font-mono text-amber-500 font-bold">433.920 MHz</span>
            </div>
          </div>
        </header>

        {/* Content View */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/20">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-12 gap-6 h-full"
              >
                {/* Left Column: Spectrum & Waterfall */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  {(viewMode === 'vhf' || viewMode === 'dual') && (
                    <div className="space-y-4">
                      <section className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                            <Activity className="w-3 h-3" /> VHF Spectrum (136-174 MHz)
                          </h3>
                        </div>
                        <SpectrumChart data={vhfData} threshold={config.threshold} />
                      </section>
                      <section className="space-y-2">
                        <Waterfall data={vhfWaterfall} width={800} height={150} />
                      </section>
                    </div>
                  )}

                  {(viewMode === 'uhf' || viewMode === 'dual') && (
                    <div className="space-y-4">
                      <section className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
                            <Activity className="w-3 h-3" /> UHF Spectrum (400-470 MHz)
                          </h3>
                        </div>
                        <SpectrumChart data={uhfData} threshold={config.threshold} />
                      </section>
                      <section className="space-y-2">
                        <Waterfall data={uhfWaterfall} width={800} height={150} />
                      </section>
                    </div>
                  )}
                </div>

                {/* Right Column: Controls & Detections */}
                <div className="col-span-12 lg:col-span-4 space-y-6 flex flex-col">
                  <ScannerControls 
                    config={config} 
                    setConfig={setConfig} 
                    isScanning={isScanning} 
                    setIsScanning={setIsScanning} 
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                  />
                  <div className="flex-1 min-h-[400px]">
                    <DetectionLog detections={detections} onClear={() => setDetections([])} />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'map' && (
              <motion.div 
                key="map"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full flex flex-col gap-4"
              >
                <div className="flex-1 relative">
                  <SignalMap 
                    detections={detections} 
                    center={currentLocation} 
                    accuracy={accuracy}
                    onResetDetections={() => setDetections([])}
                    onUpdateDetection={(id, label) => handleUpdateDetection(id, { label })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard icon={<AlertCircle className="w-4 h-4 text-amber-500" />} label="Detections" value={detections.length.toString()} />
                  <StatCard icon={<Cpu className="w-4 h-4 text-emerald-500" />} label="Active Nodes" value="3" />
                  <StatCard icon={<Compass className="w-4 h-4 text-blue-500" />} label="Accuracy" value={accuracy ? `±${Math.round(accuracy)}m` : 'Fixing...'} />
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div 
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full"
              >
                <HistoryView detections={detections} onClear={() => setDetections([])} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Bar */}
        <footer className="h-8 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-between px-4 text-[9px] font-mono uppercase tracking-widest text-zinc-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              SDR: RTL2832U
            </span>
            <span className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${accuracy ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              GPS: {accuracy ? `±${Math.round(accuracy)}m` : 'FIXING...'}
            </span>
          </div>

          <a 
            href="mailto:jamenya1988@gmail.com" 
            className="hover:text-emerald-500 transition-colors font-bold"
          >
            Kepler Camp Codes
          </a>

          <div className="flex items-center gap-4">
            <span>CPU: 12%</span>
            <span>MEM: 450MB</span>
            <span className="text-emerald-500 font-bold">SYSTEM SECURE</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, collapsed }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent'
    }`}
  >
    <div className="flex-shrink-0">{icon}</div>
    {!collapsed && <span className="text-xs font-bold uppercase tracking-widest">{label}</span>}
    {active && !collapsed && (
      <motion.div 
        layoutId="active-pill"
        className="ml-auto w-1 h-4 bg-emerald-500 rounded-full"
      />
    )}
  </button>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex items-center gap-4">
    <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
      {icon}
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
      <span className="text-xl font-mono font-bold text-zinc-100">{value}</span>
    </div>
  </div>
);

export default App;
