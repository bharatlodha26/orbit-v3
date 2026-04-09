import { useCallback } from 'react';

export function useHaptic() {
  const vibrate = useCallback((pattern: number | number[]) => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Not supported
    }
  }, []);

  const tap = useCallback(() => vibrate(10), [vibrate]);
  const grab = useCallback(() => vibrate(50), [vibrate]);
  const release = useCallback(() => vibrate([30, 20, 30]), [vibrate]);

  // Resistance increases as segment nears 0% or 60%+
  const resistance = useCallback((percentage: number) => {
    if (percentage <= 5 || percentage >= 55) {
      const intensity = percentage <= 5
        ? Math.round(80 * (1 - percentage / 5))
        : Math.round(80 * ((percentage - 55) / 5));
      vibrate(Math.max(20, intensity));
    }
  }, [vibrate]);

  return { tap, grab, release, resistance };
}
