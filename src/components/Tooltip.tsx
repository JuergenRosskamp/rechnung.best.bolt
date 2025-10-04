import { ReactNode, useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string | ReactNode;
  children?: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, position = 'top', className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="cursor-help inline-flex items-center"
      >
        {children || <HelpCircle className="h-4 w-4 text-gray-400 dark:text-secondary-600 hover:text-gray-600 dark:text-secondary-400" />}
      </div>

      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}>
          <div className="bg-gray-900 dark:bg-secondary-950 text-white text-sm rounded-lg px-3 py-2 shadow-lg max-w-xs">
            {content}
            <div className="absolute w-2 h-2 bg-gray-900 dark:bg-secondary-950 transform rotate-45 -z-10"
              style={{
                [position === 'top' ? 'bottom' : position === 'bottom' ? 'top' : position === 'left' ? 'right' : 'left']: '-4px',
                ...(position === 'top' || position === 'bottom' ? { left: '50%', marginLeft: '-4px' } : { top: '50%', marginTop: '-4px' })
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface FormLabelWithTooltipProps {
  label: string;
  tooltip: string;
  required?: boolean;
  htmlFor?: string;
}

export function FormLabelWithTooltip({ label, tooltip, required, htmlFor }: FormLabelWithTooltipProps) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-secondary-200 mb-1 flex items-center gap-2">
      {label}
      {required && <span className="text-red-500">*</span>}
      <Tooltip content={tooltip} position="right" />
    </label>
  );
}
