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
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    titleColor: 'text-green-800',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-800',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
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
          p-4 flex items-start gap-3
        `}
      >
        {/* Icon */}
        <Icon className={`w-5 h-5 ${config.iconColor} shrink-0 mt-0.5`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${config.titleColor} text-sm`}>
            {title}
          </h4>
          {message && (
            <p className="text-gray-700 text-xs mt-1 font-medium">
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