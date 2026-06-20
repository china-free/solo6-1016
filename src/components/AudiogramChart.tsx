import { useMemo } from 'react';
import type { FrequencyPoint, DynamicRangePoint } from '../types';

interface AudiogramChartProps {
  leftEar: FrequencyPoint[];
  rightEar: FrequencyPoint[];
  leftDR?: DynamicRangePoint[];
  rightDR?: DynamicRangePoint[];
}

const CHART_WIDTH = 520;
const CHART_HEIGHT = 360;
const PADDING = { top: 40, right: 30, bottom: 50, left: 60 };
const PLOT_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

const STANDARD_FREQS = [125, 250, 500, 1000, 2000, 4000, 8000];
const DB_LEVELS = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

export const AudiogramChart = ({
  leftEar,
  rightEar,
  leftDR = [],
  rightDR = [],
}: AudiogramChartProps) => {
  const xForFreq = useMemo(() => {
    return (freq: number): number => {
      const logMin = Math.log10(125);
      const logMax = Math.log10(8000);
      const logFreq = Math.log10(freq);
      const ratio = (logFreq - logMin) / (logMax - logMin);
      return PADDING.left + ratio * PLOT_WIDTH;
    };
  }, []);

  const yForDb = (db: number): number => {
    const minDb = -10;
    const maxDb = 120;
    const ratio = (db - minDb) / (maxDb - minDb);
    return PADDING.top + ratio * PLOT_HEIGHT;
  };

  const renderGridLines = () => {
    const lines = [];

    lines.push(
      <line
        key="y-axis"
        x1={PADDING.left}
        y1={PADDING.top}
        x2={PADDING.left}
        y2={PADDING.top + PLOT_HEIGHT}
        stroke="#334155"
        strokeWidth={2}
      />
    );

    lines.push(
      <line
        key="x-axis"
        x1={PADDING.left}
        y1={PADDING.top + PLOT_HEIGHT}
        x2={PADDING.left + PLOT_WIDTH}
        y2={PADDING.top + PLOT_HEIGHT}
        stroke="#334155"
        strokeWidth={2}
      />
    );

    DB_LEVELS.forEach((db) => {
      const y = yForDb(db);
      lines.push(
        <line
          key={`h-${db}`}
          x1={PADDING.left}
          y1={y}
          x2={PADDING.left + PLOT_WIDTH}
          y2={y}
          stroke={db === 0 ? '#64748b' : '#1e293b'}
          strokeWidth={db === 0 || db === 25 ? 1.5 : 0.5}
          strokeDasharray={db === 25 ? '4,4' : undefined}
          opacity={0.4}
        />
      );

      lines.push(
        <text
          key={`ht-${db}`}
          x={PADDING.left - 10}
          y={y + 4}
          textAnchor="end"
          fill="#94a3b8"
          fontSize={11}
          fontFamily="monospace"
        >
          {db}
        </text>
      );
    });

    STANDARD_FREQS.forEach((freq) => {
      const x = xForFreq(freq);
      lines.push(
        <line
          key={`v-${freq}`}
          x1={x}
          y1={PADDING.top}
          x2={x}
          y2={PADDING.top + PLOT_HEIGHT}
          stroke="#1e293b"
          strokeWidth={0.5}
          opacity={0.4}
        />
      );

      lines.push(
        <text
          key={`vt-${freq}`}
          x={x}
          y={PADDING.top + PLOT_HEIGHT + 22}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={10}
          fontFamily="monospace"
        >
          {freq >= 1000 ? `${freq / 1000}K` : freq}
        </text>
      );
    });

    return lines;
  };

  const renderNormalRange = () => {
    const yTop = yForDb(0);
    const yBottom = yForDb(25);
    return (
      <rect
        x={PADDING.left}
        y={yTop}
        width={PLOT_WIDTH}
        height={yBottom - yTop}
        fill="#22c55e"
        opacity={0.06}
      />
    );
  };

  const renderAudiogramCurve = (
    data: FrequencyPoint[],
    color: string,
    marker: 'x' | 'o',
    label: string
  ) => {
    if (data.length === 0) return null;

    const sorted = [...data].sort((a, b) => a.frequency - b.frequency);
    const points = sorted
      .filter((p) => p.frequency >= 125 && p.frequency <= 8000)
      .map((p) => ({ x: xForFreq(p.frequency), y: yForDb(p.threshold) }));

    if (points.length < 2) return null;

    const pathD = points
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(' ');

    return (
      <g>
        <path
          d={pathD}
          stroke={color}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <g key={`${label}-${i}`}>
            {marker === 'x' ? (
              <g transform={`translate(${p.x}, ${p.y})`}>
                <line x1={-6} y1={-6} x2={6} y2={6} stroke={color} strokeWidth={2.5} />
                <line x1={-6} y1={6} x2={6} y2={-6} stroke={color} strokeWidth={2.5} />
              </g>
            ) : (
              <circle cx={p.x} cy={p.y} r={5} fill="#0f172a" stroke={color} strokeWidth={2.5} />
            )}
          </g>
        ))}
      </g>
    );
  };

  const renderDynamicRange = (
    dr: DynamicRangePoint[],
    color: string
  ) => {
    return dr
      .filter((d) => d.frequency >= 125 && d.frequency <= 8000)
      .map((d, i) => {
        const x = xForFreq(d.frequency);
        const yThresh = yForDb(d.threshold);
        const yUCL = yForDb(d.uncomfortableLevel);
        return (
          <line
            key={`dr-${color}-${i}`}
            x1={x}
            y1={yThresh}
            x2={x}
            y2={yUCL}
            stroke={color}
            strokeWidth={3}
            opacity={0.3}
            strokeLinecap="round"
          />
        );
      });
  };

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full h-auto"
        style={{ maxHeight: '380px' }}
      >
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>

        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={PLOT_WIDTH}
          height={PLOT_HEIGHT}
          fill="url(#bgGrad)"
          rx={6}
        />

        {renderNormalRange()}
        {renderGridLines()}
        {renderDynamicRange(leftDR, '#3b82f6')}
        {renderDynamicRange(rightDR, '#ef4444')}
        {renderAudiogramCurve(leftEar, '#3b82f6', 'x', 'left')}
        {renderAudiogramCurve(rightEar, '#ef4444', 'o', 'right')}

        <text
          x={PADDING.left - 45}
          y={PADDING.top + PLOT_HEIGHT / 2}
          transform={`rotate(-90, ${PADDING.left - 45}, ${PADDING.top + PLOT_HEIGHT / 2})`}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={12}
          fontWeight={500}
        >
          听阈 (dB HL)
        </text>
        <text
          x={PADDING.left + PLOT_WIDTH / 2}
          y={CHART_HEIGHT - 8}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={12}
          fontWeight={500}
        >
          频率 (Hz)
        </text>

        <g transform={`translate(${PADDING.left + PLOT_WIDTH - 140}, ${PADDING.top + 10})`}>
          <rect x={0} y={0} width={130} height={52} rx={6} fill="#0f172a" stroke="#334155" strokeWidth={1} opacity={0.9} />
          <g transform="translate(10, 15)">
            <line x1={0} y1={0} x2={22} y2={0} stroke="#3b82f6" strokeWidth={2.5} />
            <line x1={28} y1={-5} x2={40} y2={5} stroke="#3b82f6" strokeWidth={2.5} />
            <line x1={28} y1={5} x2={40} y2={-5} stroke="#3b82f6" strokeWidth={2.5} />
            <text x={50} y={4} fill="#cbd5e1" fontSize={11}>左耳</text>
          </g>
          <g transform="translate(10, 37)">
            <line x1={0} y1={0} x2={22} y2={0} stroke="#ef4444" strokeWidth={2.5} />
            <circle cx={34} cy={0} r={5} fill="#0f172a" stroke="#ef4444" strokeWidth={2.5} />
            <text x={50} y={4} fill="#cbd5e1" fontSize={11}>右耳</text>
          </g>
        </g>
      </svg>
    </div>
  );
};
