import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Target, Loader2 } from 'lucide-react';
import { useLocationSuggestions, type LocationSuggestion } from '../../hooks/useLocationSuggestions';

interface StartingLocationInputProps {
  value: string;
  onChange: (value: string) => void;
  onDetect: () => void;
  detecting: boolean;
  isDark?: boolean;
  placeholder?: string;
  maxLength?: number;
}

/**
 * "Starting from" field: free-text input with worldwide place suggestions
 * (Photon autocomplete) and a geolocation Detect button. Selecting a
 * suggestion is optional — anything typed is accepted and validated at submit.
 */
const StartingLocationInput: React.FC<StartingLocationInputProps> = ({
  value,
  onChange,
  onDetect,
  detecting,
  isDark = false,
  placeholder = 'Your location...',
  maxLength = 40,
}) => {
  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  // Suppresses the dropdown right after a selection, until the user types again
  const [suppressed, setSuppressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { suggestions, loading } = useLocationSuggestions(open ? value : '');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSuppressed(false);
    onChange(e.target.value);
    setOpen(true);
    setHighlightedIdx(-1);
  };

  const handleSelect = (s: LocationSuggestion) => {
    setSuppressed(true);
    onChange(s.label.slice(0, maxLength));
    setOpen(false);
    setHighlightedIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else setHighlightedIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && highlightedIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIdx]);
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

  const showDropdown = open && !suppressed && value.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative">
      <MapPin
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-500 pointer-events-none z-10"
      />

      <input
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        onChange={handleInputChange}
        onFocus={() => { if (!suppressed) setOpen(true); }}
        onBlur={e => {
          if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full pl-10 pr-24 py-3 rounded-xl border transition-colors outline-none focus:ring-2 focus:ring-sky-500/20 ${
          isDark
            ? 'bg-slate-800 text-slate-300 border-slate-700 placeholder:text-slate-500'
            : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'
        }`}
      />

      <button
        type="button"
        onClick={onDetect}
        disabled={detecting}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-sky-100 text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {detecting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Target size={14} />
        )}
        {detecting ? 'Detecting…' : 'Detect'}
      </button>

      {showDropdown && (suggestions.length > 0 || loading) && (
        <ul
          ref={listRef}
          role="listbox"
          className={`absolute z-50 w-full mt-1 rounded-xl border shadow-xl overflow-y-auto max-h-64 ${
            isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
          }`}
        >
          {loading && suggestions.length === 0 && (
            <li className={`px-4 py-3 text-sm text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Loader2 size={14} className="inline animate-spin mr-1.5" />
              Searching…
            </li>
          )}
          {suggestions.map((s, idx) => {
            const isActive = idx === highlightedIdx;
            return (
              <li
                key={s.label}
                role="option"
                aria-selected={isActive}
                data-option=""
                onMouseDown={() => handleSelect(s)}
                onMouseEnter={() => setHighlightedIdx(idx)}
                className={`flex items-center gap-2.5 px-4 py-2 cursor-pointer transition-colors ${
                  isActive
                    ? isDark
                      ? 'bg-sky-900/40 text-sky-300'
                      : 'bg-sky-50 text-sky-700'
                    : isDark
                    ? 'text-slate-300 hover:bg-slate-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <MapPin size={13} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                <span className="text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>, {s.country}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default StartingLocationInput;
