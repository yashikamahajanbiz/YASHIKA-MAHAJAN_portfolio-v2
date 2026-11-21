# VIVEKTA — The Journey

A private site that gives Akta Mahajan her Scandinavia trip back: an opening
film that flies the globe from Noida through all 23 stops to Delhi, then a
permanent archive she can wander through.

Audience of one. No analytics, no accounts, no CMS, no cookie banner, and
**no external network requests at runtime** — everything is bundled.

---

## Run it

```bash
cd vivekta
python3 -m http.server 8000      # then open http://localhost:8000
```

Do **not** open `index.html` over `file://` — browsers block local texture
loading and you get a black globe. That is not a bug in the code.

For a preview that matches the real host (gzip, cache headers):

```bash
python3 tools/serve.py 8000
```


---

## What she can do

**Watch.** The film plays itself, start to finish, without a tap. Each beat
flies to the place, names what is around it, and cross-fades that stop's
photographs beside the caption. Hero beats hold longer and hold longer still
when they have more to show.

**It changes surface at Oslo.** Delhi, Istanbul and the flight north happen on
a photographed earth seen from orbit, which is right for that distance. The
moment the route reaches Oslo it becomes a *map*: vector coastline fades up,
the photographed earth darkens under it, the starfield gives way to flat water
and the atmosphere thins. Same camera, same unbroken flight — only the surface
resolves, so Norway's fjords and island chains are actually legible instead of
being four blurry pixels. It fades back to orbit when the route leaves for
Istanbul. See *The Norway chapter* below.

**Tap any place** — a name on the globe, a row in the list, a heading in the
archive — and that place opens in full: the story, how she got there, every
photograph, what she ate, the bookings, and the panorama if there is one. From
there, *Play the film from here* drops her back into the film at that moment.
Each place has its own address, `#/stop/flam`, so a single one can be sent to
someone on its own.

**Wander.** When the film ends the archive opens: Photos, Food, Tickets,
Travel, and Journey to watch it again or start anywhere.

---

## Changing the content

**Nobody edits code to change content.** Everything the site shows lives in
`data/`:

| File | What it drives |
|---|---|
| `data/stops.json` | The 23 stops — the film *and* the photo grouping |
| `data/tickets.json` | The Tickets section, from the booking sheet |
| `data/travel.json` | The eleven ways they travelled |
| `data/food.json` | The Food section |
| `data/media.json` | **Generated.** Every photo and video |

### Spelling

Place names on the globe are HTML, not 3D text geometry, so they are sized in
screen pixels and rendered in a real font. Write every name properly —
Ålesund, Tromsø, Florø, Måløy, Flåm, Sørengkaia — and it appears that way on
the globe, in the stop list and in the captions alike.

*(The earlier build drew labels as 3D text in a font with no Norwegian glyphs,
which forced a separate ASCII `mapLabel` on every stop. That field is gone.)*

`tier` sets the pacing — `hero` holds longest and shows media, `standard` is
normal, `quick` is a beat (the five brief Havila port calls). Equal dwell on
all 23 stops is a slog; this is deliberate.

---

## Adding photos and video

```bash
#  1. drop raw camera files in, foldered by stop id
originals/tromso-birthday/IMG_0412.HEIC
originals/oslo/food/IMG_0455.jpg          # -> the Food section
originals/turku/travel/VID_0088.mov       # -> the Travel section
originals/tickets/t_sas_sk4414.pdf        # -> a ticket artefact

#  2. encode to budget (WebP ≤2000px, H.264/AAC ≤1080p)
tools/encode.sh

#  3. regenerate the manifest
tools/build-manifest.py
```

Both are idempotent — re-run them after every drop, they skip what is current.

**Captions are preserved.** Write them straight into `data/media.json` whenever
you like; `build-manifest.py` merges on id and never clobbers one you wrote.
Captions are optional — do not block the launch on them.

Stop ids come from `data/stops.json`. Anything under a folder that is not a
stop id is reported and skipped rather than silently dropped.

`tools/build-manifest.py --check` exits non-zero if the manifest is stale —
use it before deploying.

### The Oslo panorama

Stitch her ~270° apartment pan to a single equirectangular image and save it as
`panorama/oslo-apartment.webp`. It appears at the Oslo stop in Photos, as a
drag-to-look viewer. Set `coverageDeg` on its `media.json` entry if the arc is
not 270 — the viewer maps the image across that arc and stops at the edge
rather than smearing pixels across the gap.

This is deliberately **not** a 3D reconstruction. Photogrammetry from handheld
phone video is unreliable and would eat the schedule.

---

## How it is put together

```
index.html        shell: the film and the archive in one document
css/app.css       everything visual
js/app.js         hash routing  (#/film, #/photos, …, #/stop/<id>)
js/data.js        loads data/*.json once, shared by both halves
js/film.js        globe + route animation   (loaded on demand)
js/maplabels.js   place names as HTML over the globe, with collision spreading
js/memories.js    the photographs that cross-fade alongside each beat
js/stopsheet.js   one place in full — story, photos, food, tickets, panorama
js/cards.js       the pieces the archive and the sheet are both built from
js/mapchapter.js  the Norway chapter — vector map fades in from Oslo
js/archive.js     the four sections
js/pano.js        equirectangular viewer, WebGL with a 2D fallback
js/lightbox.js    full-screen viewer, swipe on a phone
globe.gl.js       the library, bundled — never from a CDN
img/              earth textures, bundled
```

`globe.gl.js` is 1.8 MB, so it is **only fetched when the film actually runs**.
A returning visitor lands on the archive and never pays for it — and neither
does someone opening a single place through `#/stop/<id>`.

