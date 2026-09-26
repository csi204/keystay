export * from './r2';
export * from './crypto';

/**
 * Formats a currency amount into standard 2-decimal string
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return num.toFixed(2);
}

/**
 * Computes standard 7% VAT
 */
export function calculateTax(amount: number | string, taxRate = 0.07): { taxAmount: string; netAmount: string } {
  const base = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(base)) return { taxAmount: '0.00', netAmount: '0.00' };
  const tax = base * taxRate;
  const net = base + tax;
  return {
    taxAmount: tax.toFixed(2),
    netAmount: net.toFixed(2),
  };
}
