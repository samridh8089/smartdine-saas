// General Utilities for SmartDine QR

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Formats a number as Indian Rupee (INR) currency with standard en-IN numbering formats.
 * e.g., 150000 -> ₹1,50,000.00
 */
export function formatPrice(price: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
