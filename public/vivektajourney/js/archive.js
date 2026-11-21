/* The archive: photos, food, tickets, travel, journey.
   Everything here is rendered from data/*.json. */

import { content, mediaFor } from './data.js';
import { esc, mediaCell, stopCard, ticketCard, mealCard } from './cards.js';
import { mountPanorama } from './pano.js';
import { openLightbox } from './lightbox.js';

let teardown = [];

function cleanup() {
  for (const fn of teardown) {
    try { fn(); } catch { /* keep tearing down */ }
  }
  teardown = [];
}

function legDates(leg) {
  const first = leg.stops[0];
  const last = leg.stops[leg.stops.length - 1];
  return first === last ? first.dateLabel : `${first.dateLabel} – ${last.dateLabel}`;
}

/* ---------- /photos ---------- */

function renderPhotos(main, { onOpenStop }) {
  const all = content.media.filter((m) => m.section === 'photos' && m.type !== 'panorama');

  main.insertAdjacentHTML('beforeend',
    `<header class="lede"><span class="kicker">Photos</span>
       <h1>Seventeen days, in order</h1>
       <p>Grouped the way the trip happened: Oslo, then the fjords, then the coast,
          then the Arctic, then the long way home.</p></header>`);

  const open = (item) => {
    const i = all.findIndex((m) => m.id === item.id);
    openLightbox(all, Math.max(0, i));
  };

  for (const leg of content.legs) {
    const head = document.createElement('div');
    head.className = 'legtitle';
    head.innerHTML = `<h2>${esc(leg.name)}</h2><span>${esc(legDates(leg))}</span>`;
    main.append(head);

    // Oslo carries the apartment panorama.
    let pending = [];
    const flushPending = () => {
      if (!pending.length) return;
      const grid = document.createElement('div');
      grid.className = 'artefacts';
      for (const s of pending) grid.append(stopCard(s, onOpenStop));
      main.append(grid);
      pending = [];
    };

    for (const stop of leg.stops) {
      const shots = mediaFor(stop.id, 'photos').filter((m) => m.type !== 'panorama');
      const pano = content.panorama && content.panorama.stop === stop.id ? content.panorama : null;

      if (!shots.length && !pano) { pending.push(stop); continue; }
      flushPending();

      const block = document.createElement('section');
      const head2 = document.createElement('button');
      head2.type = 'button';
      head2.className = 'legtitle stoplink';
      head2.innerHTML =
        `<h2>${esc(stop.name)}</h2><span>${esc(stop.dateLabel)} · open ›</span>`;
      head2.addEventListener('click', () => onOpenStop?.(stop.id));
      block.append(head2);
      main.append(block);

      if (pano) {
        const wrap = document.createElement('div');
        wrap.className = 'panowrap';
        wrap.innerHTML = '<span class="pill">Drag to look around</span>';
        block.append(wrap);
        const viewer = mountPanorama(wrap, pano.src, pano.coverageDeg || 270);
        teardown.push(() => viewer.destroy());
      }
      if (shots.length) {
        const grid = document.createElement('div');
        grid.className = 'grid';
        for (const m of shots) grid.append(mediaCell(m, open));
        block.append(grid);
      }
    }
    flushPending();
  }
}

/* ---------- /food ---------- */

function renderFood(main) {
  main.insertAdjacentHTML('beforeend',
    `<header class="lede"><span class="kicker">Food</span>
       <h1>What they ate</h1>
       <p>It starts at a fish restaurant on the Bjørvika waterfront, twelve minutes'
          walk from the flat, on the first night.</p></header>`);

  const grid = document.createElement('div');
  grid.className = 'meals';
  main.append(grid);

  const open = (item) => {
    const shots = content.media.filter((m) => m.section === 'food');
    openLightbox(shots, Math.max(0, shots.findIndex((m) => m.id === item.id)));
  };

  for (const meal of content.food) grid.append(mealCard(meal, open));
}

/* ---------- /tickets ---------- */



function renderTickets(main) {
  main.insertAdjacentHTML('beforeend',
    `<header class="lede"><span class="kicker">Tickets</span>
       <h1>The proof</h1>
       <p>Every booking that made the seventeen days happen — eight flights, four trains,
          three boats, the Havila reference, the Oslo Pass and the Bergen Card.</p></header>`);

  const grid = document.createElement('div');
  grid.className = 'artefacts';
  main.append(grid);

  for (const t of content.tickets) {
    const card = ticketCard(t);
    const scan = content.media.find((m) => m.section === 'tickets' && m.file?.includes(t.id));
    if (scan) {
      const box = document.createElement('div');
      box.className = 'scan';
      box.append(mediaCell(scan, () => openLightbox([scan], 0)));
      card.append(box);
    }
    grid.append(card);
  }
}

/* ---------- /travel ---------- */

function renderTravel(main) {
  main.insertAdjacentHTML('beforeend',
    `<header class="lede"><span class="kicker">Travel</span>
       <h1>Eleven ways to move</h1>
       <p>An unusually rich list for seventeen days. The overnight from Rovaniemi to Turku
          is the Santa Claus Express — a VR sleeper, and a train, whatever anyone calls it.</p></header>`);

  const grid = document.createElement('div');
  grid.className = 'modes';
  main.append(grid);

  content.travel.forEach((mode, i) => {
    const card = document.createElement('article');
    card.className = 'waycard' + (mode.hero ? ' hero' : '');
    card.innerHTML =
      `<span class="n">${String(i + 1).padStart(2, '0')}</span>` +
      `<h3>${esc(mode.name)}</h3>` +
      `<span class="count">${esc(mode.count)}</span>` +
      `<span class="where">${esc(mode.where)}</span>` +
      `<p>${esc(mode.blurb)}</p>`;
    grid.append(card);
  });
}

