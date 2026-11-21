/* Place names drawn as HTML over the globe rather than as 3D text geometry.
 *
 * Three reasons this beats the built-in labels:
 *   - they stay a constant size on screen, so two stops fifteen kilometres
 *     apart are still readable once the camera moves in;
 *   - they are real text, so Ålesund and Tromsø are spelled properly;
 *   - they can be tapped, which is how she opens a place.
 *
 * globe.gl positions them and hides the ones on the far side of the earth.
 * Everything below that is collision handling: labels that would sit on top of
 * each other get lifted and grow a stem back down to their dot.
 */

const MAX_LIFT = 340;
const BASE_LIFT = 13;
const GAP = 4;              // breathing room between stacked names
const EDGE_PAD = 8;         // keep plates off the screen edge

export function createMapLabels({ world, onSelect }) {
  const nodes = new Map();          // stop id -> element
  let shown = [];                   // the data currently handed to globe.gl
  let raf = 0;
  let dead = false;

  function build(d) {
    const cached = nodes.get(d.id);
    if (cached) return cached;

    const el = document.createElement('div');
    el.className = 'mlabel';
    el.dataset.id = d.id;

    const dot = document.createElement('i');
    dot.className = 'mdot';

    const stem = document.createElement('i');
    stem.className = 'mstem';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mtext';
    btn.innerHTML = `<b></b><em></em>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect?.(el.dataset.id);
    });

    el.append(dot, stem, btn);
    nodes.set(d.id, el);
    return el;
  }

  world
    .htmlElementsData([])
    .htmlLat('lat')
    .htmlLng('lng')
    .htmlAltitude(0.014)
    .htmlElement(build)
    .htmlElementVisibilityModifier((el, isVisible) => {
      // far side of the globe — keep it out of the layout and out of reach
      el.classList.toggle('behind', !isVisible);
    })
    .htmlTransitionDuration(0);

  /* Lift labels off each other.

     Every frame this works from each label's ANCHOR — the dot, which is where
     globe.gl put it — and derives where the text would sit for a given lift.
     Measuring the text's current rect instead would feed last frame's lift
     back into this frame's maths, and the stack would never settle.

     The active stop is placed first so it keeps the lowest, calmest position
     and everything else moves around it. */
  function declutter() {
    raf = 0;
    if (dead) return;

    /* The rail and the top bar sit over the globe; a name behind either is
       noise, so the dot stays and the name goes.

       This MUST be a rectangle test, not a "below the rail's top edge" test.
       On a phone the rail is a strip across the bottom, but on a desktop it is
       a column down the right at top:0 — so comparing against its top edge
       hides every label on the map. */
    const chrome = ['#rail.show', '#top']
      .map((sel) => document.querySelector(sel))
      .filter(Boolean)
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);

    const hidden = (x, y) =>
      chrome.some((r) => x >= r.left - 2 && x <= r.right + 2
                      && y >= r.top - 2 && y <= r.bottom + 2);

    /* A plate is wider than its dot, so near an edge it must slide inward or
       it gets clipped. It must also never climb under the top bar. */
    const top = document.querySelector('#top');
    let topLimit = top ? top.getBoundingClientRect().bottom + 4 : 4;
    /* On a phone the caption sits at the top of the globe. Its box is wide and
       mostly empty, so masking anchors against it would silence nearly every
       name — but plates must not climb into the text either. Treat it as a
       ceiling, and only when it is actually up there (on a desktop it is
       bottom-left and irrelevant). */
    const cap = document.querySelector('#caption.show');
    if (cap) {
      const r = cap.getBoundingClientRect();
      if (r.bottom < window.innerHeight * 0.55) topLimit = Math.max(topLimit, r.bottom + 6);
    }
    const vw = document.documentElement.clientWidth;
    /* Only a genuine side column narrows the usable width. On a phone the rail
       is a full-width strip across the bottom — mistaking that for a right-hand
       rail drags every plate to the left edge, away from its own dot. */
    const sideRail = chrome.find((r) =>
      r.right >= vw - 2 && r.width < vw * 0.7 && r.height > 200);
    const rightLimit = (sideRail ? sideRail.left : vw) - EDGE_PAD;

    const live = [];
    for (const d of shown) {
      const el = nodes.get(d.id);
      if (!el || el.classList.contains('behind')) continue;
      const text = el.querySelector('.mtext');
      const anchor = el.getBoundingClientRect();     // 0x0 node, sits on the dot
      const w = text.offsetWidth;
      const h = text.offsetHeight;
      const covered = hidden(anchor.left, anchor.top);
      el.classList.toggle('covered', covered);
      if (covered || !w || !h) continue;
      live.push({
        el, x: anchor.left, y: anchor.top, w, h,
        // `shown` arrives sorted nearest-to-the-beat first; keep that as the
        // tiebreak so the names dropped for lack of room are the far ones
        order: live.length,
        rank: el.classList.contains('active') ? 0 : el.classList.contains('star') ? 1 : 2,
      });
    }
    // most relevant first: it gets the lowest, calmest slot nearest its dot
    live.sort((a, b) => a.rank - b.rank || a.order - b.order);

    const placed = [];
    for (const item of live) {
      // slide the plate inward when the dot sits near an edge
      const half = item.w / 2;
      const centre = Math.min(Math.max(item.x, EDGE_PAD + half), Math.max(EDGE_PAD + half, rightLimit - half));
      const shift = Math.round(centre - item.x);
      const left = centre - half;
      const right = centre + half;
      let lift = BASE_LIFT;

      /* Rise until nothing is in the way.

         Each pass takes the MAXIMUM clearance demanded by every rectangle it
         still touches, so the lift only ever increases and the loop cannot
         ping-pong between two neighbours — which is what left six Havila port
         calls sitting on top of each other. */
      let fits = true;
      for (let guard = 0; guard < 24; guard++) {
        const bottom = item.y - lift;
        const top = bottom - item.h;
        if (top < topLimit) { fits = false; break; }
        let need = lift;
        for (const p of placed) {
          const overlaps = bottom > p.top - GAP && top < p.bottom + GAP
                        && right > p.left - 8 && left < p.right + 8;
          if (overlaps) need = Math.max(need, item.y - p.top + GAP);
        }
        if (need === lift) break;
        if (need > MAX_LIFT) { fits = false; break; }
        lift = need;
      }

      /* Out of room — above the top bar, or nothing left to stack onto. Two
         names on top of each other are worse than one name and a bare dot, so
         the loser is dropped rather than drawn over. */
      if (!fits) {
        item.el.classList.add('covered');
        continue;
      }

      placed.push({ top: item.y - lift - item.h, bottom: item.y - lift, left, right });
      if (item.el.__lift !== lift || item.el.__shift !== shift) {
        item.el.__lift = lift;
        item.el.__shift = shift;
        item.el.style.setProperty('--lift', `${lift}px`);
        item.el.style.setProperty('--shift', `${shift}px`);
      }
    }
    schedule();
  }

  function schedule() {
    if (!raf && !dead) raf = requestAnimationFrame(declutter);
  }

  schedule();

  return {
    /** @param {Array} list stops to label, @param {string} activeId */
    set(list, activeId) {
      shown = list.map((s) => ({
        id: s.id, lat: s.lat, lng: s.lng,
        name: s.name, date: s.dateLabel, star: !!s.star,
      }));
      for (const d of shown) {
        const el = build(d);
        const btn = el.querySelector('.mtext');
        btn.firstChild.textContent = d.name;
        btn.lastChild.textContent = d.date;
        el.classList.toggle('star', d.star);
        el.classList.toggle('active', d.id === activeId);
      }
      world.htmlElementsData(shown);
    },
    clear() {
      shown = [];
      world.htmlElementsData([]);
    },
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      world.htmlElementsData([]);
      nodes.clear();
    },
  };
}
