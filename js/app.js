import {
  MONTHS, WEEKDAYS, validatePerson, sortByUpcoming, daysUntil, nextBirthday, currentAge, ageAtNext,
  zodiacSign, chineseZodiac, bornWeekday, daysAlive, formatDayMonth, formatCountdown, isMilestone,
  dueReminders, reminderText, wishMessage, WISH_TONES, toICS, parseCSV, parseVCard, mergePeople, stats,
  birthdayInYear,
} from './lib.js';

// ---------------------------------------------------------------- état

const STORE_KEY = 'anniv.v1';
const REMINDER_CHOICES = [
  [0, 'Le jour J'], [1, 'La veille'], [2, '2 jours avant'], [3, '3 jours avant'],
  [7, '1 semaine avant'], [14, '2 semaines avant'], [30, '1 mois avant'],
];

const state = {
  people: [],
  settings: { reminders: [0, 1, 7], theme: 'auto', notified: {} },
  view: 'home',
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear(),
  editingId: null,
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (raw) {
      state.people = (raw.people || []).map((p) => { try { return validatePerson(p); } catch { return null; } }).filter(Boolean);
      state.settings = { ...state.settings, ...raw.settings };
    }
  } catch { /* stockage indisponible : on démarre à vide */ }
}

function save() {
  mirrorForServiceWorker();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ people: state.people, settings: state.settings }));
  } catch {
    toast('⚠️ Impossible d’enregistrer (stockage du navigateur indisponible).');
  }
}

// Copie minimale des données dans le Cache Storage pour que le service worker
// puisse envoyer les rappels en arrière-plan (il n'a pas accès au localStorage).
function mirrorForServiceWorker() {
  if (!('caches' in window)) return;
  const data = { people: state.people.map(({ id, name, day, month, year, reminders }) => ({ id, name, day, month, year, reminders })), defaults: state.settings.reminders };
  caches.open('anniv-data').then((c) => c.put('/__anniv-data', new Response(JSON.stringify(data)))).catch(() => {});
}

// ---------------------------------------------------------------- utilitaires

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function colorFor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 62% 52%)`;
}

function avatar(p) {
  return p.emoji
    ? `<div class="avatar emoji" aria-hidden="true">${esc(p.emoji)}</div>`
    : `<div class="avatar" style="background:${colorFor(p.name)}" aria-hidden="true">${esc(initials(p.name))}</div>`;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function groups() {
  return [...new Set(['Famille', 'Amis', 'Travail', ...state.people.map((p) => p.group)])].sort((a, b) => a.localeCompare(b, 'fr'));
}

function findPerson(id) {
  return state.people.find((p) => p.id === id);
}

// ---------------------------------------------------------------- navigation

function setView(view) {
  state.view = view;
  $$('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === view)));
  $$('.view').forEach((v) => { v.hidden = v.id !== `view-${view}`; });
  render();
  try { history.replaceState(null, '', `#${view}`); } catch { /* ignore */ }
}

function render() {
  if (state.view === 'home') renderHome();
  if (state.view === 'calendar') renderCalendar();
  if (state.view === 'stats') renderStats();
  if (state.view === 'settings') renderSettings();
}

// ---------------------------------------------------------------- accueil

function personRow(p, today = new Date()) {
  const days = daysUntil(p, today);
  const age = ageAtNext(p, today);
  const milestone = isMilestone(age);
  const cls = ['person', days === 0 && 'is-today', days > 0 && days <= 7 && 'is-soon'].filter(Boolean).join(' ');
  const next = nextBirthday(p, today);
  const sub = [
    `${WEEKDAYS[next.getDay()]} ${formatDayMonth(p)}`,
    age != null ? `${days === 0 ? 'fête ses' : 'aura'} ${age} ans` : null,
  ].filter(Boolean).join(' · ');
  return `
    <button class="${cls}" data-open="${esc(p.id)}">
      ${avatar(p)}
      <div class="person-main">
        <div class="person-name">${esc(p.name)}
          <span class="badge">${esc(p.group)}</span>
          ${milestone ? '<span class="badge gold">⭐ âge rond</span>' : ''}
          ${p.gifts.some((g) => !g.done) ? '<span class="badge" title="Idées cadeaux">🎁</span>' : ''}
        </div>
        <div class="person-sub">${esc(sub)}</div>
      </div>
      <div class="countdown">
        <div class="days">${days === 0 ? '🎂' : days}</div>
        <div class="label">${days === 0 ? "aujourd'hui" : days === 1 ? 'demain' : 'jours'}</div>
      </div>
    </button>`;
}

