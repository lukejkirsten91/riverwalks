import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface SimpleToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-600',
    textColor: 'text-white',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-600',
    textColor: 'text-white',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-amber-600',
    textColor: 'text-white',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-600',
    textColor: 'text-white',
  },
};

export function SimpleToast({
  id,
  type,
  message,
  duration = 3000,
  onClose,
}: SimpleToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const config = typeConfig[type];
  const Icon = config.icon;
  
  // No need for hard-coded width calculations - let it size naturally

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
    }, 200); // Match the exit animation duration
  };

  return (
    <div
      className={`
        fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] transition-all duration-200 ease-in-out
        px-4 max-w-[90vw] sm:max-w-md
        ${isVisible && !isLeaving
          ? 'translate-y-0 opacity-100 scale-100'
          : '-translate-y-2 opacity-0 scale-95'
        }
      `}
    >
      <div
        className={`
          ${config.bgColor} ${config.textColor}
          rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 text-xs sm:text-sm font-medium
          cursor-pointer backdrop-blur-sm
        `}
        onClick={handleClose}
      >
        <Icon className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
        <span className="flex-1 text-center break-words leading-tight">{message}</span>
      </div>
    </div>
  );
}