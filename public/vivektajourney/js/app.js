/* Router and glue. The film lives at #/film; everything else is the archive. */

import { loadContent, hasSeenFilm, markFilmSeen, content } from './data.js';
import { renderArchive } from './archive.js';
import { openStopSheet, close as closeSheet, isOpen as sheetOpen } from './stopsheet.js';

const SECTIONS = ['photos', 'food', 'tickets', 'travel', 'journey'];
const AUTOPLAY_DELAY = 3200;     // title card holds, then the film begins itself

const filmRoot = document.getElementById('film');
const archiveRoot = document.getElementById('archive');
const main = document.getElementById('main');
const tabs = document.getElementById('tabs');

let film = null;
let filmReady = null;

function route() {
  const raw = (location.hash || '').replace(/^#\/?/, '');
  const [name, arg] = raw.split('/');
  if (name === 'film') return { name: 'film' };
  if (name === 'stop' && arg) return { name: 'stop', id: decodeURIComponent(arg) };
  if (SECTIONS.includes(name)) return { name };
  return { name: '' };
}

/** Opening a place is the same gesture everywhere: film, archive or deep link. */
function openStop(id, { fromFilm = false } = {}) {
  openStopSheet(id, {
    onPlay: (stopId) => {
      closeSheet();
      if (location.hash !== '#/film') history.replaceState(null, '', '#/film');
      showFilm({ at: stopId });
    },
    onClose: () => {
      // a deep link to a place falls back to the archive, not a blank screen
      if (route().name === 'stop') {
        history.replaceState(null, '', fromFilm ? '#/film' : '#/photos');
      }
    },
  });
}

/* The film module pulls in globe.gl (~1.9 MB). Only ever loaded on demand. */
async function getFilm() {
  if (film) return film;
  if (!filmReady) {
    filmReady = import('./film.js').then(({ createFilm }) => {
      film = createFilm({
        root: filmRoot,
        onOpenStop: (id) => openStop(id, { fromFilm: true }),
        onEnd: ({ action } = {}) => {
          markFilmSeen();
          if (action === 'replay') { film.replay(); return; }
          location.hash = action === 'journey' ? '#/journey' : '#/';
        },
      });
      return film;
    });
  }
  return filmReady;
}

let autoplayTimer = 0;

async function showFilm({ at } = {}) {
  clearTimeout(autoplayTimer);
  document.body.classList.add('film-mode');
  filmRoot.hidden = false;
  archiveRoot.hidden = true;
  window.scrollTo(0, 0);

  const f = await getFilm();
  if (at) {
    f.openAt(at);
  } else {
    // Pull the library and the earth down while the title card is on screen,
    // so the hold costs her nothing on a phone connection.
    f.preload();
    // Plays start to finish without her touching anything.
    autoplayTimer = setTimeout(() => {
      if (route().name === 'film') f.begin({ auto: true });
    }, AUTOPLAY_DELAY);
  }
}

function showArchive(name) {
  clearTimeout(autoplayTimer);
  film?.pause();
  document.body.classList.remove('film-mode');
  filmRoot.hidden = true;
  archiveRoot.hidden = false;

  for (const a of tabs.querySelectorAll('a')) {
    const on = (a.dataset.route || '') === name;
    a.classList.toggle('on', on);
    a.setAttribute('aria-current', on ? 'page' : 'false');
    // the strip scrolls; keep the section she is on reachable by thumb
    if (on) a.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  renderArchive(name, main, {
    onReplay: () => { location.hash = '#/film'; film?.replay(); },
    onOpenStop: (stopId) => { location.hash = `#/stop/${stopId}`; },
    onJump: (stopId) => {
      document.body.classList.add('film-mode');
      history.replaceState(null, '', '#/film');
      showFilm({ at: stopId });
    },
  });
  window.scrollTo(0, 0);
}

function apply() {
  const r = route();
  if (r.name !== 'stop' && sheetOpen()) closeSheet();

  if (r.name === 'film') { showFilm(); return; }
  if (r.name === 'stop') {
    // Deep link to a place: show the archive behind it, then the place itself.
    if (filmRoot.hidden !== false) showArchive('photos');
    openStop(r.id);
    return;
  }
  showArchive(r.name);
}

async function start() {
  try {
    await loadContent();
  } catch (err) {
    main.innerHTML =
      '<div class="await-block"><b>Could not load the trip</b>' +
      'The content files did not come back. Serve the folder over http rather than ' +
      'opening the file directly, then reload.</div>';
    archiveRoot.hidden = false;
    filmRoot.hidden = true;
    console.error(err);
    return;
  }

  document.title = `${content.meta.title} — ${content.meta.subtitle}`;

  // First visit goes to the film. A returning visitor lands on the archive
  // with the film one tap away. localStorage may be unavailable; if it is,
  // she simply gets the film again, which is not a failure.
  if (!location.hash && !hasSeenFilm()) {
    history.replaceState(null, '', '#/film');
  }

  window.addEventListener('hashchange', apply);
  apply();
}

start();
