export interface FrequencyPoint {
  frequency: number;
  threshold: number;
}

export interface DynamicRangePoint {
  frequency: number;
  threshold: number;
  uncomfortableLevel: number;
  dynamicRange: number;
}

export type TinnitusType = 'pure_tone' | 'narrowband' | 'broadband';
export type EarSide = 'left' | 'right' | 'bilateral';
export type NoiseType = 'white' | 'pink' | 'brown' | 'notched' | 'narrowband';

export interface TinnitusInfo {
  frequency: number;
  loudness: number;
  type: TinnitusType;
  ear: EarSide;
}

export interface MaskingParameters {
  centerFrequency: number;
  bandwidth: number;
  soundLevel: number;
  noiseType: NoiseType;
  notchFrequency?: number;
  recommendedDuration: number;
  explanation: string;
}

export interface AudioState {
  isPlaying: boolean;
  volume: number;
  frequencyOffset: number;
  bandwidthOffset: number;
  levelOffset: number;
  noiseType: NoiseType | null;
}

export const STANDARD_FREQUENCIES = [125, 250, 500, 1000, 2000, 4000, 8000];

export const createDefaultAudiogram = (): FrequencyPoint[] =>
  STANDARD_FREQUENCIES.map(f => ({ frequency: f, threshold: 25 }));
