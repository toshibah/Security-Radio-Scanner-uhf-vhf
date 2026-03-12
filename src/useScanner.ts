import { useState, useEffect, useRef, useCallback } from 'react';
import { SignalDetection, ScannerConfig } from './types';

export const useScanner = (config: ScannerConfig, activeBand: 'vhf' | 'uhf' | 'dual' = 'dual') => {
  const [vhfData, setVhfData] = useState<{ frequency: number; strength: number }[]>([]);
  const [uhfData, setUhfData] = useState<{ frequency: number; strength: number }[]>([]);
  const [vhfWaterfall, setVhfWaterfall] = useState<number[]>([]);
  const [uhfWaterfall, setUhfWaterfall] = useState<number[]>([]);
  const [detections, setDetections] = useState<SignalDetection[]>(() => {
    const saved = localStorage.getItem('spectrum_detections');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return parsed.filter((d: SignalDetection) => d.timestamp > sevenDaysAgo);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('spectrum_detections', JSON.stringify(detections));
  }, [detections]);

  const [isScanning, setIsScanning] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([-1.286389, 36.817223]); // Nairobi default
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const lastDetectionRef = useRef<Record<number, number>>({});

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCurrentLocation(prev => {
          if (prev[0] === latitude && prev[1] === longitude) return prev;
          return [latitude, longitude];
        });
        setAccuracy(accuracy);
      }, (error) => {
        console.error("Geolocation error:", error);
      }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const generateBandData = useCallback((bandConfig: { minFreq: number; maxFreq: number }) => {
    const points = 100;
    const stepSize = (bandConfig.maxFreq - bandConfig.minFreq) / points;
    const spectrum: { frequency: number; strength: number }[] = [];
    const waterfall: number[] = [];

    for (let i = 0; i < points; i++) {
      const freq = bandConfig.minFreq + i * stepSize;
      
      // Base noise floor (-110 to -100 dBm)
      let strength = -110 + Math.random() * 10;

      // Add some static signals
      // VHF Signals
      if (Math.abs(freq - 144.8) < 0.5) strength += 40 * Math.exp(-Math.pow(freq - 144.8, 2) / 0.01);
      if (Math.abs(freq - 156.8) < 0.5) strength += 50 * Math.exp(-Math.pow(freq - 156.8, 2) / 0.01);
      
      // UHF Signals
      if (Math.abs(freq - 433.92) < 0.5) strength += 35 * Math.exp(-Math.pow(freq - 433.92, 2) / 0.01);
      if (Math.abs(freq - 462.5625) < 0.5) strength += 45 * Math.exp(-Math.pow(freq - 462.5625, 2) / 0.01); // FRS Ch1

      // Random transient signals (bursts)
      if (Math.random() > 0.99) strength += 60;

      spectrum.push({ frequency: freq, strength });
      const normalized = Math.max(0, Math.min(1, (strength + 120) / 100));
      waterfall.push(normalized);

      // Detection logic
      const effectiveStrength = strength < 0 ? strength / config.sensitivity : strength * config.sensitivity;
      if (effectiveStrength > config.threshold) {
        const now = Date.now();
        const freqKey = Math.round(freq * 10);
        const lastDetected = lastDetectionRef.current[freqKey] || 0;
        
        if (now - lastDetected > 5000) {
          let label = `Signal @ ${freq.toFixed(3)} MHz`;
          if (Math.abs(freq - 144.8) < 0.01) label = "APRS Gateway - Nairobi Central";
          else if (Math.abs(freq - 433.92) < 0.01) label = "Smart Meter - Industrial Area";
          else if (Math.abs(freq - 156.8) < 0.01) label = "Marine Ch16 - Port Authority";
          else if (Math.abs(freq - 462.562) < 0.01) label = "FRS Channel 1 - Security";
          else if (strength > -50) label = "High Power TX - Restricted Zone";

          const newDetection: SignalDetection = {
            id: Math.random().toString(36).substr(2, 9),
            frequency: freq,
            strength: strength,
            timestamp: now,
            latitude: currentLocation[0] + (Math.random() - 0.5) * 0.01,
            longitude: currentLocation[1] + (Math.random() - 0.5) * 0.01,
            type: strength > -60 ? 'continuous' : 'burst',
            label: label
          };
          setDetections(prev => {
            const updated = [newDetection, ...prev];
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            return updated.filter(d => d.timestamp > sevenDaysAgo);
          });
          lastDetectionRef.current[freqKey] = now;
        }
      }
    }
    return { spectrum, waterfall };
  }, [config.threshold, config.sensitivity, currentLocation]);

  const updateAllBands = useCallback(() => {
    if (activeBand === 'vhf' || activeBand === 'dual') {
      const vhf = generateBandData(config.vhf);
      setVhfData(vhf.spectrum);
      setVhfWaterfall(vhf.waterfall);
    } else {
      setVhfData([]);
      setVhfWaterfall([]);
    }

    if (activeBand === 'uhf' || activeBand === 'dual') {
      const uhf = generateBandData(config.uhf);
      setUhfData(uhf.spectrum);
      setUhfWaterfall(uhf.waterfall);
    } else {
      setUhfData([]);
      setUhfWaterfall([]);
    }
  }, [config.vhf, config.uhf, generateBandData, activeBand]);

  useEffect(() => {
    if (!isScanning) return;
    const interval = setInterval(updateAllBands, 200);
    return () => clearInterval(interval);
  }, [isScanning, updateAllBands]);

  return {
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
  };
};
