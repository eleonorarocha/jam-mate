import { useCallback, useRef } from 'react';

export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const play = useCallback((type: 'message' | 'booking' = 'message') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'message') {
        // Two-tone chime: C6 → E6
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1047, now);        // C6
        osc.frequency.setValueAtTime(1319, now + 0.12); // E6
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        // Three-tone chime: G5 → B5 → D6
        osc.type = 'sine';
        osc.frequency.setValueAtTime(784, now);          // G5
        osc.frequency.setValueAtTime(988, now + 0.1);    // B5
        osc.frequency.setValueAtTime(1175, now + 0.2);   // D6
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {
      // AudioContext not supported — fail silently
    }
  }, []);

  return play;
};
