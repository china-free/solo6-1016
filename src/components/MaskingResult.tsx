import { useAppStore } from '../store/useAppStore';
import { Target, Clock, Radio, AlertCircle, Info } from 'lucide-react';

const NOISE_TYPE_LABELS: Record<string, string> = {
  white: '白噪声',
  pink: '粉红噪声',
  brown: '棕色噪声',
  notched: '陷波音乐',
  narrowband: '窄带噪声',
};

export const MaskingResult = () => {
  const params = useAppStore((s) => s.maskingParams);
  const audioState = useAppStore((s) => s.audioState);
  const isCalculating = useAppStore((s) => s.isCalculating);

  if (isCalculating) {
    return (
      <div className="p-5 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 min-h-[320px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 animate-pulse flex items-center justify-center">
            <Radio className="w-6 h-6 text-white animate-spin" />
          </div>
          <p className="text-slate-400 text-sm">正在分析心理声学模型...</p>
          <p className="text-slate-500 text-xs mt-1">基于临界频带与掩蔽扩散效应计算</p>
        </div>
      </div>
    );
  }

  if (!params) {
    return (
      <div className="p-5 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 min-h-[320px] flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <Target className="w-7 h-7 text-slate-500" />
          </div>
          <p className="text-slate-300 text-sm font-medium mb-1">等待计算</p>
          <p className="text-slate-500 text-xs leading-relaxed">
            请完成听力图输入和耳鸣特征描述后，点击"生成治疗方案"按钮
          </p>
        </div>
      </div>
    );
  }

  const displayFreq = params.centerFrequency + audioState.frequencyOffset;
  const displayBW = params.bandwidth + audioState.bandwidthOffset;
  const displayLevel = params.soundLevel + audioState.levelOffset;

  return (
    <div className="p-5 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50">
      <div className="flex items-center gap-2 mb-5">
        <Target className="w-5 h-5 text-cyan-400" />
        <h2 className="text-base font-bold text-white">最佳掩蔽参数</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-blue-500/30">
          <div className="text-[11px] text-blue-300/80 uppercase tracking-wider mb-1">
            中心频率
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white font-mono">
              {displayFreq.toLocaleString()}
            </span>
            <span className="text-sm text-blue-300">Hz</span>
          </div>
          {audioState.frequencyOffset !== 0 && (
            <div className={`text-[10px] mt-1 ${audioState.frequencyOffset > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
              偏移: {audioState.frequencyOffset > 0 ? '+' : ''}{audioState.frequencyOffset} Hz
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/15 to-purple-600/5 border border-purple-500/30">
          <div className="text-[11px] text-purple-300/80 uppercase tracking-wider mb-1">
            带宽 (半)
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white font-mono">
              ±{displayBW.toLocaleString()}
            </span>
            <span className="text-sm text-purple-300">Hz</span>
          </div>
          {audioState.bandwidthOffset !== 0 && (
            <div className={`text-[10px] mt-1 ${audioState.bandwidthOffset > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
              偏移: {audioState.bandwidthOffset > 0 ? '+' : ''}{audioState.bandwidthOffset} Hz
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-teal-500/15 to-teal-600/5 border border-teal-500/30">
          <div className="text-[11px] text-teal-300/80 uppercase tracking-wider mb-1">
            掩蔽声级
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white font-mono">
              {displayLevel}
            </span>
            <span className="text-sm text-teal-300">dB SL</span>
          </div>
          {audioState.levelOffset !== 0 && (
            <div className={`text-[10px] mt-1 ${audioState.levelOffset > 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
              偏移: {audioState.levelOffset > 0 ? '+' : ''}{audioState.levelOffset} dB
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">噪声类型</div>
          <div className="text-base font-semibold text-amber-400 flex items-center gap-1.5">
            <Radio className="w-4 h-4" />
            {NOISE_TYPE_LABELS[params.noiseType] || params.noiseType}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            建议时长
          </div>
          <div className="text-base font-semibold text-emerald-400">
            每次 {params.recommendedDuration} 分钟
          </div>
        </div>
      </div>

      {params.notchFrequency && (
        <div className="p-3 mb-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
          <div className="text-[10px] text-orange-300 uppercase tracking-wider mb-1">
            陷波频率 (Notch)
          </div>
          <div className="text-lg font-semibold text-orange-400 font-mono">
            {params.notchFrequency.toLocaleString()} Hz
          </div>
        </div>
      )}

      <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-300 leading-relaxed">
            {params.explanation}
          </p>
        </div>
      </div>

      {displayLevel > 40 && (
        <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            注意：当前声级较高，建议分次使用，每次不超过30分钟，并注意听觉疲劳信号。
          </p>
        </div>
      )}
    </div>
  );
};
