import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function LoadingSpinner({ 
  size = 'md', 
  className = '', 
  text 
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-current`} />
      {text && (
        <span className="text-sm text-current">{text}</span>
      )}
    </div>
  );
}

// Button loading state component
interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
  loadingText?: string;
  [key: string]: any;
}

export function LoadingButton({ 
  loading, 
  children, 
  className = '', 
  loadingText,
  ...props 
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText && <span>{loadingText}</span>}
        </div>
      ) : (
        children
      )}
    </button>
  );
}