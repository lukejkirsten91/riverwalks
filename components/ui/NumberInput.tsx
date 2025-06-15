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
  const [internalValue, setInternalValue] = useState(
    value === '' || value === 0 || value === '0' ? '' : value.toString()
  );

  // Update internal value when external value changes
  useEffect(() => {
    // Always show zeros as empty fields with visual hint
    if (value === '' || value === 0 || value === '0') {
      setInternalValue('');
    } else {
      setInternalValue(value.toString());
    }
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
    // On blur, clean up partial inputs but allow empty values
    if (
      internalValue === '.' ||
      internalValue === '-' ||
      internalValue === '-.'
    ) {
      // Clean up partial inputs to empty
      setInternalValue('');
      onChange('0'); // Empty means 0 for calculations
    } else if (internalValue === '') {
      // Empty field means 0 for calculations but shows as empty
      onChange('0');
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={internalValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className || "input-modern"}
        required={required}
        disabled={disabled}
      />
      {/* Show "0" as a visual hint when field is empty */}
      {internalValue === '' && (
        <div className="absolute inset-0 flex items-center px-4 pointer-events-none text-muted-foreground">
          0
        </div>
      )}
    </div>
  );
}
