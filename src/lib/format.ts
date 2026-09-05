import { appConfig } from "@/config/app";
import { daysBetween, parseIso } from "@/domain/dates";
import { m } from "@/i18n";

/**
 * Formatting for mixed Arabic/Latin runs. Numbers and dates always use Latin
 * digits (design rule) and are rendered inside isolated bidi spans by the
 * <Num> / <DateText> components.
 */

const intFormatter = new Intl.NumberFormat(appConfig.numberLocale, { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat(appConfig.numberLocale, { maximumFractionDigits: 2 });

export function fmtInt(n: number): string {
  return intFormatter.format(Math.round(n));
}

export function fmtDecimal(n: number): string {
  return decimalFormatter.format(n);
}

export function fmtPercent(ratio: number): string {
  return `${fmtInt(Math.round(ratio * 100))}%`;
}

const currencyCache = new Map<string, Intl.NumberFormat>();
export function fmtCurrency(amount: number, currencyCode: string): string {
  let f = currencyCache.get(currencyCode);
  if (!f) {
    try {
      f = new Intl.NumberFormat(appConfig.numberLocale, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      });
    } catch {
      f = intFormatter;
    }
    currencyCache.set(currencyCode, f);
  }
  return f.format(amount);
}

export type DateStyle = "long" | "short" | "weekday" | "monthDay";

const dateFormatters: Record<DateStyle, Intl.DateTimeFormat> = {
  long: new Intl.DateTimeFormat(appConfig.dateLocale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
  short: new Intl.DateTimeFormat(appConfig.dateLocale, { day: "numeric", month: "short", timeZone: "UTC" }),
  weekday: new Intl.DateTimeFormat(appConfig.dateLocale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
  monthDay: new Intl.DateTimeFormat(appConfig.dateLocale, { day: "numeric", month: "long", timeZone: "UTC" }),
};

export function fmtDate(iso: string, style: DateStyle = "long"): string {
  return dateFormatters[style].format(parseIso(iso));
}

export function fmtTime(hhmm: string): string {
  const [h, min] = hhmm.split(":").map(Number);
  if (h === undefined || min === undefined || Number.isNaN(h)) return hhmm;
  const d = new Date(Date.UTC(2000, 0, 1, h, min));
  return new Intl.DateTimeFormat(appConfig.numberLocale, { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(d);
}

/** "اليوم" / "غداً" / "بعد ٣ أيام" / "قبل يومين" */
export function relativeDay(iso: string, today: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return m.common.today;
  if (diff === 1) return m.common.tomorrow;
  if (diff > 1) return m.common.inDays(diff);
  return m.common.daysAgo(-diff);
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return m.today.greetingMorning;
  if (hour < 17) return m.today.greetingAfternoon;
  return m.today.greetingEvening;
}
