const dotLogo = document.querySelector('[data-dot-logo]');
const root = document.documentElement;

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const width = 100;
const height = 100;
const spacing = 3.9;
const repulsionForce = 11.7;
const repulsionEase = 0.12;
const dots = [];
const pointer = {
  active: false,
  x: width / 2,
  y: height / 2,
};
let lastFrame = 0;
let theme = 'dark';

root.setAttribute('data-theme', theme);

function seeded(row, col, tick, salt = 1) {
  const x = Math.sin((row + 1) * 12.9898 + (col + 1) * 78.233 + (tick + 1) * salt) * 43758.5453;
  return Math.abs(x - Math.floor(x));
}

function createDots() {
  if (!dotLogo) return;

  const namespace = 'http://www.w3.org/2000/svg';
  const fragment = document.createDocumentFragment();

  for (let y = spacing / 2, row = 0; y < height; y += spacing, row += 1) {
    for (let x = spacing / 2, col = 0; x < width; x += spacing, col += 1) {
      const circle = document.createElementNS(namespace, 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', 0.84);
      circle.dataset.row = row;
      circle.dataset.col = col;
      circle.dataset.homeX = x;
      circle.dataset.homeY = y;
      circle.dataset.offsetX = 0;
      circle.dataset.offsetY = 0;
      circle.style.opacity = '0.84';
      fragment.appendChild(circle);
      dots.push(circle);
    }
  }

  dotLogo.appendChild(fragment);
}

function bindPointer() {
  const svg = dotLogo?.ownerSVGElement;
  if (!svg) return;

  svg.addEventListener('pointerenter', () => {
    pointer.active = true;
  });

  svg.addEventListener('pointermove', (event) => {
    const rect = svg.getBoundingClientRect();
    pointer.active = true;
    pointer.x = ((event.clientX - rect.left) / rect.width) * width;
    pointer.y = ((event.clientY - rect.top) / rect.height) * height;
  });

  svg.addEventListener('pointerleave', () => {
    pointer.active = false;
  });
}

function updateDots(tick) {
  for (const dot of dots) {
    const homeX = Number(dot.dataset.homeX);
    const homeY = Number(dot.dataset.homeY);
    const currentOffsetX = Number(dot.dataset.offsetX);
    const currentOffsetY = Number(dot.dataset.offsetY);
    let targetOffsetX = 0;
    let targetOffsetY = 0;

    if (pointer.active) {
      const dx = homeX - pointer.x;
      const dy = homeY - pointer.y;
      const distance = Math.hypot(dx, dy);
      const influence = Math.max(0, 1 - distance / 26);

      if (influence > 0) {
        const safeDistance = Math.max(distance, 0.001);
        const force = influence * influence * repulsionForce;
        targetOffsetX = (dx / safeDistance) * force;
        targetOffsetY = (dy / safeDistance) * force;
      }
    }

    const offsetX = currentOffsetX + (targetOffsetX - currentOffsetX) * repulsionEase;
    const offsetY = currentOffsetY + (targetOffsetY - currentOffsetY) * repulsionEase;

    dot.setAttribute('transform', `translate(${offsetX.toFixed(2)} ${offsetY.toFixed(2)})`);
    dot.dataset.offsetX = offsetX;
    dot.dataset.offsetY = offsetY;
  }
}

function animate(time) {
  if (!dotLogo || reducedMotion) return;

  if (time - lastFrame >= 16) lastFrame = time;
  updateDots();

  window.requestAnimationFrame(animate);
}

if (dotLogo && !reducedMotion) {
  createDots();
  bindPointer();
  updateDots(0);
  window.requestAnimationFrame(animate);
}
