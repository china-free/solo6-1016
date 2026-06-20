import type {
  FrequencyPoint,
  TinnitusInfo,
  MaskingParametersResponse,
  NoiseType,
  CriticalBand,
  DynamicRangePoint,
} from '../types';
import { calculateDynamicRange, getThresholdAtFrequency, getAverageThreshold } from './audiogramService';

const CRITICAL_BANDS: CriticalBand[] = [
  { centerFrequency: 50, lowerFrequency: 0, upperFrequency: 100, bandwidth: 100, index: 1 },
  { centerFrequency: 150, lowerFrequency: 100, upperFrequency: 200, bandwidth: 100, index: 2 },
  { centerFrequency: 250, lowerFrequency: 200, upperFrequency: 300, bandwidth: 100, index: 3 },
  { centerFrequency: 350, lowerFrequency: 300, upperFrequency: 400, bandwidth: 100, index: 4 },
  { centerFrequency: 450, lowerFrequency: 400, upperFrequency: 510, bandwidth: 110, index: 5 },
  { centerFrequency: 570, lowerFrequency: 510, upperFrequency: 630, bandwidth: 120, index: 6 },
  { centerFrequency: 700, lowerFrequency: 630, upperFrequency: 770, bandwidth: 140, index: 7 },
  { centerFrequency: 840, lowerFrequency: 770, upperFrequency: 920, bandwidth: 150, index: 8 },
  { centerFrequency: 1000, lowerFrequency: 920, upperFrequency: 1080, bandwidth: 160, index: 9 },
  { centerFrequency: 1170, lowerFrequency: 1080, upperFrequency: 1270, bandwidth: 190, index: 10 },
  { centerFrequency: 1370, lowerFrequency: 1270, upperFrequency: 1480, bandwidth: 210, index: 11 },
  { centerFrequency: 1600, lowerFrequency: 1480, upperFrequency: 1720, bandwidth: 240, index: 12 },
  { centerFrequency: 1850, lowerFrequency: 1720, upperFrequency: 2000, bandwidth: 280, index: 13 },
  { centerFrequency: 2150, lowerFrequency: 2000, upperFrequency: 2320, bandwidth: 320, index: 14 },
  { centerFrequency: 2500, lowerFrequency: 2320, upperFrequency: 2700, bandwidth: 380, index: 15 },
  { centerFrequency: 2900, lowerFrequency: 2700, upperFrequency: 3150, bandwidth: 450, index: 16 },
  { centerFrequency: 3400, lowerFrequency: 3150, upperFrequency: 3700, bandwidth: 550, index: 17 },
  { centerFrequency: 4000, lowerFrequency: 3700, upperFrequency: 4400, bandwidth: 700, index: 18 },
  { centerFrequency: 4800, lowerFrequency: 4400, upperFrequency: 5300, bandwidth: 900, index: 19 },
  { centerFrequency: 5800, lowerFrequency: 5300, upperFrequency: 6400, bandwidth: 1100, index: 20 },
  { centerFrequency: 7000, lowerFrequency: 6400, upperFrequency: 7700, bandwidth: 1300, index: 21 },
  { centerFrequency: 8500, lowerFrequency: 7700, upperFrequency: 9500, bandwidth: 1800, index: 22 },
  { centerFrequency: 10500, lowerFrequency: 9500, upperFrequency: 12000, bandwidth: 2500, index: 23 },
  { centerFrequency: 13500, lowerFrequency: 12000, upperFrequency: 15500, bandwidth: 3500, index: 24 },
];

const findCriticalBand = (frequency: number): CriticalBand => {
  for (const band of CRITICAL_BANDS) {
    if (frequency >= band.lowerFrequency && frequency < band.upperFrequency) {
      return band;
    }
  }
  return CRITICAL_BANDS[CRITICAL_BANDS.length - 1];
};

