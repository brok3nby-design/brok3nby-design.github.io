(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function addCrtMode() {
    const layer = document.createElement('div');
    layer.className = 'b3d-crt-layer';
    layer.setAttribute('aria-hidden', 'true');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'b3d-crt-toggle';

    let enabled = false;
    try {
      enabled = localStorage.getItem('b3d_crt_mode') === '1';
    } catch (error) {}

    function render() {
      root.classList.toggle('b3d-crt-on', enabled);
      button.setAttribute('aria-pressed', String(enabled));
      button.textContent = `CRT MODE: ${enabled ? 'ON' : 'OFF'}`;
      button.setAttribute('aria-label', `${enabled ? 'Disable' : 'Enable'} CRT display mode`);
    }

    button.addEventListener('click', () => {
      enabled = !enabled;
      render();
      try {
        localStorage.setItem('b3d_crt_mode', enabled ? '1' : '0');
      } catch (error) {}
    });

    document.body.append(layer, button);
    render();
  }

  function addParticles() {
    if (reducedMotion.matches || !window.HTMLCanvasElement) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'b3d-particle-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const context = canvas.getContext('2d');
    if (!context) return;

    document.body.appendChild(canvas);
    const particles = [];
    let frame = 0;
    let width = 0;
    let height = 0;
    let lastX = 0;
    let lastY = 0;
    let lastSpawn = 0;
    let accent = '#00ff9f';

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#00ff9f';
    }

    function tick() {
      context.clearRect(0, 0, width, height);
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= .975;
        particle.vy = particle.vy * .975 + .012;
        particle.life -= .028;
        if (particle.life <= 0) {
          particles.splice(index, 1);
          continue;
        }
        context.globalAlpha = Math.max(0, particle.life) * .72;
        context.fillStyle = particle.color;
        context.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
      }
      context.globalAlpha = 1;
      frame = particles.length ? requestAnimationFrame(tick) : 0;
    }

    function spawn(event) {
      const target = event.target instanceof Element
        ? event.target.closest('section, .hero, .project-card, .feature-card, .gallery-item, .hero-image, .hero-visual')
        : null;
      if (!target) return;

      const now = performance.now();
      const distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);
      if (now - lastSpawn < 24 || distance < 3) return;
      lastSpawn = now;
      lastX = event.clientX;
      lastY = event.clientY;

      const amount = Math.min(4, 1 + Math.floor(distance / 12));
      for (let index = 0; index < amount; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = .45 + Math.random() * 1.15;
        particles.push({
          x: event.clientX + Math.cos(angle) * 5,
          y: event.clientY + Math.sin(angle) * 5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() > .72 ? 3 : 2,
          life: .72 + Math.random() * .28,
          color: Math.random() > .28 ? accent : '#ffd166'
        });
      }
      if (!frame) frame = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('pointermove', spawn, { passive: true });
  }

  function addGlitches() {
    const selectors = '.project-card h3, .hero h1, main h1, .hero-mark strong';
    document.querySelectorAll(selectors).forEach(element => {
      const label = element.textContent.trim();
      if (!label) return;
      element.classList.add('b3d-glitch');
      element.dataset.glitch = label;
      let timeout = 0;
      element.addEventListener('mouseenter', () => {
        window.clearTimeout(timeout);
        element.classList.remove('is-glitching');
        void element.offsetWidth;
        element.classList.add('is-glitching');
        timeout = window.setTimeout(() => element.classList.remove('is-glitching'), 320);
      });
    });
  }

  function tooltipText(element) {
    if (element.dataset.tooltip) return element.dataset.tooltip;
    if (element.matches('img')) return element.alt.trim();
    const text = element.textContent.replace(/\s+/g, ' ').trim();
    if (element.matches('.feature-tag')) return `Trait · ${text}`;
    if (element.matches('.status-badge, .status')) return `Project status · ${text}`;
    return text;
  }

  function addTooltips() {
    const tooltip = document.createElement('div');
    tooltip.className = 'b3d-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltip);

    const targets = document.querySelectorAll(
      '[data-tooltip], .gallery-item img, .hero-slideshow img, .hero-visual img, .feature-tag, .status-badge, .status'
    );
    let active = null;

    function place(x, y) {
      const padding = 12;
      const offset = 16;
      const rect = tooltip.getBoundingClientRect();
      const left = Math.min(window.innerWidth - rect.width - padding, Math.max(padding, x + offset));
      const top = y + rect.height + offset > window.innerHeight
        ? Math.max(padding, y - rect.height - offset)
        : y + offset;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }

    function show(element, x, y) {
      const text = tooltipText(element);
      if (!text) return;
      active = element;
      tooltip.textContent = text;
      tooltip.classList.add('is-visible');
      place(x, y);
    }

    function hide() {
      active = null;
      tooltip.classList.remove('is-visible');
    }

    targets.forEach(element => {
      element.addEventListener('pointerenter', event => show(element, event.clientX, event.clientY));
      element.addEventListener('pointermove', event => {
        if (active === element) place(event.clientX, event.clientY);
      });
      element.addEventListener('pointerleave', hide);
      element.addEventListener('focus', () => {
        const rect = element.getBoundingClientRect();
        show(element, rect.left + rect.width / 2, rect.bottom);
      });
      element.addEventListener('blur', hide);
    });
  }

  function addPageTransitions() {
    if (reducedMotion.matches) return;

    const layer = document.createElement('div');
    layer.className = 'b3d-transition-layer is-active is-arriving';
    layer.setAttribute('aria-hidden', 'true');

    for (let index = 0; index < 96; index += 1) {
      const pixel = document.createElement('i');
      pixel.className = 'b3d-transition-pixel';
      pixel.style.setProperty('--b3d-delay', `${Math.random() * .14}s`);
      layer.appendChild(pixel);
    }
    document.body.appendChild(layer);
    document.body.classList.add('b3d-arriving');
    window.setTimeout(() => {
      document.body.classList.remove('b3d-arriving');
      layer.classList.remove('is-active', 'is-arriving');
    }, 620);

    let navigating = false;
    function navigate(url) {
      if (navigating) return;
      navigating = true;
      layer.querySelectorAll('.b3d-transition-pixel').forEach(pixel => {
        pixel.style.setProperty('--b3d-delay', `${Math.random() * .1}s`);
      });
      layer.className = 'b3d-transition-layer is-active is-leaving';
      document.body.classList.add('b3d-leaving');
      window.setTimeout(() => window.location.assign(url), 390);
    }

    window.B3DEffects = Object.assign(window.B3DEffects || {}, { navigate });
    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest('a[href]');
      if (!link || link.target || link.hasAttribute('download')) return;
      const raw = link.getAttribute('href');
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.hash) return;
      if (!url.pathname.endsWith('.html') && !url.pathname.endsWith('/')) return;

      event.preventDefault();
      navigate(url.href);
    });
  }

  ready(() => {
    addCrtMode();
    addParticles();
    addGlitches();
    addTooltips();
    addPageTransitions();
  });
})();
