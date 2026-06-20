import { create } from 'zustand';
import type {
  FrequencyPoint,
  DynamicRangePoint,
  TinnitusInfo,
  MaskingParameters,
  AudioState,
} from '../types';
import { createDefaultAudiogram } from '../types';

interface AppState {
  leftEar: FrequencyPoint[];
  rightEar: FrequencyPoint[];
  leftDynamicRange: DynamicRangePoint[];
  rightDynamicRange: DynamicRangePoint[];
  tinnitus: TinnitusInfo;
  maskingParams: MaskingParameters | null;
  isCalculating: boolean;
  audioState: AudioState;
  setLeftEar: (data: FrequencyPoint[]) => void;
  setRightEar: (data: FrequencyPoint[]) => void;
  setThreshold: (side: 'left' | 'right', frequency: number, value: number) => void;
  setLeftDynamicRange: (data: DynamicRangePoint[]) => void;
  setRightDynamicRange: (data: DynamicRangePoint[]) => void;
  setTinnitus: (data: Partial<TinnitusInfo>) => void;
  setMaskingParams: (params: MaskingParameters | null) => void;
  setIsCalculating: (value: boolean) => void;
  setAudioState: (state: Partial<AudioState>) => void;
  resetAll: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  leftEar: createDefaultAudiogram(),
  rightEar: createDefaultAudiogram(),
  leftDynamicRange: [],
  rightDynamicRange: [],
  tinnitus: {
    frequency: 4000,
    loudness: 5,
    type: 'pure_tone',
    ear: 'bilateral',
  },
  maskingParams: null,
  isCalculating: false,
  audioState: {
    isPlaying: false,
    volume: 0.5,
    frequencyOffset: 0,
    bandwidthOffset: 0,
    levelOffset: 0,
    noiseType: null,
  },
  setLeftEar: (data) => set({ leftEar: data }),
  setRightEar: (data) => set({ rightEar: data }),
  setThreshold: (side, frequency, value) =>
    set((state) => {
      const key = side === 'left' ? 'leftEar' : 'rightEar';
      const earData = state[key].map((p) =>
        p.frequency === frequency ? { ...p, threshold: value } : p
      );
      return { [key]: earData } as Partial<AppState>;
    }),
  setLeftDynamicRange: (data) => set({ leftDynamicRange: data }),
  setRightDynamicRange: (data) => set({ rightDynamicRange: data }),
  setTinnitus: (data) =>
    set((state) => ({ tinnitus: { ...state.tinnitus, ...data } })),
  setMaskingParams: (params) => set({ maskingParams: params }),
  setIsCalculating: (value) => set({ isCalculating: value }),
  setAudioState: (state) =>
    set((prev) => ({ audioState: { ...prev.audioState, ...state } })),
  resetAll: () =>
    set({
      leftEar: createDefaultAudiogram(),
      rightEar: createDefaultAudiogram(),
      leftDynamicRange: [],
      rightDynamicRange: [],
      tinnitus: {
        frequency: 4000,
        loudness: 5,
        type: 'pure_tone',
        ear: 'bilateral',
      },
      maskingParams: null,
      isCalculating: false,
      audioState: {
        isPlaying: false,
        volume: 0.5,
        frequencyOffset: 0,
        bandwidthOffset: 0,
        levelOffset: 0,
        noiseType: null,
      },
    }),
}));