const getAdjacentBands = (centerBand: CriticalBand, count: number): CriticalBand[] => {
  const index = centerBand.index - 1;
  const bands: CriticalBand[] = [];
  
  for (let i = Math.max(0, index - count); i <= Math.min(CRITICAL_BANDS.length - 1, index + count); i++) {
    bands.push(CRITICAL_BANDS[i]);
  }
  
  return bands;
};

const calculateSpreadOfMasking = (
  maskerFrequency: number,
  maskerLevel: number,
  targetFrequency: number
): number => {
  const deltaFreq = targetFrequency - maskerFrequency;
  const deltaBark = freqToBark(targetFrequency) - freqToBark(maskerFrequency);
  
  let maskingEffect: number;
  
  if (deltaBark >= 0) {
    maskingEffect = maskerLevel - (27 + 0.37 * Math.max(0, maskerLevel - 40)) * deltaBark;
  } else {
    maskingEffect = maskerLevel + deltaBark * (24 + 0.23 * maskerLevel / Math.max(1, freqToBark(maskerFrequency))) - 0.2 * deltaBark * deltaBark;
  }
  
  return Math.max(-20, maskingEffect);
};

const freqToBark = (freq: number): number => {
  return 13 * Math.atan(0.00076 * freq) + 3.5 * Math.atan(freq / 7500);
};

const determineNoiseType = (
  tinnitus: TinnitusInfo,
  hearingLossPattern: string
): NoiseType => {
  if (tinnitus.type === 'pure_tone') {
    if (hearingLossPattern === 'high_frequency') {
      return 'notched';
    }
    return 'narrowband';
  } else if (tinnitus.type === 'narrowband') {
    return 'pink';
  } else {
    return 'white';
  }
};

const analyzeHearingLossPattern = (audiogram: FrequencyPoint[]): string => {
  const lowFreqAvg = getAverageThreshold(audiogram, 125, 500);
  const highFreqAvg = getAverageThreshold(audiogram, 2000, 8000);
  
  if (highFreqAvg - lowFreqAvg >= 20) {
    return 'high_frequency';
  } else if (lowFreqAvg - highFreqAvg >= 20) {
    return 'low_frequency';
  } else if (lowFreqAvg > 50 && highFreqAvg > 50) {
    return 'flat';
  }
  return 'normal_or_mild';
};

const selectEarData = (
  leftEar: FrequencyPoint[],
  rightEar: FrequencyPoint[],
  ear: string
): FrequencyPoint[] => {
  if (ear === 'left') return leftEar;
  if (ear === 'right') return rightEar;
  
  const leftAvg = getAverageThreshold(leftEar, 125, 8000);
  const rightAvg = getAverageThreshold(rightEar, 125, 8000);
  return leftAvg >= rightAvg ? leftEar : rightEar;
};

