import { useAppStore } from '../store/useAppStore';
import { STANDARD_FREQUENCIES } from '../types';
import { Volume2 } from 'lucide-react';

interface EarSectionProps {
  side: 'left' | 'right';
  title: string;
  accentColor: string;
}

const EarSection = ({ side, title, accentColor }: EarSectionProps) => {
  const earData = side === 'left' ? useAppStore((s) => s.leftEar) : useAppStore((s) => s.rightEar);
  const drData = side === 'left' ? useAppStore((s) => s.leftDynamicRange) : useAppStore((s) => s.rightDynamicRange);
  const setThreshold = useAppStore((s) => s.setThreshold);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${accentColor}`} />
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>

      {STANDARD_FREQUENCIES.map((freq) => {
        const point = earData.find((p) => p.frequency === freq);
        const dr = drData.find((d) => d.frequency === freq);
        const threshold = point?.threshold ?? 25;

        const severity =
          threshold <= 25 ? 'bg-emerald-500' :
          threshold <= 40 ? 'bg-yellow-500' :
          threshold <= 70 ? 'bg-orange-500' : 'bg-red-500';

        return (
          <div key={freq} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono w-12">
                {freq >= 1000 ? `${freq / 1000}kHz` : `${freq}Hz`}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={-10}
                  max={120}
                  value={threshold}
                  onChange={(e) =>
                    setThreshold(side, freq, Math.max(-10, Math.min(120, Number(e.target.value) || 0)))
                  }
                  className="w-14 px-2 py-1 text-xs font-mono text-right bg-slate-800 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-teal-500"
                />
                <span className="text-slate-500 text-xs">dB</span>
              </div>
            </div>

            <div className="relative">
              <input
                type="range"
                min={-10}
                max={120}
                step={5}
                value={threshold}
                onChange={(e) => setThreshold(side, freq, Number(e.target.value))}
                className="w-full h-1.5 appearance-none bg-slate-700 rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #0f766e 0%, #0f766e ${(threshold + 10) / 130 * 100}%, #334155 ${(threshold + 10) / 130 * 100}%, #334155 100%)`,
                }}
              />
            </div>

            {dr && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${severity} opacity-70`}
                    style={{
                      marginLeft: `${(dr.threshold + 10) / 130 * 100}%`,
                      width: `${Math.max(2, (dr.dynamicRange) / 130 * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono w-14 text-right">
                  DR {dr.dynamicRange}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const AudiogramInput = () => {
  const setLeftDynamicRange = useAppStore((s) => s.setLeftDynamicRange);
  const setRightDynamicRange = useAppStore((s) => s.setRightDynamicRange);
  const leftEar = useAppStore((s) => s.leftEar);
  const rightEar = useAppStore((s) => s.rightEar);

  const handleCalculateDR = async () => {
    try {
      const { fetchDynamicRange: fetchDR } = await import('../hooks/useMaskingAPI');
      const result = await fetchDR(leftEar, rightEar);
      setLeftDynamicRange(result.leftEar);
      setRightDynamicRange(result.rightEar);
    } catch (err) {
      console.error('Failed to calculate DR:', err);
    }
  };

  return (
    <div className="p-5 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-teal-400" />
          <h2 className="text-base font-bold text-white">听力图输入</h2>
        </div>
        <button
          onClick={handleCalculateDR}
          className="px-3 py-1.5 text-xs font-medium bg-teal-600/80 hover:bg-teal-500 text-white rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/20"
        >
          计算动态范围
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EarSection side="left" title="左耳 (Left Ear)" accentColor="bg-blue-500" />
        <EarSection side="right" title="右耳 (Right Ear)" accentColor="bg-red-500" />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded bg-emerald-500" />
            <span className="text-slate-400">正常 (≤25dB)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded bg-yellow-500" />
            <span className="text-slate-400">轻度 (26-40dB)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded bg-orange-500" />
            <span className="text-slate-400">中度 (41-70dB)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded bg-red-500" />
            <span className="text-slate-400">重度 ({'>'}70dB)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
