type Scalar = string | number | boolean | null | undefined;
type Row = Record<string, Scalar>;

function escapeCell(value: Scalar): string {
  if (value === null || value === undefined) return '';
  let str = typeof value === 'string' ? value : String(value);
  // Neutralize spreadsheet formula injection: a leading =, +, -, @ (or a tab/CR
  // that shifts the first cell) can execute as a formula when the CSV is opened
  // in Excel/Sheets. Prefix with an apostrophe so the cell renders as text.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  const needsQuotes = /[",\n\r]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

/**
 * Convert an array of flat objects to CSV text. Column order is derived
 * from the first row; missing keys on later rows become empty cells.
 */
export function toCSV(rows: Row[]): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]!);
  const header = columns.join(',');
  const body = rows
    .map((row) => columns.map((col) => escapeCell(row[col])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

export function downloadCSV(filename: string, rows: Row[]): void {
  const csv = toCSV(rows);
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
