(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const motionAllowed = () => window.B3DPreferences ? window.B3DPreferences.motionAllowed() : !reducedMotion.matches;

  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function addParticles() {
    if (!window.HTMLCanvasElement) return;

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
      if (!motionAllowed() || document.hidden || window.B3DPreferences?.get('particles') === false) {
        particles.length = 0;
        frame = 0;
        return;
      }
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
      if (!motionAllowed() || document.hidden || event.pointerType === 'touch' || window.B3DPreferences?.get('particles') === false) return;
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
      if (!element.textContent.trim() || element.classList.contains('b3d-glitch')) return;
      element.classList.add('b3d-glitch');
      let timeout = 0;
      element.addEventListener('mouseenter', () => {
        if (!motionAllowed()) return;
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

  function addAchievements() {
    const stack = document.createElement('div');
    stack.className = 'b3d-achievement-stack';
    stack.setAttribute('aria-live', 'polite');
    stack.setAttribute('aria-label', 'Achievements');
    document.body.appendChild(stack);
    const unlocked = new Set();

    function hasUnlocked(key) {
      if (window.B3DPassport) return window.B3DPassport.has(key);
      if (unlocked.has(key)) return true;
      try {
        return sessionStorage.getItem(`b3d_achievement_${key}`) === '1';
      } catch (error) {
        return false;
      }
    }

    function remember(key) {
      if (window.B3DPassport) { window.B3DPassport.unlock(key); return; }
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
    if (hour >= 18 || hour < 6) {
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

    // J.E.F.F. is deliberately uncommon: an easter egg should feel discovered, not decorative.
    if (Math.random() <= .18) {
    const jeffLines = [
      'You found me. Congratulations on winning absolutely nothing.',
      'I was testing the footer. It failed the vibe check.',
      'You click tiny robots. I catalogue bold life choices.',
      'This site has a lot of detail. You noticed the robot. Respect.',
      'I am J.E.F.F. Please pretend that stands for something impressive.',
      'I have reviewed your browsing technique. It is aggressively human.',
      'Do not worry. I only report the funny parts.',
      'I was built for quality assurance. Then I saw the internet.',
      'You seem lost. That is a valid navigation style.',
      'The games are evolving. Unlike my pay grade.',
      'I have no hands, yet somehow I am carrying this whole footer.',
      'Good click. Strong click. Almost professional.',
      'I was told to be helpful. Nobody defined helpful.',
      'Please enjoy the details. They were made on purpose.',
      'A hidden robot is still more available than most customer support.',
      'I patrol this footer for bugs. The metaphorical kind. Mostly.',
      'You have excellent taste in obscure clickable objects.',
      'I am not judging. I am recording. There is a difference.',
      'This is an easter egg. Try not to make it weird.',
      'J.E.F.F. online. Expectations carefully lowered.'
    ];
    let remainingLines = [];
    const nextJeffLine = () => {
      if (!remainingLines.length) remainingLines = jeffLines.slice().sort(() => Math.random() - .5);
      return remainingLines.pop();
    };
    const bot = document.createElement('button');
    bot.type = 'button';
    bot.className = 'b3d-footer-bot';
    bot.setAttribute('aria-label', 'J.E.F.F., a tiny wandering robot');
    bot.dataset.tooltip = 'J.E.F.F. is on patrol.';
    bot.addEventListener('click', () => {
      bot.style.animationPlayState = 'paused';
      bot.setAttribute('aria-label', 'J.E.F.F. has something to say');
      let speech = footer.querySelector('.b3d-jeff-speech');
      if (!speech) {
        speech = document.createElement('p');
        speech.className = 'b3d-jeff-speech';
        speech.setAttribute('role', 'status');
        footer.appendChild(speech);
      }
      const footerBounds = footer.getBoundingClientRect();
      const botBounds = bot.getBoundingClientRect();
      const speechLeft = Math.max(36, Math.min(footer.clientWidth - 220, botBounds.left - footerBounds.left + 30));
      speech.style.left = `${speechLeft}px`;
      speech.textContent = nextJeffLine();
      speech.classList.remove('is-visible');
      window.requestAnimationFrame(() => speech.classList.add('is-visible'));
      if (window.B3DAchievements) {
        window.B3DAchievements.unlock('robot', 'ROBOT WHISPERER', 'Got a sarcastic field report from J.E.F.F.');
      }
      window.setTimeout(() => { bot.style.animationPlayState = ''; }, 2200);
    });
    footer.appendChild(bot);
    }

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
    const cartridgeSound = new Audio('sounds/cartridge.mp3');
    cartridgeSound.preload = 'none';
    cartridgeSound.volume = .8;

    document.querySelectorAll('.project-card').forEach(card => {
      card.classList.add('b3d-cartridge');

      {
        card.addEventListener('pointermove', event => {
          if (event.pointerType === 'touch' || !motionAllowed()) return;
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
      }

      const link = card.querySelector('a[href$=".html"]');
      if (!link) return;
      const playCartridgeSound = event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (window.B3DPreferences?.get('sound')) {
          try {
            cartridgeSound.currentTime = 0;
            cartridgeSound.play().catch(() => {});
          } catch (error) {}
        }
        if (window.B3DAchievements) {
          window.B3DAchievements.unlock('cartridge', 'BLOW ON IT FIRST', 'Inserted a suspiciously browser-shaped cartridge.');
        }
      };
      link.addEventListener('click', playCartridgeSound);
      card.addEventListener('pointerup', event => {
        if (event.target.closest('a, button, summary, input, label')) return;
        playCartridgeSound(event);
      });
    });
  }

  function addBackToTop() {
    if (document.querySelector('.b3d-back-to-top')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'b3d-back-to-top';
    button.setAttribute('aria-label', 'Back to top');
    button.innerHTML = '<span aria-hidden="true">&#8593;</span><span>TOP</span>';

    let playtestLink = null;
    let guestbookLink = null;
    const isHomePage = document.querySelector('.hero-buttons') && document.querySelector('#released');
    if (isHomePage) {
      playtestLink = document.createElement('a');
      playtestLink.className = 'b3d-playtest-cta';
      playtestLink.href = 'glass-and-fortune.html#playtest-heading';
      playtestLink.setAttribute('aria-label', 'Learn about upcoming Brok3n by Design playtests');
      playtestLink.innerHTML = '<span class="b3d-playtest-dot" aria-hidden="true"></span><span>PLAYTESTERS WANTED</span>';

      guestbookLink = document.createElement('a');
      guestbookLink.className = 'b3d-guestbook-cta';
      guestbookLink.href = 'graffiti/';
      guestbookLink.setAttribute('aria-label', 'Open and sign the Graffiti guestbook');
      guestbookLink.innerHTML = '<span aria-hidden="true">✦</span><span>SIGN THE GUESTBOOK</span>';
    }

    const updateVisibility = () => {
      const isVisible = window.scrollY > 420;
      button.classList.toggle('is-visible', isVisible);
      button.tabIndex = isVisible ? 0 : -1;
      button.setAttribute('aria-hidden', String(!isVisible));
      if (playtestLink) {
        playtestLink.classList.toggle('is-visible', isVisible);
        playtestLink.tabIndex = isVisible ? 0 : -1;
        playtestLink.setAttribute('aria-hidden', String(!isVisible));
      }
      if (guestbookLink) {
        guestbookLink.classList.toggle('is-visible', isVisible);
        guestbookLink.tabIndex = isVisible ? 0 : -1;
        guestbookLink.setAttribute('aria-hidden', String(!isVisible));
      }
    };

    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'auto' });
    });

    if (guestbookLink) document.body.appendChild(guestbookLink);
    if (playtestLink) document.body.appendChild(playtestLink);
    document.body.appendChild(button);
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
  }

  ready(() => {
    addAchievements();
    addParticles();
    addGlitches();
    addAmbientSecrets();
    addTooltips();
    addKonamiSecret();
    addCartridgeCards();
    addBackToTop();
  });
})();
