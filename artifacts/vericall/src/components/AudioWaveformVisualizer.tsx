import { useEffect, useState } from 'react';
import { veilAudio } from '../lib/audio';

interface AudioWaveformProps {
  isListening: boolean;
  hasAudioStream: boolean;
}

export function AudioWaveformVisualizer({ isListening, hasAudioStream }: AudioWaveformProps) {
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: 32 }, (_, i) => Math.max(12, Math.round(Math.sin(i * 0.4) * 35 + 20)))
  );
  const [metrics, setMetrics] = useState<{ rms: number; highFreqRatio: number; peakFreqHz: number }>({
    rms: 0,
    highFreqRatio: 0,
    peakFreqHz: 0,
  });

  useEffect(() => {
    let animId: number;

    const tick = () => {
      if (isListening && hasAudioStream) {
        const liveBars = veilAudio.getFrequencyData();
        if (liveBars && liveBars.length > 0) {
          setBars(liveBars);
          const spectral = veilAudio.getSpectralMetrics();
          if (spectral) {
            setMetrics(spectral);
          }
        } else {
          // Synthetic micro-fluctuation if no live analyser data yet
          setBars((prev) =>
            prev.map((val) => Math.max(10, Math.min(95, val + (Math.random() * 12 - 6))))
          );
        }
      } else if (isListening) {
        // Simulated rhythmic speech waveform
        const t = Date.now() / 250;
        const sim = Array.from({ length: 32 }, (_, i) => {
          const wave1 = Math.sin(t + i * 0.3) * 30;
          const wave2 = Math.cos(t * 1.5 + i * 0.5) * 20;
          return Math.max(8, Math.min(85, Math.round(wave1 + wave2 + 35)));
        });
        setBars(sim);
        setMetrics({ rms: 42, highFreqRatio: 28, peakFreqHz: 1850 });
      } else {
        // Idle flatline with subtle pulse
        setBars((prev) => prev.map(() => 8));
        setMetrics({ rms: 0, highFreqRatio: 0, peakFreqHz: 0 });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isListening, hasAudioStream]);

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-lg p-3">
      <div className="flex justify-between items-center flex-wrap gap-1 mb-2">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              isListening ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'
            }`}
          />
          {hasAudioStream ? 'LIVE AUDIO FFT SPECTRUM (32-BINS)' : 'SYNTHETIC AUDIO WAVEFORM'}
        </span>
        <span className="text-[9px] font-mono text-cyan-400">
          {hasAudioStream ? `RMS: ${metrics.rms}% · PEAK: ${metrics.peakFreqHz}Hz` : 'MODEL OFFLINE · ILLUSTRATIVE'}
        </span>
      </div>

      <div
        className="h-12 flex items-end gap-1 px-1 py-1 bg-slate-950/60 rounded border border-slate-800/80 overflow-hidden"
        role="img"
        aria-label="Audio frequency waveform visualizer"
      >
        {bars.map((height, i) => {
          const isHighFreq = i > 20;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col justify-end items-center h-full group relative"
            >
              <div
                className={`w-full rounded-t-sm transition-all duration-75 ${
                  isHighFreq
                    ? 'bg-gradient-to-t from-cyan-600 to-indigo-400'
                    : 'bg-gradient-to-t from-cyan-500 to-teal-300'
                }`}
                style={{
                  height: `${height}%`,
                  opacity: isListening ? 0.9 : 0.25,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1.5 px-0.5">
        <span>0 Hz</span>
        <span>
          <span className="hidden sm:inline">VOCAL FORMANT </span>(1-3 kHz)
        </span>
        <span>
          <span className="hidden sm:inline">NYQUIST </span>(8-16 kHz)
        </span>
      </div>
    </div>
  );
}
