'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input label */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text to display below input */
  helperText?: string;
  /** Icon to display before input */
  icon?: React.ReactNode;
  /** Whether input is in loading state */
  loading?: boolean;
  /** Input size */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Input Component
 * 
 * Reusable input component with consistent styling, validation states,
 * and accessibility features.
 * 
 * Features:
 * - Label and error message support
 * - Icon support
 * - Loading state
 * - Different sizes
 * - Proper accessibility attributes
 */
export default function Input({
  label,
  error,
  helperText,
  icon,
  loading = false,
  size = 'md',
  className,
  id,
  ...props
}: InputProps) {
  // Generate unique ID if not provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };
  
  // Base input styles
  const baseStyles = 'w-full bg-gray-800 border rounded-md text-white placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Border styles based on state
  const borderStyles = error 
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
    : 'border-gray-600 focus:border-teal-500 focus:ring-teal-500';
  
  // Icon padding adjustment
  const iconPadding = icon ? 'pl-10' : '';
  
  // Combine all styles
  const inputStyles = cn(
    baseStyles,
    borderStyles,
    sizeStyles[size],
    iconPadding,
    className
  );

  return (
    <div className="space-y-1">
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-300"
        >
          {label}
        </label>
      )}
      
      {/* Input Container */}
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">
              {icon}
            </span>
          </div>
        )}
        
        {/* Input */}
        <input
          id={inputId}
          className={inputStyles}
          disabled={loading || props.disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : 
            helperText ? `${inputId}-helper` : 
            undefined
          }
          {...props}
        />
        
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <svg 
              className="animate-spin h-4 w-4 text-gray-400" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
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
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <p 
          id={`${inputId}-error`}
          className="text-sm text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
      
      {/* Helper Text */}
      {helperText && !error && (
        <p 
          id={`${inputId}-helper`}
          className="text-sm text-gray-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
