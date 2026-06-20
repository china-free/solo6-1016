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

const FREQUENCY_REBUILD_THRESHOLD = 200;
const BANDWIDTH_REBUILD_THRESHOLD = 300;
const CROSSFADE_DURATION = 0.05;

export const useAudioEngine = (
  initialParams: UseAudioEngineOptions
): UseAudioEngineReturn => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const activeGraphRef = useRef<{
    source: AudioBufferSourceNode;
    filters: BiquadFilterNode[];
    gain: GainNode;
    analyser: AnalyserNode;
  } | null>(null);

  const paramsRef = useRef(initialParams);
  const isPlayingRef = useRef(false);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;

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
          const scaledWhite = white * 3.5;
          const lastOut0 = channel0[i - 1] || 0;
          const lastOut1 = channel1[i - 1] || 0;
          channel0[i] = ((lastOut0 + 0.02 * scaledWhite) / 1.02) * 3.5;
          channel1[i] = ((lastOut1 + 0.02 * scaledWhite) / 1.02) * 3.5;
        }
      }

      return buffer;
    },
    []
  );

  const buildGraph = useCallback(
    (ctx: AudioContext, params: UseAudioEngineOptions) => {
      const noiseType: NoiseType = params.noiseType;
      const buffer = createNoiseBuffer(ctx, noiseType);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filters: BiquadFilterNode[] = [];
      let currentNode: AudioNode = source;

      const centerFreq = params.centerFrequency;
      const bw = params.bandwidth;

      if (noiseType === 'narrowband' || noiseType === 'notched') {
        const bpFilter = ctx.createBiquadFilter();
        bpFilter.type = 'bandpass';
        bpFilter.frequency.value = centerFreq;
        bpFilter.Q.value = bw > 0 ? centerFreq / (bw * 2) : 1;
        filters.push(bpFilter);
        currentNode.connect(bpFilter);
        currentNode = bpFilter;
      } else if (noiseType === 'pink' || noiseType === 'white' || noiseType === 'brown') {
        const hpFilter = ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.value = Math.max(50, centerFreq - bw * 2);
        hpFilter.Q.value = 0.707;
        filters.push(hpFilter);
        currentNode.connect(hpFilter);
        currentNode = hpFilter;

        const lpFilter = ctx.createBiquadFilter();
        lpFilter.type = 'lowpass';
        lpFilter.frequency.value = Math.min(20000, centerFreq + bw * 2);
        lpFilter.Q.value = 0.707;
        filters.push(lpFilter);
        currentNode.connect(lpFilter);
        currentNode = lpFilter;
      }

      if (noiseType === 'notched' && params.notchFrequency) {
        const notchFilter = ctx.createBiquadFilter();
        notchFilter.type = 'notch';
        notchFilter.frequency.value = params.notchFrequency;
        notchFilter.Q.value = 5;
        filters.push(notchFilter);
        currentNode.connect(notchFilter);
        currentNode = notchFilter;
      }

      const gain = ctx.createGain();
      const levelMultiplier =
        Math.pow(10, params.soundLevel / 20) * params.volume * 0.3;
      gain.gain.value = levelMultiplier;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;

      currentNode.connect(gain);
      gain.connect(analyser);
      analyser.connect(ctx.destination);

      return { source, filters, gain, analyser };
    },
    [createNoiseBuffer]
  );

  const needsRebuild = useCallback(
    (
      oldParams: UseAudioEngineOptions,
      newParams: Partial<UseAudioEngineOptions>
    ): boolean => {
      if (newParams.noiseType !== undefined && newParams.noiseType !== oldParams.noiseType) {
        return true;
      }
      if (
        newParams.notchFrequency !== undefined &&
        newParams.notchFrequency !== oldParams.notchFrequency
      ) {
        return true;
      }
      if (
        newParams.centerFrequency !== undefined &&
        Math.abs(newParams.centerFrequency - oldParams.centerFrequency) >
          FREQUENCY_REBUILD_THRESHOLD
      ) {
        return true;
      }
      if (
        newParams.bandwidth !== undefined &&
        Math.abs(newParams.bandwidth - oldParams.bandwidth) >
          BANDWIDTH_REBUILD_THRESHOLD
      ) {
        return true;
      }
      return false;
    },
    []
  );

  const rebuildWithCrossfade = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;
    const oldGraph = activeGraphRef.current;
    const newGraph = buildGraph(ctx, paramsRef.current);

    if (oldGraph) {
      oldGraph.gain.gain.cancelScheduledValues(now);
      oldGraph.gain.gain.setValueAtTime(oldGraph.gain.gain.value, now);
      oldGraph.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_DURATION);
    }

    newGraph.gain.gain.setValueAtTime(0, now);
    newGraph.gain.gain.linearRampToValueAtTime(
      newGraph.gain.gain.value,
      now + CROSSFADE_DURATION
    );

    newGraph.source.start(now);
    activeGraphRef.current = newGraph;

    if (oldGraph) {
      const oldSource = oldGraph.source;
      const oldGain = oldGraph.gain;
      const oldAnalyser = oldGraph.analyser;
      const oldFilters = oldGraph.filters;

      setTimeout(() => {
        try {
          oldSource.stop();
        } catch {
          // ignore
        }
        oldSource.disconnect();
        oldFilters.forEach((f) => f.disconnect());
        oldGain.disconnect();
        oldAnalyser.disconnect();
      }, (CROSSFADE_DURATION + 0.02) * 1000);
    }
  }, [buildGraph]);

  const updateFilterParamsSmoothly = useCallback(
    (newParams: Partial<UseAudioEngineOptions>) => {
      const ctx = audioContextRef.current;
      const graph = activeGraphRef.current;
      if (!ctx || !graph) return;

      const time = ctx.currentTime;

      if (newParams.soundLevel !== undefined || newParams.volume !== undefined) {
        const params = paramsRef.current;
        const levelMultiplier =
          Math.pow(10, params.soundLevel / 20) * params.volume * 0.3;
        graph.gain.gain.setTargetAtTime(levelMultiplier, time, CROSSFADE_DURATION);
      }

      if (
        newParams.centerFrequency !== undefined ||
        newParams.bandwidth !== undefined
      ) {
        const params = paramsRef.current;
        graph.filters.forEach((filter) => {
          if (filter.type === 'bandpass' && params.bandwidth > 0) {
            filter.frequency.setTargetAtTime(
              params.centerFrequency,
              time,
              CROSSFADE_DURATION
            );
            filter.Q.setTargetAtTime(
              params.centerFrequency / (params.bandwidth * 2),
              time,
              CROSSFADE_DURATION
            );
          }
          if (filter.type === 'highpass') {
            filter.frequency.setTargetAtTime(
              Math.max(50, params.centerFrequency - params.bandwidth * 2),
              time,
              CROSSFADE_DURATION
            );
          }
          if (filter.type === 'lowpass') {
            filter.frequency.setTargetAtTime(
              Math.min(20000, params.centerFrequency + params.bandwidth * 2),
              time,
              CROSSFADE_DURATION
            );
          }
        });
      }

      if (newParams.notchFrequency !== undefined) {
        const params = paramsRef.current;
        graph.filters.forEach((filter) => {
          if (filter.type === 'notch' && params.notchFrequency) {
            filter.frequency.setTargetAtTime(
              params.notchFrequency,
              time,
              CROSSFADE_DURATION
            );
          }
        });
      }
    },
    []
  );

  const start = useCallback(() => {
    const ctx = initAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (isPlayingRef.current && activeGraphRef.current) {
      return;
    }

    const graph = buildGraph(ctx, paramsRef.current);
    graph.source.start();
    activeGraphRef.current = graph;
    isPlayingRef.current = true;
  }, [initAudioContext, buildGraph]);

  const stop = useCallback(() => {
    const ctx = audioContextRef.current;
    const graph = activeGraphRef.current;

    if (graph && ctx) {
      const now = ctx.currentTime;
      graph.gain.gain.cancelScheduledValues(now);
      graph.gain.gain.setValueAtTime(graph.gain.gain.value, now);
      graph.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_DURATION);

      const source = graph.source;
      const gain = graph.gain;
      const analyser = graph.analyser;
      const filters = graph.filters;

      setTimeout(() => {
        try {
          source.stop();
        } catch {
          // ignore
        }
        source.disconnect();
        filters.forEach((f) => f.disconnect());
        gain.disconnect();
        analyser.disconnect();
      }, (CROSSFADE_DURATION + 0.02) * 1000);
    }

    activeGraphRef.current = null;
    isPlayingRef.current = false;
  }, []);

  const updateParams = useCallback(
    (newParams: Partial<UseAudioEngineOptions>) => {
      const oldParams = { ...paramsRef.current };
      paramsRef.current = { ...oldParams, ...newParams };

      if (!isPlayingRef.current) return;

      if (needsRebuild(oldParams, newParams)) {
        rebuildWithCrossfade();
      } else {
        updateFilterParamsSmoothly(newParams);
      }
    },
    [needsRebuild, rebuildWithCrossfade, updateFilterParamsSmoothly]
  );

  const getAnalyser = useCallback(
    () => activeGraphRef.current?.analyser ?? null,
    []
  );

  useEffect(() => {
    return () => {
      const ctx = audioContextRef.current;
      const graph = activeGraphRef.current;

      if (graph && ctx) {
        const now = ctx.currentTime;
        graph.gain.gain.cancelScheduledValues(now);
        try {
          graph.gain.gain.setValueAtTime(graph.gain.gain.value, now);
          graph.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_DURATION);
        } catch {
          // ignore
        }
        try {
          graph.source.stop(now + CROSSFADE_DURATION + 0.02);
        } catch {
          // ignore
        }
      }

      setTimeout(() => {
        if (ctx) ctx.close().catch(() => undefined);
      }, (CROSSFADE_DURATION + 0.05) * 1000);
    };
  }, []);

  return { start, stop, updateParams, getAnalyser };
};
