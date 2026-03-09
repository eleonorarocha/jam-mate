import { useCallback, useRef } from 'react';
import { getNotifPref } from '@/hooks/useNotificationPreferences';

export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const play = useCallback((type: 'message' | 'booking' = 'message') => {
    if (!isNotificationSoundEnabled()) return;

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
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1047, now);
        osc.frequency.setValueAtTime(1319, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(784, now);
        osc.frequency.setValueAtTime(988, now + 0.1);
        osc.frequency.setValueAtTime(1175, now + 0.2);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {
      // AudioContext not supported
    }
  }, []);

  return play;
};
