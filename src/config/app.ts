/**
 * Product-level configuration. Components never hardcode a brand name or a
 * currency; they read household settings, which default to these values.
 */
export const appConfig = {
  /** Working product name — overridable per deployment and per household. */
  defaultProductName: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "رحلتنا",
  /** ISO 4217 code used until a household chooses its own. */
  defaultCurrencyCode: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "SAR",
  /** Locale used for number/date formatting with Latin digits. */
  numberLocale: "ar-SA-u-nu-latn",
  dateLocale: "ar-SA-u-nu-latn-ca-gregory",
} as const;
