/* Equirectangular panorama viewer — drag to look around the Oslo flat.

   WebGL: a full-screen quad whose fragment shader turns each pixel back into a
   ray, converts that to spherical coordinates and samples the equirect. That is
   perspective-correct, which a plain scrolling <img> is not.

   Her recording covers roughly 270°, not a full circle, so `coverageDeg` maps
   the image across only that arc and yaw is clamped to it. Panning into a wall
   of stretched pixels would look broken; stopping at the edge looks deliberate. */

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main(){ uv = p; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 uv;
uniform sampler2D tex;
uniform float yaw, pitch, fov, aspect, coverage;
const float PI = 3.14159265359;
void main(){
  // pixel -> camera-space ray
  float t = tan(fov * 0.5);
  vec3 dir = normalize(vec3(uv.x * t * aspect, uv.y * t, -1.0));
  // pitch then yaw
  float cp = cos(pitch), sp = sin(pitch);
  dir = vec3(dir.x, dir.y * cp - dir.z * sp, dir.y * sp + dir.z * cp);
  float cy = cos(yaw), sy = sin(yaw);
  dir = vec3(dir.x * cy + dir.z * sy, dir.y, -dir.x * sy + dir.z * cy);
  // ray -> equirect uv, across the covered arc rather than a full turn
  float lon = atan(dir.x, -dir.z);
  float lat = asin(clamp(dir.y, -1.0, 1.0));
  float u = lon / coverage + 0.5;
  float v = 0.5 - lat / PI;
  if (u < 0.0 || u > 1.0) { gl_FragColor = vec4(0.016, 0.027, 0.051, 1.0); return; }
  gl_FragColor = texture2D(tex, vec2(u, v));
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(sh) || 'shader failed');
  }
  return sh;
}

/**
 * @param {HTMLElement} host    wrapper element (gets the canvas)
 * @param {string} src          equirectangular image
 * @param {number} coverageDeg  horizontal arc the image covers
 */
export function mountPanorama(host, src, coverageDeg = 360) {
  const canvas = document.createElement('canvas');
  host.appendChild(canvas);

  const coverage = (Math.min(360, Math.max(60, coverageDeg)) * Math.PI) / 180;
  const yawLimit = Math.max(0, coverage / 2 - 0.42);   // keep the edge out of frame

  let yaw = 0;
  let pitch = 0;
  let fov = 1.2;
  let raf = 0;
  let gl = null;
  let tex = null;
  let loc = {};
  let image = null;
  let dead = false;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(host.clientWidth * dpr));
    const h = Math.max(1, Math.round(host.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function drawGL() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(loc.yaw, yaw);
    gl.uniform1f(loc.pitch, pitch);
    gl.uniform1f(loc.fov, fov);
    gl.uniform1f(loc.aspect, canvas.width / canvas.height);
    gl.uniform1f(loc.coverage, coverage);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /* 2D fallback: cylindrical scroll. Not perspective-correct, still useful. */
  let ctx2d = null;
  function draw2d() {
    const scale = canvas.height / image.height;
    const w = image.width * scale;
    const x = clamp((-yaw / coverage + 0.5) * w - canvas.width / 2, 0, Math.max(0, w - canvas.width));
    ctx2d.fillStyle = '#04070d';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
    ctx2d.drawImage(image, x / scale, 0, canvas.width / scale, image.height,
                    0, 0, canvas.width, canvas.height);
  }

  /** Set once at mount to whichever backend initialised. */
  let renderer = null;

  function draw() {
    raf = 0;
    if (dead || !image || !renderer) return;
    sizeCanvas();
    renderer();
  }

  const invalidate = () => { if (!raf && !dead) raf = requestAnimationFrame(draw); };

  function initGL() {
    gl = canvas.getContext('webgl', { antialias: true, alpha: false })
      || canvas.getContext('experimental-webgl');
    if (!gl) return false;
    try {
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const p = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(p);
      gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

      for (const n of ['yaw', 'pitch', 'fov', 'aspect', 'coverage']) {
        loc[n] = gl.getUniformLocation(prog, n);
      }
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      // the pano is not power-of-two; clamp + linear, no mipmaps
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return true;
    } catch {
      return false;
    }
  }

  if (initGL()) {
    renderer = drawGL;
  } else {
    gl = null;
    ctx2d = canvas.getContext('2d');
    if (!ctx2d) return { destroy() {} };
    renderer = draw2d;
  }

  /* ---------- input: drag on desktop, one finger on a phone, pinch to zoom ---------- */
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let pinch = 0;
  const pointers = new Map();

  const down = (e) => {
    pointers.set(e.pointerId, e);
    host.classList.add('touched');
    if (pointers.size === 1) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      host.classList.add('dragging');
      host.setPointerCapture?.(e.pointerId);
    }
  };

  const move = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, e);

    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (pinch) fov = clamp(fov * (pinch / d), 0.55, 1.75);
      pinch = d;
      invalidate();
      return;
    }
    if (!dragging) return;
    const scale = fov / Math.max(1, host.clientHeight);
    yaw = clamp(yaw - (e.clientX - lastX) * scale * 1.35, -yawLimit, yawLimit);
    pitch = clamp(pitch + (e.clientY - lastY) * scale * 1.35, -1.1, 1.1);
    lastX = e.clientX;
    lastY = e.clientY;
    invalidate();
  };

  const up = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (pointers.size === 0) {
      dragging = false;
      host.classList.remove('dragging');
    }
  };

  const wheel = (e) => {
    e.preventDefault();
    fov = clamp(fov + e.deltaY * 0.0016, 0.55, 1.75);
    host.classList.add('touched');
    invalidate();
  };

  host.addEventListener('pointerdown', down);
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerup', up);
  host.addEventListener('pointercancel', up);
  host.addEventListener('wheel', wheel, { passive: false });
  const onResize = () => invalidate();
  window.addEventListener('resize', onResize);

  image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    if (dead) return;
    if (gl) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    }
    host.dataset.ready = '1';
    invalidate();
  };
  image.onerror = () => { host.dataset.failed = '1'; };
  image.src = src;

  return {
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerup', up);
      host.removeEventListener('pointercancel', up);
      host.removeEventListener('wheel', wheel);
      window.removeEventListener('resize', onResize);
      canvas.remove();
    },
  };
}
