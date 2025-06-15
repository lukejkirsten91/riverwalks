import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface InlineNumberEditProps {
  value: number;
  onSave: (value: number) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
  decimals?: number;
}

export function InlineNumberEdit({
  value,
  onSave,
  placeholder,
  className = '',
  min,
  max,
  step = 0.1,
  suffix = '',
  disabled = false,
  decimals = 1,
}: InlineNumberEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format number for display
  const formatValue = (num: number) => {
    return num.toFixed(decimals);
  };

  // Update edit value when prop value changes
  useEffect(() => {
    setEditValue(formatValue(value));
  }, [value, decimals]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(formatValue(value));
  };

  const handleSave = async () => {
    const numValue = parseFloat(editValue);
    
    if (isNaN(numValue)) {
      handleCancel();
      return;
    }

    // Apply constraints
    let constrainedValue = numValue;
    if (min !== undefined && numValue < min) {
      constrainedValue = min;
    }
    if (max !== undefined && numValue > max) {
      constrainedValue = max;
    }

    if (constrainedValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(constrainedValue);
      setIsEditing(false);
    } catch (error) {
      setEditValue(formatValue(value));
      console.error('Failed to save:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(formatValue(value));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty, numbers, and decimal point
    if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
      setEditValue(inputValue);
    }
  };

  if (isEditing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={editValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder={placeholder}
            className="input-modern pr-8"
            disabled={isLoading}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="p-1 text-success hover:bg-success/10 rounded transition-colors disabled:opacity-50"
            title="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="p-1 text-muted-foreground hover:bg-muted/50 rounded transition-colors disabled:opacity-50"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      className={`cursor-text hover:bg-muted/30 rounded px-2 py-1 transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${className}`}
      title={disabled ? '' : 'Click to edit'}
    >
      {formatValue(value)}{suffix}
    </div>
  );
}