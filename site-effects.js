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

  function addPlayerStats() {
    const areaNames = {
      'index.html': 'Boot Screen',
      'home.html': 'Studio Hub',
      'about.html': 'About Archive',
      'pocket-wilds.html': 'Pocket Wilds',
      'pocket-wilds-changelog.html': 'Wilds Logbook',
      'wrfm.html': 'WRFM Station',
      'speck.html': 'Speck',
      'doqi.html': 'DOQI',
      'lumina-dice.html': 'Lumina Dice',
      'labyrinth-fate.html': 'Labyrinth Fate',
      'juicebox.html': 'Juicebox',
      'macabre-dolls.html': 'Macabre Dolls',
      'cyoa.html': 'CYOA',
      'subscribed.html': 'Secret Mailing Room'
    };
    const totalAreas = Object.keys(areaNames).length;

    function read(storage, key, fallback) {
      try {
        const value = storage.getItem(key);
        return value === null ? fallback : value;
      } catch (error) {
        return fallback;
      }
    }

    function write(storage, key, value) {
      try {
        storage.setItem(key, value);
      } catch (error) {}
    }

    let playerId = Number.parseInt(read(localStorage, 'b3d_player_id', ''), 10);
    if (!Number.isInteger(playerId) || playerId < 10000 || playerId > 99999) {
      const random = new Uint32Array(1);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(random);
        playerId = 10000 + random[0] % 90000;
      } else {
        playerId = 10000 + Math.floor(Math.random() * 90000);
      }
      write(localStorage, 'b3d_player_id', String(playerId));
    }

    let sessionStarted = Number.parseInt(read(sessionStorage, 'b3d_session_started', ''), 10);
    if (!Number.isFinite(sessionStarted) || sessionStarted <= 0 || sessionStarted > Date.now()) {
      sessionStarted = Date.now();
      write(sessionStorage, 'b3d_session_started', String(sessionStarted));
    }

    let discovered = [];
    try {
      const parsed = JSON.parse(read(localStorage, 'b3d_areas_discovered', '[]'));
      if (Array.isArray(parsed)) discovered = parsed.filter(area => areaNames[area]);
    } catch (error) {}

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    let currentArea = pathParts[pathParts.length - 1] || 'index.html';
    if (!currentArea.includes('.')) currentArea = 'index.html';
    if (areaNames[currentArea] && !discovered.includes(currentArea)) {
      discovered.push(currentArea);
      write(localStorage, 'b3d_areas_discovered', JSON.stringify(discovered));
    }

    const hud = document.createElement('aside');
    hud.className = 'b3d-player-stats';
    hud.setAttribute('aria-label', 'Visitor game statistics');
    hud.innerHTML = `
      <button class="b3d-player-stats-toggle" type="button" aria-expanded="true">
        <span>PLAYER #${String(playerId).padStart(5, '0')}</span>
      </button>
      <div class="b3d-player-stats-body">
        <div class="b3d-stat-row">
          <span class="b3d-stat-label">SESSION TIME</span>
          <strong class="b3d-stat-value" data-b3d-session>00:00</strong>
        </div>
        <div class="b3d-stat-row">
          <span class="b3d-stat-label">AREAS DISCOVERED</span>
          <strong class="b3d-stat-value">${discovered.length} / ${totalAreas}</strong>
          <span class="b3d-area-meter" aria-hidden="true"><span></span></span>
        </div>
        <div class="b3d-stat-row">
          <span class="b3d-stat-label">CURRENT AREA</span>
          <strong class="b3d-stat-value">${areaNames[currentArea] || 'Unknown'}</strong>
        </div>
        <p class="b3d-player-stats-note">LOCAL SAVE · THIS BROWSER</p>
      </div>
    `;
    hud.style.setProperty('--b3d-area-progress', `${Math.min(100, discovered.length / totalAreas * 100)}%`);

    const toggle = hud.querySelector('.b3d-player-stats-toggle');
    const storedCollapsed = read(localStorage, 'b3d_stats_collapsed', '');
    const collapsed = storedCollapsed === '1' || (storedCollapsed === '' && window.matchMedia('(max-width: 600px)').matches);
    hud.classList.toggle('is-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.addEventListener('click', () => {
      const willCollapse = !hud.classList.contains('is-collapsed');
      hud.classList.toggle('is-collapsed', willCollapse);
      toggle.setAttribute('aria-expanded', String(!willCollapse));
      write(localStorage, 'b3d_stats_collapsed', willCollapse ? '1' : '0');
    });

    document.body.appendChild(hud);
    const timer = hud.querySelector('[data-b3d-session]');
    function updateTimer() {
      const elapsed = Math.max(0, Math.floor((Date.now() - sessionStarted) / 1000));
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor(elapsed % 3600 / 60);
      const seconds = elapsed % 60;
      timer.textContent = hours > 0
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    updateTimer();
    window.setInterval(updateTimer, 1000);

    if (discovered.length >= 5 && window.B3DAchievements) {
      window.setTimeout(() => {
        window.B3DAchievements.unlock('explorer', 'MAP GETTING CROWDED', 'Discovered five areas of the studio.');
      }, 850);
    }
  }

  function retireLegacyMusic() {
    try {
      localStorage.setItem('bbd_music_playing', '0');
    } catch (error) {}

    document.querySelectorAll('#musicBtn, .floating-music-btn').forEach(button => {
      button.hidden = true;
      button.setAttribute('aria-hidden', 'true');
      button.setAttribute('tabindex', '-1');
    });

    document.querySelectorAll('audio#bgMusic').forEach(audio => {
      const stop = () => {
        if (!audio.paused) audio.pause();
      };
      audio.pause();
      audio.muted = true;
      audio.loop = false;
      audio.preload = 'none';
      audio.addEventListener('play', stop);
    });
  }

  function addAchievements() {
    const stack = document.createElement('div');
    stack.className = 'b3d-achievement-stack';
    stack.setAttribute('aria-live', 'polite');
    stack.setAttribute('aria-label', 'Achievements');
    document.body.appendChild(stack);
    const unlocked = new Set();

    function hasUnlocked(key) {
      if (unlocked.has(key)) return true;
      try {
        return sessionStorage.getItem(`b3d_achievement_${key}`) === '1';
      } catch (error) {
        return false;
      }
    }

    function remember(key) {
      unlocked.add(key);
      try {
        sessionStorage.setItem(`b3d_achievement_${key}`, '1');
      } catch (error) {}
    }

    function unlock(key, title, copy) {
      if (hasUnlocked(key)) return false;
      remember(key);

      const popup = document.createElement('div');
      popup.className = 'b3d-achievement';
      popup.innerHTML = `
        <span class="b3d-achievement-label">ACHIEVEMENT UNLOCKED</span>
        <strong class="b3d-achievement-title"></strong>
        <span class="b3d-achievement-copy"></span>
      `;
      popup.querySelector('.b3d-achievement-title').textContent = title;
      popup.querySelector('.b3d-achievement-copy').textContent = copy;
      stack.appendChild(popup);
      requestAnimationFrame(() => popup.classList.add('is-visible'));
      window.setTimeout(() => {
        popup.classList.remove('is-visible');
        window.setTimeout(() => popup.remove(), 260);
      }, 3800);
      return true;
    }

    window.B3DAchievements = { unlock };

    if (/about\.html$/i.test(window.location.pathname)) {
      window.setTimeout(() => unlock('about', 'CURIOUS HUMAN', 'Found the About page.'), 650);
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const available = document.documentElement.scrollHeight - window.innerHeight;
        if (available > 0 && window.scrollY / available > .78) {
          unlock('scrolled', 'SCROLLED TOO FAR', 'There was nothing down here. Until now.');
        }
        ticking = false;
      });
    }, { passive: true });
  }

  function addAmbientSecrets() {
    const footer = document.querySelector('footer');
    if (!footer) return;
    footer.classList.add('b3d-ambient-footer');

    const hour = new Date().getHours();
    if (!reducedMotion.matches && (hour >= 18 || hour < 6)) {
      const fireflies = document.createElement('div');
      fireflies.className = 'b3d-fireflies';
      fireflies.setAttribute('aria-hidden', 'true');
      for (let index = 0; index < 7; index += 1) {
        const firefly = document.createElement('i');
        firefly.className = 'b3d-firefly';
        firefly.style.setProperty('--x', `${8 + Math.random() * 82}%`);
        firefly.style.setProperty('--y', `${12 + Math.random() * 65}%`);
        firefly.style.setProperty('--delay', `${Math.random() * -8}s`);
        firefly.style.setProperty('--duration', `${5 + Math.random() * 5}s`);
        fireflies.appendChild(firefly);
      }
      footer.prepend(fireflies);
    }

    const bot = document.createElement('button');
    bot.type = 'button';
    bot.className = 'b3d-footer-bot';
    bot.setAttribute('aria-label', 'A tiny wandering robot');
    bot.dataset.tooltip = 'A tiny robot. It seems busy.';
    bot.addEventListener('click', () => {
      bot.style.animationPlayState = 'paused';
      bot.setAttribute('aria-label', 'A happy tiny wandering robot');
      if (window.B3DAchievements) {
        window.B3DAchievements.unlock('robot', 'ROBOT WHISPERER', 'Interrupted a very important patrol.');
      }
      window.setTimeout(() => { bot.style.animationPlayState = ''; }, 2200);
    });
    footer.appendChild(bot);

    if (/home\.html$/i.test(window.location.pathname)) {
      const door = document.createElement('button');
      door.type = 'button';
      door.className = 'b3d-secret-door';
      door.setAttribute('aria-label', 'A suspiciously tiny door');
      door.dataset.tooltip = 'This was definitely not here before.';
      door.addEventListener('click', () => {
        door.classList.toggle('is-open');
        if (window.B3DAchievements) {
          window.B3DAchievements.unlock('door', 'DOOR? WHAT DOOR?', 'Opened something too small to enter.');
        }
      });
      footer.appendChild(door);
    }
  }

  function addKonamiSecret() {
    const sequence = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
    let position = 0;
    let active = false;
    let bots = [];

    function toggleChaos() {
      active = !active;
      root.classList.toggle('b3d-chaos-mode', active);

      if (active) {
        const banner = document.createElement('div');
        banner.className = 'b3d-chaos-banner';
        banner.textContent = 'FORBIDDEN DEBUG DISCO';
        document.body.appendChild(banner);
        window.setTimeout(() => banner.remove(), 2300);

        bots = Array.from({ length: 12 }, (_, index) => {
          const bot = document.createElement('i');
          bot.className = 'b3d-chaos-bot';
          bot.textContent = index % 2 ? '▣' : '◆';
          bot.style.left = `${3 + Math.random() * 94}%`;
          bot.style.setProperty('--delay', `${Math.random() * -3.5}s`);
          document.body.appendChild(bot);
          return bot;
        });
        if (window.B3DAchievements) {
          window.B3DAchievements.unlock('konami', 'ABSOLUTELY NORMAL WEBSITE', 'Activated the forbidden debug disco. Repeat the code to escape.');
        }
      } else {
        bots.forEach(bot => bot.remove());
        bots = [];
      }
    }

    document.addEventListener('keydown', event => {
      if (event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      position = key === sequence[position] ? position + 1 : (key === sequence[0] ? 1 : 0);
      if (position === sequence.length) {
        position = 0;
        toggleChaos();
      }
    });
  }

  function addCartridgeCards() {
    if (reducedMotion.matches) return;
    document.querySelectorAll('.project-card').forEach(card => {
      card.classList.add('b3d-cartridge');

      card.addEventListener('pointermove', event => {
        if (event.pointerType === 'touch') return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.setProperty('--b3d-tilt-x', `${(-y * 6).toFixed(2)}deg`);
        card.style.setProperty('--b3d-tilt-y', `${(x * 7).toFixed(2)}deg`);
      });

      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--b3d-tilt-x');
        card.style.removeProperty('--b3d-tilt-y');
      });

      const link = card.querySelector('a[href$=".html"]');
      if (!link) return;
      link.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        card.classList.add('is-inserting');
        link.textContent = 'INSERTING…';
        if (window.B3DAchievements) {
          window.B3DAchievements.unlock('cartridge', 'BLOW ON IT FIRST', 'Inserted a suspiciously browser-shaped cartridge.');
        }
        window.setTimeout(() => window.location.assign(link.href), 540);
      });
    });
  }

  ready(() => {
    retireLegacyMusic();
    addAchievements();
    addPlayerStats();
    addParticles();
    addGlitches();
    addAmbientSecrets();
    addTooltips();
    addKonamiSecret();
    addCartridgeCards();
  });
})();
