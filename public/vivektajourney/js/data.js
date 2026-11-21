/* Content loading. Everything the site shows comes through here. */

const JSON_FILES = {
  stops: 'data/stops.json',
  media: 'data/media.json',
  tickets: 'data/tickets.json',
  food: 'data/food.json',
  travel: 'data/travel.json',
};

async function grab(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/** Loaded once, shared by the film and the archive. */
export const content = {
  stops: [],
  media: [],
  tickets: [],
  food: [],
  travel: [],
  meta: {},
  byStop: new Map(),      // stop id  -> stop
  mediaByStop: new Map(),  // stop id  -> media[]
  ticketById: new Map(),
  panorama: null,
  legs: [],                // [{ name, stops: [] }] in trip order
};

let loaded = null;

export function loadContent() {
  if (loaded) return loaded;
  loaded = (async () => {
    const [stops, media, tickets, food, travel] = await Promise.all(
      Object.values(JSON_FILES).map(grab)
    );

    content.meta = { title: stops.title, subtitle: stops.subtitle,
                     tripStart: stops.tripStart, tripEnd: stops.tripEnd };
    content.stops = stops.stops;
    content.media = media.media || [];
    content.tickets = tickets.tickets || [];
    content.food = food.meals || [];
    content.travel = travel.modes || [];

    for (const s of content.stops) {
      content.byStop.set(s.id, s);
      content.mediaByStop.set(s.id, []);
    }
    for (const t of content.tickets) content.ticketById.set(t.id, t);

    for (const m of content.media) {
      if (m.type === 'panorama' && !content.panorama) content.panorama = m;
      const bucket = content.mediaByStop.get(m.stop);
      if (bucket) bucket.push(m);
    }

    // Legs, in trip order, derived from the stops themselves.
    let current = null;
    for (const s of content.stops) {
      const name = s.leg || 'The journey';
      if (!current || current.name !== name) {
        current = { name, stops: [] };
        content.legs.push(current);
      }
      current.stops.push(s);
    }

    return content;
  })();
  return loaded;
}

/** Media for a stop, optionally narrowed to one archive section. */
export function mediaFor(stopId, section) {
  const all = content.mediaByStop.get(stopId) || [];
  return section ? all.filter((m) => m.section === section) : all;
}

export function ticketsFor(stop) {
  return (stop.tickets || []).map((id) => content.ticketById.get(id)).filter(Boolean);
}

/* localStorage can throw (private mode, disabled storage, full quota) and can
   return nothing at all. Nothing here is allowed to depend on it working. */
const KEY = 'vivekta.seen-film';

export function hasSeenFilm() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markFilmSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* fine — she just gets the film again, which is not a failure */
  }
}
