/* The pieces both the archive and the stop sheet are built from. */

import { content } from './data.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const KIND_LABEL = {
  flight: 'Flight', train: 'Train', ferry: 'Ferry', bus: 'Bus',
  stay: 'Stay', pass: 'Pass', voyage: 'Coastal voyage', sleeper: 'Sleeper',
};

/** A photo or video tile. Everything below the fold loads lazily. */
export function mediaCell(item, onOpen) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cell';
  if (item.width && item.height) btn.style.aspectRatio = `${item.width} / ${item.height}`;

  if (item.type === 'video') {
    const v = document.createElement('video');
    v.src = item.src;
    v.muted = true;
    v.playsInline = true;
    v.preload = 'metadata';
    btn.append(v);
    const play = document.createElement('span');
    play.className = 'play';
    play.innerHTML = '<b>▶</b>';
    btn.append(play);
  } else {
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.caption || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    if (item.width && item.height) { img.width = item.width; img.height = item.height; }
    btn.append(img);
  }
  if (item.caption) {
    const cap = document.createElement('span');
    cap.className = 'cap';
    cap.textContent = item.caption;
    btn.append(cap);
  }
  btn.addEventListener('click', () => onOpen(item));
  return btn;
}

/** A stop with no photographs yet still has its story. */
export function stopCard(stop, onOpen) {
  const card = document.createElement(onOpen ? 'button' : 'article');
  if (onOpen) card.type = 'button';
  card.className = 'stopcard' + (stop.star ? ' star' : '') + (onOpen ? ' tappable' : '');
  card.innerHTML =
    `<span class="d">${esc(stop.dateLabel)}</span>` +
    `<h3>${esc(stop.name)}</h3>` +
    `<span class="sub">${esc(stop.subtitle || '')}</span>` +
    `<p>${esc(stop.caption || '')}</p>` +
    (stop.arrivedBy ? `<span class="await">Arrived by ${esc(stop.arrivedBy)}</span>` : '');
  if (onOpen) card.addEventListener('click', () => onOpen(stop.id));
  return card;
}

/** A booking, as an artefact rather than a row in a list. */
export function ticketCard(t, { compact = false } = {}) {
  const stop = t.stop ? content.byStop.get(t.stop) : null;
  const card = document.createElement('article');
  card.className = 'ticket' + (t.stop === 'tromso-birthday' ? ' gold' : '');
  card.innerHTML =
    '<span class="punch l"></span><span class="punch r"></span>' +
    `<div class="op"><b>${esc(t.operator)}</b><i>${esc(KIND_LABEL[t.kind] || t.kind)}</i></div>` +
    `<h3>${esc(t.title)}</h3>` +
    (t.from || t.to
      ? `<div class="route"><span>${esc(t.from || '')}</span><em>→</em><span>${esc(t.to || '')}</span></div>`
      : '') +
    `<div class="times">
       ${t.depart ? `<div><small>${t.kind === 'stay' ? 'In' : 'Dep'}</small><b>${esc(t.depart)}</b></div>` : ''}
       ${t.arrive ? `<div><small>${t.kind === 'stay' ? 'Out' : 'Arr'}</small><b>${esc(t.arrive)}</b></div>` : ''}
       <div><small>Date</small><b style="font-size:12px">${esc(t.dateLabel)}</b></div>
     </div>` +
    (t.ref ? `<span class="ref">Ref ${esc(t.ref)}</span>` : '') +
    (!compact && t.note ? `<p class="note">${esc(t.note)}</p>` : '') +
    (!compact && stop ? `<span class="ref" style="color:var(--faint)">${esc(stop.name)}</span>` : '');
  return card;
}

/** Something they ate. */
export function mealCard(meal, onOpen) {
  const card = document.createElement('article');
  card.className = 'meal' + (meal.first ? ' first' : '');

  const shots = (meal.media || [])
    .map((id) => content.media.find((m) => m.id === id))
    .filter(Boolean);
  if (shots.length && onOpen) {
    const strip = document.createElement('div');
    strip.className = 'grid';
    strip.style.gap = '2px';
    for (const m of shots) strip.append(mediaCell(m, onOpen));
    card.append(strip);
  }

  const body = document.createElement('div');
  body.className = 'body';
  body.innerHTML =
    `<span class="when">${esc(meal.meal)}${meal.time ? ' · ' + esc(meal.time) : ''} · ${esc(meal.dateLabel)}</span>` +
    `<h3>${esc(meal.place)}</h3>` +
    `<span class="where">${esc(meal.city)}</span>` +
    `<p>${esc(meal.blurb)}</p>` +
    (meal.confirmed ? '' : '<span class="maybe">On the list — not confirmed</span>');
  card.append(body);
  return card;
}
