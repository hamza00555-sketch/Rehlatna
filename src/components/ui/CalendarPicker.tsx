"use client";

import { useMemo, useState } from "react";
import { addDays, parseIso, toIso } from "@/domain/dates";
import { appConfig } from "@/config/app";
import { IconButton } from "./IconButton";
import { m } from "@/i18n";
import { cx } from "@/lib/cx";
import styles from "./CalendarPicker.module.css";

interface Props {
  value?: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  today: string;
  label: string;
}

const monthFormatter = new Intl.DateTimeFormat(appConfig.dateLocale, { month: "long", year: "numeric", timeZone: "UTC" });
const weekdayFormatter = new Intl.DateTimeFormat(appConfig.dateLocale, { weekday: "short", timeZone: "UTC" });
const fullFormatter = new Intl.DateTimeFormat(appConfig.dateLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Saturday-first week, as used across the Arabian Peninsula. */
const WEEK_START = 6;

/** DateSelector (calendar variant): RTL month grid with Latin numerals. */
export function CalendarPicker({ value, onChange, min, max, today, label }: Props) {
  const initial = parseIso(value ?? today);
  const [view, setView] = useState({ year: initial.getUTCFullYear(), month: initial.getUTCMonth() });

  const grid = useMemo(() => {
    const first = new Date(Date.UTC(view.year, view.month, 1));
    const daysInMonth = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
    const offset = (first.getUTCDay() - WEEK_START + 7) % 7;
    const cells: (string | null)[] = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toIso(new Date(Date.UTC(view.year, view.month, d))));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view]);

  const weekdays = useMemo(() => {
    const base = parseIso("2024-01-06"); // a Saturday
    return Array.from({ length: 7 }, (_, i) => weekdayFormatter.format(parseIso(addDays(toIso(base), i))));
  }, []);

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(view.year, view.month + delta, 1));
    setView({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  };

  const monthLabel = monthFormatter.format(new Date(Date.UTC(view.year, view.month, 1)));

  return (
    <div className={styles.calendar} role="group" aria-label={label}>
      <div className={styles.header}>
        <IconButton icon="back" label={m.today.previousWeek} variant="quiet" onClick={() => shift(-1)} />
        <span className={cx(styles.month, "num")} dir="rtl">
          {monthLabel}
        </span>
        <IconButton icon="forward" label={m.today.nextWeek} variant="quiet" onClick={() => shift(1)} />
      </div>
      <div className={styles.weekdays} aria-hidden="true">
        {weekdays.map((w) => (
          <span key={w} className={styles.weekday}>
            {w}
          </span>
        ))}
      </div>
      <div className={styles.grid}>
        {grid.map((iso, i) =>
          iso ? (
            <button
              key={iso}
              type="button"
              className={cx(styles.day, iso === value && styles.selected, iso === today && styles.today)}
              disabled={(min !== undefined && iso < min) || (max !== undefined && iso > max)}
              onClick={() => onChange(iso)}
              aria-pressed={iso === value}
              aria-label={fullFormatter.format(parseIso(iso))}
            >
              <span className="num">{parseIso(iso).getUTCDate()}</span>
            </button>
          ) : (
            <span key={`empty-${i}`} className={styles.empty} />
          ),
        )}
      </div>
    </div>
  );
}
