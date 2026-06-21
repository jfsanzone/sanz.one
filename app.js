import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

/* =========================================================================
   SANZONE — WebGL flowmap distortion + chromatic aberration wordmark.
   Modeled on supersolid.agency: a single wordmark image is sampled with
   distorted UVs driven by a velocity flowmap, with RGB channel splitting.
   The distortion dissipates smoothly when the cursor stops.
   ========================================================================= */

const container = document.querySelector('[data-webgl-container]');
const imgEl = document.querySelector('#distorted-image');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CONFIG = {
  falloff: 0.36,           // larger = wider, softer smear
  alpha: 1.0,
  dissipation: 0.955,      // recovers faster so the wordmark stays readable
  distortionStrength: 0.10, // gentler warp — legible most of the time
  chromaticAberration: 0.006,
  chromaticSpread: 1.0,
  velocityScale: 0.7,      // softer kick per movement
  velocityDamping: 0.88,   // velocity settles sooner
  autoplay: true,          // continuously animate as if a cursor were hovering
  autoSpeed: 0.5,          // pace of the virtual cursor (higher = faster)
  sideBlurMax: 0.014,      // peak blur radius applied at the L/R edges (UV units)
  sideBlurPeriod: 9.0,     // seconds per side-blur pulse cycle ("from time to time")
  sideBlurEdge: 0.28,      // how far in from each edge the blur reaches (0 = edge only)
};

const FLOW_SIZE = 512;

function boot() {
  if (!container || !imgEl || reducedMotion) {
    if (imgEl) imgEl.style.opacity = '1';
    return;
  }

  const start = (tex) => {
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    const aspect = tex.image.width / tex.image.height;
    init(tex, aspect);
  };

  const src = imgEl.currentSrc || imgEl.src;
  new THREE.TextureLoader().load(src, start, undefined, () => { imgEl.style.opacity = '1'; });
}