export const calculateMaskingParameters = (
  audiogram: { leftEar: FrequencyPoint[]; rightEar: FrequencyPoint[] },
  tinnitus: TinnitusInfo
): MaskingParametersResponse => {
  const earData = selectEarData(audiogram.leftEar, audiogram.rightEar, tinnitus.ear);
  const dynamicRange = calculateDynamicRange(earData);
  
  const tinnitusBand = findCriticalBand(tinnitus.frequency);
  
  const tinnitusThreshold = getThresholdAtFrequency(earData, tinnitus.frequency);
  
  const tinnitusLoudnessInDB = tinnitusThreshold + (tinnitus.loudness / 10) * 40;
  
  const tinnitusDR = dynamicRange.find(
    d => Math.abs(d.frequency - tinnitus.frequency) < 1000
  ) || dynamicRange[Math.floor(dynamicRange.length / 2)];
  
  const bandsForMasking = tinnitus.type === 'pure_tone'
    ? [tinnitusBand]
    : tinnitus.type === 'narrowband'
    ? getAdjacentBands(tinnitusBand, 1)
    : getAdjacentBands(tinnitusBand, 3);
  
  let centerFrequency: number;
  let bandwidth: number;
  
  if (tinnitus.type === 'pure_tone') {
    centerFrequency = tinnitus.frequency;
    bandwidth = tinnitusBand.bandwidth;
  } else {
    const minFreq = Math.min(...bandsForMasking.map(b => b.lowerFrequency));
    const maxFreq = Math.max(...bandsForMasking.map(b => b.upperFrequency));
    centerFrequency = Math.round((minFreq + maxFreq) / 2);
    bandwidth = Math.round((maxFreq - minFreq) / 2);
  }
  
  const centerThreshold = getThresholdAtFrequency(earData, centerFrequency);
  
  let baseMaskingLevel: number;
  
  if (tinnitus.type === 'pure_tone') {
    const maskingAtTinnitus = calculateSpreadOfMasking(
      centerFrequency,
      centerThreshold + 20,
      tinnitus.frequency
    );
    const effectiveLevel = maskingAtTinnitus;
    const requiredOvermask = Math.max(10, tinnitus.loudness * 1.5);
    baseMaskingLevel = centerThreshold + Math.max(15, tinnitusLoudnessInDB - effectiveLevel + requiredOvermask - centerThreshold);
  } else {
    const requiredOvermask = Math.max(10, tinnitus.loudness * 2);
    baseMaskingLevel = centerThreshold + Math.max(15, tinnitusLoudnessInDB - centerThreshold + requiredOvermask);
  }
  
  const safeMaxLevel = tinnitusDR.uncomfortableLevel - 15;
  const soundLevel = Math.round(Math.min(baseMaskingLevel, safeMaxLevel) - centerThreshold);
  
  const hearingLossPattern = analyzeHearingLossPattern(earData);
  const noiseType = determineNoiseType(tinnitus, hearingLossPattern);
  
  let notchFrequency: number | undefined;
  if (noiseType === 'notched') {
    notchFrequency = tinnitus.frequency;
  }
  
  let recommendedDuration: number;
  if (tinnitus.loudness <= 3) {
    recommendedDuration = 15;
  } else if (tinnitus.loudness <= 6) {
    recommendedDuration = 30;
  } else {
    recommendedDuration = 60;
  }
  
  const explanation = generateExplanation(
    tinnitus,
    centerFrequency,
    bandwidth,
    soundLevel,
    noiseType,
    hearingLossPattern
  );
  
  return {
    centerFrequency,
    bandwidth,
    soundLevel,
    noiseType: noiseType as NoiseType,
    notchFrequency,
    recommendedDuration,
    explanation,
  };
};

const generateExplanation = (
  tinnitus: TinnitusInfo,
  centerFreq: number,
  bandwidth: number,
  soundLevel: number,
  noiseType: string,
  hearingPattern: string
): string => {
  const parts: string[] = [];
  
  const tinnitusTypeText: Record<string, string> = {
    pure_tone: '纯音型',
    narrowband: '窄带噪声型',
    broadband: '宽带噪声型',
  };
  
  parts.push(`针对${tinnitus.frequency}Hz的${tinnitusTypeText[tinnitus.type]}耳鸣`);
  
  if (hearingPattern === 'high_frequency') {
    parts.push('检测到高频听力下降特征');
  } else if (hearingPattern === 'low_frequency') {
    parts.push('检测到低频听力下降特征');
  } else if (hearingPattern === 'flat') {
    parts.push('检测到平坦型听力损失');
  }
  
  const noiseTypeText: Record<string, string> = {
    white: '白噪声',
    pink: '粉红噪声',
    brown: '棕色噪声',
    notched: '陷波音乐(频谱修正)',
    narrowband: '窄带噪声',
  };
  parts.push(`推荐使用${noiseTypeText[noiseType] || '定制噪声'}进行掩蔽`);
  
  parts.push(`中心频率设为${centerFreq}Hz，带宽±${bandwidth}Hz`);
  parts.push(`声级设置为${soundLevel}dB SL（感觉级），确保掩蔽效果同时避免听觉疲劳`);
  
  if (soundLevel > 40) {
    parts.push('注意：声级较高，建议分多次使用并适当休息');
  }
  
  return parts.join('；') + '。';
};
