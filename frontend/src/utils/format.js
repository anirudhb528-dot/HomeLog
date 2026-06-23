// Small formatting helpers shared across screens.

export function formatCurrency(amount, currency = 'USD') {
  const n = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
  } catch (_e) {
    return `$${n.toFixed(2)}`;
  }
}

export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Whole-day difference from today (negative = overdue). */
export function daysUntil(value) {
  const d = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate, status) {
  return status === 'pending' && daysUntil(dueDate) < 0;
}

/** Capitalize the first letter for display labels. */
export function titleCase(s = '') {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
