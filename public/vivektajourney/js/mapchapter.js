/* The Norway chapter.
 *
 * The film arrives from orbit on a photographed earth, which is the right
 * thing for Delhi → Istanbul → Oslo. It is the wrong thing the moment the
 * camera drops into a fjord: a 4096 px texture is mush at that range.
 *
 * So from Oslo onward the presentation turns into a map. Vector coastline
 * fades up, the photographic earth darkens underneath it, the starfield gives
 * way to flat water, and the atmosphere thins. Same camera, same flight — only
 * the surface changes, so it reads as the world resolving into detail rather
 * than a cut to a different thing.
 *
 * It reverses on the way out, when the route leaves for Istanbul.
 */

const MAP_URL = 'data/scandinavia.geo.json';

/* Where the chapter applies. Anything inside this box is "the Nordic leg",
   which is Oslo (59.9) through Stockholm (59.3) by way of Tromsø (69.7). */
const NORDIC = { west: 3, south: 54, east: 33, north: 72 };

/* Norway is the subject and carries all the contrast. Its neighbours are
   clipped to a bounding box, so any stroke or bright fill on them turns that
   clip into a visible straight line across the sea. Kept barely above the
   water and unstroked, they read as land haze and the cut disappears. */
const LAND = '#0a1a27';
const LAND_SUBJECT = '#1d4668';
const EDGE = 'rgba(0, 0, 0, 0)';
const EDGE_SUBJECT = 'rgba(79, 209, 165, 0.95)';
const SEA = '#040a12';

const FADE_MS = 1400;

export const isNordic = (stop) =>
  !!stop && stop.lat >= NORDIC.south && stop.lat <= NORDIC.north
         && stop.lng >= NORDIC.west && stop.lng <= NORDIC.east;

export function createMapChapter({ world }) {
  let features = [];
  let loading = null;
  let on = false;
  let anim = 0;
  let dead = false;
  let progress = 0;                 // 0 = earth from orbit, 1 = map

  /* Do NOT add polygonCapCurvatureResolution here. Setting it — even with no
     polygon data loaded — makes three-globe render the entire globe white.
     Cost an hour to find. The default is correct at country scale anyway. */
  world
    .polygonGeoJsonGeometry('geometry')
    .polygonsTransitionDuration(0)
    .polygonAltitude(0.004)
    .polygonSideColor(() => 'rgba(0,0,0,0)')
    .polygonsData([]);

  /** Fetch once, in the background, long before the route needs it. */
  function preload() {
    if (loading) return loading;
    loading = fetch(MAP_URL, { cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((geo) => {
        features = (geo.features || []).map((f) => ({
          geometry: f.geometry,
          subject: !!f.properties?.subject,
          name: f.properties?.name,
        }));
        return features;
      })
      .catch(() => {
        // No map is survivable: the film simply stays on the photographed
        // earth, which is what it did before this chapter existed.
        features = [];
        return features;
      });
    return loading;
  }

  const mix = (a, b, t) => a + (b - a) * t;

  /** One knob drives the whole look, so the pieces can never disagree. */
  function applyProgress(t) {
    progress = t;
    const globeMat = world.globeMaterial();
    if (globeMat?.color) {
      // darken the photographed earth until the vector map is what reads
      const v = mix(1, 0.22, t);
      globeMat.color.setRGB(v, v * 1.02, v * 1.1);
      globeMat.needsUpdate = true;
    }
    world.atmosphereAltitude(mix(0.17, 0.07, t));
    world.polygonCapColor((d) => withAlpha(d.subject ? LAND_SUBJECT : LAND, t));
    world.polygonStrokeColor((d) => withAlpha(d.subject ? EDGE_SUBJECT : EDGE, t));
    // nudge the renderer to pick up the new accessors
    world.polygonsData(world.polygonsData());
  }

  function withAlpha(color, t) {
    if (t >= 0.999) return color;
    if (t <= 0.001) return 'rgba(0,0,0,0)';
    if (color.startsWith('#')) {
      const n = parseInt(color.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${t.toFixed(3)})`;
    }
    return color.replace(/,\s*([\d.]+)\)$/, (_, a) => `,${(parseFloat(a) * t).toFixed(3)})`);
  }

  function animateTo(target, ms) {
    cancelAnimationFrame(anim);
    const from = progress;
    if (Math.abs(target - from) < 0.001) return;
    const t0 = performance.now();
    const tick = (now) => {
      if (dead) return;
      const k = Math.min(1, (now - t0) / ms);
      // ease-in-out so the surface resolves rather than snaps
      const e = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
      applyProgress(mix(from, target, e));
      if (k < 1) anim = requestAnimationFrame(tick);
    };
    anim = requestAnimationFrame(tick);
  }

  return {
    preload,

    /** Called on every beat. Turns the map on inside the Nordic box, off outside. */
    async setActive(wanted, { instant = false } = {}) {
      if (wanted === on) return;
      on = wanted;
      // the rest of the page can style off this, and it makes the transition
      // something a test can assert rather than squint at
      document.body.dataset.chapter = wanted ? 'map' : 'orbit';

      if (wanted) {
        await preload();
        if (dead || !on) return;
        world.polygonsData(features);
        world.backgroundImageUrl(null);
        world.backgroundColor(SEA);
      }

      animateTo(wanted ? 1 : 0, instant ? 0 : FADE_MS);

      if (!wanted) {
        // put the stars back once the land has faded out
        setTimeout(() => {
          if (dead || on) return;
          world.polygonsData([]);
          world.backgroundImageUrl('img/night-sky.webp');
        }, instant ? 0 : FADE_MS);
      }
    },

    get active() { return on; },

    reset() {
      cancelAnimationFrame(anim);
      on = false;
      document.body.dataset.chapter = 'orbit';
      applyProgress(0);
      world.polygonsData([]);
      world.backgroundImageUrl('img/night-sky.webp');
    },

    destroy() {
      dead = true;
      cancelAnimationFrame(anim);
      world.polygonsData([]);
    },
  };
}
