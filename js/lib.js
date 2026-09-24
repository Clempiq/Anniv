// Logique métier pure (sans DOM) : dates, âges, signes, rappels, import/export.
// Utilisable dans le navigateur et dans Node (tests).

export const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
export const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const DAY_MS = 86400000;

export function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(month, year = 2000) {
  // month : 1-12
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Date locale à minuit (sans heure). */
export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Date de l'anniversaire pour une année donnée (29 février → 28 février les années non bissextiles). */
export function birthdayInYear(person, year) {
  let day = person.day;
  if (person.month === 2 && day === 29 && !isLeapYear(year)) day = 28;
  return new Date(year, person.month - 1, day);
}

/** Prochaine occurrence (aujourd'hui inclus). */
export function nextBirthday(person, today = new Date()) {
  const t = startOfDay(today);
  let d = birthdayInYear(person, t.getFullYear());
  if (d < t) d = birthdayInYear(person, t.getFullYear() + 1);
  return d;
}

export function daysBetween(a, b) {
  // Math.round absorbe les décalages d'heure d'été
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
}

export function daysUntil(person, today = new Date()) {
  return daysBetween(today, nextBirthday(person, today));
}

/** Âge actuel, ou null si l'année est inconnue. */
export function currentAge(person, today = new Date()) {
  if (!person.year) return null;
  const t = startOfDay(today);
  let age = t.getFullYear() - person.year;
  if (birthdayInYear(person, t.getFullYear()) > t) age--;
  return age;
}

/** Âge atteint lors de la prochaine occurrence. */
export function ageAtNext(person, today = new Date()) {
  if (!person.year) return null;
  return nextBirthday(person, today).getFullYear() - person.year;
}

export function isMilestone(age) {
  if (age == null) return false;
  return age === 1 || age === 18 || age === 21 || (age >= 10 && age % 10 === 0) || age % 25 === 0 && age > 0;
}

const ZODIAC = [
  // [signe, emoji, mois de fin, jour de fin]
  ['Capricorne', '♑', 1, 19],
  ['Verseau', '♒', 2, 18],
  ['Poissons', '♓', 3, 20],
  ['Bélier', '♈', 4, 19],
  ['Taureau', '♉', 5, 20],
  ['Gémeaux', '♊', 6, 20],
  ['Cancer', '♋', 7, 22],
  ['Lion', '♌', 8, 22],
  ['Vierge', '♍', 9, 22],
  ['Balance', '♎', 10, 22],
  ['Scorpion', '♏', 11, 21],
  ['Sagittaire', '♐', 12, 21],
  ['Capricorne', '♑', 12, 31],
];

export function zodiacSign(month, day) {
  for (const [name, emoji, m, d] of ZODIAC) {
    if (month < m || (month === m && day <= d)) return { name, emoji };
  }
  return { name: 'Capricorne', emoji: '♑' };
}

const CHINESE = [
  ['Rat', '🐀'], ['Bœuf', '🐂'], ['Tigre', '🐅'], ['Lapin', '🐇'],
  ['Dragon', '🐉'], ['Serpent', '🐍'], ['Cheval', '🐎'], ['Chèvre', '🐐'],
  ['Singe', '🐒'], ['Coq', '🐓'], ['Chien', '🐕'], ['Cochon', '🐖'],
];

/** Signe chinois (approximation par année grégorienne ; 2020 = Rat). */
export function chineseZodiac(year) {
  if (!year) return null;
  const [name, emoji] = CHINESE[(((year - 2020) % 12) + 12) % 12];
  return { name, emoji };
}

export function bornWeekday(person) {
  if (!person.year) return null;
  return WEEKDAYS[new Date(person.year, person.month - 1, person.day).getDay()];
}

export function daysAlive(person, today = new Date()) {
  if (!person.year) return null;
  return daysBetween(new Date(person.year, person.month - 1, person.day), today);
}

export function formatDayMonth(person) {
  return `${person.day} ${MONTHS[person.month - 1]}`;
}

export function formatCountdown(days) {
  if (days === 0) return "Aujourd'hui 🎉";
  if (days === 1) return 'Demain';
  if (days < 7) return `Dans ${days} jours`;
  if (days < 14) return 'Dans 1 semaine';
  if (days < 31) return `Dans ${Math.floor(days / 7)} semaines`;
  const months = Math.round(days / 30.4);
  return months <= 1 ? 'Dans 1 mois' : `Dans ${months} mois`;
}

/** Valide et normalise une personne. Lève une erreur en français si invalide. */
export function validatePerson(p) {
  const name = String(p.name ?? '').trim();
  if (!name) throw new Error('Le nom est obligatoire.');
  const day = Number(p.day);
  const month = Number(p.month);
  const year = p.year === '' || p.year == null ? null : Number(p.year);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Mois invalide.');
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(month, 2000)) throw new Error('Jour invalide.');
  if (year !== null) {
    const thisYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1900 || year > thisYear) throw new Error('Année invalide.');
    if (month === 2 && day === 29 && !isLeapYear(year)) throw new Error(`${year} n'est pas bissextile.`);
  }
  return {
    id: p.id || uid(),
    name,
    day,
    month,
    year,
    group: String(p.group ?? '').trim() || 'Amis',
    notes: String(p.notes ?? ''),
    gifts: Array.isArray(p.gifts)
      ? p.gifts.filter((g) => g && String(g.text ?? '').trim())
        .map((g) => ({ text: String(g.text).trim(), done: !!g.done }))
      : [],
    emoji: p.emoji || '',
    phone: String(p.phone ?? '').trim(),
    email: String(p.email ?? '').trim(),
    reminders: Array.isArray(p.reminders) ? p.reminders.map(Number).filter((n) => n >= 0) : null,
    celebrated: p.celebrated && typeof p.celebrated === 'object' ? p.celebrated : {},
    createdAt: p.createdAt || new Date().toISOString(),
  };
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Liste triée par proximité du prochain anniversaire. */
export function sortByUpcoming(people, today = new Date()) {
  return [...people]
    .map((p) => ({ person: p, days: daysUntil(p, today) }))
    .sort((a, b) => a.days - b.days || a.person.name.localeCompare(b.person.name, 'fr'));
}

