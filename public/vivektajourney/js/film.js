/* The opening film: globe → Noida → all 23 stops → Delhi.
   globe.gl is ~1.9 MB, so it is fetched only when the film actually runs.
   A returning visitor who lands on the archive never pays for it. */

import { content, mediaFor } from './data.js';
import { createMapLabels } from './maplabels.js';
import { createMemories } from './memories.js';
import { createMapChapter, isNordic } from './mapchapter.js';

const AURORA = '#4fd1a5';
const GOLD = '#e8b765';
const DAY = 'img/earth-blue-marble.webp';
const NIGHT = 'img/earth-night.webp';

/* Dwell per tier. Equal time on all 23 stops is a slog — the five Havila port
   calls get a beat, the birthday gets room to land. */
const DWELL = { hero: 5200, standard: 3100, quick: 1700 };
const FLY = { hero: 2200, standard: 1900, quick: 1200 };

/* An isolated stop keeps the old floor: below it the surrounding coastline
   leaves frame and the viewer is looking at undifferentiated ocean.
   A stop with neighbours already in frame is a different case — the neighbours
   ARE the context, so the camera is allowed much closer to show how near two
   places actually are. ALT_NEAR is as tight as the 4096px earth texture can
   be pushed before it turns to mush; checked on a 390px viewport. */
const ALT_FLOOR = 0.82;
const ALT_NEAR = 0.26;
const ALT_CEIL = 2.2;

/* Stops within this many degrees of the current one are framed with it. */
const CLUSTER_DEG = 6;
/* Leave the cluster this much smaller than the usable band, so nothing sits
   right against the edge. */
const CLUSTER_MARGIN = 1.7;
/* Share of the viewport height not covered by the caption and the stop rail. */
const USABLE_BAND = 0.46;

const RAIL_HOLD_MS = 5000;   // leave the list alone while a thumb is on it
const MAX_FILM_MEDIA = 6;
/* A calm frame names a handful of places, not everything seen so far.
   On the Norway map the names are the whole point, so more of them earn space. */
const MAX_LABELS = 6;
const MAX_LABELS_MAP = 10;

let world = null;
let libPromise = null;

function loadGlobeLib() {
  if (window.Globe) return Promise.resolve();
  if (libPromise) return libPromise;
  libPromise = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = 'globe.gl.js';
    el.onload = resolve;
    el.onerror = () => reject(new Error('globe.gl.js failed to load'));
    document.head.appendChild(el);
  });
  return libPromise;
}

/* Resolves once an image is decoded, or when `ms` runs out — a slow network
   must delay the reveal, never block it for good. */
function decoded(src, ms) {
  return new Promise((resolve) => {
    const done = setTimeout(resolve, ms);
    const img = new Image();
    const finish = () => { clearTimeout(done); resolve(); };
    img.onload = finish;
    img.onerror = finish;
    img.src = src;
  });
}

/* Great-circle separation in degrees — used to stop labels piling on top of
   each other when the camera is close in. */
function angSep(a, b) {
  const R = Math.PI / 180;
  const p1 = a.lat * R;
  const p2 = b.lat * R;
  const dl = (a.lng - b.lng) * R;
  const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl);
  return Math.acos(Math.min(1, Math.max(-1, c))) / R;
}

