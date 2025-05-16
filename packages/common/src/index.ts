export * from './types.js';

export function timeStringToDate(timeStr: string): Date {
  // Extract numeric value and unit from the string
  const match = timeStr.match(/^(\d+)([smhdw])$/i);

  if (!match) {
    throw new Error(`Invalid time string format: ${timeStr}`);
  }

  const amount = parseInt(match[1] as string, 10);
  const unit = match[2]!.toLowerCase();

  // Convert units to milliseconds
  const millisecondsPerUnit: { [key: string]: number } = {
    s: 1000, // seconds
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days (exactly what you requested)
    w: 7 * 24 * 60 * 60 * 1000, // weeks
  };

  if (!(unit in millisecondsPerUnit)) {
    throw new Error(`Unsupported time unit: ${unit}`);
  }

  // Calculate total milliseconds and create new Date
  const totalMs = amount * millisecondsPerUnit[unit]!;
  return new Date(Date.now() + totalMs);
}