/**
 * Rappels dus aujourd'hui : pour chaque personne et chaque délai (jours avant),
 * renvoie ceux où daysUntil === délai.
 */
export function dueReminders(people, defaultOffsets, today = new Date()) {
  const out = [];
  for (const p of people) {
    const offsets = p.reminders ?? defaultOffsets;
    const d = daysUntil(p, today);
    if (offsets.includes(d)) out.push({ person: p, days: d, key: `${p.id}:${nextBirthday(p, today).getFullYear()}:${d}` });
  }
  return out;
}

export function reminderText({ person, days }, today = new Date()) {
  const age = ageAtNext(person, today);
  const ageStr = age ? ` (${age} ans)` : '';
  if (days === 0) return `C'est l'anniversaire de ${person.name}${ageStr} aujourd'hui ! 🎂`;
  if (days === 1) return `Demain : anniversaire de ${person.name}${ageStr}.`;
  return `Dans ${days} jours : anniversaire de ${person.name}${ageStr} le ${formatDayMonth(person)}.`;
}

// ---------- Messages de vœux ----------

const WISHES = {
  chaleureux: [
    'Joyeux anniversaire {prenom} ! 🎂 Je te souhaite une année pleine de bonheur, de rires et de belles surprises.',
    'Bon anniversaire {prenom} ! 🎉 Que cette nouvelle année t’apporte tout ce dont tu rêves.',
    'Happy birthday {prenom} ! Plein de bisous et une journée magnifique ☀️',
  ],
  drole: [
    'Joyeux anniversaire {prenom} ! 🎈 Ne compte pas les bougies, compte plutôt les parts de gâteau.',
    '{prenom}, tu n’as pas pris une année, tu as gagné un niveau ! 🕹️ Joyeux anniversaire !',
    'Bon anniversaire {prenom} ! Rappelle-toi : tu seras toujours plus jeune que tu ne le seras jamais. 😄',
  ],
  pro: [
    'Bon anniversaire {prenom} ! Je vous souhaite une excellente journée et une très belle année.',
    'Joyeux anniversaire {prenom}, au plaisir de continuer à travailler ensemble. Belle journée !',
  ],
  milestone: [
    '{age} ans, ça se fête ! 🥂 Joyeux anniversaire {prenom}, profite à fond de cette étape.',
    'Joyeux {age}e anniversaire {prenom} ! 🎊 Un cap mémorable pour une personne formidable.',
  ],
};

export const WISH_TONES = { chaleureux: 'Chaleureux', drole: 'Drôle', pro: 'Pro', milestone: 'Âge rond' };

export function wishMessage(person, tone = 'chaleureux', index = 0, today = new Date()) {
  const list = WISHES[tone] ?? WISHES.chaleureux;
  const tpl = list[((index % list.length) + list.length) % list.length];
  const age = ageAtNext(person, today);
  return tpl
    .replaceAll('{prenom}', person.name.split(' ')[0])
    .replaceAll('{age}', age ?? '');
}

// ---------- Export iCalendar (rappels natifs dans Google/Apple/Outlook) ----------

