import { useState, useEffect } from "react";

const CURRENCY_KEY = "medicore_currency_code";

export const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", flag: "🇸🇦" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", flag: "🇨🇦" },
];

export function getCurrencyCode(): string {
  try { return localStorage.getItem(CURRENCY_KEY) || "INR"; } catch { return "INR"; }
}

export function setCurrencyCode(code: string) {
  try {
    localStorage.setItem(CURRENCY_KEY, code);
    window.dispatchEvent(new StorageEvent("storage", { key: CURRENCY_KEY, newValue: code }));
  } catch {}
}

export function getCurrencySymbol(code?: string): string {
  const c = CURRENCIES.find(c => c.code === (code || getCurrencyCode()));
  return c?.symbol ?? "₹";
}

export function formatMoney(amount: number | string, code?: string): string {
  const sym = getCurrencySymbol(code);
  const num = Number(amount);
  if (isNaN(num)) return `${sym}0`;
  return `${sym}${num.toLocaleString()}`;
}

export function useCurrency() {
  const [code, setCode] = useState(getCurrencyCode);

  useEffect(() => {
    function handler(e: StorageEvent) {
      if (e.key === CURRENCY_KEY || !e.key) setCode(getCurrencyCode());
    }
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const sym = getCurrencySymbol(code);

  return {
    code,
    symbol: sym,
    format: (amount: number | string) => formatMoney(amount, code),
    currencies: CURRENCIES,
  };
}