export function createFilm({ root, onEnd, onOpenStop }) {
  const stops = content.stops;

  const el = {
    globe: root.querySelector('#globe'),
    intro: root.querySelector('#intro'),
    loading: root.querySelector('#intro .loading'),
    begin: root.querySelector('#go'),
    caption: root.querySelector('#caption'),
    capDate: root.querySelector('#caption .date'),
    capPlace: root.querySelector('#caption .place'),
    capSub: root.querySelector('#caption .sub'),
    capMode: root.querySelector('#caption .mode'),
    capApprox: root.querySelector('#caption .approx'),
    memories: root.querySelector('#memories'),
    rail: root.querySelector('#rail'),
    bar: root.querySelector('#bar i'),
    hint: root.querySelector('#hint'),
    endcard: root.querySelector('#endcard'),
    night: root.querySelector('#tNight'),
    play: root.querySelector('#tPlay'),
    skip: root.querySelector('#tSkip'),
  };

  // Legs, skipping zero-length hops (Tromsø → her birthday is the same point).
  const legs = [];
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (a.lat === b.lat && a.lng === b.lng) continue;
    legs.push({
      i,
      startLat: a.lat, startLng: a.lng,
      endLat: b.lat, endLng: b.lng,
      color: [AURORA, b.star ? GOLD : AURORA],
    });
  }

  let cur = -1;
  let shownLegs = 0;
  let timer = null;
  let playing = false;
  let holdScroll = 0;
  let started = false;
  let ended = false;
  let night = true;
  let destroyed = false;
  let labels = null;
  let memories = null;
  let mapChapter = null;
  /* Timers for the opening fly-in. Held so that jumping, replaying or leaving
     can cancel them instead of being overwritten by a stale beat. */
  const openingTimers = [];
  const clearOpening = () => {
    while (openingTimers.length) clearTimeout(openingTimers.pop());
  };

  /* ---------------- rail ---------------- */
  const rows = stops.map((s, i) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'stop' + (s.star ? ' star' : '');
    row.dataset.i = String(i);
    const shots = mediaFor(s.id).length;
    row.innerHTML =
      `<span class="d">${s.dateLabel}</span>` +
      `<span class="n">${s.name}${shots ? '<i class="cam" title="has photos"></i>' : ''}` +
      `<span class="sub">${s.subtitle}</span></span>`;
    // Tapping a stop flies there and opens the place in full.
    row.addEventListener('click', () => { pausePlayback(); jump(i); onOpenStop?.(s.id); });
    el.rail.appendChild(row);
    return row;
  });

  const hold = () => { holdScroll = Date.now() + RAIL_HOLD_MS; };
  for (const ev of ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'mouseenter', 'mousemove']) {
    el.rail.addEventListener(ev, hold, { passive: true });
  }

  /* ---------------- caption ---------------- */

  /* What this beat puts on screen. Dwell is derived from the same list, so a
     beat never holds for media it does not show. Panoramas belong to the
     place's own page, not to the film. */
  function filmMediaFor(stop) {
    return mediaFor(stop.id, 'photos')
      .filter((m) => m.type !== 'panorama')
      .slice(0, stop.tier === 'hero' ? MAX_FILM_MEDIA : 4);
  }

  function setCaption(stop) {
    el.caption.classList.remove('show');
    setTimeout(() => {
      if (destroyed) return;
      el.capDate.textContent = stop.dateLabel;
      el.capPlace.textContent = stop.name;
      el.capSub.textContent = stop.subtitle || '';
      el.capMode.textContent = stop.caption || '';
      el.capApprox.hidden = !stop.coordsApprox;
      el.capApprox.textContent = 'position approximate';
      el.caption.classList.toggle('star', !!stop.star);
      el.caption.classList.toggle('hero', stop.tier === 'hero');
      el.caption.classList.add('show');
    }, 190);
  }

  /* ---------------- globe painting ---------------- */

  /* Which revealed stops sit close enough to the current one to be framed with
     it. These are what make a tight zoom legible instead of disorienting. */
  function clusterAround(i) {
    const here = stops[i];
    const near = [];
    for (let j = 0; j <= cur; j++) {
      if (j === i) continue;
      const s = stops[j];
      if (s.coincident) continue;
      if (s.lat === here.lat && s.lng === here.lng) continue;
      if (angSep(here, s) <= CLUSTER_DEG) near.push(s);
    }
    return near;
  }

  /* Altitude at which an arc of `spanDeg` fills the usable band.
     For a camera at R(1+alt) looking at the centre, a surface point psi
     degrees off-axis subtends atan(sin psi / (1 + alt - cos psi)). Setting
     that to the half-field and solving for alt gives this directly. */
  function altForSpan(spanDeg) {
    const fovDeg = world?.camera()?.fov ?? 50;
    const halfField = Math.atan(Math.tan((fovDeg * Math.PI) / 360) * USABLE_BAND);
    const psi = Math.min(Math.PI / 2.2, ((spanDeg * CLUSTER_MARGIN) / 2) * (Math.PI / 180));
    return Math.sin(psi) / Math.tan(halfField) + Math.cos(psi) - 1;
  }

  /* Isolated stop -> the old floor. Stop with neighbours -> close enough to
     read the distance between them, because they are in frame too. */
  function altFor(i) {
    if (i <= 0) return 0.95;
    const near = clusterAround(i);
    if (!near.length) {
      const a = stops[i - 1];
      const b = stops[i];
      const d = Math.hypot(a.lng - b.lng, a.lat - b.lat);
      return Math.min(ALT_CEIL, Math.max(ALT_FLOOR, 0.66 + d * 0.062));
    }
    const reach = Math.max(...near.map((s) => angSep(stops[i], s)));
    return Math.min(ALT_CEIL, Math.max(ALT_NEAR, altForSpan(reach * 2)));
  }

  /* Dots and rings are sized in globe degrees, so they must shrink with the
     camera or a close shot is nothing but a giant blob. */
  function scaleGlobe(alt) {
    const k = Math.max(0.3, Math.min(1, alt / ALT_FLOOR));
    world.pointRadius(0.13 * k)
      .pointAltitude(0.004 * k)
      .ringMaxRadius(5.5 * k)
      .arcStroke(0.55 * Math.max(0.45, k));
  }

  function paint(altitude) {
    if (!world) return;
    const alt = altitude ?? ALT_FLOOR;
    const seen = stops.slice(0, cur + 1);
    scaleGlobe(alt);
    world.arcsData(legs.slice(0, shownLegs));
    world.pointsData(
      seen.filter((s) => !s.coincident).map((s) => ({ lat: s.lat, lng: s.lng, star: !!s.star }))
    );
    world.ringsData(
      cur >= 0 && stops[cur].star ? [{ lat: stops[cur].lat, lng: stops[cur].lng }] : []
    );

    /* Labels are HTML, so they stay readable at any zoom, spell Tromsø
       correctly, and can be tapped to open the place.

       On the map the names ARE the point — a coast full of identical dots
       tells her nothing — so the chapter gets a wider reach and a bigger
       budget. From orbit the opposite is true and a handful is plenty. */
    const onMap = document.body.dataset.chapter === 'map';
    const here = stops[cur];
    const reach = onMap ? Math.max(7, alt * 30) : Math.max(4, alt * 15);
    const budget = onMap ? MAX_LABELS_MAP : MAX_LABELS;
    const labelled = seen
      .filter((s, i) => !s.coincident
        && (i === cur || ((!s.minorLabel || onMap) && angSep(s, here) <= reach)))
      .sort((a, b) => angSep(a, here) - angSep(b, here))
      .slice(0, budget);
    labels?.set(labelled, here?.id);

    rows.forEach((r, i) => {
      r.classList.toggle('active', i === cur);
      r.classList.toggle('done', i < cur);
    });
    el.bar.style.width = `${(100 * (cur + 1)) / stops.length}%`;

    // Don't yank the list out from under a thumb reaching for a row.
    const active = rows[cur];
    if (active && Date.now() > holdScroll) {
      active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /* Hero beats hold longer and hold longer still when they have media to show. */
  function dwellFor(stop) {
    let ms = DWELL[stop.tier] ?? DWELL.standard;
    const shots = filmMediaFor(stop);
    if (shots.length) {
      ms += Math.min(shots.length, MAX_FILM_MEDIA) * (stop.tier === 'hero' ? 1400 : 650);
    }
    const vid = shots.find((m) => m.type === 'video' && m.duration);
    if (vid) ms = Math.max(ms, Math.min(vid.duration * 1000, 12000));
    return ms;
  }

  function jump(i) {
    cur = Math.max(0, Math.min(stops.length - 1, i));
    shownLegs = legs.filter((l) => l.i <= cur).length;
    const alt = altFor(cur);
    const stop = stops[cur];
    setCaption(stop);
    memories?.show(filmMediaFor(stop), dwellFor(stop), stop.tier === 'hero');
    // From Oslo onward the surface becomes a map; it turns back at Istanbul.
    mapChapter?.setActive(isNordic(stop));
    world.pointOfView({ lat: stop.lat, lng: stop.lng, altitude: alt }, FLY[stop.tier] ?? FLY.standard);
    paint(alt);
  }

  /* ---------------- playback ---------------- */
  function step() {
    if (destroyed) return;
    if (cur >= stops.length - 1) { finish(); return; }
    jump(cur + 1);
    timer = setTimeout(step, dwellFor(stops[cur]));
  }

  function play() {
    if (destroyed || ended) return;
    playing = true;
    el.play.textContent = 'Pause';
    el.play.classList.add('on');
    step();
  }

  function pausePlayback() {
    playing = false;
    clearTimeout(timer);
    el.play.textContent = 'Play';
    el.play.classList.remove('on');
  }

  function finish() {
    pausePlayback();
    ended = true;
    el.endcard.classList.add('show');
  }

  /** Back to the top. Also what the Play control does once the film has ended. */
  async function replayFilm() {
    if (!started) { await begin(); return; }
    clearOpening();
    pausePlayback();
    ended = false;
    el.endcard.classList.remove('show');
    cur = -1;
    shownLegs = 0;
    world?.arcsData([]).pointsData([]).ringsData([]);
    labels?.clear();
    memories?.hide();
    mapChapter?.reset();
    el.caption.classList.remove('show');
    world?.pointOfView({ lat: 18, lng: 60, altitude: 3.1 }, 1800);
    openingTimers.push(setTimeout(() => {
      if (destroyed) return;
      cur = 0;
      setCaption(stops[0]);
      paint(0.95);
      play();
    }, 1900));
  }

  /* ---------------- opening sequence ---------------- */
  async function begin({ auto = false, at = null } = {}) {
    if (started || destroyed) return;
    started = true;
    el.loading.textContent = 'Loading the globe…';

    try {
      await loadGlobeLib();
    } catch {
      el.loading.textContent = 'The globe could not load — the rest of the site is fine.';
      onEnd?.({ failed: true });
      return;
    }
    if (destroyed) return;

    world = window.Globe()(el.globe)
      .globeImageUrl(NIGHT)
      .bumpImageUrl('img/earth-topology.webp')
      .backgroundImageUrl('img/night-sky.webp')
      .showAtmosphere(true)
      .atmosphereColor(AURORA)
      .atmosphereAltitude(0.17)
      .arcColor('color')
      .arcStroke(0.55)
      .arcAltitudeAutoScale(0.42)
      .arcDashLength(0.45)
      .arcDashGap(0.9)
      .arcDashAnimateTime(2600)
      .arcsTransitionDuration(0)
      .pointLat('lat').pointLng('lng').pointAltitude(0.004)
      .pointRadius(0.13).pointResolution(6)
      .pointColor((d) => (d.star ? GOLD : 'rgba(79,209,165,.85)'))
      .ringLat('lat').ringLng('lng')
      .ringColor(() => (t) => `rgba(232,183,101,${1 - t})`)
      .ringMaxRadius(5.5).ringPropagationSpeed(1.6).ringRepeatPeriod(1100)
      .pointOfView({ lat: 18, lng: 60, altitude: 3.1 }, 0);

    const controls = world.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.32;
    controls.enableDamping = true;

    labels = createMapLabels({ world, onSelect: (id) => { pausePlayback(); onOpenStop?.(id); } });
    memories = createMemories(el.memories);
    mapChapter = createMapChapter({ world });

    resize();
    window.addEventListener('resize', resize);

    // Hold the title card until the earth has actually decoded. Dismissing it
    // first shows her a black sphere on a slow connection.
    el.loading.textContent = 'Lighting the earth…';
    await decoded(NIGHT, 7000);
    if (destroyed) return;
    el.intro.classList.add('gone');
    controls.autoRotate = false;
    el.hint.classList.add('show');

    // Only now fetch the map. It is not needed until Oslo, some twenty seconds
    // away, and starting it earlier makes it race the earth textures for a
    // phone's bandwidth.
    mapChapter.preload();

    // Opening straight at a stop (the replay route) skips the choreography
    // entirely, rather than racing its timers.
    if (at) {
      el.rail.classList.add('show');
      const i = stops.findIndex((s) => s.id === at);
      jump(i < 0 ? 0 : i);
      // Nothing is running, so the control must offer Play, not Pause.
      pausePlayback();
      return;
    }

    // globe → India → Noida
    world.pointOfView({ lat: 22, lng: 78, altitude: 2.3 }, 2600);
    openingTimers.push(setTimeout(() => {
      if (!destroyed) world.pointOfView({ lat: 28.594, lng: 77.368, altitude: 0.95 }, 2600);
    }, 2700));
    openingTimers.push(setTimeout(() => {
      if (destroyed) return;
      el.rail.classList.add('show');
      cur = 0;
      shownLegs = 0;
      setCaption(stops[0]);
      paint(0.95);
    }, 5400));
    openingTimers.push(setTimeout(() => { if (!destroyed) play(); }, 8000));

    if (auto) el.begin.blur();
  }

  function resize() {
    if (world) world.width(window.innerWidth).height(window.innerHeight);
  }

  /* ---------------- controls ---------------- */
  el.begin.addEventListener('click', () => begin());
  el.play.addEventListener('click', () => {
    if (playing) return pausePlayback();
    // Once it has finished, Play means start it again — never nothing.
    if (ended) return replayFilm();
    return play();
  });
  el.night.addEventListener('click', () => {
    night = !night;
    world?.globeImageUrl(night ? NIGHT : DAY);
    el.night.textContent = night ? 'Night' : 'Day';
    el.night.classList.toggle('on', night);
  });
  el.skip.addEventListener('click', () => { pausePlayback(); onEnd?.({ skipped: true }); });
  el.endcard.querySelectorAll('[data-end]').forEach((b) => {
    b.addEventListener('click', () => onEnd?.({ action: b.dataset.end }));
  });

  return {
    begin,
    /** Start fetching the library and the earth while the title card holds.
        Costs nothing if begin() never runs; saves the whole hold if it does. */
    preload() {
      loadGlobeLib().catch(() => {});
      decoded(NIGHT, 20000);
    },
    /** Open the film already at a given stop — the replay route. */
    async openAt(stopId) {
      if (!started) { await begin({ at: stopId }); return; }
      clearOpening();
      pausePlayback();
      ended = false;
      el.endcard.classList.remove('show');
      const i = stops.findIndex((s) => s.id === stopId);
      jump(i < 0 ? 0 : i);
    },
    replay: replayFilm,
    pause() { clearOpening(); pausePlayback(); },
    destroy() {
      destroyed = true;
      clearOpening();
      pausePlayback();
      labels?.destroy();
      memories?.destroy();
      mapChapter?.destroy();
      window.removeEventListener('resize', resize);
    },
  };
}
