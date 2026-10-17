import React, { useState, useEffect, useRef } from 'react';
import { CalendarDaysIcon } from './Icons';

export interface DateChangeEvent {
  target: {
    name?: string;
    value: string;
  };
}

export interface DateInputProps {
  id?: string;
  name?: string;
  value?: string; // Expects YYYY-MM-DD (or empty string)
  onChange?: (e: DateChangeEvent | any) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * DateInput component that strictly enforces DD/MM/AAAA format for display and keyboard input,
 * while maintaining a standard YYYY-MM-DD value interface for forms and databases.
 * Also includes a native date-picker button that syncs smoothly.
 */
export const DateInput: React.FC<DateInputProps> = ({
  id,
  name,
  value = '',
  onChange,
  required = false,
  disabled = false,
  placeholder = 'dd/mm/aaaa',
  className = '',
  autoFocus = false,
}) => {
  // Convert standard YYYY-MM-DD to DD/MM/AAAA display string
  const toDisplay = (isoStr?: string): string => {
    if (!isoStr) return '';
    const clean = isoStr.trim().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split('-');
      return `${d}/${m}/${y}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
      return clean;
    }
    return clean;
  };

  const [text, setText] = useState<string>(() => toDisplay(value));
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(toDisplay(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d]/g, ''); // only keep numbers
    if (raw.length > 8) raw = raw.slice(0, 8);

    // Format as DD/MM/AAAA as the user types
    let formatted = raw;
    if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`;
    } else if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }

    setText(formatted);

    // If complete DD/MM/AAAA (10 characters: 2 + 1 + 2 + 1 + 4)
    if (formatted.length === 10) {
      const [d, m, y] = formatted.split('/');
      const dayNum = parseInt(d, 10);
      const monthNum = parseInt(m, 10);
      const yearNum = parseInt(y, 10);

      if (yearNum >= 1900 && yearNum <= 2100 && monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        const isoValue = `${y}-${m}-${d}`;
        onChange?.({ target: { name, value: isoValue } });
        return;
      }
    }

    // If cleared
    if (formatted.length === 0) {
      onChange?.({ target: { name, value: '' } });
    }
  };

  const handleBlur = () => {
    // If not a valid full date on blur, revert to current prop value to avoid broken partial text
    if (text.length > 0 && text.length < 10) {
      setText(toDisplay(value));
    } else if (text.length === 10) {
      const [d, m, y] = text.split('/');
      const dayNum = parseInt(d, 10);
      const monthNum = parseInt(m, 10);
      const yearNum = parseInt(y, 10);
      if (!(yearNum >= 1900 && yearNum <= 2100 && monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31)) {
        setText(toDisplay(value));
      }
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIso = e.target.value; // YYYY-MM-DD
    setText(toDisplay(newIso));
    onChange?.({ target: { name, value: newIso } });
  };

  const openPicker = () => {
    if (disabled) return;
    try {
      if (hiddenDateRef.current && 'showPicker' in HTMLInputElement.prototype) {
        (hiddenDateRef.current as any).showPicker();
      } else {
        hiddenDateRef.current?.focus();
        hiddenDateRef.current?.click();
      }
    } catch {
      hiddenDateRef.current?.focus();
    }
  };

  // Separate wrapper-level classes (margin, width, flex) from input-level classes
  const isWrapperClass = (c: string) => /^(mt-|mb-|my-|m-|w-|max-w-|min-w-|flex-|inline-|self-)/.test(c);
  const classList = className ? className.trim().split(/\s+/) : [];
  const wrapperCustomClasses = classList.filter(isWrapperClass).join(' ');
  const inputCustomClasses = classList.filter(c => !isWrapperClass(c)).join(' ');
  const hasWidth = classList.some(c => /^(w-|max-w-|min-w-|flex-1)/.test(c));

  return (
    <div className={`relative flex items-center ${hasWidth ? '' : 'w-full'} ${wrapperCustomClasses}`.trim()}>
      <input
        type="text"
        id={id}
        name={name}
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={10}
        inputMode="numeric"
        className={`block w-full px-3 py-2.5 min-h-[44px] bg-background border border-border rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base sm:text-sm text-text-primary placeholder:text-text-secondary/50 disabled:opacity-50 transition-all pr-11 ${inputCustomClasses}`.trim()}
      />

      {/* Button to open calendar picker (min 44px touch target) */}
      <button
        type="button"
        tabIndex={-1}
        onClick={openPicker}
        disabled={disabled}
        aria-label="Abrir calendario"
        className="absolute right-0 top-0 bottom-0 w-11 flex items-center justify-center text-text-secondary hover:text-primary active:scale-95 transition-colors disabled:opacity-40"
      >
        <CalendarDaysIcon className="w-5 h-5" />
      </button>

      {/* Hidden native input to provide calendar dropdown without overriding format */}
      <input
        ref={hiddenDateRef}
        type="date"
        tabIndex={-1}
        value={value ? value.split('T')[0] : ''}
        onChange={handlePickerChange}
        disabled={disabled}
        className="sr-only"
        aria-hidden="true"
      />
    </div>
  );
};

export default DateInput;
