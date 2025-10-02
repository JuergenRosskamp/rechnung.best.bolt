import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      gradient: 'from-success-500 to-success-600',
      bg: 'bg-success-50',
      text: 'text-success-900',
      border: 'border-success-200',
      iconColor: 'text-success-600',
    },
    error: {
      icon: XCircle,
      gradient: 'from-error-500 to-error-600',
      bg: 'bg-error-50',
      text: 'text-error-900',
      border: 'border-error-200',
      iconColor: 'text-error-600',
    },
    info: {
      icon: Info,
      gradient: 'from-primary-500 to-primary-600',
      bg: 'bg-primary-50',
      text: 'text-primary-900',
      border: 'border-primary-200',
      iconColor: 'text-primary-600',
    },
    warning: {
      icon: AlertTriangle,
      gradient: 'from-warning-500 to-warning-600',
      bg: 'bg-warning-50',
      text: 'text-warning-900',
      border: 'border-warning-200',
      iconColor: 'text-warning-600',
    },
  };

  const { icon: Icon, gradient, bg, text, border, iconColor } = config[type];

  return (
    <div className="toast animate-slide-down">
      <div className={`${bg} ${border} border rounded-2xl shadow-soft-lg overflow-hidden backdrop-blur-sm`}>
        <div className={`h-1 bg-gradient-to-r ${gradient}`} />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 ${iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${text}`}>{message}</p>
            </div>
            <button
              onClick={onClose}
              className={`flex-shrink-0 ${text} hover:opacity-70 transition-opacity rounded-lg p-1 hover:bg-black/5`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