function renderHome() {
  const today = new Date();
  const q = $('#search').value.trim().toLowerCase();
  const g = $('#groupFilter').value;
  const sort = $('#sortMode').value;

  // Filtre de groupes
  const current = $('#groupFilter').value;
  $('#groupFilter').innerHTML = `<option value="">Tous les groupes</option>${groups().map((x) => `<option ${x === current ? 'selected' : ''}>${esc(x)}</option>`).join('')}`;

  // Bannière du jour
  const todays = state.people.filter((p) => daysUntil(p, today) === 0);
  $('#todayBanner').innerHTML = todays.length
    ? `<div class="banner">
        <h2>🎉 Aujourd'hui, on fête ${todays.map((p) => esc(p.name)).join(' et ')} !</h2>
        <p class="banner-sub">${todays.map((p) => { const a = ageAtNext(p, today); return a ? `${esc(p.name.split(' ')[0])} a ${a} ans` : ''; }).filter(Boolean).join(' · ') || 'N’oubliez pas de lui souhaiter !'}</p>
        <div class="btn-row">${todays.map((p) => `<button class="btn small" data-open="${esc(p.id)}">💌 Écrire à ${esc(p.name.split(' ')[0])}</button>`).join('')}</div>
      </div>`
    : '';
  if (todays.length && !sessionStorageFlag('confetti')) confetti();

  let list = state.people.filter((p) => (!g || p.group === g)
    && (!q || `${p.name} ${p.notes} ${p.group}`.toLowerCase().includes(q)));

  if (!state.people.length) {
    $('#list').innerHTML = `<div class="empty"><div class="big">🎈</div>
      <p>Aucun anniversaire pour l'instant.</p>
      <p><button class="btn primary" data-action="add">Ajouter le premier</button>
      <button class="btn ghost" data-action="demo">Voir des exemples</button></p></div>`;
    return;
  }
  if (!list.length) {
    $('#list').innerHTML = '<div class="empty"><p>Aucun résultat.</p></div>';
    return;
  }

  let html = '';
  if (sort === 'upcoming') {
    let lastLabel = null;
    for (const { person, days } of sortByUpcoming(list, today)) {
      const n = nextBirthday(person, today);
      const label = days <= 6 ? 'Cette semaine'
        : `${MONTHS[n.getMonth()]}${n.getFullYear() !== today.getFullYear() ? ` ${n.getFullYear()}` : ''}`;
      if (label !== lastLabel) {
        lastLabel = label;
        html += `<div class="month-sep">${esc(label)}</div>`;
      }
      html += personRow(person, today);
    }
  } else {
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    if (sort === 'age') list.sort((a, b) => (currentAge(b, today) ?? -1) - (currentAge(a, today) ?? -1));
    if (sort === 'calendar') list.sort((a, b) => a.month - b.month || a.day - b.day);
    html = list.map((p) => personRow(p, today)).join('');
  }
  $('#list').innerHTML = html;
}

function sessionStorageFlag(name) {
  try {
    if (sessionStorage.getItem(name)) return true;
    sessionStorage.setItem(name, '1');
  } catch { /* ignore */ }
  return false;
}

// ---------------------------------------------------------------- calendrier

