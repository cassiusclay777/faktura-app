"use client";

import { ReactNode, useState } from "react";

interface TooltipProps {
  /** Content to show in the tooltip */
  content: string;
  /** Child element that triggers the tooltip */
  children: ReactNode;
  /** Position of the tooltip relative to the trigger */
  position?: "top" | "bottom" | "left" | "right";
  /** Delay before showing tooltip (ms) */
  delay?: number;
  /** Maximum width of the tooltip */
  maxWidth?: number;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
  maxWidth = 200,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (disabled) return;
    
    const id = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "bottom-[-4px] left-1/2 transform -translate-x-1/2 border-t-zinc-800 border-l-transparent border-r-transparent border-b-transparent",
    bottom: "top-[-4px] left-1/2 transform -translate-x-1/2 border-b-zinc-800 border-l-transparent border-r-transparent border-t-transparent",
    left: "right-[-4px] top-1/2 transform -translate-y-1/2 border-l-zinc-800 border-t-transparent border-b-transparent border-r-transparent",
    right: "left-[-4px] top-1/2 transform -translate-y-1/2 border-r-zinc-800 border-t-transparent border-b-transparent border-l-transparent",
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]}`}
          role="tooltip"
        >
          <div
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-200 shadow-lg"
            style={{ maxWidth: `${maxWidth}px` }}
          >
            {content}
            <div
              className={`absolute h-0 w-0 border-4 ${arrowClasses[position]}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface InfoIconProps {
  /** Content to show in the tooltip */
  content: string;
  /** Size of the icon */
  size?: "sm" | "md" | "lg";
  /** Additional className */
  className?: string;
}

export function InfoIcon({
  content,
  size = "md",
  className = "",
}: InfoIconProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Tooltip content={content}>
      <svg
        className={`${sizeClasses[size]} ${className} text-zinc-500 hover:text-zinc-400 cursor-help`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </Tooltip>
  );
}

interface HelpTextProps {
  /** Main help text */
  text: string;
  /** Detailed explanation (shown in tooltip) */
  details?: string;
  /** Whether to show as inline text */
  inline?: boolean;
}

export function HelpText({ text, details, inline = false }: HelpTextProps) {
  if (inline) {
    return (
      <span className="text-sm text-zinc-500">
        {text}
        {details && (
          <Tooltip content={details}>
            <span className="ml-1 cursor-help text-zinc-600 hover:text-zinc-500">
              [?]
            </span>
          </Tooltip>
        )}
      </span>
    );
  }

  return (
    <div className="mt-1 text-sm text-zinc-500">
      {text}
      {details && (
        <Tooltip content={details}>
          <span className="ml-1 cursor-help text-zinc-600 hover:text-zinc-500">
            [?]
          </span>
        </Tooltip>
      )}
    </div>
  );
}