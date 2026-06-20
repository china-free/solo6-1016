import { useAppStore } from '../store/useAppStore';
import { fetchDynamicRange, fetchMaskingParameters } from '../hooks/useMaskingAPI';
import { Waves, Activity, Sparkles, Loader2 } from 'lucide-react';

const TINNITUS_TYPES = [
  { value: 'pure_tone', label: '纯音', icon: '●', desc: '单一频率' },
  { value: 'narrowband', label: '窄带', icon: '∿', desc: '窄频带' },
  { value: 'broadband', label: '宽带', icon: '≋', desc: '宽频带' },
] as const;

const EAR_SIDES = [
  { value: 'left', label: '左耳' },
  { value: 'right', label: '右耳' },
  { value: 'bilateral', label: '双侧' },
] as const;

const FREQUENCY_OPTIONS = [
  125, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000, 12000,
];

const LOUDNESS_LABELS: Record<number, string> = {
  1: '极弱',
  3: '轻微',
  5: '中等',
  7: '明显',
  10: '强烈',
};

export const TinnitusConfig = () => {
  const tinnitus = useAppStore((s) => s.tinnitus);
  const setTinnitus = useAppStore((s) => s.setTinnitus);
  const setIsCalculating = useAppStore((s) => s.setIsCalculating);
  const setMaskingParams = useAppStore((s) => s.setMaskingParams);
  const setLeftDR = useAppStore((s) => s.setLeftDynamicRange);
  const setRightDR = useAppStore((s) => s.setRightDynamicRange);
  const leftEar = useAppStore((s) => s.leftEar);
  const rightEar = useAppStore((s) => s.rightEar);
  const isCalculating = useAppStore((s) => s.isCalculating);

  const handleCalculate = async () => {
    setIsCalculating(true);
    setMaskingParams(null);

    try {
      const dr = await fetchDynamicRange(leftEar, rightEar);
      setLeftDR(dr.leftEar);
      setRightDR(dr.rightEar);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const params = await fetchMaskingParameters(
        { leftEar, rightEar },
        tinnitus
      );
      setMaskingParams(params);
    } catch (err) {
      console.error('Calculation failed:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="p-5 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="w-5 h-5 text-orange-400" />
        <h2 className="text-base font-bold text-white">耳鸣特征描述</h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            耳鸣频率 (Hz)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {FREQUENCY_OPTIONS.map((freq) => (
              <button
                key={freq}
                onClick={() => setTinnitus({ frequency: freq })}
                className={`px-2.5 py-1.5 text-xs font-mono rounded-lg transition-all duration-200 ${
                  tinnitus.frequency === freq
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 scale-105'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {freq >= 1000 ? `${freq / 1000}K` : freq}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-slate-400">
              主观响度 (1-10)
            </label>
            <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
              {tinnitus.loudness} / 10 · {LOUDNESS_LABELS[tinnitus.loudness] || ''}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={tinnitus.loudness}
            onChange={(e) => setTinnitus({ loudness: Number(e.target.value) })}
            className="w-full h-2 appearance-none bg-slate-800 rounded-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f97316 0%, #f97316 ${(tinnitus.loudness - 1) / 9 * 100}%, #1e293b ${(tinnitus.loudness - 1) / 9 * 100}%, #1e293b 100%)`,
            }}
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-0.5">
            <span>轻微</span>
            <span>干扰</span>
            <span>难以忍受</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            耳鸣类型
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TINNITUS_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setTinnitus({ type: type.value })}
                className={`p-3 rounded-xl transition-all duration-200 text-center ${
                  tinnitus.type === type.value
                    ? 'bg-gradient-to-br from-teal-600/40 to-teal-500/20 border border-teal-500/50 shadow-lg shadow-teal-500/10'
                    : 'bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-600/50'
                }`}
              >
                <div className={`text-2xl mb-1 ${tinnitus.type === type.value ? 'text-teal-400' : 'text-slate-400'}`}>
                  {type.icon}
                </div>
                <div className={`text-sm font-medium ${tinnitus.type === type.value ? 'text-white' : 'text-slate-300'}`}>
                  {type.label}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {type.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            受累耳侧
          </label>
          <div className="grid grid-cols-3 gap-2">
            {EAR_SIDES.map((ear) => (
              <button
                key={ear.value}
                onClick={() => setTinnitus({ ear: ear.value })}
                className={`py-2 px-3 text-sm rounded-lg transition-all duration-200 ${
                  tinnitus.ear === ear.value
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {ear.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCalculate}
          disabled={isCalculating}
          className="w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 hover:from-teal-400 hover:via-cyan-400 hover:to-blue-400 transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/40 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCalculating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              正在计算掩蔽参数...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              生成治疗方案
            </>
          )}
        </button>
      </div>
    </div>
  );
};
