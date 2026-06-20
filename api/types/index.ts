export interface FrequencyPoint {
  frequency: number;
  threshold: number;
}

export interface AudiogramRequest {
  leftEar: FrequencyPoint[];
  rightEar: FrequencyPoint[];
}

export interface DynamicRangePoint {
  frequency: number;
  threshold: number;
  uncomfortableLevel: number;
  dynamicRange: number;
}

export interface DynamicRangeResponse {
  leftEar: DynamicRangePoint[];
  rightEar: DynamicRangePoint[];
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

export interface MaskingCalculationRequest {
  audiogram: AudiogramRequest;
  tinnitus: TinnitusInfo;
}

export interface MaskingParametersResponse {
  centerFrequency: number;
  bandwidth: number;
  soundLevel: number;
  noiseType: NoiseType;
  notchFrequency?: number;
  recommendedDuration: number;
  explanation: string;
}

export interface CriticalBand {
  centerFrequency: number;
  lowerFrequency: number;
  upperFrequency: number;
  bandwidth: number;
  index: number;
}
