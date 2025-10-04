import { useState, useRef, useEffect, ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';

interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  hidden?: boolean;
  separator?: boolean;
}

interface DropdownMenuProps {
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export function DropdownMenu({ items, align = 'right' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropup, setDropup] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const visibleItems = items.filter(item => !item.hidden);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev =>
            prev < visibleItems.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < visibleItems.length) {
            const item = visibleItems[focusedIndex];
            if (!item.disabled && !item.separator) {
              item.onClick();
              setIsOpen(false);
              setFocusedIndex(-1);
            }
          }
          break;
        case 'Tab':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, focusedIndex, visibleItems]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      setDropup(spaceBelow < 300 && spaceAbove > spaceBelow);
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setFocusedIndex(0);
    }
  };

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled && !item.separator) {
      item.onClick();
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="btn-ghost p-2 rounded-lg"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${
            dropup ? 'bottom-full mb-2' : 'top-full mt-2'
          } z-50 min-w-56 card py-2 animate-scale-in shadow-soft-lg`}
        >
          {visibleItems.map((item, index) => {
            if (item.separator) {
              return <div key={index} className="my-2 border-t border-secondary-200" />;
            }

            const isFocused = index === focusedIndex;

            return (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`w-full px-4 py-2.5 text-sm font-medium text-left flex items-center gap-3 transition-colors ${
                  item.variant === 'danger'
                    ? 'text-error-600 hover:bg-error-50'
                    : 'text-secondary-700 hover:bg-secondary-50'
                } ${
                  item.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                } ${
                  isFocused ? 'bg-secondary-50' : ''
                }`}
              >
                {item.icon && (
                  <span className={`flex-shrink-0 ${item.variant === 'danger' ? 'text-error-600' : 'text-secondary-500'}`}>
                    {item.icon}
                  </span>
                )}
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
