'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Color variant */
  variant?: 'primary' | 'secondary' | 'white';
  /** Optional text to display below spinner */
  text?: string;
  /** Whether to center the spinner */
  centered?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * LoadingSpinner Component
 * 
 * Reusable loading spinner with different sizes and variants.
 * Can be used standalone or with text for loading states.
 * 
 * Features:
 * - Multiple sizes
 * - Color variants matching theme
 * - Optional loading text
 * - Centering option
 * - Smooth animation
 */
export default function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  text,
  centered = false,
  className
}: LoadingSpinnerProps) {
  // Size styles
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };
  
  // Color variants
  const variantStyles = {
    primary: 'text-teal-500',
    secondary: 'text-gray-400',
    white: 'text-white'
  };
  
  // Text size based on spinner size
  const textSizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };
  
  // Container styles
  const containerStyles = cn(
    'flex flex-col items-center space-y-2',
    centered && 'justify-center min-h-[100px]',
    className
  );
  
  // Spinner styles
  const spinnerStyles = cn(
    'animate-spin',
    sizeStyles[size],
    variantStyles[variant]
  );

  return (
    <div className={containerStyles}>
      {/* Spinner */}
      <svg 
        className={spinnerStyles}
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
        role="status"
        aria-label={text || 'Loading'}
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      
      {/* Loading Text */}
      {text && (
        <p className={cn(
          'text-center font-medium',
          textSizeStyles[size],
          variantStyles[variant]
        )}>
          {text}
        </p>
      )}
    </div>
  );
}
