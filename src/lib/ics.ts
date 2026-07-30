// Utilities to build and download .ics calendar files (RFC 5545).

const pad = (n: number) => String(n).padStart(2, '0');

/** Formats a Date as a UTC iCalendar timestamp: 20260730T143500Z */
export const toIcsUtc = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;

/** Escapes text per RFC 5545 (commas, semicolons, backslashes, newlines). */
export const escapeIcsText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');

/** Folds long lines to 75 octets as required by the spec. */
const foldLine = (line: string) => {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest.length) parts.push(` ${rest}`);
  return parts.join('\r\n');
};

export interface IcsEventInput {
  uid: string;
  start: Date;
  end: Date;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

export const buildIcsCalendar = (events: IcsEventInput[]) => {
  const stamp = toIcsUtc(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JamMate//Jam Sessions//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toIcsUtc(event.start)}`,
      `DTEND:${toIcsUtc(event.end)}`,
      `SUMMARY:${escapeIcsText(event.title)}`
    );
    if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    if (event.url) lines.push(`URL:${escapeIcsText(event.url)}`);
    if (event.status) lines.push(`STATUS:${event.status}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n');
};

export const downloadIcs = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
