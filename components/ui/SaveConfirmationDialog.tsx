import React, { useState, useEffect } from 'react';
import { Save, Clock, X, ArrowLeft } from 'lucide-react';

interface SaveConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndMarkComplete: () => void;
  onSaveAndMarkInProgress: () => void;
  onLeaveWithoutSaving: () => void;
  hasUnsavedChanges: boolean;
  loading?: boolean;
}

export function SaveConfirmationDialog({
  isOpen,
  onClose,
  onSaveAndMarkComplete,
  onSaveAndMarkInProgress,
  onLeaveWithoutSaving,
  hasUnsavedChanges,
  loading = false
}: SaveConfirmationDialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setAnimationClass('dialog-enter');
    } else if (isVisible) {
      setAnimationClass('dialog-exit');
      const timer = setTimeout(() => {
        setIsVisible(false);
        setAnimationClass('');
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className={`bg-white rounded-lg max-w-md w-full p-6 shadow-xl ${animationClass}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {hasUnsavedChanges ? 'Save Changes?' : 'Leave Form?'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {hasUnsavedChanges 
                ? 'You have unsaved changes. What would you like to do?'
                : 'How would you like to update the task status?'
              }
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {hasUnsavedChanges && (
            <>
              <button
                onClick={onSaveAndMarkComplete}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-800 font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                Save and Mark Complete
              </button>
              
              <button
                onClick={onSaveAndMarkInProgress}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg text-yellow-800 font-medium transition-colors disabled:opacity-50"
              >
                <Clock className="w-5 h-5" />
                Save and Mark In Progress
              </button>
            </>
          )}
          
          {!hasUnsavedChanges && (
            <>
              <button
                onClick={onSaveAndMarkComplete}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-800 font-medium transition-colors disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                Mark Complete and Leave
              </button>
              
              <button
                onClick={onSaveAndMarkInProgress}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg text-yellow-800 font-medium transition-colors disabled:opacity-50"
              >
                <Clock className="w-5 h-5" />
                Mark In Progress and Leave
              </button>
            </>
          )}
          
          <button
            onClick={onLeaveWithoutSaving}
            disabled={loading}
            className="w-full flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-800 font-medium transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
            {hasUnsavedChanges ? 'Leave Without Saving' : 'Leave Without Updating Status'}
          </button>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}