function renderCalendar() {
  const { calMonth: m, calYear: y } = state;
  const today = new Date();
  $('#calTitle').textContent = `${MONTHS[m]} ${y}`;
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7; // lundi en premier
  const byDay = {};
  for (const p of state.people) {
    const b = birthdayInYear(p, y);
    if (b.getMonth() === m) (byDay[b.getDate()] ??= []).push(p);
  }
  let html = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((d) => `<div class="cal-dow">${d}</div>`).join('');
  const start = new Date(y, m, 1 - offset);
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    if (i >= 35 && d.getMonth() !== m) break;
    const inMonth = d.getMonth() === m;
    const ppl = inMonth ? byDay[d.getDate()] ?? [] : [];
    const isToday = d.toDateString() === today.toDateString();
    html += `<div class="cal-day ${inMonth ? '' : 'out'} ${isToday ? 'today' : ''} ${ppl.length ? 'has' : ''}"
      ${ppl.length ? `data-open="${esc(ppl[0].id)}" title="${esc(ppl.map((p) => p.name).join(', '))}"` : ''}>
      <div class="num">${d.getDate()}</div>
      ${ppl.map((p) => `<span class="cal-pill">🎂 ${esc(p.name.split(' ')[0])}</span>`).join('')}
    </div>`;
  }
  $('#calGrid').innerHTML = html;
  const monthPeople = state.people
    .filter((p) => birthdayInYear(p, y).getMonth() === m)
    .sort((a, b) => a.day - b.day);
  $('#calList').innerHTML = monthPeople.length
    ? monthPeople.map((p) => personRow(p, new Date(y, m, 1) > today ? new Date(y, m, 1) : today)).join('')
    : '<div class="empty">Aucun anniversaire ce mois-ci.</div>';
}

// ---------------------------------------------------------------- stats

function renderStats() {
  const s = stats(state.people);
  if (!s.total) {
    $('#statsContent').innerHTML = '<div class="empty"><div class="big">📊</div><p>Ajoutez des anniversaires pour voir des statistiques.</p></div>';
    return;
  }
  const max = Math.max(...s.byMonth, 1);
  const busiest = s.byMonth.indexOf(Math.max(...s.byMonth));
  const hbars = (obj) => {
    const entries = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    const m = Math.max(...entries.map((e) => e[1]), 1);
    return entries.map(([k, v]) => `<div class="hbar"><span>${esc(k)}</span><i style="width:${(v / m) * 100}%"></i><b>${v}</b></div>`).join('');
  };
  const upcomingMilestones = s.milestones
    .map((p) => ({ p, d: daysUntil(p) }))
    .sort((a, b) => a.d - b.d);

  $('#statsContent').innerHTML = `
    <div class="stat-grid">
      <div class="stat"><div class="v">${s.total}</div><div class="k">anniversaires</div></div>
      <div class="stat"><div class="v">${s.thisMonth}</div><div class="k">ce mois-ci</div></div>
      <div class="stat"><div class="v">${s.avgAge != null ? Math.round(s.avgAge) : '—'}</div><div class="k">âge moyen</div></div>
      <div class="stat"><div class="v" style="text-transform:capitalize">${MONTHS[busiest]}</div><div class="k">mois le plus chargé</div></div>
    </div>
    <div class="card">
      <h3>Répartition par mois</h3>
      <div class="bars">${s.byMonth.map((v, i) => `<div class="bar" title="${MONTHS[i]} : ${v}"><b>${v || ''}</b><i style="height:${(v / max) * 100}%"></i><span>${MONTHS[i].slice(0, 3)}</span></div>`).join('')}</div>
    </div>
    ${upcomingMilestones.length ? `<div class="card"><h3>⭐ Âges ronds à venir</h3>
      ${upcomingMilestones.map(({ p, d }) => `<p><b>${esc(p.name)}</b> — ${ageAtNext(p)} ans · ${esc(formatCountdown(d).toLowerCase())}</p>`).join('')}</div>` : ''}
    ${s.youngest ? `<div class="card"><h3>👶 / 🧓</h3>
      <p>Plus jeune : <b>${esc(s.youngest.person.name)}</b> (${s.youngest.age} ans)</p>
      <p>Doyen·ne : <b>${esc(s.oldest.person.name)}</b> (${s.oldest.age} ans)</p></div>` : ''}
    <div class="card"><h3>Par groupe</h3>${hbars(s.byGroup)}</div>
    <div class="card"><h3>Signes astrologiques</h3>${hbars(s.bySign)}</div>`;
}

// ---------------------------------------------------------------- réglages

