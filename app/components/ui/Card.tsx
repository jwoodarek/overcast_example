'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Card title */
  title?: string;
  /** Card subtitle or description */
  subtitle?: string;
  /** Whether card is clickable */
  clickable?: boolean;
  /** Click handler for clickable cards */
  onClick?: () => void;
  /** Whether card is in selected state */
  selected?: boolean;
  /** Whether card is in disabled state */
  disabled?: boolean;
  /** Card variant */
  variant?: 'default' | 'classroom' | 'participant';
  /** Custom className */
  className?: string;
  /** Header actions (buttons, icons, etc.) */
  headerActions?: React.ReactNode;
}

/**
 * Card Component
 * 
 * Reusable card component for displaying content in a consistent container.
 * Supports different variants for different use cases (classroom cards, participant cards, etc.).
 * 
 * Features:
 * - Multiple variants with appropriate styling
 * - Clickable state with hover effects
 * - Selected and disabled states
 * - Header with title, subtitle, and actions
 * - Consistent spacing and borders
 */
export default function Card({
  children,
  title,
  subtitle,
  clickable = false,
  onClick,
  selected = false,
  disabled = false,
  variant = 'default',
  className,
  headerActions
}: CardProps) {
  // Base card styles
  const baseStyles = 'rounded-lg border transition-all duration-200';
  
  // Variant styles
  const variantStyles = {
    default: 'bg-gray-900 border-gray-700',
    classroom: 'bg-gray-900 border-teal-500/30 hover:border-teal-500/50',
    participant: 'bg-gray-800 border-gray-600'
  };
  
  // Interactive styles
  const interactiveStyles = clickable && !disabled
    ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
    : '';
  
  // Selected styles
  const selectedStyles = selected
    ? 'border-teal-500 bg-teal-900/20 shadow-lg shadow-teal-500/20'
    : '';
  
  // Disabled styles
  const disabledStyles = disabled
    ? 'opacity-50 cursor-not-allowed'
    : '';
  
  // Combine all styles
  const cardStyles = cn(
    baseStyles,
    variantStyles[variant],
    interactiveStyles,
    selectedStyles,
    disabledStyles,
    className
  );
  
  // Handle click
  const handleClick = () => {
    if (clickable && !disabled && onClick) {
      onClick();
    }
  };
  
  // Handle keyboard interaction
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (clickable && !disabled && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cardStyles}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={clickable && !disabled ? 0 : undefined}
      role={clickable ? 'button' : undefined}
      aria-disabled={disabled}
    >
      {/* Header */}
      {(title || subtitle || headerActions) && (
        <div className="flex items-start justify-between p-4 pb-2">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold text-white truncate">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center space-x-2 ml-4">
              {headerActions}
            </div>
          )}
        </div>
      )}
      
      {/* Content */}
      <div className={cn(
        'p-4',
        (title || subtitle || headerActions) && 'pt-2'
      )}>
        {children}
      </div>
    </div>
  );
}