---

## The Norway chapter

`data/scandinavia.geo.json` is Natural Earth 10m, clipped to the Nordic frame
and simplified — 237 KB raw, **73 KB gzipped**, bundled. Rebuild it with:

```bash
tools/build-map.py            # downloads the source if you don't pass a path
```

The download is a *build* step. The site itself fetches nothing external.

Three things keep it honest:

- **It is off the critical path.** The map is only fetched once the globe is
  already lit, because Oslo is twenty seconds away and racing the earth
  textures for a phone's bandwidth helps nobody. Measured arriving ~14 s before
  it is needed on slow 4G.
- **Norway carries all the contrast; its neighbours do not.** They are clipped
  to a bounding box, so a stroke or a bright fill on them turns that clip into
  a straight line ruled across the sea. Kept just above the water and
  unstroked, they read as land haze and the cut disappears.
- **If the fetch fails the film simply stays on the photographed earth.** No
  error, no gap — exactly what it did before this chapter existed.

`document.body.dataset.chapter` is `map` or `orbit` throughout, which is what
the transition test asserts.

---

## Performance

Measured in Chrome with CDP network throttling, gzip on:

| | Title card | Usable | Transferred |
|---|---|---|---|
| Archive, returning visitor · slow 4G | 0.8 s | **1.1 s** | 34 KB |
| One place, deep link · slow 4G | 0.8 s | **1.1 s** | 34 KB |
| Film, first visit · slow 4G | 0.7 s | **5.5 s** | 840 KB |
| Film, first visit · fast 4G | 0.3 s | **3.8 s** | 840 KB |
| Norway map live, in time for Oslo · slow 4G | — | 19.5 s *(Oslo arrives ~20 s)* | +73 KB |

The title card paints in under a second on every route, and the globe library
downloads behind it while it holds — the hold costs her nothing.

Textures were re-encoded to WebP: **3378 KB → 602 KB**, and only 408 KB of that
is on the first-paint path (the day texture loads only if she toggles it).

**The host must gzip text assets.** `globe.gl.js` is 1.8 MB raw and 511 KB
gzipped — nine seconds versus two and a half on a phone. Every CDN does this by
default; check it rather than assume it. `tools/serve.py` does it locally so
what you measure is what she gets.

Budgets the encoder enforces: photos WebP ≤2000 px long edge, video H.264/AAC
≤1080p with `+faststart`, all below-fold media lazy-loaded, never more than one
video playing at once.

---

## Things that already cost debugging time

- **Bundle everything.** The artifact host blocks external images, and
  bundling means it works offline. No CDNs.
- **Never set `polygonCapCurvatureResolution`.** Calling it at all — even with
  no polygon data loaded — makes three-globe render the entire globe white.
  The symptom looks like a broken GPU or a bad texture, and is neither. The
  default is correct at country scale.
- **Two camera floors, not one.** An *isolated* stop still bottoms out at
  `0.82` — below that the surrounding coastline leaves frame and the viewer is
  looking at blank ocean. A stop with neighbours already on screen is the
  opposite case: the neighbours *are* the context, so the camera is allowed
  down to `ALT_NEAR = 0.26` to show how close two places really are. That is
  what makes Noida/Delhi and the Myrdal–Flåm–Gudvangen run legible. Both are
  in `altFor()`; `0.26` is as tight as the 4096 px earth texture survives, and
  was checked on a 390 px viewport.
- **Dots and rings are sized in globe degrees**, so `scaleGlobe()` shrinks them
  with the camera. Skip it and a close shot is one enormous blob.
- **Rail auto-scroll pauses for 5 s whenever the list is touched**, or taps land
  on the wrong row as the list moves under the thumb.
- **`localStorage` is wrapped in try/catch** and is only used for "has seen the
  film". It can throw or return nothing; the site must not depend on it. Verified
  working with storage access fully blocked.
- **Naming the dots is `maplabels.js`, and it has four rules.** On the map a
  coast of identical dots tells her nothing, so up to ten names are drawn
  (six from orbit), nearest the beat first. Then:
  1. Each plate rises until it clears every plate already placed, taking the
     *maximum* clearance demanded by all of them. Nudging up a fixed step
     cannot clear six Havila port calls, and finding only the first collision
     lets two neighbours ping-pong forever.
  2. If a plate cannot fit — no room below the top bar, or the stack is full —
     it is **dropped**, not drawn overlapping. One name and a bare dot beats
     two names on top of each other.
  3. Plates slide inward near a screen edge so they are never clipped.
  4. No CSS transition on their position. The camera moves every frame, so an
     animated `bottom` always lags the computed stack and the names drift back
     into each other.
- **Chrome occlusion MUST be a rectangle test.** A "below the rail's top edge"
  test works on a phone, where the rail is a strip across the bottom, and
  hides *every label on the map* on a desktop, where the same rail is a column
  down the right at `top:0`. Likewise, only treat a rail as a side column when
  it is genuinely narrower than the viewport — otherwise the phone's bottom
  strip is read as a right-hand rail and every plate is dragged to the left
  edge, away from its own dot.

---

## Still open

- **Media.** The site ships with whatever exists and keeps filling. Every
  section already renders real itinerary content with no photos at all.
- **Three coordinates are placed by name**, not from the booking — Cleo County,
  the Panorama Glass Lodge, Torvik. Flagged `coordsApprox`, and the film shows
  a quiet "position approximate" note on those beats.
- **Day sheets 9–17 are empty in the booking workbook.** Confirmed by reading
  it: there is no activity detail from 23 November onward, so none is invented.
- **Domain not chosen.**