function reminderChips(container, selected, onToggle) {
  container.innerHTML = REMINDER_CHOICES.map(([v, l]) => `<button type="button" class="chip" data-v="${v}" aria-pressed="${selected.includes(v)}">${l}</button>`).join('');
  container.onclick = (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const v = Number(b.dataset.v);
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    onToggle(v, on);
  };
}

function renderSettings() {
  reminderChips($('#defaultReminders'), state.settings.reminders, (v, on) => {
    const set = new Set(state.settings.reminders);
    on ? set.add(v) : set.delete(v);
    state.settings.reminders = [...set].sort((a, b) => a - b);
    save();
  });
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  $('#notifStatus').textContent = {
    granted: '✅ Notifications activées.',
    denied: '🚫 Notifications bloquées : autorisez-les dans les réglages du navigateur.',
    default: 'Notifications non activées.',
    unsupported: 'Ce navigateur ne gère pas les notifications.',
  }[perm];
  $('#notifBtn').hidden = perm !== 'default';
}

// ---------------------------------------------------------------- notifications

async function notify(title, body, tag) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, tag, icon: 'icons/icon.svg', badge: 'icons/icon.svg' });
    else new Notification(title, { body, tag, icon: 'icons/icon.svg' });
    return true;
  } catch {
    return false;
  }
}

async function checkReminders() {
  const due = dueReminders(state.people, state.settings.reminders);
  const fresh = due.filter((r) => !state.settings.notified[r.key]);
  if (!fresh.length) return;
  for (const r of fresh) {
    const sent = await notify('🎂 Rappel d’anniversaire', reminderText(r), r.key);
    if (!sent) toast(reminderText(r));
    state.settings.notified[r.key] = Date.now();
  }
  // purge des clés de plus d'un an
  const limit = Date.now() - 400 * 86400000;
  for (const [k, t] of Object.entries(state.settings.notified)) if (t < limit) delete state.settings.notified[k];
  save();
}

// ---------------------------------------------------------------- édition

function openEdit(id = null) {
  state.editingId = id;
  const p = id ? findPerson(id) : null;
  const f = $('#editForm');
  f.reset();
  $('#editTitle').textContent = p ? `Modifier ${p.name}` : 'Nouvel anniversaire';
  $('#deleteBtn').hidden = !p;
  $('#editError').textContent = '';
  f.month.innerHTML = MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
  f.year.max = new Date().getFullYear();
  $('#groupList').innerHTML = groups().map((g) => `<option value="${esc(g)}">`).join('');
  if (p) {
    for (const k of ['name', 'day', 'month', 'group', 'emoji', 'phone', 'email', 'notes']) f[k].value = p[k] ?? '';
    f.year.value = p.year ?? '';
  } else {
    f.month.value = new Date().getMonth() + 1;
    f.group.value = $('#groupFilter').value || '';
  }
  const custom = p?.reminders ?? null;
  f.customReminders.checked = custom !== null;
  let selected = [...(custom ?? state.settings.reminders)];
  const chips = $('#personReminders');
  reminderChips(chips, selected, (v, on) => {
    selected = on ? [...selected, v] : selected.filter((x) => x !== v);
  });
  chips.classList.toggle('disabled', !f.customReminders.checked);
  f.customReminders.onchange = () => chips.classList.toggle('disabled', !f.customReminders.checked);
  f.getSelectedReminders = () => (f.customReminders.checked ? [...new Set(selected)].sort((a, b) => a - b) : null);
  $('#editDialog').showModal();
  if (!p) f.name.focus();
}

function submitEdit(e) {
  e.preventDefault();
  const f = $('#editForm');
  const existing = state.editingId ? findPerson(state.editingId) : null;
  try {
    const p = validatePerson({
      ...(existing ?? {}),
      name: f.name.value,
      day: f.day.value,
      month: f.month.value,
      year: f.year.value,
      group: f.group.value,
      emoji: f.emoji.value.trim(),
      phone: f.phone.value,
      email: f.email.value,
      notes: f.notes.value,
      reminders: f.getSelectedReminders(),
    });
    if (existing) state.people[state.people.indexOf(existing)] = p;
    else state.people.push(p);
    save();
    $('#editDialog').close();
    toast(existing ? 'Modifications enregistrées ✔️' : `${p.name} ajouté·e 🎈`);
    render();
    checkReminders();
  } catch (err) {
    $('#editError').textContent = err.message;
  }
}