function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function toICS(people, defaultOffsets = [0, 1, 7], now = new Date()) {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T000000Z`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Anniv//Rappels anniversaires//FR',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Anniversaires',
  ];
  for (const p of people) {
    // Année de départ bissextile pour que le 29/02 existe ; RRULE annuelle.
    const startYear = p.month === 2 && p.day === 29 ? 2024 : now.getFullYear() - 1;
    const dt = `${startYear}${pad(p.month)}${pad(p.day)}`;
    const next = new Date(startYear, p.month - 1, p.day + 1);
    const dtEnd = `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`;
    const title = p.year ? `🎂 ${p.name} (né·e en ${p.year})` : `🎂 ${p.name}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${p.id}@anniv`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dt}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      p.month === 2 && p.day === 29 ? 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'RRULE:FREQ=YEARLY',
      `SUMMARY:${icsEscape(title)}`,
      'TRANSP:TRANSPARENT',
    );
    if (p.notes) lines.push(`DESCRIPTION:${icsEscape(p.notes)}`);
    for (const off of p.reminders ?? defaultOffsets) {
      // Rappel à 9h le jour J-off (le déclencheur est relatif à minuit).
      const trigger = off === 0 ? 'PT9H' : `-P${off - 1}DT15H`;
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${icsEscape(off === 0 ? `Anniversaire de ${p.name} aujourd'hui` : `Anniversaire de ${p.name} dans ${off} jour(s)`)}`,
        `TRIGGER:${trigger}`,
        'END:VALARM',
      );
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ---------- Import CSV / vCard ----------

/** CSV simple : nom;date(JJ/MM[/AAAA]);groupe;notes — séparateur , ou ; */
export function parseCSV(text) {
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  const errors = [];
  for (const [i, row] of rows.entries()) {
    const sep = row.includes(';') ? ';' : ',';
    const cols = row.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (i === 0 && /nom|name/i.test(cols[0])) continue; // en-tête
    const date = parseDateString(cols[1] ?? '');
    if (!date) {
      errors.push(`Ligne ${i + 1} : date illisible « ${cols[1] ?? ''} »`);
      continue;
    }
    try {
      out.push(validatePerson({ name: cols[0], ...date, group: cols[2], notes: cols[3] }));
    } catch (e) {
      errors.push(`Ligne ${i + 1} : ${e.message}`);
    }
  }
  return { people: out, errors };
}

/** Accepte JJ/MM, JJ/MM/AAAA, JJ-MM-AAAA, AAAA-MM-JJ, --MM-JJ (vCard). */
export function parseDateString(s) {
  s = s.trim();
  let m;
  if ((m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})$/))) return { year: +m[1], month: +m[2], day: +m[3] };
  if ((m = s.match(/^--(\d{2})-?(\d{2})$/))) return { year: null, month: +m[1], day: +m[2] };
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}))?$/))) {
    return { day: +m[1], month: +m[2], year: m[3] ? +m[3] : null };
  }
  return null;
}

export function parseVCard(text) {
  const out = [];
  const errors = [];
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  for (const card of unfolded.split(/BEGIN:VCARD/i).slice(1)) {
    const fn = card.match(/^FN[^:]*:(.+)$/im)?.[1]?.trim();
    const bday = card.match(/^BDAY[^:]*:(.+)$/im)?.[1]?.trim();
    const tel = card.match(/^TEL[^:]*:(.+)$/im)?.[1]?.trim();
    const email = card.match(/^EMAIL[^:]*:(.+)$/im)?.[1]?.trim();
    if (!fn || !bday) continue;
    const date = parseDateString(bday.slice(0, 10).replace(/T.*/, ''));
    if (!date) {
      errors.push(`${fn} : date illisible`);
      continue;
    }
    try {
      out.push(validatePerson({ name: fn, ...date, phone: tel, email, group: 'Contacts' }));
    } catch (e) {
      errors.push(`${fn} : ${e.message}`);
    }
  }
  return { people: out, errors };
}

/** Fusionne des personnes importées en ignorant les doublons (même nom + même date). */
export function mergePeople(existing, incoming) {
  const key = (p) => `${p.name.toLowerCase()}|${p.day}|${p.month}`;
  const seen = new Set(existing.map(key));
  const added = [];
  for (const p of incoming) {
    if (seen.has(key(p))) continue;
    seen.add(key(p));
    added.push(p);
  }
  return { people: [...existing, ...added], added: added.length, skipped: incoming.length - added.length };
}

// ---------- Statistiques ----------

export function stats(people, today = new Date()) {
  const byMonth = Array(12).fill(0);
  const byGroup = {};
  const bySign = {};
  const ages = [];
  for (const p of people) {
    byMonth[p.month - 1]++;
    byGroup[p.group] = (byGroup[p.group] ?? 0) + 1;
    const z = zodiacSign(p.month, p.day);
    bySign[`${z.emoji} ${z.name}`] = (bySign[`${z.emoji} ${z.name}`] ?? 0) + 1;
    const a = currentAge(p, today);
    if (a != null) ages.push({ person: p, age: a });
  }
  ages.sort((a, b) => a.age - b.age);
  const avgAge = ages.length ? ages.reduce((s, a) => s + a.age, 0) / ages.length : null;
  return {
    total: people.length,
    byMonth,
    byGroup,
    bySign,
    avgAge,
    youngest: ages[0] ?? null,
    oldest: ages[ages.length - 1] ?? null,
    thisMonth: people.filter((p) => p.month === today.getMonth() + 1).length,
    milestones: people.filter((p) => isMilestone(ageAtNext(p, today)) && daysUntil(p, today) <= 365),
  };
}
