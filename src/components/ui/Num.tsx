import { fmtCurrency, fmtDate, fmtDecimal, fmtInt, fmtPercent, fmtTime, type DateStyle } from "@/lib/format";
import { cx } from "@/lib/cx";

/**
 * Isolated bidi runs for Latin numerals inside Arabic text. Tabular numerals
 * come from the `.num` global rule.
 */

interface NumProps {
  value: number;
  format?: "int" | "decimal" | "percent" | "currency";
  currency?: string;
  className?: string;
}

export function Num({ value, format = "int", currency = "SAR", className }: NumProps) {
  const text =
    format === "currency"
      ? fmtCurrency(value, currency)
      : format === "percent"
        ? fmtPercent(value)
        : format === "decimal"
          ? fmtDecimal(value)
          : fmtInt(value);
  return (
    <bdi className={cx("num", className)} dir="ltr">
      {text}
    </bdi>
  );
}

export function DateText({ iso, style = "long", className }: { iso: string; style?: DateStyle; className?: string }) {
  return (
    <bdi className={cx("num", className)} dir="rtl">
      {fmtDate(iso, style)}
    </bdi>
  );
}

export function TimeText({ value, className }: { value: string; className?: string }) {
  return (
    <bdi className={cx("num", className)} dir="ltr">
      {fmtTime(value)}
    </bdi>
  );
}
