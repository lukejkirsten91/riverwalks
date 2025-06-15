import React, { useState, useEffect } from 'react';

interface NumberInputProps {
  value: number | string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step = 0.1,
  className = '',
  required = false,
  disabled = false,
}: NumberInputProps) {
  const [internalValue, setInternalValue] = useState(value.toString());

  // Update internal value when external value changes
  useEffect(() => {
    setInternalValue(value.toString());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty string for natural deletion
    if (inputValue === '') {
      setInternalValue('');
      onChange('');
      return;
    }

    // Allow partial inputs like ".", "-", "0.", etc.
    if (inputValue === '.' || inputValue === '-' || inputValue === '-.') {
      setInternalValue(inputValue);
      return;
    }

    // Validate numeric input
    const numericRegex = /^-?\d*\.?\d*$/;
    if (numericRegex.test(inputValue)) {
      setInternalValue(inputValue);

      // Only call onChange with valid numbers
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        // Apply min/max constraints if specified
        let constrainedValue = numValue;
        if (min !== undefined && numValue < min) {
          constrainedValue = min;
        }
        if (max !== undefined && numValue > max) {
          constrainedValue = max;
        }

        if (constrainedValue !== numValue) {
          setInternalValue(constrainedValue.toString());
        }

        onChange(constrainedValue.toString());
      }
    }
  };

  const handleBlur = () => {
    // On blur, ensure we have a valid number or empty string
    if (
      internalValue === '' ||
      internalValue === '.' ||
      internalValue === '-' ||
      internalValue === '-.'
    ) {
      if (required) {
        // Reset to 0 if required and empty
        setInternalValue('0');
        onChange('0');
      } else {
        setInternalValue('');
        onChange('');
      }
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      required={required}
      disabled={disabled}
    />
  );
}
