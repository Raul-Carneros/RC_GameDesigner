// Raúl Carneros · Portfolio
// Vanilla JS: scroll reveals, nav state, mobile menu, project dialogs.

(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Scroll reveals (IntersectionObserver, no scroll listeners) ----------
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    // Anything already in the initial viewport reveals right away (staggered
    // via --i); the observer only handles elements below the fold.
    var belowFold = revealEls.filter(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
        el.classList.add('in');
        return false;
      }
      return true;
    });
    if (belowFold.length) {
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
      belowFold.forEach(function (el) { revealObserver.observe(el); });
    }
  }

  // ---------- Active section in nav ----------
  var navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
  var sections = [];
  navLinks.forEach(function (link) {
    var section = document.querySelector(link.getAttribute('href'));
    if (section) sections.push({ link: link, section: section });
  });
  if ('IntersectionObserver' in window && sections.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (l) { l.removeAttribute('aria-current'); });
        var match = sections.find(function (s) { return s.section === entry.target; });
        if (match) match.link.setAttribute('aria-current', 'true');
        // The hero is observed too: back at the top, no link stays active.
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { sectionObserver.observe(s.section); });
    var hero = document.querySelector('.hero');
    if (hero) sectionObserver.observe(hero);
  }

  // ---------- Mobile menu ----------
  var header = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        header.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------- Project dialogs ----------
  document.querySelectorAll('[data-dialog]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dlg = document.getElementById(btn.getAttribute('data-dialog'));
      if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
    });
  });

  document.querySelectorAll('.dlg').forEach(function (dlg) {
    var closeBtn = dlg.querySelector('[data-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () { dlg.close(); });
    }
    // Click on the backdrop (outside the frame) closes the dialog.
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close();
    });
  });

  // ---------- Image lightbox ----------
  var lightbox = document.getElementById('lightbox');
  if (lightbox) {
    var lbImg = lightbox.querySelector('img');
    var lbCap = lightbox.querySelector('.lightbox-cap');
    document.querySelectorAll('.zoom').forEach(function (zoomBtn) {
      zoomBtn.addEventListener('click', function () {
        var img = zoomBtn.querySelector('img');
        if (!img) return;
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lbCap.textContent = img.alt;
        lightbox.showModal();
      });
    });
  }

  // ---------- BUG HUNT: arcade mini-game (bonus level section) ----------
  // One-button jumper on a 320x180 buffer, upscaled with crisp pixels.
  // Runs only while the canvas is on screen; starts on user input only.
  var canvas = document.getElementById('bughunt');
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext('2d');
    var W = 320, H = 180, GROUND = 150;
    var COL = {
      sky: '#0a0b0f', star: '#3a4050', ground: '#2a2e3a',
      text: '#e9ebf1', dim: '#a9b0bd', accent: '#ffd84d', bug: '#e0564f'
    };
    var STATE = { TITLE: 0, PLAYING: 1, OVER: 2 };
    var state = STATE.TITLE;
    var frame = 0, score = 0, best = 0, speed = 0;
    var player = { x: 42, y: GROUND, vy: 0, w: 12, h: 14 };
    var bugs = [], spawnIn = 0;
    // Visible by default; the observer below pauses the loop off-screen.
    var visible = true, rafId = null;

    try { best = parseInt(localStorage.getItem('rc-arcade-best'), 10) || 0; } catch (e) { best = 0; }

    var stars = [];
    for (var s = 0; s < 36; s++) {
      stars.push({ x: Math.random() * W, y: Math.random() * (GROUND - 40), v: 0.08 + Math.random() * 0.25 });
    }

    function px(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    }

    function text(str, x, y, size, color, align) {
      ctx.fillStyle = color;
      ctx.font = size + 'px "Press Start 2P", monospace';
      ctx.textAlign = align || 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(str, x, y);
    }

    function reset() {
      score = 0;
      speed = 2.1;
      bugs = [];
      spawnIn = 50;
      player.y = GROUND;
      player.vy = 0;
    }

    function spawnBug() {
      var tall = Math.random() < 0.3;
      bugs.push({ x: W + 12, w: tall ? 9 : 13, h: tall ? 15 : 9 });
      var gap = 64 - Math.min(28, speed * 6);
      spawnIn = gap + Math.random() * 55;
    }

    function jump() {
      if (state !== STATE.PLAYING) {
        reset();
        state = STATE.PLAYING;
        return;
      }
      if (player.y >= GROUND) player.vy = -4.7;
    }

    function drawPlayer() {
      var x = player.x, y = player.y - player.h;
      px(x, y, player.w, player.h - 4, COL.accent);              // body
      px(x + 2, y + 3, 3, 3, COL.sky);                           // eyes
      px(x + 7, y + 3, 3, 3, COL.sky);
      var running = state === STATE.PLAYING && player.y >= GROUND;
      var step = running && (frame >> 2) % 2 === 0 ? 2 : 0;
      px(x + 1, y + player.h - 4 + step / 2, 3, 4 - step / 2, COL.accent);  // legs alternate
      px(x + 8, y + player.h - 4, 3, 4 - step, COL.accent);
    }

    function drawBug(b) {
      var y = GROUND - b.h;
      px(b.x, y, b.w, b.h - 2, COL.bug);
      px(b.x - 2, y + 2, 2, 2, COL.bug);                         // antenna
      px(b.x + 2, GROUND - 2, 2, 2, COL.bug);                    // legs
      px(b.x + b.w - 4, GROUND - 2, 2, 2, COL.bug);
    }

    function drawWorld(moving) {
      px(0, 0, W, H, COL.sky);
      stars.forEach(function (st) {
        if (moving) { st.x -= st.v; if (st.x < 0) st.x = W; }
        px(st.x, st.y, 1, 1, COL.star);
      });
      px(0, GROUND, W, 2, COL.ground);
      for (var d = 0; d < 8; d++) {
        var dx = (d * 48 - (moving ? (frame * speed) % 48 : 0));
        px(dx, GROUND + 6, 14, 2, COL.ground);
      }
    }

    function hud() {
      text('SCORE ' + String(score).padStart(5, '0'), 6, 7, 8, COL.dim, 'left');
      if (best > 0) text('BEST ' + String(best).padStart(5, '0'), W - 6, 7, 8, COL.dim, 'right');
    }

    function blinkOn() { return frame % 64 < 38; }

    function render() {
      frame++;
      if (state === STATE.PLAYING) {
        drawWorld(true);
        speed = Math.min(5.4, speed + 0.0012);
        score = Math.floor(frame / 5);

        player.vy += 0.24;
        player.y += player.vy;
        if (player.y > GROUND) { player.y = GROUND; player.vy = 0; }

        if (--spawnIn <= 0) spawnBug();
        for (var i = bugs.length - 1; i >= 0; i--) {
          bugs[i].x -= speed;
          if (bugs[i].x + bugs[i].w < -4) bugs.splice(i, 1);
        }

        bugs.forEach(function (b) {
          var hit = player.x + 2 < b.x + b.w - 2 &&
                    player.x + player.w - 2 > b.x + 2 &&
                    player.y - 2 > GROUND - b.h;
          if (hit) {
            state = STATE.OVER;
            if (score > best) {
              best = score;
              try { localStorage.setItem('rc-arcade-best', String(best)); } catch (e) { /* private mode */ }
            }
          }
        });

        bugs.forEach(drawBug);
        drawPlayer();
        hud();
      } else if (state === STATE.TITLE) {
        drawWorld(!reducedMotion);
        drawPlayer();
        text('BUG HUNT', W / 2, 48, 16, COL.accent);
        text('JUMP THE BUGS. SHIP THE BUILD.', W / 2, 76, 7, COL.dim);
        if (blinkOn() || reducedMotion) text('PRESS START', W / 2, 104, 8, COL.text);
        text('SPACE / TAP', W / 2, 124, 7, COL.dim);
        if (best > 0) hud();
      } else {
        drawWorld(false);
        bugs.forEach(drawBug);
        drawPlayer();
        hud();
        text('GAME OVER', W / 2, 56, 14, COL.bug);
        text('SCORE ' + score + (score >= best ? '  NEW BEST!' : ''), W / 2, 84, 8, COL.text);
        if (blinkOn() || reducedMotion) text('PRESS START', W / 2, 108, 8, COL.text);
      }
    }

    // Fixed 60Hz simulation step so game speed is identical on 60/120/144Hz
    // displays; rAF only decides when to advance the accumulator.
    var last = 0, acc = 0, STEP = 1000 / 60;

    function loop(ts) {
      if (!last) last = ts;
      acc += ts - last;
      last = ts;
      if (acc > 250) acc = STEP; // resumed after a stall: don't fast-forward
      while (acc >= STEP) {
        render();
        acc -= STEP;
      }
      // On reduced motion the title/over screens are static frames; the
      // loop only spins while the user is actually playing.
      if (visible && (!reducedMotion || state === STATE.PLAYING)) {
        rafId = requestAnimationFrame(loop);
      } else {
        rafId = null;
        last = 0;
      }
    }

    function wake() {
      if (rafId === null && visible) {
        last = 0;
        rafId = requestAnimationFrame(loop);
      }
    }

    // Pause off-screen / resume on-screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) wake();
      }, { threshold: 0.2 }).observe(canvas);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state === STATE.PLAYING) state = STATE.OVER;
    });

    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      jump();
      wake();
    });
    canvas.addEventListener('keydown', function (e) {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
        e.preventDefault();
        jump();
        wake();
      }
    });

    // First paint once the pixel font is ready (fallback: paint anyway).
    if (document.fonts && document.fonts.ready) {
      document.fonts.load('8px "Press Start 2P"').then(function () { render(); wake(); });
    } else {
      render();
      wake();
    }
  }
})();
