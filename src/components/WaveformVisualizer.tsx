import { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  getAnalyser: () => AnalyserNode | null;
  isPlaying: boolean;
}

export const WaveformVisualizer = ({ getAnalyser, isPlaying }: WaveformVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const analyser = getAnalyser();
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e293b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      if (!analyser || !isPlaying) {
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(isPlaying ? '初始化中...' : '等待播放', width / 2, height / 2 - 8);
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      const freqArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(freqArray);

      const barCount = 64;
      const barWidth = width / barCount;
      const freqStep = Math.floor(bufferLength / barCount);

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < freqStep; j++) {
          sum += freqArray[i * freqStep + j];
        }
        const avg = sum / freqStep;
        const barHeight = (avg / 255) * height * 0.85;

        const x = i * barWidth + barWidth * 0.1;
        const y = height - barHeight - 4;
        const bw = barWidth * 0.8;

        const hue = 170 + (i / barCount) * 60;
        const saturation = 70 + (avg / 255) * 20;
        const lightness = 45 + (avg / 255) * 15;

        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        ctx.beginPath();
        const radius = Math.min(bw / 2, 3);
        if (barHeight > radius * 2) {
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + bw - radius, y);
          ctx.quadraticCurveTo(x + bw, y, x + bw, y + radius);
          ctx.lineTo(x + bw, y + barHeight - radius);
          ctx.quadraticCurveTo(x + bw, y + barHeight, x + bw - radius, y + barHeight);
          ctx.lineTo(x + radius, y + barHeight);
          ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
        } else {
          ctx.roundRect(x, y, bw, barHeight, radius);
        }
        ctx.fill();

        ctx.fillStyle = `hsla(${hue}, 80%, 70%, 0.25)`;
        ctx.fillRect(x, y + barHeight, bw, Math.min(6, barHeight * 0.2));
      }

      const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
      waveGrad.addColorStop(0, 'rgba(45, 212, 191, 0.9)');
      waveGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.9)');
      waveGrad.addColorStop(1, 'rgba(59, 130, 246, 0.9)');

      ctx.lineWidth = 2;
      ctx.strokeStyle = waveGrad;
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let xPos = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(xPos, y);
        } else {
          ctx.lineTo(xPos, y);
        }
        xPos += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [getAnalyser, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-28 rounded-xl bg-slate-900/80 border border-slate-700/50"
      style={{ display: 'block' }}
    />
  );
};
