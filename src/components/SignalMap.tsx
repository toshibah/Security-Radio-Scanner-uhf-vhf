import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Tooltip, useMapEvents, LayersControl, LayerGroup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { SignalDetection } from '../types';
import { Radar, Navigation, Target, Activity, AlertTriangle, Filter, ChevronDown, ChevronUp, Compass, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Fix for default marker icons in Leaflet with React
const markerIcon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const markerShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface SignalMapProps {
  detections: SignalDetection[];
  center: [number, number];
  accuracy?: number | null;
  onResetDetections?: () => void;
  onUpdateDetection?: (id: string, label: string) => void;
}

// Helper to calculate distance in meters
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const MapController = ({ onMove }: { onMove: (center: [number, number]) => void }) => {
  useMapEvents({
    move: (e) => {
      const center = e.target.getCenter();
      onMove([center.lat, center.lng]);
    },
  });
  return null;
};

const ZoomControls = () => {
  const map = useMapEvents({});
  return (
    <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
      <button
        onClick={() => map.zoomIn()}
        className="w-8 h-8 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded flex items-center justify-center text-zinc-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all shadow-xl pointer-events-auto"
        title="Zoom In"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="w-8 h-8 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded flex items-center justify-center text-zinc-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all shadow-xl pointer-events-auto"
        title="Zoom Out"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
};

// Subtle beep sound generator
const playAlertSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
  } catch (e) {
    console.warn('Audio alert failed:', e);
  }
};

