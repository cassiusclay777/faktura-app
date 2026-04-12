"use client";

import { type ReactNode } from "react";

interface LoadingProps {
  /** Text to display below the spinner */
  text?: string;
  /** Size of the spinner (sm, md, lg) */
  size?: "sm" | "md" | "lg";
  /** Whether to show full page overlay */
  fullPage?: boolean;
  /** Custom className for the container */
  className?: string;
}

export function Loading({
  text = "Načítání...",
  size = "md",
  fullPage = false,
  className = "",
}: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  const content = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`animate-spin rounded-full border-zinc-700 border-t-blue-500 ${sizeClasses[size]}`}
        role="status"
        aria-label="Načítání"
      />
      {text && <p className="text-sm text-zinc-400">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
}

interface SkeletonProps {
  /** Number of lines to show */
  lines?: number;
  /** Height of each line */
  lineHeight?: "sm" | "md" | "lg";
  /** Whether to show random width for lines */
  randomWidth?: boolean;
  /** Custom className for the container */
  className?: string;
}

export function Skeleton({
  lines = 3,
  lineHeight = "md",
  randomWidth = true,
  className = "",
}: SkeletonProps) {
  const heightClasses = {
    sm: "h-3",
    md: "h-4",
    lg: "h-6",
  };

  const getRandomWidth = (index: number) => {
    if (!randomWidth) return "w-full";
    const widths = ["w-3/4", "w-4/5", "w-full", "w-5/6"];
    return widths[index % widths.length];
  };

  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Načítání obsahu">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse rounded-md bg-zinc-800 ${heightClasses[lineHeight]} ${getRandomWidth(index)}`}
        />
      ))}
      <span className="sr-only">Načítání...</span>
    </div>
  );
}

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  isLoading: boolean;
  /** Content to show when loading */
  loadingContent?: ReactNode;
  /** Content to show when not loading */
  children: ReactNode;
  /** Whether to blur the background */
  blurBackground?: boolean;
}

export function LoadingOverlay({
  isLoading,
  loadingContent,
  children,
  blurBackground = true,
}: LoadingOverlayProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div
        className={`absolute inset-0 z-10 flex items-center justify-center ${blurBackground ? "backdrop-blur-sm" : ""}`}
      >
        {loadingContent || <Loading />}
      </div>
      <div className={isLoading ? "opacity-30" : ""}>{children}</div>
    </div>
  );
}

interface ProgressBarProps {
  /** Current progress (0-100) */
  progress: number;
  /** Text to display */
  text?: string;
  /** Color of the progress bar */
  color?: "blue" | "green" | "red" | "yellow";
  /** Whether to show percentage */
  showPercentage?: boolean;
}

export function ProgressBar({
  progress,
  text,
  color = "blue",
  showPercentage = true,
}: ProgressBarProps) {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="space-y-2">
      {(text || showPercentage) && (
        <div className="flex justify-between text-sm">
          {text && <span className="text-zinc-400">{text}</span>}
          {showPercentage && (
            <span className="font-medium text-zinc-300">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClasses[color]}`}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

// Hook for managing loading state with delay to prevent flickering
export function useLoadingState(initialState = false, delay = 200) {
  const [isLoading, setIsLoading] = useState(initialState);
  const [showLoader, setShowLoader] = useState(initialState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setShowLoader(true);
    }, delay);
  }, [delay]);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setShowLoader(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    showLoader,
    startLoading,
    stopLoading,
  };
}

// Import useState, useEffect, useCallback, useRef for the hook
import { useState, useEffect, useCallback, useRef } from "react";