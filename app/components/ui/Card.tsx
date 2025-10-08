'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
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

interface CardSubComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card Component
 * 
 * Reusable card component for displaying content in a consistent container.
 * Supports different variants for different use cases (classroom cards, participant cards, etc.).
 * 
 * Can be used as a simple component with title/subtitle props or as a compound component
 * with CardHeader, CardTitle, CardDescription, CardContent, and CardFooter sub-components.
 * 
 * Features:
 * - Multiple variants with appropriate styling
 * - Clickable state with hover effects
 * - Selected and disabled states
 * - Header with title, subtitle, and actions
 * - Consistent spacing and borders
 * - Compound component pattern for flexible layouts
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
  headerActions,
  ...props
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
      {...props}
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

/**
 * CardHeader Component
 * 
 * Container for card header content including title and description.
 */
export function CardHeader({ children, className, ...props }: CardSubComponentProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

/**
 * CardTitle Component
 * 
 * Displays the main title of the card with consistent typography.
 */
export function CardTitle({ children, className, ...props }: CardSubComponentProps) {
  return (
    <h3 className={cn('text-2xl font-semibold leading-none tracking-tight text-white', className)} {...props}>
      {children}
    </h3>
  );
}

/**
 * CardDescription Component
 * 
 * Displays secondary descriptive text below the title.
 */
export function CardDescription({ children, className, ...props }: CardSubComponentProps) {
  return (
    <p className={cn('text-sm text-gray-400', className)} {...props}>
      {children}
    </p>
  );
}

/**
 * CardContent Component
 * 
 * Main content area of the card.
 */
export function CardContent({ children, className, ...props }: CardSubComponentProps) {
  return (
    <div className={cn('p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

/**
 * CardFooter Component
 * 
 * Footer area for actions and additional information.
 */
export function CardFooter({ children, className, ...props }: CardSubComponentProps) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props}>
      {children}
    </div>
  );
}
