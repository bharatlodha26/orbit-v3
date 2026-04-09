import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import type { Segment } from '../types';
import { useHaptic } from '../hooks/useHaptic';
import { useAudio } from '../hooks/useAudio';

interface VerticalAllocationBarProps {
  segments: Segment[];
  onSegmentsChange?: (segments: Segment[]) => void;
  interactive?: boolean;
  height?: number;
}

export function VerticalAllocationBar({
  segments,
  onSegmentsChange,
  interactive = false,
  height = 380,
}: VerticalAllocationBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ index: number; startY: number; startPercentages: number[] } | null>(null);
  const [activeHandle, setActiveHandle] = useState<number | null>(null);
  const haptic = useHaptic();
  const audio = useAudio();

  const handlePointerDown = useCallback((e: React.PointerEvent, handleIndex: number) => {
    if (!interactive) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = {
      index: handleIndex,
      startY: e.clientY,
      startPercentages: segments.map(s => s.percentage),
    };
    setActiveHandle(handleIndex);
    haptic.grab();
  }, [interactive, segments, haptic]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !barRef.current || !onSegmentsChange) return;
    const { index, startY, startPercentages } = draggingRef.current;
    const barHeight = barRef.current.getBoundingClientRect().height;
    const deltaY = e.clientY - startY;
    // Dragging down grows the upper segment, shrinks the lower
    const deltaPercent = (deltaY / barHeight) * 100;

    const newPercentages = [...startPercentages];
    const upper = index;
    const lower = index + 1;

    if (segments[upper]?.isLocked || segments[lower]?.isLocked) return;

    const newUpper = Math.max(5, Math.min(60, startPercentages[upper] + deltaPercent));
    const newLower = Math.max(5, Math.min(60, startPercentages[lower] - deltaPercent));

    newPercentages[upper] = newUpper;
    newPercentages[lower] = newLower;

    const total = newPercentages.reduce((s, p) => s + p, 0);
    const normalised = newPercentages.map(p => Math.round((p / total) * 100));
    const diff = 100 - normalised.reduce((s, p) => s + p, 0);
    if (diff !== 0) normalised[upper] += diff;

    const updated = segments.map((s, i) => ({ ...s, percentage: normalised[i] }));
    onSegmentsChange(updated);

    audio.playSegmentChange(newUpper, deltaPercent > 0);
    haptic.resistance(newUpper);
    haptic.resistance(newLower);
  }, [segments, onSegmentsChange, audio, haptic]);

  const handlePointerUp = useCallback(() => {
    if (draggingRef.current) {
      haptic.release();
      draggingRef.current = null;
      setActiveHandle(null);
    }
  }, [haptic]);

  return (
    <div
      ref={barRef}
      className="vertical-allocation-bar"
      style={{ height, display: 'flex', flexDirection: 'column', borderRadius: 10, overflow: 'hidden', position: 'relative', userSelect: 'none' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {segments.map((seg, i) => (
        <motion.div
          key={seg.id}
          layout
          animate={{ flex: seg.percentage }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{
            backgroundColor: seg.color,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: seg.isLocked
              ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 8px)'
              : 'none',
          }}
        >
          <span style={{
            color: 'white',
            fontWeight: 700,
            fontSize: seg.percentage > 20 ? 13 : 11,
            textAlign: 'center',
            padding: '0 8px',
            lineHeight: 1.3,
          }}>
            {seg.percentage >= 15 ? seg.name : (seg.shortName ?? seg.name)}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>
            {seg.percentage}%
          </span>

          {/* Horizontal drag handle between segments */}
          {interactive && i < segments.length - 1 && (
            <div
              onPointerDown={(e) => handlePointerDown(e, i)}
              style={{
                position: 'absolute',
                bottom: -8,
                left: 0,
                right: 0,
                height: 16,
                cursor: 'row-resize',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <motion.div
                animate={{ opacity: activeHandle === i ? 1 : 0.5, scaleX: activeHandle === i ? 1 : 0.6 }}
                style={{
                  width: 32,
                  height: 3,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  borderRadius: 2,
                }}
              />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
