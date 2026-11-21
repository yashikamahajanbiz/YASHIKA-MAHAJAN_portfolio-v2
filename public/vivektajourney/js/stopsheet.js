/* One place, in full: the story, how she got there, what she photographed,
 * what she ate, and the bookings that put her there.
 *
 * Slides up over the film when she taps a stop, and is also the whole page at
 * #/stop/<id>. Same component either way, so the two can never drift.
 */

import { content, mediaFor, ticketsFor } from './data.js';
import { esc, mediaCell, ticketCard, mealCard } from './cards.js';
import { mountPanorama } from './pano.js';
import { openLightbox } from './lightbox.js';

let sheet = null;
let panoViewer = null;
let currentId = null;
let handlers = {};

function teardownPano() {
  if (panoViewer) {
    panoViewer.destroy();
    panoViewer = null;
  }
}

function build() {
  sheet = document.createElement('div');
  sheet.id = 'stopsheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.innerHTML = `
    <div class="scrim"></div>
    <div class="panel">
      <div class="grip" aria-hidden="true"></div>
      <button class="sclose" type="button" aria-label="Close">✕</button>
      <div class="sbody"></div>
    </div>`;
  document.body.append(sheet);

  sheet.querySelector('.scrim').addEventListener('click', close);
  sheet.querySelector('.sclose').addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet.classList.contains('show')) close();
  });

  // drag the sheet down to dismiss, the way a phone sheet should behave
  const panel = sheet.querySelector('.panel');
  let startY = 0;
  let dy = 0;
  let dragging = false;
  panel.addEventListener('pointerdown', (e) => {
    if (panel.scrollTop > 0 || !e.target.closest('.grip, .panel > .sclose, .shead')) return;
    dragging = true;
    startY = e.clientY;
    dy = 0;
    panel.style.transition = 'none';
  });
  panel.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - startY);
    panel.style.transform = `translateY(${dy}px)`;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = '';
    panel.style.transform = '';
    if (dy > 110) close();
  };
  panel.addEventListener('pointerup', release);
  panel.addEventListener('pointercancel', release);
}

/** Build the body for one stop. Shared by the sheet and the #/stop route. */
export function renderStopDetail(stop, host, opts = {}) {
  const photos = mediaFor(stop.id, 'photos').filter((m) => m.type !== 'panorama');
  const foodShots = mediaFor(stop.id, 'food');
  const travelShots = mediaFor(stop.id, 'travel');
  const pano = content.panorama && content.panorama.stop === stop.id ? content.panorama : null;
  const tickets = ticketsFor(stop);
  const meals = content.food.filter((m) => m.stop === stop.id);
  const modes = content.travel.filter((m) => (m.stops || []).includes(stop.id));
  const idx = content.stops.indexOf(stop);
  const prev = content.stops[idx - 1];
  const next = content.stops[idx + 1];

  host.textContent = '';
  host.className = 'sbody' + (stop.star ? ' star' : '');

  const head = document.createElement('header');
  head.className = 'shead';
  head.innerHTML =
    `<span class="d">${esc(stop.dateLabel)}${stop.leg ? ' · ' + esc(stop.leg) : ''}</span>` +
    `<h2>${esc(stop.name)}</h2>` +
    `<span class="sub">${esc(stop.subtitle || '')}</span>` +
    `<p class="story">${esc(stop.caption || '')}</p>` +
    (stop.arrivedBy ? `<p class="arrived"><span>Arrived by</span> ${esc(stop.arrivedBy)}</p>` : '') +
    (stop.coordsApprox ? '<span class="approxtag">Position approximate</span>' : '');
  host.append(head);

  if (opts.onPlay) {
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'tool on playhere';
    play.textContent = 'Play the film from here';
    play.addEventListener('click', () => opts.onPlay(stop.id));
    host.append(play);
  }

  const section = (title, count) => {
    const h = document.createElement('div');
    h.className = 'legtitle';
    h.innerHTML = `<h2>${esc(title)}</h2>` + (count ? `<span>${esc(count)}</span>` : '');
    host.append(h);
    return h;
  };

  if (pano) {
    section('The room');
    const wrap = document.createElement('div');
    wrap.className = 'panowrap';
    wrap.innerHTML = '<span class="pill">Drag to look around</span>';
    host.append(wrap);
    teardownPano();
    panoViewer = mountPanorama(wrap, pano.src, pano.coverageDeg || 270);
  }

  if (photos.length) {
    section('Photographs', `${photos.length}`);
    const grid = document.createElement('div');
    grid.className = 'grid';
    const open = (item) =>
      openLightbox(photos, Math.max(0, photos.findIndex((m) => m.id === item.id)));
    for (const m of photos) grid.append(mediaCell(m, open));
    host.append(grid);
  }

  if (meals.length || foodShots.length) {
    section('What they ate');
    const grid = document.createElement('div');
    grid.className = 'meals';
    const open = (item) =>
      openLightbox(foodShots, Math.max(0, foodShots.findIndex((m) => m.id === item.id)));
    for (const meal of meals) grid.append(mealCard(meal, open));
    host.append(grid);
    if (foodShots.length) {
      const strip = document.createElement('div');
      strip.className = 'grid';
      for (const m of foodShots) strip.append(mediaCell(m, open));
      host.append(strip);
    }
  }

  if (modes.length) {
    section('Getting there');
    const grid = document.createElement('div');
    grid.className = 'modes';
    for (const mode of modes) {
      const card = document.createElement('article');
      card.className = 'waycard' + (mode.hero ? ' hero' : '');
      card.innerHTML =
        `<h3>${esc(mode.name)}</h3><span class="count">${esc(mode.count)}</span>` +
        `<p>${esc(mode.blurb)}</p>`;
      grid.append(card);
    }
    host.append(grid);
    if (travelShots.length) {
      const strip = document.createElement('div');
      strip.className = 'grid';
      const open = (item) =>
        openLightbox(travelShots, Math.max(0, travelShots.findIndex((m) => m.id === item.id)));
      for (const m of travelShots) strip.append(mediaCell(m, open));
      host.append(strip);
    }
  }

  if (tickets.length) {
    section('The proof', `${tickets.length}`);
    const grid = document.createElement('div');
    grid.className = 'artefacts';
    for (const t of tickets) grid.append(ticketCard(t));
    host.append(grid);
  }

  if (!photos.length && !pano && !meals.length && !tickets.length && !modes.length) {
    const note = document.createElement('div');
    note.className = 'await-block';
    note.innerHTML = '<b>Nothing here yet</b>The photographs from this stop are still coming.';
    host.append(note);
  }

  const nav = document.createElement('nav');
  nav.className = 'stopnav';
  for (const [s, label] of [[prev, '← ' + (prev ? prev.name : '')], [next, (next ? next.name : '') + ' →']]) {
    if (!s) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'jumprow';
    b.innerHTML = `<span class="n">${esc(label)}<span class="sub">${esc(s.dateLabel)}</span></span>`;
    b.addEventListener('click', () => (opts.onGo ? opts.onGo(s.id) : openStopSheet(s.id, handlers)));
    nav.append(b);
  }
  host.append(nav);
}

export function openStopSheet(stopId, opts = {}) {
  const stop = content.byStop.get(stopId);
  if (!stop) return;
  if (!sheet) build();
  handlers = opts;
  currentId = stopId;

  renderStopDetail(stop, sheet.querySelector('.sbody'), {
    ...opts,
    onGo: (id) => openStopSheet(id, opts),
  });

  sheet.querySelector('.panel').scrollTop = 0;
  sheet.classList.add('show');
  document.body.classList.add('sheet-open');
  opts.onOpen?.(stopId);
}

export function close() {
  if (!sheet) return;
  teardownPano();
  sheet.classList.remove('show');
  document.body.classList.remove('sheet-open');
  const id = currentId;
  currentId = null;
  handlers.onClose?.(id);
}

export const isOpen = () => !!sheet && sheet.classList.contains('show');