function deletePerson(id) {
  const p = findPerson(id);
  if (!p || !confirm(`Supprimer ${p.name} ?`)) return;
  const idx = state.people.indexOf(p);
  state.people.splice(idx, 1);
  save();
  $('#editDialog').close();
  $('#detailDialog').close();
  render();
  toastUndo(`${p.name} supprimé·e`, () => {
    state.people.splice(idx, 0, p);
    save();
    render();
  });
}

function toastUndo(msg, undo) {
  const el = $('#toast');
  el.innerHTML = `${esc(msg)} <button class="btn small" style="margin-left:8px">Annuler</button>`;
  el.querySelector('button').onclick = () => { undo(); el.classList.remove('show'); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 5000);
}

// ---------------------------------------------------------------- fiche détail

let wishTone = 'chaleureux';
let wishIndex = 0;

function openDetail(id) {
  const p = findPerson(id);
  if (!p) return;
  const today = new Date();
  const days = daysUntil(p, today);
  const z = zodiacSign(p.month, p.day);
  const cz = chineseZodiac(p.year);
  const age = currentAge(p, today);
  const nextAge = ageAtNext(p, today);
  if (isMilestone(nextAge)) wishTone = 'milestone';
  else if (wishTone === 'milestone') wishTone = 'chaleureux';
  const msg = wishMessage(p, wishTone, wishIndex, today);
  const firstName = p.name.split(' ')[0];
  const year = nextBirthday(p, today).getFullYear();
  const celebrated = p.celebrated[year];
  const history = Object.entries(p.celebrated).sort((a, b) => b[0] - a[0]);

  $('#detailContent').innerHTML = `
    <div class="detail-head">
      ${avatar(p)}
      <div style="flex:1;min-width:0">
        <h2>${esc(p.name)}</h2>
        <div class="muted">${esc(formatDayMonth(p))}${p.year ? ` ${p.year}` : ''} · ${esc(p.group)}</div>
      </div>
      <button class="icon-btn" data-close aria-label="Fermer">✕</button>
    </div>

    <div class="facts">
      <div class="fact"><div class="k">Prochain</div><div class="v">${esc(formatCountdown(days))}</div></div>
      ${age != null ? `<div class="fact"><div class="k">Âge</div><div class="v">${age} ans${isMilestone(nextAge) ? ` → ⭐ ${nextAge}` : ''}</div></div>` : ''}
      <div class="fact"><div class="k">Signe</div><div class="v">${z.emoji} ${z.name}</div></div>
      ${cz ? `<div class="fact"><div class="k">Signe chinois</div><div class="v">${cz.emoji} ${cz.name}</div></div>` : ''}
      ${p.year ? `<div class="fact"><div class="k">Né·e un</div><div class="v">${bornWeekday(p)}</div></div>` : ''}
      ${p.year ? `<div class="fact"><div class="k">Jours vécus</div><div class="v">${daysAlive(p, today).toLocaleString('fr-FR')}</div></div>` : ''}
    </div>

    ${p.notes ? `<p class="wish-box">📝 ${esc(p.notes)}</p>` : ''}

    <h3>🎁 Idées cadeaux</h3>
    <ul class="gifts">
      ${p.gifts.map((g, i) => `<li class="${g.done ? 'done' : ''}">
        <input type="checkbox" data-gift-toggle="${i}" ${g.done ? 'checked' : ''} aria-label="Offert">
        <span>${esc(g.text)}</span>
        <button class="del" data-gift-del="${i}" aria-label="Supprimer l’idée">✕</button></li>`).join('') || '<li class="muted">Aucune idée pour l’instant.</li>'}
    </ul>
    <form class="add-gift" id="giftForm">
      <input name="gift" placeholder="Ajouter une idée…" maxlength="120" autocomplete="off">
      <button class="btn">Ajouter</button>
    </form>

    <h3>💌 Message de vœux</h3>
    <div class="chips" id="toneChips">
      ${Object.entries(WISH_TONES).map(([k, l]) => `<button class="chip" data-tone="${k}" aria-pressed="${k === wishTone}">${l}</button>`).join('')}
      <button class="chip" data-next-wish>🔀 Autre</button>
    </div>
    <div class="wish-box" id="wishText">${esc(msg)}</div>
    <div class="btn-row">
      <button class="btn" data-copy>📋 Copier</button>
      ${navigator.share ? '<button class="btn" data-share>📤 Partager</button>' : ''}
      ${p.phone ? `<a class="btn" href="sms:${esc(p.phone)}?&body=${encodeURIComponent(msg)}">💬 SMS</a>
        <a class="btn" href="https://wa.me/${esc(p.phone.replace(/[^\d]/g, '').replace(/^0/, '33'))}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="btn" href="tel:${esc(p.phone)}">📞 Appeler</a>` : ''}
      ${p.email ? `<a class="btn" href="mailto:${esc(p.email)}?subject=${encodeURIComponent(`Joyeux anniversaire ${firstName} !`)}&body=${encodeURIComponent(msg)}">✉️ E-mail</a>` : ''}
    </div>

    <h3>✅ Suivi</h3>
    <label class="inline" style="display:flex;gap:8px;align-items:center">
      <input type="checkbox" data-celebrated ${celebrated ? 'checked' : ''} style="width:auto">
      J'ai souhaité l'anniversaire ${year}
    </label>
    ${history.length ? `<p class="history">Historique : ${history.map(([y]) => y).join(', ')}</p>` : ''}

    <div class="btn-row end">
      <button class="btn danger" data-delete>Supprimer</button>
      <span class="spacer"></span>
      <button class="btn" data-ics>📆 Agenda</button>
      <button class="btn primary" data-edit>Modifier</button>
    </div>`;

  const dlg = $('#detailDialog');
  const c = $('#detailContent');
  const update = (fn) => { fn(p); save(); openDetail(id); render(); };

  c.onclick = async (e) => {
    const t = e.target;
    if (t.closest('[data-close]')) dlg.close();
    else if (t.closest('[data-edit]')) { dlg.close(); openEdit(id); }
    else if (t.closest('[data-delete]')) deletePerson(id);
    else if (t.closest('[data-ics]')) download(`anniversaire-${firstName.toLowerCase()}.ics`, toICS([p], state.settings.reminders), 'text/calendar');
    else if (t.closest('[data-tone]')) { wishTone = t.closest('[data-tone]').dataset.tone; wishIndex = 0; openDetail(id); }
    else if (t.closest('[data-next-wish]')) { wishIndex++; openDetail(id); }
    else if (t.closest('[data-copy]')) {
      try { await navigator.clipboard.writeText($('#wishText').textContent); toast('Message copié 📋'); } catch { toast('Copie impossible'); }
    } else if (t.closest('[data-share]')) {
      try { await navigator.share({ text: $('#wishText').textContent }); } catch { /* annulé */ }
    } else if (t.closest('[data-gift-del]')) {
      update((x) => x.gifts.splice(Number(t.closest('[data-gift-del]').dataset.giftDel), 1));
    }
  };
  c.onchange = (e) => {
    const t = e.target;
    if (t.matches('[data-gift-toggle]')) update((x) => { x.gifts[Number(t.dataset.giftToggle)].done = t.checked; });
    if (t.matches('[data-celebrated]')) {
      update((x) => { if (t.checked) x.celebrated[year] = new Date().toISOString(); else delete x.celebrated[year]; });
      if (t.checked) { confetti(); toast('Bravo, vous n’avez pas oublié ! 🎉'); }
    }
  };
  $('#giftForm').onsubmit = (e) => {
    e.preventDefault();
    const text = e.target.gift.value.trim();
    if (!text) return;
    update((x) => x.gifts.push({ text, done: false }));
    $('#giftForm input').focus();
  };
  if (!dlg.open) dlg.showModal();
}

// ---------------------------------------------------------------- import / export

async function handleImport(file) {
  const text = await file.text();
  let incoming = [];
  let errors = [];
  try {
    if (/\.json$/i.test(file.name) || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      const data = JSON.parse(text);
      const arr = Array.isArray(data) ? data : data.people ?? [];
      for (const p of arr) {
        try { incoming.push(validatePerson(p)); } catch (e) { errors.push(`${p?.name ?? '?'} : ${e.message}`); }
      }
      if (!Array.isArray(data) && data.settings?.reminders) state.settings.reminders = data.settings.reminders;
    } else if (/BEGIN:VCARD/i.test(text)) {
      ({ people: incoming, errors } = parseVCard(text));
    } else {
      ({ people: incoming, errors } = parseCSV(text));
    }
  } catch {
    toast('Fichier illisible 😕');
    return;
  }
  const r = mergePeople(state.people, incoming);
  state.people = r.people;
  save();
  render();
  toast(`${r.added} ajouté(s)${r.skipped ? `, ${r.skipped} doublon(s) ignoré(s)` : ''}${errors.length ? `, ${errors.length} erreur(s)` : ''}`);
  if (errors.length) console.warn('Erreurs d’import :', errors);
}

function exportCSV() {
  const rows = [['nom', 'date', 'groupe', 'notes', 'telephone', 'email']];
  for (const p of state.people) {
    const date = `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')}${p.year ? `/${p.year}` : ''}`;
    rows.push([p.name, date, p.group, p.notes.replace(/[\n;]/g, ' '), p.phone, p.email]);
  }
  download('anniversaires.csv', `﻿${rows.map((r) => r.join(';')).join('\n')}`, 'text/csv');
}

