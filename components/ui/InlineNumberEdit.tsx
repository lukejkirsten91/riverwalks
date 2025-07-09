import React, { useState, useRef, useEffect } from 'react';

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
    // Start with the raw number, not the formatted version
    setEditValue(value === 0 ? '' : value.toString());
  };

  const handleSave = async () => {
    // Don't save if the value is empty or just a decimal point
    if (editValue === '' || editValue === '.') {
      handleCancel();
      return;
    }
    
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
    
    // Allow empty input
    if (inputValue === '') {
      setEditValue('');
      return;
    }
    
    // Allow numbers, decimal point, and partial decimal inputs
    // This regex allows: 123, 12.3, .5, 0.5, etc.
    if (/^\d*\.?\d*$/.test(inputValue)) {
      setEditValue(inputValue);
    }
  };

  if (isEditing) {
    return (
      <div className={`relative ${className}`}>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          pattern="[0-9]*\.?[0-9]*"
          value={editValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          className="input-modern text-base min-h-[44px] w-full pr-8"
          disabled={isLoading}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            {suffix}
          </span>
        )}
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