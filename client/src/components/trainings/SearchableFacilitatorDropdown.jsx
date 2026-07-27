import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Search } from 'lucide-react';
import { searchReservistsBySquadrons } from '@/services/organizationService';

const inputCls =
  'w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all';

function useDebouncedCallback(fn, delayMs) {
  const ref = useRef(null);
  return useCallback(
    (...args) => {
      if (ref.current) clearTimeout(ref.current);
      ref.current = setTimeout(() => {
        ref.current = null;
        fn(...args);
      }, delayMs);
    },
    [fn, delayMs],
  );
}

function formatReservistLabel(r) {
  const parts = [];
  if (r.rank) parts.push(r.rank);
  parts.push(`${r.last_name}, ${r.first_name}`);
  return parts.join(' ');
}

function formatReservistSub(r) {
  return r.service_number || '';
}

export default function SearchableFacilitatorDropdown({ value, onChange, onSelect, squadronIds, disabled }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const hasSquadrons = Array.isArray(squadronIds) && squadronIds.length > 0;

  const fetchReservists = useCallback(async (searchTerm) => {
    if (!hasSquadrons) {
      setOptions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const r = await searchReservistsBySquadrons(squadronIds, searchTerm || '', 50);
    setLoading(false);
    if (r.success) {
      setOptions(r.reservists || []);
      setActiveIndex(0);
      setOpen(true);
    }
  }, [squadronIds, hasSquadrons]);

  const debouncedFetch = useDebouncedCallback(fetchReservists, 300);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectReservist = (r) => {
    const label = formatReservistLabel(r);
    onChange(label);
    if (onSelect) {
      onSelect({
        id: r.id,
        userId: r.user_id,
        label,
        rank: r.rank,
        firstName: r.first_name,
        lastName: r.last_name,
        serviceNumber: r.service_number,
      });
    }
    setOpen(false);
    setQuery('');
    setOptions([]);
  };

  const clearSelection = () => {
    onChange('');
    if (onSelect) {
      onSelect(null);
    }
    setQuery('');
    setOptions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setQuery(val);
    if (!val.trim()) {
      setOptions([]);
      setOpen(false);
      return;
    }
    debouncedFetch(val);
  };

  const handleFocus = () => {
    if (hasSquadrons && !value) {
      fetchReservists('');
    }
  };

  const handleKeyDown = (e) => {
    if (!open || !options.length) {
      if (e.key === 'ArrowDown' && hasSquadrons && !value) {
        e.preventDefault();
        fetchReservists(query);
      } else if (e.key === 'Enter') {
        // Nothing to select yet (still debouncing/loading, or zero results) —
        // swallow Enter here so it never bubbles up and submits the parent
        // training form.
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[activeIndex]) {
        selectReservist(options[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-autocomplete="list"
          aria-controls="facilitator-listbox"
          aria-activedescendant={open && options[activeIndex] ? `facilitator-opt-${options[activeIndex].id}` : undefined}
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className={`${inputCls} pr-8`}
          placeholder={hasSquadrons ? 'Search facilitator by name, rank, or service number...' : 'Add squadrons in Target participants to search facilitators...'}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            aria-label="Clear facilitator"
          >
            <X size={14} />
          </button>
        )}
        {!value && (
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        )}
      </div>

      {open && !disabled && (
        <ul
          id="facilitator-listbox"
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg text-sm"
        >
          {loading ? (
            <li className="px-3 py-2.5 text-xs text-neutral-500 text-center">Searching…</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-neutral-500 text-center">
              {hasSquadrons ? 'No reservists found.' : 'Add squadrons first to search.'}
            </li>
          ) : (
            options.map((r, i) => (
              <li
                key={r.id}
                id={`facilitator-opt-${r.id}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`px-3 py-2 cursor-pointer ${
                  i === activeIndex
                    ? 'bg-indigo-50 dark:bg-indigo-950/50'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
                onClick={() => selectReservist(r)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {formatReservistLabel(r)}
                </span>
                {formatReservistSub(r) && (
                  <span className="text-neutral-500 dark:text-neutral-400 ml-2 text-xs">
                    {formatReservistSub(r)}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}