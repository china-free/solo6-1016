import { useAppStore } from '../store/useAppStore';
import { useAudioEngine } from '../hooks/useAudioEngine';
import { WaveformVisualizer } from './WaveformVisualizer';
import { Play, Pause, Volume2, VolumeX, Radio, Disc3 } from 'lucide-react';
import type { NoiseType } from '../types';

const NOISE_TABS = [
  { value: 'white', label: '白噪声', color: 'from-slate-400 to-slate-500' },
  { value: 'pink', label: '粉红噪声', color: 'from-pink-400 to-rose-500' },
  { value: 'brown', label: '棕色噪声', color: 'from-amber-600 to-orange-700' },
  { value: 'narrowband', label: '窄带', color: 'from-teal-400 to-cyan-500' },
  { value: 'notched', label: '陷波', color: 'from-violet-400 to-purple-500' },
] as const;

export const AudioPlayer = () => {
  const maskingParams = useAppStore((s) => s.maskingParams);
  const audioState = useAppStore((s) => s.audioState);
  const setAudioState = useAppStore((s) => s.setAudioState);

  const { getAnalyser } = useAudioEngine();

  const currentNoiseType: NoiseType | null = audioState.noiseType
    ?? maskingParams?.noiseType
    ?? null;

  const handleTogglePlay = () => {
    setAudioState({ isPlaying: !audioState.isPlaying });
  };

  const handleNoiseTypeChange = (type: NoiseType) => {
    if (!maskingParams) return;
    setAudioState({
      noiseType: type === maskingParams.noiseType ? null : type,
    });
  };

  return (
    <div className="p-5 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50">
      <div className="flex items-center gap-2 mb-5">
        <Disc3 className={`w-5 h-5 text-emerald-400 ${audioState.isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
        <h2 className="text-base font-bold text-white">音频合成与试听</h2>
        {audioState.isPlaying && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            正在播放
          </span>
        )}
      </div>

      {!maskingParams ? (
        <div className="py-12 text-center">
          <Radio className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <p className="text-sm text-slate-400">请先生成掩蔽参数</p>
          <p className="text-xs text-slate-500 mt-1">完成耳鸣特征描述后即可试听</p>
        </div>
      ) : (
        <div className="space-y-4">
          <WaveformVisualizer getAnalyser={getAnalyser} isPlaying={audioState.isPlaying} />

          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePlay}
              className={`relative flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                audioState.isPlaying
                  ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-105'
                  : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105'
              }`}
            >
              {audioState.isPlaying ? (
                <Pause className="w-7 h-7 text-white" strokeWidth={2.5} />
              ) : (
                <Play className="w-7 h-7 text-white ml-1" strokeWidth={2.5} fill="currentColor" />
              )}
            </button>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  {audioState.volume < 0.01 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  音量
                </div>
                <span className="text-xs font-mono text-slate-300">
                  {Math.round(audioState.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={audioState.volume}
                onChange={(e) => setAudioState({ volume: Number(e.target.value) })}
                className="w-full h-1.5 appearance-none bg-slate-700 rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #10b981 0%, #10b981 ${audioState.volume * 100}%, #334155 ${audioState.volume * 100}%, #334155 100%)`,
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              噪声类型切换
            </label>
            <div className="flex flex-wrap gap-1.5">
              {NOISE_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleNoiseTypeChange(tab.value as NoiseType)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                    currentNoiseType === tab.value
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-md scale-105`
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
