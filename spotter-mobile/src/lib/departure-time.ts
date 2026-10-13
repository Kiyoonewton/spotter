function wallAt(instant: number, timezone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(instant)
      .map(({ type, value }) => [type, value]),
  );
  return `${values['year']}-${values['month']}-${values['day']}T${values['hour']}:${values['minute']}:${values['second']}`;
}
function offsetAt(instant: number, timezone: string) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' })
      .formatToParts(instant)
      .map(({ type, value }) => [type, value]),
  );
  const match = values['timeZoneName']?.match(/GMT([+-])(\d{2}):?(\d{2})/);
  return match
    ? (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3])) * 60000
    : 0;
}
export function localTimestamp(value: string, timezone: string) {
  if (!timezone) throw new Error('Select an origin with a valid IANA timezone.');
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Enter a valid departure time in ${timezone}.`);
  const wall = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00`;
  const naive = Date.parse(`${wall}Z`);
  const offsets = new Set(
    [-172800000, -86400000, 0, 86400000, 172800000].map((delta) =>
      offsetAt(naive + delta, timezone),
    ),
  );
  const candidates = [...offsets]
    .map((offset) => naive - offset)
    .filter((instant) => wallAt(instant, timezone) === wall);
  if (candidates.length === 0)
    throw new Error(
      `That departure time does not exist in ${timezone} because of daylight-saving time.`,
    );
  if (candidates.length > 1)
    throw new Error(`That departure time is ambiguous in ${timezone}; choose a different time.`);
  return new Date(candidates[0]!).toISOString();
}

export function upcomingDeparture(timezone: string, now = Date.now()): string {
  let instant = (Math.floor(now / 3600000) + 1) * 3600000;
  for (let hour = 0; hour < 24; hour++, instant += 3600000) {
    const wall = wallAt(instant, timezone).slice(0, 16);
    try {
      if (Date.parse(localTimestamp(wall, timezone)) > now) return wall;
    } catch {
      /* Skip an ambiguous DST hour rather than guessing an offset. */
    }
  }
  throw new Error('Unable to choose an upcoming departure in this timezone.');
}

export function departureIsPast(value: string, timezone: string, now = Date.now()): boolean {
  try {
    return Date.parse(localTimestamp(value, timezone)) < now;
  } catch {
    return false;
  } // Existing submission validation reports invalid timezone/DST inputs.
}
