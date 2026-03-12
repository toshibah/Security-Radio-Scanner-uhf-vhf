export interface SignalDetection {
  id: string;
  frequency: number; // MHz
  strength: number; // dBm
  timestamp: number;
  latitude: number;
  longitude: number;
  type: 'continuous' | 'burst' | 'pattern';
  label?: string;
}

export interface BandConfig {
  minFreq: number;
  maxFreq: number;
}

export interface ScannerConfig {
  vhf: BandConfig;
  uhf: BandConfig;
  gain: number;
  threshold: number;
  sensitivity: number;
}
