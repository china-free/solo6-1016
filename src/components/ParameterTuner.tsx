import { useAppStore } from '../store/useAppStore';
import { Settings2, RotateCcw, Plus, Minus } from 'lucide-react';

interface TunerGroupProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
}

const TunerGroup = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  color,
  gradientFrom,
  gradientTo,
}: TunerGroupProps) => {
  const percentage = ((value - min) / (max - min)) * 100;

  const adjust = (delta: number) => {
    onChange(Math.max(min, Math.min(max, value + delta)));
  };

  return (
    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <span className={`text-sm font-mono font-bold ${color}`}>
          {value > 0 ? '+' : ''}{value} {unit}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => adjust(-step)}
          className="w-8 h-8 flex-shrink-0 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-all duration-150 active:scale-95"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="flex-1 relative">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 appearance-none bg-transparent cursor-pointer relative z-10"
            style={{
              WebkitAppearance: 'none',
            }}
          />
          <div
            className="absolute top-1/2 left-0 h-2 rounded-full -translate-y-1/2 pointer-events-none"
            style={{
              width: `${50 + percentage / 2}%`,
              left: value < 0 ? `${50 + percentage / 2}%` : '50%',
              background: value === 0
                ? 'transparent'
                : `linear-gradient(to right, ${gradientFrom}, ${gradientTo})`,
              transformOrigin: 'left',
              transform: value < 0
                ? `translate(${-(50 - (50 + percentage / 2)) * 2}px, -50%) scaleX(-1)`
                : 'translateY(-50%)',
            }}
          />
          <div className="absolute top-1/2 left-0 w-full h-2 bg-slate-700 rounded-full -translate-y-1/2 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 w-0.5 h-3 bg-slate-500 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div
            className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-y-1/2 z-20"
            style={{
              left: `calc(${percentage}% - 8px)`,
              background: value === 0 ? '#64748b' : `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
              boxShadow: value !== 0 ? `0 0 12px ${gradientFrom}80` : undefined,
            }}
          />
        </div>

        <button
          onClick={() => adjust(step)}
          className="w-8 h-8 flex-shrink-0 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-all duration-150 active:scale-95"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex justify-between mt-1.5 px-10 text-[10px] text-slate-600 font-mono">
        <span>{min}</span>
        <span>0</span>
        <span>+{max}</span>
      </div>
    </div>
  );
};

export const ParameterTuner = () => {
  const audioState = useAppStore((s) => s.audioState);
  const setAudioState = useAppStore((s) => s.setAudioState);
  const maskingParams = useAppStore((s) => s.maskingParams);

  const handleReset = () => {
    setAudioState({
      frequencyOffset: 0,
      bandwidthOffset: 0,
      levelOffset: 0,
    });
  };

  const hasOffset =
    audioState.frequencyOffset !== 0 ||
    audioState.bandwidthOffset !== 0 ||
    audioState.levelOffset !== 0;

  return (
    <div className="p-5 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-violet-400" />
          <h2 className="text-base font-bold text-white">参数微调</h2>
        </div>
        <button
          onClick={handleReset}
          disabled={!hasOffset || !maskingParams}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
            hasOffset && maskingParams
              ? 'bg-slate-700/80 hover:bg-slate-600 text-slate-300 hover:text-white'
              : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置
        </button>
      </div>

      {!maskingParams ? (
        <div className="py-8 text-center">
          <Settings2 className="w-10 h-10 mx-auto mb-2 text-slate-700" />
          <p className="text-sm text-slate-500">请先生成掩蔽参数</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          <TunerGroup
            label="频率微调"
            value={audioState.frequencyOffset}
            onChange={(v) => setAudioState({ frequencyOffset: v })}
            min={-500}
            max={500}
            step={25}
            unit="Hz"
            color="text-blue-400"
            gradientFrom="#3b82f6"
            gradientTo="#06b6d4"
          />

          <TunerGroup
            label="带宽微调"
            value={audioState.bandwidthOffset}
            onChange={(v) => setAudioState({ bandwidthOffset: v })}
            min={-1000}
            max={1000}
            step={50}
            unit="Hz"
            color="text-purple-400"
            gradientFrom="#a855f7"
            gradientTo="#ec4899"
          />

          <TunerGroup
            label="声级微调"
            value={audioState.levelOffset}
            onChange={(v) => setAudioState({ levelOffset: v })}
            min={-20}
            max={20}
            step={1}
            unit="dB"
            color="text-teal-400"
            gradientFrom="#14b8a6"
            gradientTo="#22c55e"
          />

          <div className="pt-2 mt-4 border-t border-slate-700/40">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <span className="text-slate-400">提示：</span>
              微调参数可帮助您找到最舒适的掩蔽效果。调整后音频会实时更新，建议每次小幅度调整后停留10-15秒感受效果变化。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