function loadDemo() {
  const y = new Date().getFullYear();
  const t = new Date();
  const rel = (n) => { const d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + n); return { day: d.getDate(), month: d.getMonth() + 1 }; };
  const demo = [
    { name: 'Maman', ...rel(0), year: y - 58, group: 'Famille', emoji: '👩', notes: 'Adore les orchidées et le thé vert', gifts: [{ text: 'Orchidée blanche' }, { text: 'Coffret de thés' }] },
    { name: 'Lucas Bernard', ...rel(3), year: y - 30, group: 'Amis', notes: 'Fan de randonnée', gifts: [{ text: 'Gourde isotherme' }] },
    { name: 'Chloé Petit', ...rel(9), year: y - 17, group: 'Famille', emoji: '🎸' },
    { name: 'Mme Garnier', ...rel(20), group: 'Travail', notes: 'Responsable — carte signée par l’équipe' },
    { name: 'Hugo Leroy', ...rel(45), year: y - 40, group: 'Amis' },
    { name: 'Papi Jean', ...rel(80), year: y - 85, group: 'Famille', emoji: '👴', notes: 'Appeler plutôt le matin' },
    { name: 'Inès Moreau', day: 29, month: 2, year: 2000, group: 'Amis' },
    { name: 'Tom Girard', ...rel(200), year: y - 6, group: 'Famille', emoji: '🦖', gifts: [{ text: 'Lego dinosaure' }] },
  ].map((p) => validatePerson(p));
  const r = mergePeople(state.people, demo);
  state.people = r.people;
  save();
  render();
  toast(`${r.added} exemples ajoutés`);
}

