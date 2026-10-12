// Fixed Western zodiac calendar for event tribes; only month and day are used.
export const ELEMENTS = ['Fire', 'Air', 'Water', 'Earth'] as const;
export type Element = (typeof ELEMENTS)[number];

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const STARTS = [120, 219, 321, 420, 521, 621, 723, 823, 923, 1023, 1122, 1222];
const SIGNS = ['Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn'];
const SIGN_ELEMENTS: Element[] = ['Air', 'Water', 'Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth'];

export function daysInMonth(month: number) {
  return DAYS_IN_MONTH[month - 1] ?? 31;
}

export function zodiacForBirthday(month: number | string, day: number | string) {
  if (!/^[0-9]{1,2}$/.test(String(month)) || !/^[0-9]{1,2}$/.test(String(day))) return null;
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(m)) return null;
  let index = 11;
  for (let i = 0; i < STARTS.length; i++) if (m * 100 + d >= STARTS[i]) index = i;
  const element = SIGN_ELEMENTS[index];
  return { month: m, day: d, sign: SIGNS[index], element, preferredPosition: ELEMENTS.indexOf(element) };
}
