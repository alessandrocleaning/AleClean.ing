import { getYear, getMonth, getDate, isSameDay, addDays } from 'date-fns';

interface Holiday {
  date: Date;
  name: string;
}

// Calcolo della Pasqua (Metodo Gauss)
const getEasterDate = (year: number): Date => {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);

  return new Date(year, month - 1, day);
};

export const getItalianHolidays = (year: number): Holiday[] => {
  const fixedHolidays = [
    { month: 0, day: 1, name: "Capodanno" },
    { month: 0, day: 6, name: "Epifania" },
    { month: 3, day: 25, name: "Liberazione" },
    { month: 4, day: 1, name: "Festa Lavoro" },
    { month: 5, day: 2, name: "Repubblica" },
    { month: 7, day: 15, name: "Ferragosto" },
    { month: 10, day: 1, name: "Ognissanti" },
    { month: 11, day: 8, name: "Immacolata" },
    { month: 11, day: 25, name: "Natale" },
    { month: 11, day: 26, name: "S. Stefano" },
  ];

  const holidays: Holiday[] = fixedHolidays.map(h => ({
    date: new Date(year, h.month, h.day),
    name: h.name
  }));

  const easter = getEasterDate(year);
  const easterMonday = addDays(easter, 1);

  holidays.push({ date: easter, name: "Pasqua" });
  holidays.push({ date: easterMonday, name: "Pasquetta" });

  return holidays;
};

export const checkIsHoliday = (date: Date): { isHoliday: boolean; name?: string } => {
  const year = getYear(date);
  const holidays = getItalianHolidays(year);
  
  const found = holidays.find(h => isSameDay(h.date, date));
  
  if (found) {
    return { isHoliday: true, name: found.name };
  }
  return { isHoliday: false };
};