export const SignalMap: React.FC<SignalMapProps> = ({ detections, center, accuracy, onResetDetections, onUpdateDetection }) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  
  // Sync map center with GPS location when it updates
  useEffect(() => {
    setMapCenter(center);
  }, [center]);

  const [alertSignal, setAlertSignal] = useState<SignalDetection | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState('');
  const [filters, setFilters] = useState({
    types: ['continuous', 'burst', 'pattern'] as ('continuous' | 'burst' | 'pattern')[],
    minFreq: 100,
    maxFreq: 500,
    showOnlyStrongest: false,
    timeRange: '1h' as '1h' | '24h' | '7d',
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [scanRadius, setScanRadius] = useState(500); // meters
  const [alertRadius, setAlertRadius] = useState(200); // meters
  const prevNearbyIds = useRef<Set<string>>(new Set());

  const filteredDetections = useMemo(() => {
    const now = Date.now();
    const rangeMs = 
      filters.timeRange === '1h' ? 60 * 60 * 1000 :
      filters.timeRange === '24h' ? 24 * 60 * 60 * 1000 :
      7 * 24 * 60 * 60 * 1000;

    let result = detections.filter(d => 
      filters.types.includes(d.type) &&
      d.frequency >= filters.minFreq &&
      d.frequency <= filters.maxFreq &&
      (now - d.timestamp) < rangeMs
    );

    if (filters.showOnlyStrongest) {
      // Define strongest as top 20% or signals above -70dBm
      // Let's go with top 10 signals or signals > -60dBm for clarity
      result = result
        .sort((a, b) => b.strength - a.strength)
        .slice(0, Math.max(5, Math.floor(result.length * 0.3)));
    }

    return result;
  }, [detections, filters]);

  const nearbySignals = useMemo(() => {
    return filteredDetections
      .map(d => ({
        ...d,
        distance: getDistance(mapCenter[0], mapCenter[1], d.latitude, d.longitude)
      }))
      .filter(d => d.distance < scanRadius)
      .sort((a, b) => a.distance - b.distance);
  }, [filteredDetections, mapCenter, scanRadius]);

  // Alert logic
  useEffect(() => {
    const currentIds = new Set(nearbySignals.map(s => s.id));
    // Only alert for signals within alertRadius
    const newAlertingSignals = nearbySignals.filter(s => s.distance < alertRadius && !prevNearbyIds.current.has(s.id));

    // Update the ref immediately to prevent re-triggering on the next render
    prevNearbyIds.current = currentIds;

    if (newAlertingSignals.length > 0) {
      const latest = newAlertingSignals[0];
      setAlertSignal(latest);
      playAlertSound();
      
      // Auto-clear visual alert after 3 seconds
      const timer = setTimeout(() => setAlertSignal(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [nearbySignals, alertRadius]);

  const renderDetectionMarker = (detection: SignalDetection, layerKey?: string) => {
    const isNearby = getDistance(mapCenter[0], mapCenter[1], detection.latitude, detection.longitude) < scanRadius;
    const isAlerting = alertSignal?.id === detection.id;
    const isUHF = detection.frequency >= 300;
    
    // Strength mapping: -120dBm (weak) to -30dBm (strong)
    const strengthPercent = Math.max(0, Math.min(100, (detection.strength + 120) * 1.1));
    const strengthRadius = Math.max(30, (detection.strength + 130) * 1.5);
    const strengthOpacity = 0.1 + (strengthPercent / 100) * 0.4;

    // Tactical Strength Gradient (Blue -> Green -> Yellow -> Red)
    const getStrengthColor = (percent: number) => {
      if (percent < 25) return '#3b82f6'; // Blue
      if (percent < 50) return '#10b981'; // Emerald
      if (percent < 75) return '#f59e0b'; // Amber
      return '#ef4444'; // Red
    };

    const strengthColor = getStrengthColor(strengthPercent);
    const bandText = isUHF ? 'text-amber-400' : 'text-emerald-400';
    const bandBorder = isUHF ? 'border-amber-500/50' : 'border-emerald-500/50';
    const bandTether = isUHF ? 'bg-amber-500/60' : 'bg-emerald-500/60';

    return (
      <React.Fragment key={`${layerKey || 'default'}-${detection.id}`}>
        <Marker position={[detection.latitude, detection.longitude]}>
          <Tooltip 
            permanent 
            direction="top" 
            offset={[0, -40]}
            className="custom-tooltip"
          >
            <div className="flex flex-col items-center group pointer-events-none">
              <div className={`flex flex-col items-center bg-zinc-950/95 px-2 py-1 rounded border ${bandBorder} shadow-[0_0_10px_rgba(0,0,0,0.8)] backdrop-blur-md relative overflow-hidden`}>
                {/* Radial Strength Indicator (Mini) */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div 
                    className="h-full bg-current transition-all duration-500" 
                    style={{ 
                      width: `${strengthPercent}%`, 
                      backgroundColor: strengthColor,
                      filter: 'blur(8px)'
                    }} 
                  />
                </div>

                <div className="flex items-center gap-2 relative z-10">
                  <span className={`text-[10px] font-mono font-bold ${bandText} whitespace-nowrap`}>
                    {detection.frequency.toFixed(3)} MHz
                  </span>
                  <div className="flex flex-col gap-[1px] w-1.5 h-3 justify-end">
                    {[1, 2, 3, 4].map((i) => (
                      <div 
                        key={i} 
                        className={`w-full h-[2px] rounded-full transition-colors duration-500 ${
                          strengthPercent >= (i * 25) ? '' : 'bg-zinc-800'
                        }`} 
                        style={{ backgroundColor: strengthPercent >= (i * 25) ? strengthColor : undefined }}
                      />
                    ))}
                  </div>
                </div>
                {detection.label && (
                  <span className="text-[8px] font-sans font-medium text-zinc-400 uppercase tracking-tighter border-t border-zinc-800 mt-0.5 pt-0.5 whitespace-nowrap relative z-10">
                    {detection.label}
                  </span>
                )}
              </div>
              <div 
                className="w-px h-3 shadow-[0_0_4px_rgba(0,0,0,0.5)] transition-colors duration-500" 
                style={{ backgroundColor: strengthColor }}
              />
            </div>
          </Tooltip>
          <Popup>
            <div className="text-zinc-900 font-sans p-1 min-w-[150px]">
              <p className="font-bold" style={{ color: strengthColor }}>{detection.frequency.toFixed(3)} MHz</p>
              <p className="text-xs">Band: {isUHF ? 'UHF' : 'VHF'}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs">Strength: {detection.strength.toFixed(1)} dBm</p>
                <div className="flex-1 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-all duration-500" 
                    style={{ width: `${strengthPercent}%`, backgroundColor: strengthColor }} 
                  />
                </div>
              </div>
              <p className="text-xs">Type: {detection.type}</p>
              
              <div className="mt-2 pt-2 border-t border-zinc-200">
                {editingLabelId === detection.id ? (
                  <div className="flex flex-col gap-2">
                    <input 
                      type="text" 
                      value={tempLabel}
                      onChange={(e) => setTempLabel(e.target.value)}
                      placeholder="Enter label..."
                      className="w-full px-2 py-1 text-[10px] border border-zinc-300 rounded focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          onUpdateDetection?.(detection.id, tempLabel);
                          setEditingLabelId(null);
                        }}
                        className="flex-1 bg-emerald-500 text-white text-[9px] py-1 rounded hover:bg-emerald-600 transition-colors"
                      >
                        Save
                      </button>
                      <button 
                        onClick={() => setEditingLabelId(null)}
                        className="flex-1 bg-zinc-200 text-zinc-600 text-[9px] py-1 rounded hover:bg-zinc-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-500 italic truncate max-w-[80px]">
                      {detection.label || 'No label'}
                    </span>
                    <button 
                      onClick={() => {
                        setEditingLabelId(detection.id);
                        setTempLabel(detection.label || '');
                      }}
                      className="text-[9px] text-emerald-600 hover:underline font-bold"
                    >
                      {detection.label ? 'Edit' : 'Add Label'}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">{new Date(detection.timestamp).toLocaleTimeString()}</p>
            </div>
          </Popup>
        </Marker>
        <Circle
          center={[detection.latitude, detection.longitude]}
          radius={strengthRadius}
          pathOptions={{
            color: isAlerting ? '#ef4444' : (isNearby ? strengthColor : '#3f3f46'),
            fillColor: isAlerting ? '#ef4444' : (isNearby ? strengthColor : '#3f3f46'),
            fillOpacity: isAlerting ? 0.5 : (isNearby ? strengthOpacity : 0.05),
            weight: isAlerting ? 4 : (isNearby ? 2 : 1),
            dashArray: isNearby ? undefined : '3, 3'
          }}
        />
        {isNearby && strengthPercent > 70 && (
          <Circle
            center={[detection.latitude, detection.longitude]}
            radius={strengthRadius * 1.2}
            pathOptions={{
              color: strengthColor,
              fillColor: 'transparent',
              weight: 1,
              opacity: 0.2,
              dashArray: '5, 10'
            }}
          />
        )}
      </React.Fragment>
    );
  };

  return (
    <div className={`${isExpanded ? 'fixed inset-0 z-[9999] bg-[#0a0a0b]' : 'h-full w-full rounded-lg border border-zinc-800 bg-zinc-950'} overflow-hidden relative transition-all duration-300`}>
      <MapContainer 
        center={center} 
        zoom={14} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Tactical Dark">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Detailed Terrain">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="Roads & Labels">
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              zIndex={1000}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="GPS Accuracy">
            <LayerGroup>
              {accuracy && (
                <Circle
                  center={mapCenter}
                  radius={accuracy}
                  pathOptions={{
                    color: '#3b82f6',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.1,
                    weight: 1,
                    dashArray: '2, 4',
                    className: 'accuracy-pulse'
                  }}
                />
              )}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Scan Ranges">
            <LayerGroup>
              {/* Scan Range (Outer) */}
              <Circle
                center={mapCenter}
                radius={scanRadius}
                pathOptions={{
                  color: alertSignal ? '#ef4444' : '#10b981',
                  fillColor: alertSignal ? '#ef4444' : '#10b981',
                  fillOpacity: alertSignal ? 0.05 : 0.02,
                  weight: alertSignal ? 2 : 1,
                  dashArray: '10, 10'
                }}
              />

              {/* Proximity Alert Range (Inner) */}
              <Circle
                center={mapCenter}
                radius={alertRadius}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.05,
                  weight: 1,
                  dashArray: '5, 5'
                }}
              />
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="User Position">
            <Circle
              center={mapCenter}
              radius={8}
              pathOptions={{
                color: '#000000',
                fillColor: '#000000',
                fillOpacity: 1,
                weight: 2
              }}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="VHF Band (<300MHz)">
            <LayerGroup>
              <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
                {filteredDetections.filter(d => d.frequency < 300).map(detection => renderDetectionMarker(detection))}
              </MarkerClusterGroup>
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="UHF Band (>=300MHz)">
            <LayerGroup>
              <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
                {filteredDetections.filter(d => d.frequency >= 300).map(detection => renderDetectionMarker(detection))}
              </MarkerClusterGroup>
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Continuous Signals Only">
            <LayerGroup>
              {filteredDetections.filter(d => d.type === 'continuous').map(detection => renderDetectionMarker(detection, "continuous-only"))}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Burst/Pattern Signals Only">
            <LayerGroup>
              {filteredDetections.filter(d => d.type !== 'continuous').map(detection => renderDetectionMarker(detection, "burst-only"))}
            </LayerGroup>
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Tether Lines">
            <LayerGroup>
              {nearbySignals.map(s => (
                <Polyline
                  key={`line-${s.id}`}
                  positions={[mapCenter, [s.latitude, s.longitude]]}
                  pathOptions={{
                    color: alertSignal?.id === s.id ? '#ef4444' : '#10b981',
                    weight: alertSignal?.id === s.id ? 2 : 1,
                    opacity: alertSignal?.id === s.id ? 0.6 : 0.3,
                    dashArray: '4, 4'
                  }}
                />
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>
        <ZoomControls />
      </MapContainer>

      {/* Visual Alert Banner */}
      <AnimatePresence>
        {alertSignal && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 z-[2000] pointer-events-none"
          >
            <div className="bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-red-400/50">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Proximity Alert</span>
                <span className="text-xs font-mono font-bold">{alertSignal.frequency.toFixed(3)} MHz Detected</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proximity Gadget Overlay */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-3 pointer-events-none">
        <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-3 rounded-lg shadow-2xl w-64 pointer-events-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Radar className={`w-4 h-4 ${alertSignal ? 'text-red-500' : 'text-emerald-500'} animate-pulse`} />
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Proximity Radar</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded px-1 gap-1 pointer-events-auto">
                <button 
                  onClick={() => {
                    setScanRadius(prev => Math.max(100, prev - 100));
                    setAlertRadius(prev => Math.max(50, prev - 50));
                  }}
                  className="text-[10px] text-zinc-500 hover:text-emerald-500 p-0.5"
                  title="Reduce Range"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <span className="text-[9px] font-mono text-zinc-400 min-w-[35px] text-center">{(scanRadius/1000).toFixed(1)}km</span>
                <button 
                  onClick={() => {
                    setScanRadius(prev => Math.min(5000, prev + 100));
                    setAlertRadius(prev => Math.min(2000, prev + 50));
                  }}
                  className="text-[10px] text-zinc-500 hover:text-emerald-500 p-0.5"
                  title="Expand Range"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
              </div>
              <button 
                onClick={() => {
                  onResetDetections?.();
                  prevNearbyIds.current = new Set();
                }}
                className="text-[9px] font-mono text-emerald-500 hover:text-emerald-400 uppercase tracking-tighter border border-emerald-500/30 px-1.5 py-0.5 rounded bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors pointer-events-auto"
              >
                Reset Scan
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {nearbySignals.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-[10px] font-mono text-zinc-600 uppercase">No signals in range</p>
              </div>
            ) : (
              nearbySignals.slice(0, 8).map((s) => (
                <div 
                  key={s.id} 
                  className={`flex items-center justify-between p-2 rounded border transition-colors ${
                    alertSignal?.id === s.id 
                      ? 'bg-red-500/20 border-red-500/50' 
                      : 'bg-zinc-950/50 border-zinc-800/50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-mono font-bold ${alertSignal?.id === s.id ? 'text-red-400' : 'text-emerald-500'}`}>
                      {s.frequency.toFixed(3)} MHz
                    </span>
                    <div className="flex items-center gap-1 text-[8px] text-zinc-500 uppercase">
                      <Navigation className="w-2 h-2" />
                      <span>{s.distance > 1000 ? `${(s.distance/1000).toFixed(1)}km` : `${Math.round(s.distance)}m`}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-mono text-zinc-300">{s.strength.toFixed(0)} dBm</span>
                    <div className="w-12 h-1 bg-zinc-800 rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full ${alertSignal?.id === s.id ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.max(0, Math.min(100, (s.strength + 120) * 1.2))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-mono text-zinc-500 uppercase">In Range: {nearbySignals.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-mono text-zinc-500 uppercase">
                GPS: {accuracy ? `±${Math.round(accuracy)}m` : 'FIXING...'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-mono text-zinc-500 uppercase">Scan: Active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
        <div className="bg-zinc-900/90 border border-zinc-800 p-2 rounded text-[10px] font-mono uppercase tracking-widest text-emerald-500 shadow-xl flex items-center gap-3">
          <span>Signal Mapping Interface</span>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-1 rounded transition-colors ${isFilterOpen ? 'bg-emerald-500 text-black' : 'hover:bg-zinc-800 text-zinc-400'}`}
              title="Filters"
            >
              <Filter className="w-3 h-3" />
            </button>
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 transition-colors"
              title={isExpanded ? "Reduce View" : "Expand View"}
            >
              {isExpanded ? <ChevronDown className="w-3 h-3 rotate-180" /> : <ChevronUp className="w-3 h-3 rotate-180" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 p-4 rounded-lg shadow-2xl w-64 space-y-4"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Time Range</label>
                <div className="flex gap-1 bg-zinc-950 p-1 rounded border border-zinc-800">
                  {(['1h', '24h', '7d'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setFilters({ ...filters, timeRange: range })}
                      className={`flex-1 py-1 rounded text-[9px] font-mono uppercase transition-all ${
                        filters.timeRange === range
                          ? 'bg-emerald-500 text-black font-bold'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Signal Types</label>
                <div className="flex flex-wrap gap-2">
                  {(['continuous', 'burst', 'pattern'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        const newTypes = filters.types.includes(type)
                          ? filters.types.filter(t => t !== type)
                          : [...filters.types, type];
                        setFilters({ ...filters, types: newTypes });
                      }}
                      className={`px-2 py-1 rounded text-[9px] font-mono uppercase border transition-all ${
                        filters.types.includes(type)
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Freq Range (MHz)</label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[8px] text-zinc-600 uppercase">Min</span>
                    <input 
                      type="number"
                      value={filters.minFreq}
                      onChange={(e) => setFilters({ ...filters, minFreq: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] font-mono text-emerald-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] text-zinc-600 uppercase">Max</span>
                    <input 
                      type="number"
                      value={filters.maxFreq}
                      onChange={(e) => setFilters({ ...filters, maxFreq: Number(e.target.value) })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[10px] font-mono text-emerald-500 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Signal Optimization</label>
                <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded p-2">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase">Strongest Only</span>
                  <button
                    onClick={() => setFilters({ ...filters, showOnlyStrongest: !filters.showOnlyStrongest })}
                    className={`w-8 h-4 rounded-full relative transition-colors ${filters.showOnlyStrongest ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${filters.showOnlyStrongest ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-[9px] text-zinc-500 uppercase">Showing {filteredDetections.length} of {detections.length}</span>
                <button 
                  onClick={() => setFilters({ types: ['continuous', 'burst', 'pattern'], minFreq: 100, maxFreq: 500, showOnlyStrongest: false })}
                  className="text-[9px] text-emerald-500 hover:underline uppercase"
                >
                  Reset
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
