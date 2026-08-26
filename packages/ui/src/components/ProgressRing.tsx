import * as React from 'react';
import { cn } from '../lib/cn';

export interface ProgressRingProps extends React.SVGAttributes<SVGSVGElement> {
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Shown in the center, in label-md style — defaults to "N%". */
  label?: React.ReactNode;
}

/**
 * Used in dashboards for course completion percentages. Center of the ring
 * displays the numerical percentage in label-md style — per spec.
 */
export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  label,
  className,
  ...props
}: ProgressRingProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const isComplete = clamped >= 100;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${Math.round(clamped)}% complete`}
        {...props}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-[stroke-dashoffset] duration-300', isComplete ? 'stroke-success-500' : 'stroke-primary')}
        />
      </svg>
      <span className="absolute text-label-md text-foreground" aria-hidden="true">
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}
