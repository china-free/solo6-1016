import { useRef, useCallback, useEffect } from 'react';
import type { NoiseType } from '../types';

interface UseAudioEngineOptions {
  centerFrequency: number;
  bandwidth: number;
  soundLevel: number;
  noiseType: NoiseType;
  notchFrequency?: number;
  volume: number;
}

interface UseAudioEngineReturn {
  start: () => void;
  stop: () => void;
  updateParams: (params: Partial<UseAudioEngineOptions>) => void;
  getAnalyser: () => AnalyserNode | null;
}

export const useAudioEngine = (
  initialParams: UseAudioEngineOptions
): UseAudioEngineReturn => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const filterNodesRef = useRef<BiquadFilterNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const isPlayingRef = useRef(false);
  const paramsRef = useRef(initialParams);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const createNoiseBuffer = useCallback(
    (ctx: AudioContext, type: NoiseType): AudioBuffer => {
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const channel0 = buffer.getChannelData(0);
      const channel1 = buffer.getChannelData(1);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      let c0 = 0, c1 = 0, c2 = 0, c3 = 0, c4 = 0, c5 = 0, c6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;

        if (type === 'white' || type === 'narrowband') {
          channel0[i] = white;
          channel1[i] = white;
        } else if (type === 'pink') {
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          let pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          b6 = white * 0.115926;
          pink *= 0.11;
          channel0[i] = pink;
          channel1[i] = pink;
        } else if (type === 'brown' || type === 'notched') {
          white = (Math.random() * 2 - 1) * 3.5;
          const lastOut0 = channel0[i - 1] || 0;
          const lastOut1 = channel1[i - 1] || 0;
          channel0[i] = (lastOut0 + 0.02 * white) / 1.02;
          channel1[i] = (lastOut1 + 0.02 * white) / 1.02;
          channel0[i] *= 3.5;
          channel1[i] *= 3.5;
          void c0; void c1; void c2; void c3; void c4; void c5; void c6;
        }
      }

      return buffer;
    },
    []
  );

  const buildAudioGraph = useCallback(() => {
    const ctx = initAudioContext();
    const params = paramsRef.current;

    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }
    filterNodesRef.current.forEach((f) => f.disconnect());
    filterNodesRef.current = [];
    if (gainNodeRef.current) gainNodeRef.current.disconnect();
    if (analyserRef.current) analyserRef.current.disconnect();

    const noiseType: NoiseType = params.noiseType === 'notched' ? 'notched' : params.noiseType;
    noiseBufferRef.current = createNoiseBuffer(ctx, noiseType);

    const source = ctx.createBufferSource();
    source.buffer = noiseBufferRef.current;
    source.loop = true;
    sourceNodeRef.current = source;

    let currentNode: AudioNode = source;

    const centerFreq = params.centerFrequency;
    const bw = params.bandwidth;

    if (params.noiseType === 'narrowband' || params.noiseType === 'notched') {
      const bpFilter = ctx.createBiquadFilter();
      bpFilter.type = 'bandpass';
      bpFilter.frequency.value = centerFreq;
      bpFilter.Q.value = centerFreq / (bw * 2);
      filterNodesRef.current.push(bpFilter);
      currentNode.connect(bpFilter);
      currentNode = bpFilter;
    } else if (params.noiseType === 'pink' || params.noiseType === 'white' || params.noiseType === 'brown') {
      const hpFilter = ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.value = Math.max(50, centerFreq - bw * 2);
      hpFilter.Q.value = 0.707;
      filterNodesRef.current.push(hpFilter);
      currentNode.connect(hpFilter);
      currentNode = hpFilter;

      const lpFilter = ctx.createBiquadFilter();
      lpFilter.type = 'lowpass';
      lpFilter.frequency.value = Math.min(20000, centerFreq + bw * 2);
      lpFilter.Q.value = 0.707;
      filterNodesRef.current.push(lpFilter);
      currentNode.connect(lpFilter);
      currentNode = lpFilter;
    }

    if (params.noiseType === 'notched' && params.notchFrequency) {
      const notchFilter = ctx.createBiquadFilter();
      notchFilter.type = 'notch';
      notchFilter.frequency.value = params.notchFrequency;
      notchFilter.Q.value = 5;
      filterNodesRef.current.push(notchFilter);
      currentNode.connect(notchFilter);
      currentNode = notchFilter;
    }

    const gainNode = ctx.createGain();
    const levelMultiplier = Math.pow(10, params.soundLevel / 20) * params.volume * 0.3;
    gainNode.gain.value = levelMultiplier;
    gainNodeRef.current = gainNode;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    currentNode.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(ctx.destination);
  }, [initAudioContext, createNoiseBuffer]);

  const start = useCallback(() => {
    const ctx = initAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    buildAudioGraph();

    if (sourceNodeRef.current) {
      sourceNodeRef.current.start();
      isPlayingRef.current = true;
    }
  }, [initAudioContext, buildAudioGraph]);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    isPlayingRef.current = false;
  }, []);

  const updateParams = useCallback(
    (newParams: Partial<UseAudioEngineOptions>) => {
      paramsRef.current = { ...paramsRef.current, ...newParams };

      if (isPlayingRef.current) {
        if (gainNodeRef.current && audioContextRef.current) {
          const params = paramsRef.current;
          const levelMultiplier = Math.pow(10, params.soundLevel / 20) * params.volume * 0.3;
          gainNodeRef.current.gain.setTargetAtTime(
            levelMultiplier,
            audioContextRef.current.currentTime,
            0.05
          );
        }

        if (
          (newParams.centerFrequency !== undefined ||
            newParams.bandwidth !== undefined ||
            newParams.noiseType !== undefined ||
            newParams.notchFrequency !== undefined) &&
          audioContextRef.current
        ) {
          const time = audioContextRef.current.currentTime;
          filterNodesRef.current.forEach((filter) => {
            if (filter.type === 'bandpass' && paramsRef.current.bandwidth > 0) {
              filter.frequency.setTargetAtTime(paramsRef.current.centerFrequency, time, 0.05);
              filter.Q.setTargetAtTime(
                paramsRef.current.centerFrequency / (paramsRef.current.bandwidth * 2),
                time,
                0.05
              );
            }
            if (filter.type === 'notch' && paramsRef.current.notchFrequency) {
              filter.frequency.setTargetAtTime(paramsRef.current.notchFrequency, time, 0.05);
            }
          });
        }
      }
    },
    []
  );

  const getAnalyser = useCallback(() => analyserRef.current, []);

  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stop]);

  return { start, stop, updateParams, getAnalyser };
};
