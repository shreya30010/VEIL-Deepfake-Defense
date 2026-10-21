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
    this.stopChunkRecording();
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
      this.source = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }

  // Live audio chunk recording state
  private scriptProcessor: ScriptProcessorNode | null = null;
  private silentGain: GainNode | null = null;
  private accumulatedSamples: Float32Array[] = [];
  private accumulatedCount = 0;
  private chunkCallback: ((chunk: AudioChunkPayload) => void) | null = null;
  private chunkTargetSamples = 16000 * 3.5;

  /**
   * Start streaming live audio chunks (3.5s by default) converted to 16 kHz 16-bit mono WAV base64
   */
  public startChunkRecording(callback: (chunk: AudioChunkPayload) => void, chunkDurationSec = 3.5): boolean {
    const ctx = this.getContext();
    if (!ctx || !this.source) {
      console.warn('AudioContext or media source not ready for chunk recording');
      return false;
    }

    this.stopChunkRecording();
    this.chunkCallback = callback;
    this.accumulatedSamples = [];
    this.accumulatedCount = 0;
    // Collect raw samples at the browser's native rate and resample ONCE per finished chunk
    // (resampling every 4096-sample block separately created small discontinuities).
    this.chunkTargetSamples = Math.round(ctx.sampleRate * chunkDurationSec);

    // Buffer audio using standard ScriptProcessorNode
    const bufferSize = 4096;
    this.scriptProcessor = ctx.createScriptProcessor(bufferSize, 1, 1);

    // Muted gain node to keep the audio pump running without echoing mic to speakers
    this.silentGain = ctx.createGain();
    this.silentGain.gain.setValueAtTime(0, ctx.currentTime);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.chunkCallback) return;
      const channelData = e.inputBuffer.getChannelData(0);
      this.accumulatedSamples.push(new Float32Array(channelData)); // copy: the browser reuses its buffer
      this.accumulatedCount += channelData.length;

      if (this.accumulatedCount >= this.chunkTargetSamples) {
        // Flatten collected blocks (native sample rate), then convert to 16 kHz mono once
        const native = new Float32Array(this.accumulatedCount);
        let ptr = 0;
        for (const block of this.accumulatedSamples) {
          native.set(block, ptr);
          ptr += block.length;
        }
        const full = resampleTo16k(native, ctx.sampleRate);
        let sumSq = 0;
        for (let i = 0; i < full.length; i++) {
          sumSq += full[i] * full[i];
        }
        const rms = Math.sqrt(sumSq / (full.length || 1));
        const wavBytes = encodeWav(full, 16000);
        const base64 = uint8ArrayToBase64(wavBytes);
        const durationSeconds = full.length / 16000;
        const cb = this.chunkCallback;

        // Reset accumulation for next window
        this.accumulatedSamples = [];
        this.accumulatedCount = 0;

        cb({
          base64,
          durationSeconds,
          byteLength: wavBytes.byteLength,
          rms,
        });
      }
    };

    this.source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.silentGain);
    this.silentGain.connect(ctx.destination);
    return true;
  }

  public stopChunkRecording() {
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor.onaudioprocess = null;
      this.scriptProcessor = null;
    }
    if (this.silentGain) {
      try {
        this.silentGain.disconnect();
      } catch {}
      this.silentGain = null;
    }
    this.accumulatedSamples = [];
    this.accumulatedCount = 0;
    this.chunkCallback = null;
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

export interface AudioChunkPayload {
  base64: string;
  durationSeconds: number;
  byteLength: number;
  rms: number;
}

/**
 * Resample Float32Array from input sampleRate to 16,000 Hz.
 * Downsampling averages the source samples that fall inside each output sample (a simple box filter,
 * which removes most aliasing); upsampling uses linear interpolation. This is a basic resampler, not a
 * studio-grade one, so live scores can differ slightly from the benchmark clips, which were converted with ffmpeg.
 */
function resampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === 16000) return input;
  const ratio = inputRate / 16000;
  if (ratio > 1) {
    const outLength = Math.floor(input.length / ratio);
    const out = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.max(start + 1, Math.min(input.length, Math.floor((i + 1) * ratio)));
      let sum = 0;
      for (let j = start; j < end; j++) sum += input[j];
      out[i] = sum / (end - start);
    }
    return out;
  }
  const newLength = Math.round(input.length / ratio);
  const output = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const indexFloor = Math.floor(srcIndex);
    const indexCeil = Math.min(input.length - 1, indexFloor + 1);
    const t = srcIndex - indexFloor;
    output[i] = input[indexFloor] * (1 - t) + input[indexCeil] * t;
  }
  return output;
}

/**
 * Encode Float32Array samples into 16-bit mono PCM WAV format with 44-byte RIFF header
 */
function encodeWav(samples: Float32Array, sampleRate = 16000): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeStr(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF identifier
  writeStr(0, 'RIFF');
  // file length minus RIFF identifier & length = 36 + data size
  view.setUint32(4, 36 + samples.length * 2, true);
  // RIFF type
  writeStr(8, 'WAVE');
  // format chunk identifier
  writeStr(12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count (1 = mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeStr(36, 'data');
  // data chunk length
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Uint8Array(buffer);
}

/**
 * Efficiently convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

export const veilAudio = new VeilAudioManager();
