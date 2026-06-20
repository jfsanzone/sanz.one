import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

/* =========================================================================
   SANZONE — WebGL flowmap distortion + chromatic aberration wordmark
   Inspired by supersolid.agency: a single wordmark image is sampled with
   distorted UVs driven by a velocity flowmap, with RGB channel splitting
   and motion blur. The distortion dissipates when the cursor stops.
   ========================================================================= */

const container = document.querySelector('[data-webgl-container]');
const imgEl = document.querySelector('#distorted-image');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CONFIG = {
  falloff: 0.18,
  alpha: 0.97,
  dissipation: 0.965,
  distortionStrength: 0.12,
  chromaticAberration: 0.006,
  chromaticSpread: 1.0,
  velocityScale: 0.6,
  velocityDamping: 0.85,
  motionBlurStrength: 0.35,
  motionBlurDecay: 0.88,
  motionBlurThreshold: 0.5,
};

const FLOW_SIZE = 256;

function boot() {
  if (!container || !imgEl || reducedMotion) {
    if (imgEl) imgEl.style.opacity = '1';
    return;
  }

  new THREE.TextureLoader().load(
    imgEl.currentSrc || imgEl.src,
    (tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      const aspect = tex.image.width / tex.image.height;
      init(tex, aspect);
    },
    undefined,
    () => { imgEl.style.opacity = '1'; }
  );
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

  // Clear flow targets to zero — uninitialized float RTs contain garbage
  // that would otherwise produce extreme distortion on the first frames.
  renderer.setRenderTarget(flowA); renderer.setClearColor(0x000000, 0); renderer.clear();
  renderer.setRenderTarget(flowB); renderer.clear();
  renderer.setRenderTarget(null);

  /* ---- Motion-blur frame buffers ---- */
  let frameA = makeFrameRT();
  let frameB = makeFrameRT();
  function makeFrameRT() {
    return new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false });
  }

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
        float influence = 1.0 - smoothstep(0.0, uFalloff, dist);
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
      uPrevFrame: { value: frameA.texture },
      uDistortion: { value: CONFIG.distortionStrength },
      uAberration: { value: CONFIG.chromaticAberration },
      uSpread: { value: CONFIG.chromaticSpread },
      uBlurStrength: { value: CONFIG.motionBlurStrength },
      uBlurDecay: { value: CONFIG.motionBlurDecay },
      uBlurThreshold: { value: CONFIG.motionBlurThreshold },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy*2.0,0.0,1.0); }`,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uImage;
      uniform sampler2D uFlow;
      uniform sampler2D uPrevFrame;
      uniform float uDistortion;
      uniform float uAberration;
      uniform float uSpread;
      uniform float uBlurStrength;
      uniform float uBlurDecay;
      uniform float uBlurThreshold;

      void main(){
        vec3 flow = texture2D(uFlow, vUv).rgb;
        vec2 flowDir = flow.rg;
        float mag = length(flowDir);

        vec2 baseUv = vUv + flowDir * uDistortion * 0.5;

        // chromatic aberration: split RGB along/against/perp to flow
        vec2 dir = mag > 0.0001 ? normalize(flowDir) : vec2(0.0);
        vec2 perp = vec2(-dir.y, dir.x);
        float ab = uAberration * uSpread * (0.4 + mag * 6.0);

        vec2 rUv = baseUv + dir * ab;
        vec2 bUv = baseUv - dir * ab;
        vec2 gUv = baseUv + perp * ab * 0.8;

        float r = texture2D(uImage, rUv).r;
        float g = texture2D(uImage, gUv).g;
        float b = texture2D(uImage, bUv).b;
        // alpha from the most-displaced sample average to keep edges soft
        float a = (texture2D(uImage, rUv).a + texture2D(uImage, gUv).a + texture2D(uImage, bUv).a) / 3.0;

        vec4 cur = vec4(r, g, b, a);

        // motion blur: blend with previous frame when flow is strong
        vec4 prev = texture2D(uPrevFrame, vUv);
        float blur = smoothstep(uBlurThreshold, 1.0, mag) * uBlurStrength;
        vec4 outc = mix(cur, prev * uBlurDecay, blur);
        outc.a = max(cur.a, outc.a);

        gl_FragColor = outc;
      }`,
  });
  const dispMesh = new THREE.Mesh(quad, dispMat);
  dispMesh.frustumCulled = false;

  /* ===================== Copy material (for frame feedback) ===================== */
  const copyMat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uTex: { value: null } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy*2.0,0.0,1.0); }`,
    fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D uTex; void main(){ gl_FragColor = texture2D(uTex, vUv); }`,
  });
  const copyMesh = new THREE.Mesh(quad, copyMat);
  copyMesh.frustumCulled = false;

  /* ===================== Mouse tracking ===================== */
  const cur = new THREE.Vector2(-1, -1);
  const target = new THREE.Vector2(-1, -1);
  const last = new THREE.Vector2(-1, -1);
  const velocity = new THREE.Vector2(0, 0);
  const smoothVel = new THREE.Vector2(0, 0);
  let hasMoved = false;

  function setTargetFromEvent(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    target.set((clientX - rect.left) / rect.width, 1.0 - (clientY - rect.top) / rect.height);
    if (!hasMoved) { cur.copy(target); last.copy(target); hasMoved = true; }
  }
  container.addEventListener('pointermove', (e) => setTargetFromEvent(e.clientX, e.clientY));
  container.addEventListener('pointerleave', () => { target.set(-1, -1); });

  /* ===================== Sizing ===================== */
  function resize() {
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    renderer.setSize(w, h, false);
    const pr = renderer.getPixelRatio();
    const pw = Math.floor(w * pr), ph = Math.floor(h * pr);
    frameA.setSize(pw, ph);
    frameB.setSize(pw, ph);
    renderer.setRenderTarget(frameA); renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.setRenderTarget(frameB); renderer.clear();
    renderer.setRenderTarget(null);
  }
  window.addEventListener('resize', resize);
  resize();

  /* ===================== Render loop ===================== */
  function frame() {
    // smooth mouse + velocity
    cur.lerp(target, 0.7);
    const nv = new THREE.Vector2((cur.x - last.x) * 80, (cur.y - last.y) * 80);
    velocity.lerp(nv, 0.6);
    smoothVel.lerp(velocity, 0.3);
    velocity.multiplyScalar(CONFIG.velocityDamping);
    last.copy(cur);

    const mouseActive = target.x >= 0 && target.y >= 0;
    flowMat.uniforms.uMouse.value.copy(mouseActive ? cur : new THREE.Vector2(-1, -1));
    flowMat.uniforms.uVelocity.value.copy(smoothVel).multiplyScalar(CONFIG.velocityScale);

    // Pass 1: update flowmap (read flowA -> write flowB)
    flowMat.uniforms.uPrev.value = flowA.texture;
    flowMesh.material = flowMat;
    scene.clear(); scene.add(flowMesh);
    renderer.setRenderTarget(flowB);
    renderer.render(scene, camera);
    [flowA, flowB] = [flowB, flowA];

    // Pass 2: render distorted logo into frameB (read previous frameA)
    dispMat.uniforms.uFlow.value = flowA.texture;
    dispMat.uniforms.uPrevFrame.value = frameA.texture;
    scene.clear(); scene.add(dispMesh);
    renderer.setRenderTarget(frameB);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    // copy frameB to screen
    copyMat.uniforms.uTex.value = frameB.texture;
    scene.clear(); scene.add(copyMesh);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene, camera);

    [frameA, frameB] = [frameB, frameA];

    requestAnimationFrame(frame);
  }

  // reveal: hide raw img, show canvas
  imgEl.style.opacity = '0';
  canvas.style.opacity = '0';
  requestAnimationFrame(() => {
    canvas.style.transition = 'opacity 700ms cubic-bezier(0.16,1,0.3,1)';
    canvas.style.opacity = '1';
  });
  requestAnimationFrame(frame);
}

boot();
