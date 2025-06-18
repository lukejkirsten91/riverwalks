import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-success/10',
    borderColor: 'border-success/20',
    iconColor: 'text-success',
    titleColor: 'text-success',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
    iconColor: 'text-destructive',
    titleColor: 'text-destructive',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/20',
    iconColor: 'text-warning',
    titleColor: 'text-warning',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-600',
  },
};

export function Toast({
  id,
  type,
  title,
  message,
  duration = 4000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const config = typeConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto close after duration
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match the exit animation duration
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
    >
      <div
        className={`
          ${config.bgColor} ${config.borderColor} border rounded-lg shadow-modern-lg
          backdrop-blur-sm p-4 flex items-start gap-3
        `}
      >
        {/* Icon */}
        <Icon className={`w-5 h-5 ${config.iconColor} shrink-0 mt-0.5`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium ${config.titleColor} text-sm`}>
            {title}
          </h4>
          {message && (
            <p className="text-muted-foreground text-xs mt-1">
              {message}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}