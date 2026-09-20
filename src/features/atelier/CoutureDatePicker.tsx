'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const fieldFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
});

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromIso(value: string) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return new Date(year, month - 1, day);
}

function sameDay(a: Date, b: Date) {
  return toIso(a) === toIso(b);
}

export function CoutureDatePicker({
  id,
  name,
  label,
}: {
  id: string;
  name: string;
  label: string;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [focusDate, setFocusDate] = useState(today);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialogId = useId();

  const days = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const leading = (new Date(year, month, 1).getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - leading + 1;
      return day >= 1 && day <= count ? new Date(year, month, day) : null;
    });
  }, [visibleMonth]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selector = `[data-calendar-date="${toIso(focusDate)}"]`;
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(selector)?.focus());
  }, [focusDate, open, visibleMonth]);

  function showMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function moveFocus(date: Date, amount: number) {
    const next = new Date(date);
    next.setDate(date.getDate() + amount);
    if (next < today) return;
    setFocusDate(next);
    setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  function choose(date: Date) {
    setValue(toIso(date));
    setFocusDate(date);
    setOpen(false);
    trigger.current?.focus();
  }

  const selected = value ? fromIso(value) : null;
  const currentMonth =
    visibleMonth.getFullYear() === today.getFullYear() &&
    visibleMonth.getMonth() === today.getMonth();

  return (
    <div className="f couture-date" ref={root}>
      <label className="lab" htmlFor={id}>{label}</label>
      <input type="hidden" name={name} value={value} />
      <button
        ref={trigger}
        className="couture-date__trigger"
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => {
          const next = selected ?? today;
          setFocusDate(next);
          setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
          setOpen((current) => !current);
        }}
      >
        <span className={selected ? undefined : 'couture-date__placeholder'}>
          {selected ? fieldFormatter.format(selected) : 'Choose a date'}
        </span>
        <span className="couture-date__icon" aria-hidden="true">
          <span />
        </span>
      </button>

      {open ? (
        <div
          className="couture-date__popover"
          id={dialogId}
          role="dialog"
          aria-modal="false"
          aria-label={`${label} calendar`}
          onKeyDown={(event) => {
            const target = event.target as HTMLElement;
            const raw = target.dataset.calendarDate;
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              trigger.current?.focus();
              return;
            }
            if (!raw) return;
            const date = fromIso(raw);
            const moves: Record<string, number> = {
              ArrowLeft: -1,
              ArrowRight: 1,
              ArrowUp: -7,
              ArrowDown: 7,
            };
            const move = moves[event.key];
            if (move !== undefined) {
              event.preventDefault();
              moveFocus(date, move);
            } else if (event.key === 'Home') {
              event.preventDefault();
              moveFocus(date, -((date.getDay() + 6) % 7));
            } else if (event.key === 'End') {
              event.preventDefault();
              moveFocus(date, 6 - ((date.getDay() + 6) % 7));
            } else if (event.key === 'PageUp' || event.key === 'PageDown') {
              event.preventDefault();
              const next = new Date(date);
              next.setMonth(date.getMonth() + (event.key === 'PageUp' ? -1 : 1));
              if (next >= today) {
                setFocusDate(next);
                setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
              }
            }
          }}
        >
          <div className="couture-date__head">
            <button
              type="button"
              aria-label="Previous month"
              disabled={currentMonth}
              onClick={() => showMonth(-1)}
            >
              ←
            </button>
            <strong aria-live="polite">{monthFormatter.format(visibleMonth)}</strong>
            <button type="button" aria-label="Next month" onClick={() => showMonth(1)}>
              →
            </button>
          </div>
          <div className="couture-date__week" aria-hidden="true">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="couture-date__grid" role="grid" aria-label={monthFormatter.format(visibleMonth)}>
            {days.map((date, index) => {
              if (!date) return <span className="couture-date__blank" key={`blank-${index}`} />;
              const disabled = date < today;
              const isSelected = selected ? sameDay(date, selected) : false;
              const isToday = sameDay(date, today);
              return (
                <button
                  className="couture-date__day"
                  data-calendar-date={toIso(date)}
                  key={toIso(date)}
                  type="button"
                  role="gridcell"
                  disabled={disabled}
                  aria-label={dayFormatter.format(date)}
                  aria-selected={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  tabIndex={sameDay(date, focusDate) ? 0 : -1}
                  onClick={() => choose(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="couture-date__foot">
            <span>Preference only. The atelier confirms availability.</span>
            {selected ? (
              <button type="button" onClick={() => setValue('')}>Clear</button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
