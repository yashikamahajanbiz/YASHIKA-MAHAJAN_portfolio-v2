/* Full-screen viewer. Swipe on a phone, arrows or keys on a desktop.
   Only ever one video playing. */

let box = null;
let items = [];
let index = 0;
let track = null;
let dragging = false;
let startX = 0;
let dx = 0;

function build() {
  box = document.createElement('div');
  box.id = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `
    <div class="lbtop">
      <span class="count"></span>
      <button class="close" type="button" aria-label="Close">✕</button>
    </div>
    <div class="stage">
      <div class="track"></div>
      <button class="arrow prev" type="button" aria-label="Previous">‹</button>
      <button class="arrow next" type="button" aria-label="Next">›</button>
    </div>
    <div class="lbcap"></div>`;
  document.body.append(box);

  track = box.querySelector('.track');
  box.querySelector('.close').addEventListener('click', close);
  box.querySelector('.prev').addEventListener('click', () => go(index - 1));
  box.querySelector('.next').addEventListener('click', () => go(index + 1));

  const stage = box.querySelector('.stage');
  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    startX = e.clientX;
    dx = 0;
    track.style.transition = 'none';
    stage.setPointerCapture?.(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = e.clientX - startX;
    track.style.transform = `translateX(${-index * 100}%) translateX(${dx}px)`;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    track.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1)';
    const threshold = Math.min(90, window.innerWidth * 0.18);
    if (dx < -threshold) go(index + 1);
    else if (dx > threshold) go(index - 1);
    else place();
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  document.addEventListener('keydown', (e) => {
    if (!box.classList.contains('show')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  });

  // A modal must not outlive the route that opened it — Back closes it too.
  window.addEventListener('hashchange', () => {
    if (box.classList.contains('show')) close();
  });
}

function pauseAll() {
  for (const v of track.querySelectorAll('video')) v.pause();
}

function place() {
  track.style.transform = `translateX(${-index * 100}%)`;
  box.querySelector('.count').textContent = `${index + 1} / ${items.length}`;
  box.querySelector('.lbcap').textContent = items[index]?.caption || '';
  box.querySelector('.prev').hidden = index === 0;
  box.querySelector('.next').hidden = index === items.length - 1;

  // One video at a time: everything pauses, then only the visible one plays.
  pauseAll();
  const slide = track.children[index];
  const vid = slide?.querySelector('video');
  if (vid) vid.play().catch(() => {});

  // Load the neighbours so a swipe does not land on a blank frame.
  for (let i = index - 1; i <= index + 1; i++) {
    const el = track.children[i];
    const lazy = el?.querySelector('[data-src]');
    if (lazy) {
      lazy.src = lazy.dataset.src;
      delete lazy.dataset.src;
    }
  }
}

function go(i) {
  if (i < 0 || i >= items.length) return place();
  index = i;
  place();
}

function close() {
  pauseAll();
  box.classList.remove('show');
  document.body.style.overflow = '';
  setTimeout(() => { if (!box.classList.contains('show')) track.textContent = ''; }, 300);
}

export function openLightbox(list, start = 0) {
  if (!list?.length) return;
  if (!box) build();

  items = list;
  index = Math.max(0, Math.min(list.length - 1, start));
  track.textContent = '';
  track.style.transition = 'none';

  for (const m of items) {
    const slide = document.createElement('div');
    slide.className = 'slide';
    if (m.type === 'video') {
      const v = document.createElement('video');
      v.dataset.src = m.src;
      v.controls = true;
      v.playsInline = true;
      v.preload = 'none';
      slide.append(v);
    } else {
      const img = document.createElement('img');
      img.dataset.src = m.src;
      img.alt = m.caption || '';
      img.decoding = 'async';
      slide.append(img);
    }
    track.append(slide);
  }

  box.classList.add('show');
  document.body.style.overflow = 'hidden';
  place();
  requestAnimationFrame(() => { track.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1)'; });
}
