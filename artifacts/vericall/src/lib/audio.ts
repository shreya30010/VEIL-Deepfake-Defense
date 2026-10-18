/**
 * Audio synthesis & Web Audio API Analyzer for VEIL Defense Shield
 */

class VeilAudioManager {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: any = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // Play synthesized security sound alert
  public playAlertTone(type: 'caution' | 'critical' | 'success') {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'critical') {
        // Red alert: pulsing dual frequency siren (880Hz -> 440Hz)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.18);
        osc.frequency.setValueAtTime(880, now + 0.22);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'caution') {
        // Amber warning: double soft chime (523Hz -> 659Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // Success / verified: clean ascending major chord
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.08);
        osc.frequency.setValueAtTime(659.25, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.38);
      }
    } catch {
      // Audio autoplay policy or hardware limitation; graceful fallback
    }
  }

  // Connect microphone stream to Web Audio Analyser
  public attachStream(stream: MediaStream): boolean {
    try {
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) return false;

      const ctx = this.getContext();
      if (!ctx) return false;

      this.detachStream();

      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source = ctx.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      // NOTE: Analyser is deliberately NOT connected to ctx.destination to avoid microphone feedback!

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      return true;
    } catch (e) {
      console.warn('Could not attach audio analyzer to stream:', e);
      return false;
    }
  }

  public detachStream() {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
      this.source = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }

  // Get real-time frequency bar heights (normalized 0 - 100)
  public getFrequencyData(): number[] | null {
    if (!this.analyser || !this.dataArray) return null;
    this.analyser.getByteFrequencyData(this.dataArray);
    const bars: number[] = [];
    const len = Math.min(32, this.dataArray.length);
    for (let i = 0; i < len; i++) {
      bars.push(Math.round((this.dataArray[i] / 255) * 100));
    }
    return bars;
  }

  // Calculate audio spectral metrics
  public getSpectralMetrics(): { rms: number; highFreqRatio: number; peakFreqHz: number } | null {
    if (!this.analyser || !this.dataArray || !this.audioCtx) return null;
    this.analyser.getByteFrequencyData(this.dataArray);

    let sum = 0;
    let highFreqSum = 0;
    let maxVal = 0;
    let maxIdx = 0;
    const len = this.dataArray.length;

    for (let i = 0; i < len; i++) {
      const val = this.dataArray[i];
      sum += val * val;
      if (val > maxVal) {
        maxVal = val;
        maxIdx = i;
      }
      if (i > len * 0.6) {
        highFreqSum += val;
      }
    }

    const rms = Math.min(100, Math.round(Math.sqrt(sum / len)));
    const totalEnergy = sum > 0 ? sum : 1;
    const highFreqRatio = Math.min(100, Math.round((highFreqSum / (totalEnergy / 255 + 1)) * 100));
    const nyquist = this.audioCtx.sampleRate / 2;
    const peakFreqHz = Math.round((maxIdx / len) * nyquist);

    return { rms, highFreqRatio, peakFreqHz };
  }
}

export const veilAudio = new VeilAudioManager();
