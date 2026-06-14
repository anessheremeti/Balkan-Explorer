import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Map as MapIcon, ChevronDown } from 'lucide-react';
import {
  getDestinationOptions,
  BALKAN_DESTINATIONS,
  type DestinationOption,
} from '../../constants/allowedDestinations';

interface DestinationComboboxProps {
  value: string;
  confirmed: boolean;
  onChange: (value: string, confirmed: boolean) => void;
  isDark?: boolean;
  hasError?: boolean;
  placeholder?: string;
}

const ALL_OPTIONS = getDestinationOptions();

const DestinationCombobox: React.FC<DestinationComboboxProps> = ({
  value,
  confirmed,
  onChange,
  isDark = false,
  hasError = false,
  placeholder = 'City or country...',
}) => {
  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered: DestinationOption[] = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return ALL_OPTIONS;
    return ALL_OPTIONS.filter(
      opt =>
        opt.label.toLowerCase().includes(q) ||
        opt.country.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [value]);

  // Preserve BALKAN_DESTINATIONS display order
  const grouped: [string, DestinationOption[]][] = useMemo(() => {
    const map = new Map<string, DestinationOption[]>(
      BALKAN_DESTINATIONS.map(r => [r.country, []])
    );
    for (const opt of filtered) map.get(opt.country)?.push(opt);
    return [...map.entries()].filter(([, opts]) => opts.length > 0);
  }, [filtered]);

  // Flat list in display order for keyboard nav
  const flatList: DestinationOption[] = useMemo(
    () => grouped.flatMap(([, opts]) => opts),
    [grouped]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, false);
    setOpen(true);
    setHighlightedIdx(-1);
  };

  const handleSelect = (opt: DestinationOption) => {
    onChange(opt.value, true);
    setOpen(false);
    setHighlightedIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(i => Math.min(i + 1, flatList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      e.preventDefault();
      handleSelect(flatList[highlightedIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current || highlightedIdx < 0) return;
    const items = listRef.current.querySelectorAll<HTMLElement>('[data-option]');
    items[highlightedIdx]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIdx]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const borderColor = hasError
    ? 'border-red-400'
    : confirmed
    ? 'border-emerald-400'
    : isDark
    ? 'border-slate-700'
    : 'border-slate-200';

  return (
    <div ref={containerRef} className="relative">
      <MapIcon
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500 pointer-events-none z-10"
      />

      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onBlur={e => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full pl-10 pr-9 py-3 rounded-xl border transition-colors outline-none focus:ring-2 focus:ring-violet-500/20 ${borderColor} ${
          isDark
            ? 'bg-slate-800 text-slate-300 placeholder:text-slate-500'
            : 'bg-slate-50 text-slate-800 placeholder:text-slate-400'
        }`}
      />

      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {confirmed ? (
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
        ) : (
          <ChevronDown
            size={16}
            className={`transition-transform duration-150 ${open ? 'rotate-180' : ''} ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}
          />
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className={`absolute z-50 w-full mt-1 rounded-xl border shadow-xl overflow-y-auto max-h-64 ${
            isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
          }`}
        >
          {flatList.length === 0 ? (
            <li
              className={`px-4 py-4 text-sm text-center ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              No results — only Kosovo, Albania, North Macedonia &amp; Montenegro are supported.
            </li>
          ) : (
            grouped.map(([country, opts]) => (
              <React.Fragment key={country}>
                <li
                  className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest select-none ${
                    isDark ? 'text-slate-500 bg-slate-900/60' : 'text-slate-400 bg-slate-50'
                  }`}
                >
                  {country}
                </li>
                {opts.map(opt => {
                  const idx = flatList.indexOf(opt);
                  const isActive = idx === highlightedIdx;
                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={isActive}
                      data-option=""
                      onMouseDown={() => handleSelect(opt)}
                      onMouseEnter={() => setHighlightedIdx(idx)}
                      className={`flex items-center justify-between cursor-pointer transition-colors ${
                        opt.type === 'country' ? 'px-4 py-2 font-semibold' : 'px-6 py-1.5'
                      } ${
                        isActive
                          ? isDark
                            ? 'bg-violet-900/40 text-violet-300'
                            : 'bg-violet-50 text-violet-700'
                          : isDark
                          ? 'text-slate-300 hover:bg-slate-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-sm">{opt.label}</span>
                      {opt.type === 'country' && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          all cities
                        </span>
                      )}
                    </li>
                  );
                })}
              </React.Fragment>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default DestinationCombobox;