function init(logoTex, imageAspect) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, premultipliedAlpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const canvas = renderer.domElement;
  canvas.className = 'g_canvas_distortion';
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
  camera.position.z = 1;
  const quad = new THREE.PlaneGeometry(1, 1);

  /* ---- Ping-pong flowmap render targets ---- */
  const rtOpts = { type: THREE.FloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
  let flowA = new THREE.WebGLRenderTarget(FLOW_SIZE, FLOW_SIZE, rtOpts);
  let flowB = new THREE.WebGLRenderTarget(FLOW_SIZE, FLOW_SIZE, rtOpts);

  // Clear flow targets — uninitialized float RTs contain garbage that would
  // otherwise produce extreme distortion on the first frames.
  renderer.setRenderTarget(flowA); renderer.setClearColor(0x000000, 0); renderer.clear();
  renderer.setRenderTarget(flowB); renderer.clear();
  renderer.setRenderTarget(null);

  /* ===================== Pass 1: flowmap update ===================== */
  const flowMat = new THREE.ShaderMaterial({
    uniforms: {
      uPrev: { value: flowA.texture },
      uMouse: { value: new THREE.Vector2(-1, -1) },
      uVelocity: { value: new THREE.Vector2(0, 0) },
      uFalloff: { value: CONFIG.falloff },
      uAlpha: { value: CONFIG.alpha },
      uDissipation: { value: CONFIG.dissipation },
      uAspect: { value: imageAspect },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy*2.0,0.0,1.0); }`,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uPrev;
      uniform vec2 uMouse;
      uniform vec2 uVelocity;
      uniform float uFalloff;
      uniform float uAlpha;
      uniform float uDissipation;
      uniform float uAspect;
      void main(){
        vec4 prev = texture2D(uPrev, vUv);
        prev.rgb *= uDissipation;            // fade flow each frame
        vec2 d = vUv - uMouse;
        d.x *= uAspect;                       // correct for wide aspect
        float dist = length(d);
        // soft gaussian-ish splat for a smoother smear
        float influence = exp(-dist*dist / (uFalloff*uFalloff));
        prev.rg += uVelocity * influence * uAlpha;
        prev.b = length(prev.rg) * 2.0;
        gl_FragColor = prev;
      }`,
  });
  const flowMesh = new THREE.Mesh(quad, flowMat);
  flowMesh.frustumCulled = false;

  /* ===================== Pass 2: distorted display ===================== */
  const dispMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uImage: { value: logoTex },
      uFlow: { value: flowA.texture },
      uDistortion: { value: CONFIG.distortionStrength },
      uAberration: { value: CONFIG.chromaticAberration },
      uSpread: { value: CONFIG.chromaticSpread },
      uTexel: { value: new THREE.Vector2(1 / FLOW_SIZE, 1 / FLOW_SIZE) },
      uSideBlur: { value: 0.0 },   // 0..1 strength of the periodic edge blur
      uSideEdge: { value: CONFIG.sideBlurEdge },
      uBlurMax: { value: CONFIG.sideBlurMax },
      uInvert: { value: 1.0 },     // 1 = invert (light theme), 0 = keep light letters (dark)
      uDispAspect: { value: imageAspect }, // wordmark is very wide -> round the blur
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy*2.0,0.0,1.0); }`,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uImage;
      uniform sampler2D uFlow;
      uniform float uDistortion;
      uniform float uAberration;
      uniform float uSpread;
      uniform vec2 uTexel;
      uniform float uSideBlur;   // 0..1 pulse strength
      uniform float uSideEdge;   // reach in from each edge
      uniform float uBlurMax;    // peak blur radius in UV units
      uniform float uInvert;     // 1 = invert RGB (light theme look)
      uniform float uDispAspect; // image width/height (UV is normalized per-axis)

      // Resolve a single image sample into the final themed color (same invert
      // logic used for the main pixel) so blur taps blend in the right space.
      vec4 resolveColor(vec2 uv){
        vec4 s = texture2D(uImage, uv);
        vec3 rgb = s.rgb;
        vec3 inv = 1.0 - rgb;
        float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
        vec3 chroma = rgb - vec3(luma);
        vec3 darkCol = vec3(luma) - chroma;
        vec3 outRgb = mix(darkCol, inv, uInvert);
        return vec4(outRgb, s.a);
      }

      // 9-tap blurred flow read -> smoother smear
      vec2 sampleFlow(vec2 uv){
        vec2 sum = vec2(0.0);
        sum += texture2D(uFlow, uv).rg * 0.25;
        sum += texture2D(uFlow, uv + vec2(uTexel.x, 0.0)).rg * 0.125;
        sum += texture2D(uFlow, uv - vec2(uTexel.x, 0.0)).rg * 0.125;
        sum += texture2D(uFlow, uv + vec2(0.0, uTexel.y)).rg * 0.125;
        sum += texture2D(uFlow, uv - vec2(0.0, uTexel.y)).rg * 0.125;
        sum += texture2D(uFlow, uv + uTexel).rg * 0.0625;
        sum += texture2D(uFlow, uv - uTexel).rg * 0.0625;
        sum += texture2D(uFlow, uv + vec2(uTexel.x, -uTexel.y)).rg * 0.0625;
        sum += texture2D(uFlow, uv + vec2(-uTexel.x, uTexel.y)).rg * 0.0625;
        return sum;
      }

      void main(){
        vec2 flowDir = sampleFlow(vUv);
        float mag = length(flowDir);

        vec2 baseUv = vUv + flowDir * uDistortion;

        vec2 dir = mag > 0.0001 ? normalize(flowDir) : vec2(0.0);
        vec2 perp = vec2(-dir.y, dir.x);
        float ab = uAberration * uSpread * (0.4 + mag * 7.0);

        vec2 rUv = baseUv + dir * ab;
        vec2 bUv = baseUv - dir * ab;
        vec2 gUv = baseUv + perp * ab * 0.8;

        vec4 col = resolveColor(rUv);
        col.r = resolveColor(rUv).r;
        col.g = resolveColor(gUv).g;
        col.b = resolveColor(bUv).b;
        col.a = (resolveColor(rUv).a + resolveColor(gUv).a + resolveColor(bUv).a) / 3.0;

        // ---- Periodic edge blur ----
        // A smooth, even Gaussian (color + alpha together) that fades in from the
        // left and right edges, leaving the readable center crisp. Enough taps
        // along a 2D ring that it reads as one creamy blur, not layered ghosts.
        // uSideBlur pulses over time on the JS side ("from time to time").
        float edge = 1.0 - smoothstep(0.0, max(uSideEdge, 0.001), min(vUv.x, 1.0 - vUv.x));
        float blurAmt = edge * uSideBlur;
        if (blurAmt > 0.001) {
          float radius = uBlurMax * blurAmt;
          // Dense, tightly-spaced Gaussian so it reads as one creamy blur with no
          // ring/echo artifacts. The wordmark UV is very wide, so we scale the v
          // step by the aspect ratio to keep the kernel round on screen. We run a
          // 13-tap horizontal Gaussian for several vertical offsets (a separable
          // approximation in a single pass).
          // Precomputed 1D Gaussian weights (sigma ~ N/3), normalized per axis.
          const int H = 8;   // horizontal half-width (taps: -8..8 = 17)
          const int V = 2;   // vertical half-width (taps: -2..2 = 5)
          float vy = radius * uDispAspect;   // round the kernel
          vec4 acc = vec4(0.0);
          float wsum = 0.0;
          for (int j = -V; j <= V; j++) {
            float fy = float(j) / float(V + 1);
            float wy = exp(-3.0 * fy * fy);
            for (int i = -H; i <= H; i++) {
              float fx = float(i) / float(H + 1);
              float wx = exp(-3.0 * fx * fx);
              float w = wx * wy;
              vec2 o = vec2(fx * radius, fy * vy);
              acc += resolveColor(baseUv + o) * w;
              wsum += w;
            }
          }
          acc /= wsum;
          col = mix(col, acc, blurAmt);
        }

        gl_FragColor = col;
      }`,
  });
  const dispMesh = new THREE.Mesh(quad, dispMat);
  dispMesh.frustumCulled = false;

  /* ===================== Mouse tracking ===================== */
  const cur = new THREE.Vector2(-1, -1);
  const target = new THREE.Vector2(-1, -1);
  const last = new THREE.Vector2(-1, -1);
  const velocity = new THREE.Vector2(0, 0);
  const smoothVel = new THREE.Vector2(0, 0);
  let hasMoved = false;

  let lastRealMove = -Infinity;   // timestamp of last real pointer movement
  const REAL_TIMEOUT = 1200;      // ms after real cursor leaves before autoplay resumes

  function setTargetFromEvent(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    target.set((clientX - rect.left) / rect.width, 1.0 - (clientY - rect.top) / rect.height);
    if (!hasMoved) { cur.copy(target); last.copy(target); hasMoved = true; }
    lastRealMove = performance.now();
  }
  container.addEventListener('pointermove', (e) => setTargetFromEvent(e.clientX, e.clientY));
  container.addEventListener('pointerleave', () => { lastRealMove = performance.now(); });

  /* ---- Virtual cursor: a smooth wandering path so the logo animates on its
     own as if hovered. Layered sines on each axis give an organic, non-looping
     feel; it covers the full wordmark width and stays near the vertical middle. */
  function autoTarget(t) {
    const s = t * 0.001 * CONFIG.autoSpeed;
    // x sweeps the full width with a couple of overlaid frequencies
    const x = 0.5 + 0.46 * Math.sin(s * 1.7) * Math.cos(s * 0.6);
    // y stays in the vertical band of the wordmark with gentle bob
    const y = 0.5 + 0.22 * Math.sin(s * 2.3 + 1.1);
    target.set(x, y);
    if (!hasMoved) { cur.copy(target); last.copy(target); hasMoved = true; }
  }

  /* ===================== Theme -> shader invert ===================== */
  // The invert that used to live in CSS (filter: invert(--wordmark-invert)) now
  // happens in-shader so dark themes keep the vivid fringe colors. We read the
  // SAME --wordmark-invert variable the page already defines, so every page's
  // existing intent is respected automatically:
  //   /mark  -> 1 on light (black letters), 0 on dark (white letters).
  //   home   -> 0 on its dark card (white letters), 1 on its light card.
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme() {
    const v = getComputedStyle(container)
      .getPropertyValue('--wordmark-invert').trim();
    // default to 1 (invert) when unset, matching the light-mode look
    dispMat.uniforms.uInvert.value = v === '0' ? 0.0 : 1.0;
  }
  applyTheme();
  darkQuery.addEventListener('change', applyTheme);
  // React to the home page's manual theme toggle (sets data-theme on <html>).
  new MutationObserver(applyTheme).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme'],
  });

  /* ===================== Sizing ===================== */
  function resize() {
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize);
  resize();

  /* ===================== Render loop ===================== */
  function frame(now) {
    const t = now || performance.now();

    // If the real cursor hasn't moved recently, drive the virtual cursor.
    const realActive = (t - lastRealMove) < REAL_TIMEOUT;
    if (CONFIG.autoplay && !realActive) {
      autoTarget(t);
    }

    cur.lerp(target, 0.7);
    const nv = new THREE.Vector2((cur.x - last.x) * 80, (cur.y - last.y) * 80);
    velocity.lerp(nv, 0.6);
    smoothVel.lerp(velocity, 0.3);
    velocity.multiplyScalar(CONFIG.velocityDamping);
    last.copy(cur);

    const mouseActive = target.x >= 0 && target.y >= 0;
    flowMat.uniforms.uMouse.value.copy(mouseActive ? cur : new THREE.Vector2(-5, -5));
    flowMat.uniforms.uVelocity.value.copy(smoothVel).multiplyScalar(CONFIG.velocityScale);

    // Periodic side blur: a slow swell that mostly rests at 0 and rises into a
    // soft pulse "from time to time". sin^6 keeps the valleys long and flat.
    const phase = (t * 0.001) * (Math.PI * 2 / CONFIG.sideBlurPeriod);
    const swell = Math.pow(Math.max(0, Math.sin(phase)), 6.0);
    dispMat.uniforms.uSideBlur.value = swell;

    // Pass 1: update flowmap (read flowA -> write flowB)
    flowMat.uniforms.uPrev.value = flowA.texture;
    scene.clear(); scene.add(flowMesh);
    renderer.setRenderTarget(flowB);
    renderer.render(scene, camera);
    [flowA, flowB] = [flowB, flowA];

    // Pass 2: render distorted logo to screen
    dispMat.uniforms.uFlow.value = flowA.texture;
    scene.clear(); scene.add(dispMesh);
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    requestAnimationFrame(frame);
  }

  // Seed the virtual cursor immediately so motion starts on the first frame.
  if (CONFIG.autoplay) autoTarget(performance.now());

  // reveal: hide raw img, fade in canvas
  imgEl.style.opacity = '0';
  canvas.style.opacity = '0';
  requestAnimationFrame(() => {
    canvas.style.transition = 'opacity 700ms cubic-bezier(0.16,1,0.3,1)';
    canvas.style.opacity = '1';
  });
  requestAnimationFrame(frame);
}

boot();
