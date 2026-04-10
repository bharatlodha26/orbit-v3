import { useRef, useCallback } from 'react';

export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number = 0.15, type: OscillatorType = 'sine', volume: number = 0.08) => {
    try {
      const ctx = getCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.98, ctx.currentTime + duration);

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // Audio not supported
    }
  }, [getCtx]);

  // Soft tick — neutral detent click, no pitch variation
  const playSegmentChange = useCallback((_percentage: number, _growing: boolean) => {
    try {
      const ctx = getCtx();
      const duration = 0.04;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Short noise burst shaped with a very fast decay — feels like a soft click
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 28);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // High-pass to remove rumble, keep only the crisp tick transient
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 1800;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      source.connect(hpf);
      hpf.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Audio not supported
    }
  }, [getCtx]);

  // Click/lock sound — wooden block feel
  const playLockClick = useCallback(() => {
    try {
      const ctx = getCtx();
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 2;
      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
    } catch {
      // Audio not supported
    }
  }, [getCtx]);

  const playChipSelect = useCallback(() => {
    playTone(440, 0.08, 'sine', 0.05);
  }, [playTone]);

  const playTransition = useCallback(() => {
    playTone(320, 0.2, 'sine', 0.04);
    setTimeout(() => playTone(400, 0.2, 'sine', 0.04), 100);
  }, [playTone]);

  return { playSegmentChange, playLockClick, playChipSelect, playTransition };
}
