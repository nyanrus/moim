import { useCallback, useEffect, useRef, useState } from "react";
import type { CarouselApi } from "~/components/ui/carousel";

export function useCarouselAutoplay(
  api: CarouselApi | undefined,
  slidesCount: number,
  durationMs: number,
) {
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const timerStartedAtRef = useRef<number | null>(null);
  const remainingRef = useRef(durationMs);
  const cycleStartedWithRemainingRef = useRef(durationMs);

  const clearScheduled = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const getTimeLeft = useCallback(() => {
    if (timerStartedAtRef.current === null) {
      return remainingRef.current;
    }
    const elapsed = performance.now() - timerStartedAtRef.current;
    return Math.max(0, cycleStartedWithRemainingRef.current - elapsed);
  }, []);

  const startCycle = useCallback((duration: number) => {
    if (!api || slidesCount <= 1) return;

    clearScheduled();
    const safeDuration = Math.max(1, duration);
    cycleStartedWithRemainingRef.current = safeDuration;
    remainingRef.current = safeDuration;
    timerStartedAtRef.current = performance.now();
    setProgress(((durationMs - safeDuration) / durationMs) * 100);

    const updateProgress = () => {
      const timeLeft = getTimeLeft();
      remainingRef.current = timeLeft;
      setProgress(((durationMs - timeLeft) / durationMs) * 100);
      if (timeLeft > 0) {
        frameRef.current = window.requestAnimationFrame(updateProgress);
      }
    };

    frameRef.current = window.requestAnimationFrame(updateProgress);
    timeoutRef.current = window.setTimeout(() => {
      remainingRef.current = durationMs;
      api.scrollNext();
    }, safeDuration);
  }, [api, clearScheduled, getTimeLeft, slidesCount, durationMs]);

  const pauseAutoplay = useCallback(() => {
    if (slidesCount <= 1) return;
    pausedRef.current = true;
    const timeLeft = getTimeLeft();
    remainingRef.current = timeLeft;
    timerStartedAtRef.current = null;
    setProgress(((durationMs - timeLeft) / durationMs) * 100);
    clearScheduled();
  }, [clearScheduled, getTimeLeft, slidesCount, durationMs]);

  const resumeAutoplay = useCallback(() => {
    if (slidesCount <= 1) return;
    pausedRef.current = false;
    startCycle(remainingRef.current > 0 ? remainingRef.current : durationMs);
  }, [slidesCount, startCycle, durationMs]);

  // Reset and re-arm when api or slides change
  useEffect(() => {
    if (!api) return;

    const syncCarouselState = () => {
      remainingRef.current = durationMs;
      timerStartedAtRef.current = null;
      setProgress(0);
      clearScheduled();
      if (!pausedRef.current && slidesCount > 1) {
        startCycle(durationMs);
      }
    };

    syncCarouselState();
    api.on("select", syncCarouselState);
    api.on("reInit", syncCarouselState);

    return () => {
      api.off("select", syncCarouselState);
      api.off("reInit", syncCarouselState);
    };
  }, [api, clearScheduled, slidesCount, startCycle, durationMs]);

  useEffect(() => {
    pausedRef.current = false;
    remainingRef.current = durationMs;
    setProgress(0);
    if (slidesCount <= 1) {
      clearScheduled();
      timerStartedAtRef.current = null;
    }
  }, [clearScheduled, slidesCount, durationMs]);

  useEffect(() => clearScheduled, [clearScheduled]);

  return { progress, pauseAutoplay, resumeAutoplay };
}