/* ---------- /journey ---------- */

function renderJourney(main, { onReplay, onOpenStop }) {
  main.insertAdjacentHTML('beforeend',
    `<header class="lede"><span class="kicker">The journey</span>
       <h1>Watch it again</h1>
       <p>From the top, or open any place to see it in full and start there.</p></header>`);

  const actions = document.createElement('div');
  actions.className = 'tools';
  actions.style.cssText = 'margin-bottom:28px;pointer-events:auto';
  const replay = document.createElement('button');
  replay.className = 'tool on';
  replay.style.cssText = 'height:46px;padding:0 22px';
  replay.textContent = 'Play the film from the start';
  replay.addEventListener('click', onReplay);
  actions.append(replay);
  main.append(actions);

  const list = document.createElement('div');
  list.className = 'replay';
  main.append(list);

  for (const leg of content.legs) {
    const head = document.createElement('div');
    head.className = 'legtitle';
    head.innerHTML = `<h2>${esc(leg.name)}</h2><span>${esc(legDates(leg))}</span>`;
    list.append(head);

    for (const stop of leg.stops) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'jumprow' + (stop.star ? ' star' : '');
      row.innerHTML =
        `<span class="d">${esc(stop.dateLabel)}</span>` +
        `<span class="n">${esc(stop.name)}<span class="sub">${esc(stop.subtitle || '')}</span></span>` +
        '<span class="go">Open ›</span>';
      row.addEventListener('click', () => onOpenStop?.(stop.id));
      list.append(row);
    }
  }
}

/* ---------- archive home ---------- */

function renderHome(main, { onReplay, onOpenStop }) {
  const birthday = content.byStop.get('tromso-birthday');
  main.insertAdjacentHTML('beforeend',
    `<header class="lede"><span class="kicker">15 November — 1 December 2025</span>
       <h1>Everything from the trip,<br>kept in one place</h1>
       <p>Four ways in. Wander whichever one you like — it is all still here,
          and it keeps filling up.</p></header>`);

  const grid = document.createElement('div');
  grid.className = 'modes';
  main.append(grid);

  const counts = {
    photos: content.media.filter((m) => m.section === 'photos').length,
    food: content.food.length,
    tickets: content.tickets.length,
    travel: content.travel.length,
  };

  const cards = [
    ['photos', 'Photos', `${counts.photos || 'Still arriving'}`, 'Grouped by leg, in trip order, with the Oslo flat to look around.'],
    ['food', 'Food', `${counts.food} places`, 'Starting with Fiskeriet Bjørvika on the first night.'],
    ['tickets', 'Tickets', `${counts.tickets} bookings`, 'Boarding passes, the Havila reference, the Oslo Pass, the Bergen Card.'],
    ['travel', 'Travel', `${counts.travel} ways`, 'Uber to coastal ship to overnight sleeper, and everything between.'],
  ];
  for (const [route, name, count, blurb] of cards) {
    const a = document.createElement('a');
    a.className = 'waycard';
    a.href = `#/${route}`;
    a.innerHTML = `<h3>${name}</h3><span class="count">${esc(count)}</span><p>${esc(blurb)}</p>`;
    grid.append(a);
  }

  if (birthday) {
    const card = document.createElement('article');
    card.className = 'waycard hero';
    card.style.marginTop = '12px';
    card.innerHTML =
      `<span class="n">23 Nov</span><h3>${esc(birthday.name)}</h3>` +
      `<span class="count">${esc(birthday.subtitle)}</span>` +
      `<p>${esc(birthday.caption)}</p>`;
    const go = document.createElement('button');
    go.className = 'tool gold';
    go.style.cssText = 'align-self:flex-start;margin-top:4px;height:var(--tap);padding:0 20px';
    go.textContent = 'Open that night';
    go.addEventListener('click', () => onOpenStop?.('tromso-birthday'));
    card.append(go);
    main.append(card);
  }

  const again = document.createElement('div');
  again.className = 'tools';
  again.style.cssText = 'margin-top:26px;pointer-events:auto';
  const btn = document.createElement('button');
  btn.className = 'tool';
  btn.style.cssText = 'height:46px;padding:0 22px';
  btn.textContent = 'Watch the film again';
  btn.addEventListener('click', onReplay);
  again.append(btn);
  main.append(again);
}

/* ---------- entry ---------- */

const ROUTES = {
  '': renderHome,
  photos: renderPhotos,
  food: renderFood,
  tickets: renderTickets,
  travel: renderTravel,
  journey: renderJourney,
};

export function renderArchive(route, main, handlers) {
  cleanup();
  main.textContent = '';
  (ROUTES[route] || renderHome)(main, handlers);

  const foot = document.createElement('footer');
  foot.className = 'foot';
  foot.innerHTML =
    '<b>VIVEKTA</b> · 15 November – 1 December 2025 · 23 stops, 11 ways of travelling.<br>' +
    'Cleo County, the Panorama Glass Lodge and Torvik are placed by name rather than from the booking.';
  main.append(foot);

  return cleanup;
}