// ---------------------------------------------------------------- confettis

function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = $('#confetti');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  const colors = ['#e8505b', '#f2a93b', '#2f9e6e', '#4a7cf0', '#b35cf0', '#ffd23f'];
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight / 3,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 12 - 4,
    r: Math.random() * 6 + 3, c: colors[Math.floor(Math.random() * colors.length)],
    a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.3,
  }));
  const t0 = performance.now();
  (function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6); ctx.restore();
    }
    if (t - t0 < 3500) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}

// ---------------------------------------------------------------- thème

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
}

// ---------------------------------------------------------------- initialisation

function bind() {
  $$('.tabs button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('#addBtn').onclick = () => openEdit();
  $('#themeBtn').onclick = () => {
    const order = ['auto', 'light', 'dark'];
    state.settings.theme = order[(order.indexOf(state.settings.theme) + 1) % 3];
    applyTheme();
    save();
    toast({ auto: 'Thème : automatique', light: 'Thème : clair ☀️', dark: 'Thème : sombre 🌙' }[state.settings.theme]);
  };
  $('#search').oninput = renderHome;
  $('#groupFilter').onchange = renderHome;
  $('#sortMode').onchange = renderHome;

  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    if (open && !open.closest('#detailContent')) openDetail(open.dataset.open);
    const act = e.target.closest('[data-action]');
    if (act?.dataset.action === 'add') openEdit();
    if (act?.dataset.action === 'demo') loadDemo();
  });

  $('#editForm').addEventListener('submit', submitEdit);
  $('#cancelEdit').onclick = () => $('#editDialog').close();
  $('#deleteBtn').onclick = () => deletePerson(state.editingId);
  // fermeture au clic sur le fond
  for (const d of $$('dialog')) d.addEventListener('click', (e) => { if (e.target === d) d.close(); });

  $('#calPrev').onclick = () => { if (--state.calMonth < 0) { state.calMonth = 11; state.calYear--; } renderCalendar(); };
  $('#calNext').onclick = () => { if (++state.calMonth > 11) { state.calMonth = 0; state.calYear++; } renderCalendar(); };
  $('#calToday').onclick = () => { state.calMonth = new Date().getMonth(); state.calYear = new Date().getFullYear(); renderCalendar(); };

  $('#notifBtn').onclick = async () => {
    if (!('Notification' in window)) return;
    await Notification.requestPermission();
    renderSettings();
    if (Notification.permission === 'granted') { toast('Notifications activées 🔔'); checkReminders(); }
  };
  $('#testNotifBtn').onclick = async () => {
    const ok = await notify('🎂 Anniv', 'Les rappels fonctionnent ! Vous serez prévenu·e à temps.', 'test');
    if (!ok) toast('Notifications non autorisées — le rappel s’affichera ici à la place.');
  };
  $('#icsBtn').onclick = () => {
    if (!state.people.length) return toast('Aucun anniversaire à exporter.');
    download('anniversaires.ics', toICS(state.people, state.settings.reminders), 'text/calendar');
    toast('Ouvrez le fichier pour l’ajouter à votre agenda 📆');
  };
  $('#exportBtn').onclick = () => download(`anniv-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify({ app: 'anniv', version: 1, people: state.people, settings: { reminders: state.settings.reminders } }, null, 2), 'application/json');
  $('#exportCsvBtn').onclick = exportCSV;
  $('#importFile').onchange = (e) => { const f = e.target.files[0]; if (f) handleImport(f); e.target.value = ''; };
  $('#demoBtn').onclick = loadDemo;
  $('#wipeBtn').onclick = () => {
    if (!state.people.length || !confirm('Effacer tous les anniversaires ? Cette action est définitive.')) return;
    state.people = [];
    save();
    render();
    toast('Tout a été effacé.');
  };

  // Installation PWA
  let deferred;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
  $('#installBtn').onclick = async () => { deferred?.prompt(); deferred = null; $('#installBtn').hidden = true; };

  // Raccourcis clavier
  document.addEventListener('keydown', (e) => {
    if (document.querySelector('dialog[open]') || e.target.matches('input, textarea, select')) return;
    if (e.key === 'n') { e.preventDefault(); openEdit(); }
    if (e.key === '/') { e.preventDefault(); setView('home'); $('#search').focus(); }
  });

  // Revérifier les rappels quand l'app revient au premier plan
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); checkReminders(); } });
}

async function init() {
  load();
  mirrorForServiceWorker();
  applyTheme();
  bind();
  const hash = location.hash.slice(1);
  setView(['home', 'calendar', 'stats', 'settings'].includes(hash) ? hash : 'home');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    try {
      await navigator.serviceWorker.register('sw.js');
      // Synchronisation périodique (Chrome Android, app installée) pour les rappels en arrière-plan
      const reg = await navigator.serviceWorker.ready;
      if ('periodicSync' in reg) await reg.periodicSync.register('anniv-check', { minInterval: 12 * 3600 * 1000 }).catch(() => {});
    } catch { /* hors ligne non disponible */ }
  }
  checkReminders();
  setInterval(checkReminders, 30 * 60 * 1000);
}

init();
