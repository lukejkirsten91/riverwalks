import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface InlineEditProps {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  disabled?: boolean;
  type?: 'text' | 'date';
}

export function InlineEdit({
  value,
  onSave,
  placeholder,
  className = '',
  inputClassName = '',
  multiline = false,
  disabled = false,
  type = 'text',
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Update edit value when prop value changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

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
    setEditValue(value);
  };

  const handleSave = async () => {
    if (editValue.trim() === '') {
      handleCancel();
      return;
    }

    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(editValue.trim());
      setIsEditing(false);
    } catch (error) {
      // Reset to original value on error
      setEditValue(value);
      console.error('Failed to save:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';
    
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <InputComponent
          ref={inputRef as any}
          type={multiline ? undefined : type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          className={`input-modern ${inputClassName} ${
            multiline ? 'min-h-[2.5rem] resize-none' : ''
          }`}
          disabled={isLoading}
          rows={multiline ? 2 : undefined}
        />
        
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
      {value || (
        <span className="text-muted-foreground italic">
          {placeholder || 'Click to edit'}
        </span>
      )}
    </div>
  );
}