import type { FrequencyPoint, DynamicRangePoint } from '../types';

const STANDARD_FREQUENCIES = [125, 250, 500, 1000, 2000, 4000, 8000];

const getUncomfortableLevel = (threshold: number, frequency: number): number => {
  let baseUCL = 100;
  
  if (frequency >= 4000) {
    baseUCL = threshold + Math.max(50, 90 - threshold * 0.3);
  } else if (frequency >= 2000) {
    baseUCL = threshold + Math.max(55, 95 - threshold * 0.2);
  } else {
    baseUCL = threshold + Math.max(60, 100 - threshold * 0.15);
  }
  
  baseUCL = Math.min(baseUCL, 120);
  baseUCL = Math.max(baseUCL, threshold + 30);
  
  return Math.round(baseUCL);
};

const interpolateThreshold = (
  points: FrequencyPoint[],
  targetFreq: number
): number => {
  const sorted = [...points].sort((a, b) => a.frequency - b.frequency);
  
  if (sorted.length === 0) return 25;
  
  if (targetFreq <= sorted[0].frequency) return sorted[0].threshold;
  if (targetFreq >= sorted[sorted.length - 1].frequency) return sorted[sorted.length - 1].threshold;
  
  for (let i = 0; i < sorted.length - 1; i++) {
    if (targetFreq >= sorted[i].frequency && targetFreq <= sorted[i + 1].frequency) {
      const freqRatio = 
        (Math.log10(targetFreq) - Math.log10(sorted[i].frequency)) /
        (Math.log10(sorted[i + 1].frequency) - Math.log10(sorted[i].frequency));
      return Math.round(
        sorted[i].threshold + freqRatio * (sorted[i + 1].threshold - sorted[i].threshold)
      );
    }
  }
  
  return 25;
};

export const calculateDynamicRange = (
  earData: FrequencyPoint[]
): DynamicRangePoint[] => {
  const result: DynamicRangePoint[] = [];
  
  for (const freq of STANDARD_FREQUENCIES) {
    const threshold = interpolateThreshold(earData, freq);
    const uncomfortableLevel = getUncomfortableLevel(threshold, freq);
    const dynamicRange = uncomfortableLevel - threshold;
    
    result.push({
      frequency: freq,
      threshold,
      uncomfortableLevel,
      dynamicRange,
    });
  }
  
  const customFreqs = earData
    .map(p => p.frequency)
    .filter(f => !STANDARD_FREQUENCIES.includes(f));
  
  for (const freq of customFreqs) {
    const point = earData.find(p => p.frequency === freq);
    if (point) {
      const threshold = point.threshold;
      const uncomfortableLevel = getUncomfortableLevel(threshold, freq);
      result.push({
        frequency: freq,
        threshold,
        uncomfortableLevel,
        dynamicRange: uncomfortableLevel - threshold,
      });
    }
  }
  
  return result.sort((a, b) => a.frequency - b.frequency);
};

export const getThresholdAtFrequency = (
  earData: FrequencyPoint[],
  frequency: number
): number => {
  return interpolateThreshold(earData, frequency);
};

export const getAverageThreshold = (
  earData: FrequencyPoint[],
  lowFreq: number,
  highFreq: number
): number => {
  const relevant = earData.filter(
    p => p.frequency >= lowFreq && p.frequency <= highFreq
  );
  
  if (relevant.length === 0) {
    return interpolateThreshold(earData, (lowFreq + highFreq) / 2);
  }
  
  const sum = relevant.reduce((acc, p) => acc + p.threshold, 0);
  return Math.round(sum / relevant.length);
};
