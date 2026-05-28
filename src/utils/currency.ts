/**
 * Currency Utilities
 * Best practices for handling currency formatting across the application
 */

// Supported currencies with their symbols
const CURRENCY_SYMBOLS: Record<string, string> = {
  'EUR': '€',
  'USD': '$',
  'GBP': '£',
  'JPY': '¥',
  'CHF': 'CHF',
  'CAD': 'C$',
  'AUD': 'A$',
  'NZD': 'NZ$',
  'SEK': 'kr',
  'NOK': 'kr',
  'DKK': 'kr',
};

/**
 * Get currency symbol from currency code
 * @param currencyCode - ISO 4217 currency code (e.g., 'EUR', 'USD')
 * @returns Currency symbol or code if not found
 */
export const getCurrencySymbol = (currencyCode: string): string => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};

/**
 * Format amount as currency with symbol and thousands separator
 * Best practice: Reusable across all components
 * @param amount - Numeric amount to format
 * @param currencyCode - ISO 4217 currency code
 * @returns Formatted string (e.g., '€1,234.56')
 */
export const formatCurrency = (amount: number, currencyCode: string): string => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${amount?.toLocaleString()}`;
};

/**
 * Get currency name from code
 * @param currencyCode - ISO 4217 currency code
 * @returns Full currency name
 */
export const getCurrencyName = (currencyCode: string): string => {
  const names: Record<string, string> = {
    'EUR': 'Euro',
    'USD': 'US Dollar',
    'GBP': 'British Pound',
    'JPY': 'Japanese Yen',
    'CHF': 'Swiss Franc',
    'CAD': 'Canadian Dollar',
    'AUD': 'Australian Dollar',
    'NZD': 'New Zealand Dollar',
  };
  return names[currencyCode] || currencyCode;
};