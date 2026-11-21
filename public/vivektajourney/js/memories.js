/* The memories that play alongside the film.
 *
 * Each beat hands this its photographs. They cross-fade one into the next for
 * as long as the beat holds, drifting slowly so a still photograph still feels
 * like it is moving. When the beat changes the whole panel is replaced.
 *
 * Never more than one video playing, anywhere, ever.
 */

const MIN_SLIDE = 1700;     // no photo gets less than this
const FADE = 900;

export function createMemories(root) {
  let items = [];
  let index = 0;
  let timer = 0;
  let layers = [];
  let dead = false;

  function stopVideos() {
    for (const v of root.querySelectorAll('video')) {
      v.pause();
      v.removeAttribute('src');
      v.load();
    }
  }

  function buildLayer(item) {
    const fig = document.createElement('figure');
    fig.className = 'mem';
    if (item.type === 'video') {
      const v = document.createElement('video');
      v.src = item.src;
      v.muted = true;
      v.playsInline = true;
      v.loop = true;
      v.preload = 'metadata';
      fig.append(v);
    } else {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.caption || '';
      img.decoding = 'async';
      img.loading = 'eager';   // this one is on screen now, by definition
      fig.append(img);
    }
    if (item.caption) {
      const cap = document.createElement('figcaption');
      cap.textContent = item.caption;
      fig.append(cap);
    }
    return fig;
  }

  function showAt(n) {
    layers.forEach((layer, i) => {
      const on = i === n;
      layer.classList.toggle('on', on);
      const v = layer.querySelector('video');
      if (!v) return;
      // one at a time
      if (on) v.play().catch(() => {});
      else v.pause();
    });
  }

  function advance() {
    if (dead || items.length < 2) return;
    index = (index + 1) % items.length;
    showAt(index);
  }

  return {
    /**
     * @param {Array} media  photos and video for this beat
     * @param {number} holdMs how long the beat lasts
     * @param {boolean} hero  hero beats get the larger frame
     */
    show(media, holdMs, hero) {
      clearInterval(timer);
      stopVideos();
      root.textContent = '';
      root.classList.toggle('hero', !!hero);
      items = media || [];
      index = 0;

      if (!items.length) {
        root.classList.remove('show');
        layers = [];
        return;
      }

      layers = items.map((m, i) => {
        const layer = buildLayer(m);
        layer.style.animationDelay = `${i === 0 ? 0 : 0}ms`;
        root.append(layer);
        return layer;
      });

      root.classList.add('show');
      showAt(0);

      if (items.length > 1) {
        const each = Math.max(MIN_SLIDE, Math.floor((holdMs - FADE) / items.length));
        timer = setInterval(advance, each);
      }
    },
    hide() {
      clearInterval(timer);
      stopVideos();
      root.classList.remove('show');
      root.textContent = '';
      items = [];
      layers = [];
    },
    destroy() {
      dead = true;
      clearInterval(timer);
      stopVideos();
      root.textContent = '';
    },
  };
}
