import React, { createContext, useContext, useState, useCallback } from 'react';
import { SimpleToast } from './SimpleToast';

interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastData, 'id'>) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastData = {
      ...toast,
      id,
    };
    setToasts(prev => [...prev, newToast]);
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast({ type: 'success', message });
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast({ type: 'error', message });
  }, [showToast]);

  const showWarning = useCallback((message: string) => {
    showToast({ type: 'warning', message });
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    showToast({ type: 'info', message });
  }, [showToast]);

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Simple Toast Container - positioned at top center */}
      {toasts.map((toast) => (
        <SimpleToast
          key={toast.id}
          {...toast}
          onClose={removeToast}
        />
      ))}
    </ToastContext.Provider>
  );
}