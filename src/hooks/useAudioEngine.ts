import { useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { NoiseType, MaskingParameters, AudioState } from '../types';

interface EngineParams {
  centerFrequency: number;
  bandwidth: number;
  soundLevel: number;
  noiseType: NoiseType;
  notchFrequency?: number;
  volume: number;
}

interface AudioGraph {
  source: AudioBufferSourceNode;
  filters: BiquadFilterNode[];
  gain: GainNode;
  analyser: AnalyserNode;
}

const FREQUENCY_REBUILD_THRESHOLD = 200;
const BANDWIDTH_REBUILD_THRESHOLD = 300;
const CROSSFADE_DURATION = 0.05;

const resolveEngineParams = (
  maskingParams: MaskingParameters | null,
  audioState: AudioState
): EngineParams | null => {
  if (!maskingParams) return null;
  return {
    centerFrequency: maskingParams.centerFrequency + audioState.frequencyOffset,
    bandwidth: Math.max(50, maskingParams.bandwidth + audioState.bandwidthOffset),
    soundLevel: maskingParams.soundLevel + audioState.levelOffset,
    noiseType: audioState.noiseType ?? maskingParams.noiseType,
    notchFrequency: maskingParams.notchFrequency,
    volume: audioState.volume,
  };
};

interface UseAudioEngineReturn {
  getAnalyser: () => AnalyserNode | null;
}

export const useAudioEngine = (): UseAudioEngineReturn => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeGraphRef = useRef<AudioGraph | null>(null);

  const lastParamsRef = useRef<EngineParams | null>(null);
  const lastIsPlayingRef = useRef(false);

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
    (ctx: AudioContext, params: EngineParams): AudioGraph => {
      const buffer = createNoiseBuffer(ctx, params.noiseType);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filters: BiquadFilterNode[] = [];
      let currentNode: AudioNode = source;

      const centerFreq = params.centerFrequency;
      const bw = params.bandwidth;

      if (params.noiseType === 'narrowband' || params.noiseType === 'notched') {
        const bpFilter = ctx.createBiquadFilter();
        bpFilter.type = 'bandpass';
        bpFilter.frequency.value = centerFreq;
        bpFilter.Q.value = bw > 0 ? centerFreq / (bw * 2) : 1;
        filters.push(bpFilter);
        currentNode.connect(bpFilter);
        currentNode = bpFilter;
      } else if (params.noiseType === 'pink' || params.noiseType === 'white' || params.noiseType === 'brown') {
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

      if (params.noiseType === 'notched' && params.notchFrequency) {
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
    (oldParams: EngineParams, newParams: EngineParams): boolean => {
      if (newParams.noiseType !== oldParams.noiseType) return true;
      if (newParams.notchFrequency !== oldParams.notchFrequency) return true;
      if (Math.abs(newParams.centerFrequency - oldParams.centerFrequency) > FREQUENCY_REBUILD_THRESHOLD) return true;
      if (Math.abs(newParams.bandwidth - oldParams.bandwidth) > BANDWIDTH_REBUILD_THRESHOLD) return true;
      return false;
    },
    []
  );

  const disposeGraph = useCallback((graph: AudioGraph, ctx: AudioContext) => {
    const now = ctx.currentTime;
    try {
      graph.gain.gain.cancelScheduledValues(now);
      graph.gain.gain.setValueAtTime(graph.gain.gain.value, now);
      graph.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_DURATION);
    } catch {
      // ignore
    }
    const source = graph.source;
    const gainNode = graph.gain;
    const analyser = graph.analyser;
    const filters = graph.filters;
    setTimeout(() => {
      try { source.stop(); } catch { /* ignore */ }
      source.disconnect();
      filters.forEach((f) => f.disconnect());
      gainNode.disconnect();
      analyser.disconnect();
    }, (CROSSFADE_DURATION + 0.02) * 1000);
  }, []);

  const rebuildWithCrossfade = useCallback((ctx: AudioContext, params: EngineParams) => {
    const now = ctx.currentTime;
    const oldGraph = activeGraphRef.current;
    const newGraph = buildGraph(ctx, params);

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
      const src = oldGraph.source;
      const gn = oldGraph.gain;
      const an = oldGraph.analyser;
      const fs = oldGraph.filters;
      setTimeout(() => {
        try { src.stop(); } catch { /* ignore */ }
        src.disconnect();
        fs.forEach((f) => f.disconnect());
        gn.disconnect();
        an.disconnect();
      }, (CROSSFADE_DURATION + 0.02) * 1000);
    }
  }, [buildGraph]);

  const updateFilterParamsSmoothly = useCallback((ctx: AudioContext, params: EngineParams) => {
    const graph = activeGraphRef.current;
    if (!graph) return;

    const time = ctx.currentTime;

    const levelMultiplier =
      Math.pow(10, params.soundLevel / 20) * params.volume * 0.3;
    graph.gain.gain.setTargetAtTime(levelMultiplier, time, CROSSFADE_DURATION);

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
      if (filter.type === 'notch' && params.notchFrequency) {
        filter.frequency.setTargetAtTime(
          params.notchFrequency,
          time,
          CROSSFADE_DURATION
        );
      }
    });
  }, []);

  const applyState = useCallback(() => {
    const state = useAppStore.getState();
    const newParams = resolveEngineParams(state.maskingParams, state.audioState);
    const newIsPlaying = state.audioState.isPlaying;

    const lastParams = lastParamsRef.current;
    const lastIsPlaying = lastIsPlayingRef.current;

    // Case 1: 没有 maskingParams，停止播放并清理
    if (!newParams) {
      if (lastIsPlaying && activeGraphRef.current && audioContextRef.current) {
        disposeGraph(activeGraphRef.current, audioContextRef.current);
      }
      activeGraphRef.current = null;
      lastParamsRef.current = null;
      lastIsPlayingRef.current = false;
      return;
    }

    // Case 2: 从停止变为播放
    if (!lastIsPlaying && newIsPlaying) {
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      const graph = buildGraph(ctx, newParams);
      graph.source.start();
      activeGraphRef.current = graph;
      lastParamsRef.current = newParams;
      lastIsPlayingRef.current = true;
      return;
    }

    // Case 3: 从播放变为停止
    if (lastIsPlaying && !newIsPlaying) {
      if (activeGraphRef.current && audioContextRef.current) {
        disposeGraph(activeGraphRef.current, audioContextRef.current);
      }
      activeGraphRef.current = null;
      lastParamsRef.current = newParams;
      lastIsPlayingRef.current = false;
      return;
    }

    // Case 4: 正在播放，参数更新
    if (lastIsPlaying && newIsPlaying && lastParams) {
      if (needsRebuild(lastParams, newParams)) {
        const ctx = initAudioContext();
        rebuildWithCrossfade(ctx, newParams);
      } else {
        const ctx = audioContextRef.current;
        if (ctx) updateFilterParamsSmoothly(ctx, newParams);
      }
      lastParamsRef.current = newParams;
      return;
    }

    // Case 5: 未播放，参数更新（只记录，不建图）
    if (!lastIsPlaying && !newIsPlaying) {
      lastParamsRef.current = newParams;
      return;
    }
  }, [initAudioContext, buildGraph, needsRebuild, rebuildWithCrossfade, updateFilterParamsSmoothly, disposeGraph]);

  useEffect(() => {
    applyState();
    const unsubscribe = useAppStore.subscribe(applyState);
    return () => {
      unsubscribe();
      const ctx = audioContextRef.current;
      const graph = activeGraphRef.current;
      if (graph && ctx) {
        const now = ctx.currentTime;
        try {
          graph.gain.gain.cancelScheduledValues(now);
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
  }, [applyState]);

  const getAnalyser = useCallback(
    () => activeGraphRef.current?.analyser ?? null,
    []
  );

  return { getAnalyser };
};
