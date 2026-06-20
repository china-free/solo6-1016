import { AudiogramInput } from '@/components/AudiogramInput';
import { AudiogramChart } from '@/components/AudiogramChart';
import { TinnitusConfig } from '@/components/TinnitusConfig';
import { MaskingResult } from '@/components/MaskingResult';
import { AudioPlayer } from '@/components/AudioPlayer';
import { ParameterTuner } from '@/components/ParameterTuner';
import { useAppStore } from '@/store/useAppStore';
import { Headphones, HeartPulse, Shield, Info } from 'lucide-react';

export default function Home() {
  const leftEar = useAppStore((s) => s.leftEar);
  const rightEar = useAppStore((s) => s.rightEar);
  const leftDR = useAppStore((s) => s.leftDynamicRange);
  const rightDR = useAppStore((s) => s.rightDynamicRange);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  <Headphones className="w-5.5 h-5.5 text-white" strokeWidth={2} />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">
                  听力学仿真平台
                </h1>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Audiology & Tinnitus Treatment Designer
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                心理声学模型驱动
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                实时音频合成
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10 border border-teal-500/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info className="w-4.5 h-4.5 text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1">
                使用流程
              </h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span>1️⃣ 输入左右耳听力阈值</span>
                <span className="text-slate-600">→</span>
                <span>2️⃣ 描述耳鸣特征</span>
                <span className="text-slate-600">→</span>
                <span>3️⃣ 生成治疗方案</span>
                <span className="text-slate-600">→</span>
                <span>4️⃣ 试听与微调</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4 space-y-6">
            <AudiogramInput />
          </div>

          <div className="xl:col-span-4 space-y-6">
            <div className="p-5 bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-5 h-5 text-blue-400"
                >
                  <path d="M3 3v18h18" />
                  <path d="M7 14l4-4 4 4 5-5" />
                </svg>
                <h2 className="text-base font-bold text-white">听力图可视化</h2>
              </div>
              <AudiogramChart
                leftEar={leftEar}
                rightEar={rightEar}
                leftDR={leftDR}
                rightDR={rightDR}
              />
              <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-800/50">
                  <div className="text-slate-400 mb-0.5">左耳 PTA</div>
                  <div className="text-slate-200 font-mono font-semibold">
                    {leftEar.length
                      ? Math.round(
                          leftEar
                            .filter((p) => [500, 1000, 2000].includes(p.frequency))
                            .reduce((a, p) => a + p.threshold, 0) /
                            Math.max(
                              1,
                              leftEar.filter((p) =>
                                [500, 1000, 2000].includes(p.frequency)
                              ).length
                            )
                        )
                      : 0}{' '}
                    dB
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-slate-800/50">
                  <div className="text-slate-400 mb-0.5">右耳 PTA</div>
                  <div className="text-slate-200 font-mono font-semibold">
                    {rightEar.length
                      ? Math.round(
                          rightEar
                            .filter((p) => [500, 1000, 2000].includes(p.frequency))
                            .reduce((a, p) => a + p.threshold, 0) /
                            Math.max(
                              1,
                              rightEar.filter((p) =>
                                [500, 1000, 2000].includes(p.frequency)
                              ).length
                            )
                        )
                      : 0}{' '}
                    dB
                  </div>
                </div>
              </div>
            </div>

            <TinnitusConfig />
            <MaskingResult />
          </div>

          <div className="xl:col-span-4 space-y-6">
            <AudioPlayer />
            <ParameterTuner />

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                安全须知
              </h4>
              <ul className="space-y-2 text-xs text-slate-400 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-amber-400 mt-0.5">▸</span>
                  <span>本工具仅供参考，具体治疗方案请遵医嘱</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400 mt-0.5">▸</span>
                  <span>初次使用请从低音量开始，逐渐调整</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400 mt-0.5">▸</span>
                  <span>出现耳痛、头晕或不适请立即停止</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400 mt-0.5">▸</span>
                  <span>避免长时间高音量使用，建议定时休息</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-slate-800/60">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              © 2026 Audiology Simulation Platform · 基于心理声学掩蔽模型
            </div>
            <div className="flex items-center gap-4">
              <span>Web Audio API</span>
              <span className="text-slate-700">·</span>
              <span>临界频带分析</span>
              <span className="text-slate-700">·</span>
              <span>掩蔽扩散效应</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
