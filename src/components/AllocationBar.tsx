import { useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Segment } from '../types';
import { useHaptic } from '../hooks/useHaptic';
import { useAudio } from '../hooks/useAudio';

interface AllocationBarProps {
  segments: Segment[];
  onSegmentsChange?: (segments: Segment[]) => void;
  interactive?: boolean;
  locked?: boolean;
  showDeltas?: boolean;
  prevSegments?: Segment[];
  compact?: boolean;
}

export function AllocationBar({
  segments,
  onSegmentsChange,
  interactive = false,
  locked = false,
  showDeltas = false,
  prevSegments = [],
  compact = false,
}: AllocationBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ index: number; startX: number; startPercentages: number[] } | null>(null);
  const haptic = useHaptic();
  const audio = useAudio();
  const [activeHandle, setActiveHandle] = useState<number | null>(null);

  const getDelta = (seg: Segment) => {
    const prev = prevSegments.find(p => p.id === seg.id);
    if (!prev) return null;
    return seg.percentage - prev.percentage;
  };

  const handlePointerDown = useCallback((e: React.PointerEvent, handleIndex: number) => {
    if (!interactive || locked) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingRef.current = {
      index: handleIndex,
      startX: e.clientX,
      startPercentages: segments.map(s => s.percentage),
    };
    setActiveHandle(handleIndex);
    haptic.grab();
  }, [interactive, locked, segments, haptic]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !barRef.current || !onSegmentsChange) return;
    const { index, startX, startPercentages } = draggingRef.current;
    const barWidth = barRef.current.getBoundingClientRect().width;
    const deltaX = e.clientX - startX;
    const deltaPercent = (deltaX / barWidth) * 100;

    const newPercentages = [...startPercentages];
    const leftSeg = index;
    const rightSeg = index + 1;

    const newLeft = Math.max(5, Math.min(60, startPercentages[leftSeg] + deltaPercent));
    const newRight = Math.max(5, Math.min(60, startPercentages[rightSeg] - deltaPercent));

    // Check locked constraints
    if (segments[leftSeg]?.isLocked || segments[rightSeg]?.isLocked) return;

    newPercentages[leftSeg] = newLeft;
    newPercentages[rightSeg] = newRight;

    const total = newPercentages.reduce((s, p) => s + p, 0);
    const normalised = newPercentages.map(p => Math.round((p / total) * 100));

    const diff = 100 - normalised.reduce((s, p) => s + p, 0);
    if (diff !== 0) normalised[leftSeg] += diff;

    const updated = segments.map((s, i) => ({ ...s, percentage: normalised[i] }));
    onSegmentsChange(updated);

    // Audio feedback
    audio.playSegmentChange(newLeft, deltaPercent > 0);

    // Haptic resistance at extremes
    haptic.resistance(newLeft);
    haptic.resistance(newRight);
  }, [segments, onSegmentsChange, audio, haptic]);

  const handlePointerUp = useCallback(() => {
    if (draggingRef.current) {
      haptic.release();
      draggingRef.current = null;
      setActiveHandle(null);
    }
  }, [haptic]);

  const barHeight: number | string = compact ? 48 : 'var(--allocation-bar-height)';

  return (
    <div
      ref={barRef}
      className="allocation-bar"
      style={{ height: barHeight, display: 'flex', borderRadius: locked ? 0 : 8, overflow: 'hidden', position: 'relative', userSelect: 'none' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <AnimatePresence>
        {segments.map((seg, i) => (
          <motion.div
            key={seg.id}
            layout
            initial={{ flex: seg.percentage }}
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
                ? `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.08) 4px, rgba(0,0,0,0.08) 8px)`
                : 'none',
            }}
          >
            {/* Segment name */}
            <span style={{
              color: 'white',
              fontWeight: 700,
              fontSize: compact ? 10 : (seg.percentage > 15 ? 13 : seg.percentage > 10 ? 11 : 9),
              textAlign: 'center',
              lineHeight: 1.2,
              padding: '0 4px',
              whiteSpace: seg.percentage > 12 ? 'nowrap' : 'normal',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              letterSpacing: 0.2,
            }}>
              {seg.percentage >= 10 ? seg.name : (seg.shortName ?? seg.name.slice(0, 3))}
            </span>
            {/* Percentage */}
            {!compact && (
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 1 }}>
                {seg.percentage}%
              </span>
            )}
            {/* Delta */}
            {showDeltas && getDelta(seg) !== null && (
              <span style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: 9,
                marginTop: 1,
                fontWeight: 600,
              }}>
                {getDelta(seg)! > 0 ? `↑${getDelta(seg)}` : `↓${Math.abs(getDelta(seg)!)}`}
              </span>
            )}
            {/* Drag handle */}
            {interactive && !locked && i < segments.length - 1 && (
              <div
                onPointerDown={(e) => handlePointerDown(e, i)}
                style={{
                  position: 'absolute',
                  right: -10,
                  top: 0,
                  bottom: 0,
                  width: 20,
                  cursor: 'col-resize',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <motion.div
                  animate={{ opacity: activeHandle === i ? 1 : 0.4, scaleY: activeHandle === i ? 1 : 0.7 }}
                  style={{
                    width: 3,
                    height: 24,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: 2,
                  }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
