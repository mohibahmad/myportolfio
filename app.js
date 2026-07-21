/* Disable heavy animations for visitors who prefer reduced motion. */
window.__portfolioStaticMode = window.matchMedia('(prefers-reduced-motion: reduce)').matches;



/* ===== LOADER ===== */
(function () {
  var pl = document.getElementById('preloader');
  if (!pl) return;

  var fromResume = window.location.search.includes('from=resume');
  var fromProject = window.location.search.includes('from=project');
  if (fromResume || fromProject || window.__resumeHistoryReturn) {
    pl.style.display = 'none';
    document.body.classList.remove('loading');
    window.__pageReady = true;
    document.dispatchEvent(new Event('page:ready'));
    // Use the hash stored by the inline script (hash was removed from URL to prevent native scroll)
    var hashTarget = window.__returnHash || '';
    initSmoothScroll(hashTarget);
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  var num = document.getElementById('plNum');
  var fill = document.getElementById('plFill');
  var msg = document.getElementById('plMsg');
  var msgs = [
    'Initializing Flutter Engine…',
    'Compiling Dart AOT…',
    'Warming Impeller shaders…',
    'Preparing interactive details…',
    'Polishing pixels…',
    'Loading Experience…'
  ];
  var done = false;

  function finish() {
    if (done) return;
    done = true;
    pl.style.opacity = '0';
    pl.style.pointerEvents = 'none';
    pl.style.transition = 'opacity 0.8s ease';
    document.body.classList.remove('loading');
    // Flag the page as ready so scroll-triggered animations (cards, etc.)
    // can start revealing with a proper animation instead of an instant pop.
    window.__pageReady = true;
    document.dispatchEvent(new Event('page:ready'));
    setTimeout(function () {
      pl.style.display = 'none';
      initSmoothScroll();
    }, 850);
  }

  function initSmoothScroll(hashTarget) {
    if (typeof Lenis !== 'undefined' && !window.__portfolioStaticMode) {
      try {
        var lenis = new Lenis({
          duration: 1.2,
          easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
          orientation: 'vertical',
          gestureOrientation: 'vertical',
          smoothWheel: true,
          wheelMultiplier: 1.0,
          smoothTouch: true,
          touchMultiplier: 1.5,
          touchLerp: 0.1,
          syncTouch: true,
          syncTouchLerp: 0.1,
          infinite: false,
        });
        window.__lenis = lenis;
        var lenisRaf = function (time) {
          lenis.raf(time);
          requestAnimationFrame(lenisRaf);
        };
        requestAnimationFrame(lenisRaf);

        // Inject Lenis scroll classes onto html for CSS hooks
        document.documentElement.classList.add('lenis', 'lenis-smooth');

        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
          anchor.addEventListener('click', function (e) {
            var targetId = this.getAttribute('href');
            if (targetId === '#') return;
            var targetEl = document.querySelector(targetId);
            if (targetEl) {
              e.preventDefault();
              var offset = targetId === '#top' ? 0 : 70;
              lenis.scrollTo(targetEl, { offset: offset, duration: 1.4 });
            }
          });
        });

        // Initialize the parallax effect tied to this lenis instance
        initCardParallax(lenis);

        // If returning from a project page, scroll to the hash target after Lenis is ready
        if (hashTarget) {
          var targetEl = document.querySelector(hashTarget);
          if (targetEl) {
            // Small delay to let Lenis fully initialize and layout settle
            setTimeout(function () {
              var offset = hashTarget === '#top' ? 0 : 70;
              lenis.scrollTo(targetEl, { offset: offset, duration: 0.8 });
              // Unblock scroll after scrolling completes
              setTimeout(function () {
                document.documentElement.style.overflow = '';
                document.documentElement.style.height = '';
              }, 900);
            }, 100);
          } else {
            // Hash target not found, just unblock scroll
            document.documentElement.style.overflow = '';
            document.documentElement.style.height = '';
          }
        } else {
          // No hash, just unblock scroll
          document.documentElement.style.overflow = '';
          document.documentElement.style.height = '';
        }

      } catch (e) { }
    }
  }

  // Force finish after 5s no matter what
  setTimeout(finish, 5000);

  // Animate progress
  var totalDuration = 2000;
  var startTime = performance.now();
  function tick(now) {
    if (done) return;
    var elapsed = now - startTime;
    var t = Math.min(elapsed / totalDuration, 1);
    var eased = 1 - Math.pow(1 - t, 3);
    var p = eased * 100;
    var ip = Math.floor(p);
    if (num) num.textContent = ip;
    if (fill) fill.style.width = p + '%';
    if (msg) msg.textContent = msgs[Math.min(Math.floor(p / 18), msgs.length - 1)];
    if (t >= 1) {
      setTimeout(finish, 300);
      return;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // 3D preloader scene
  (function () {
    var canvas = document.getElementById('plAurora');
    if (!canvas || typeof THREE === 'undefined' || window.__portfolioStaticMode) {
      if (canvas) canvas.style.display = 'none';
      return;
    }
    try {
      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.z = 5;

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);

      var geom = new THREE.IcosahedronGeometry(1.4, 2);
      var mat = new THREE.MeshBasicMaterial({
        color: 0x00f2fe,
        wireframe: true,
        transparent: true,
        opacity: 0.16
      });
      var mesh = new THREE.Mesh(geom, mat);
      scene.add(mesh);

      var pGeom = new THREE.BufferGeometry();
      var pCount = 90;
      var pPos = new Float32Array(pCount * 3);
      for (var i = 0; i < pCount * 3; i += 3) {
        var theta = Math.random() * Math.PI * 2;
        var phi = Math.acos(2 * Math.random() - 1);
        var r = 2.5 + Math.random() * 2.5;
        pPos[i] = r * Math.sin(phi) * Math.cos(theta);
        pPos[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        pPos[i + 2] = r * Math.cos(phi);
      }
      pGeom.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

      var pCanvas = document.createElement('canvas');
      pCanvas.width = 64;
      pCanvas.height = 64;
      var pCtx = pCanvas.getContext('2d');
      var grad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 64, 64);
      var pTexture = new THREE.CanvasTexture(pCanvas);

      var pMat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.045,
        transparent: true,
        opacity: 0.85,
        map: pTexture,
        depthWrite: false
      });
      var points = new THREE.Points(pGeom, pMat);
      scene.add(points);

      var pmx = 0, pmy = 0, ptx = 0, pty = 0;
      function track(e) {
        ptx = (e.clientX / window.innerWidth - 0.5) * 1.6;
        pty = (e.clientY / window.innerHeight - 0.5) * -1.6;
      }
      window.addEventListener('mousemove', track, { passive: true });

      var activeFrame = true;
      function anim() {
        if (!activeFrame) return;
        requestAnimationFrame(anim);
        mesh.rotation.y += 0.005;
        mesh.rotation.x += 0.003;
        pmx += (ptx - pmx) * 0.05;
        pmy += (pty - pmy) * 0.05;
        mesh.position.x = pmx;
        mesh.position.y = pmy;
        renderer.render(scene, camera);
      }
      requestAnimationFrame(anim);

      window.addEventListener('resize', function () {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }, { passive: true });

      window.__cleanupLoader3D = function () {
        activeFrame = false;
        window.removeEventListener('mousemove', track);
        geom.dispose(); mat.dispose(); pGeom.dispose(); pMat.dispose(); renderer.dispose();
      };
    } catch (e) {
      canvas.style.display = 'none';
    }
  })();
})();



/* ===== SCROLL READER — GPU-composited via transform: scaleX() ===== */
(function () {
  var bar = document.getElementById('srBar');
  if (!bar) return;
  // Use transform scaleX for GPU compositing instead of width (avoids layout thrash)
  bar.style.transformOrigin = '0% 50%';
  bar.style.willChange = 'transform';
  function u() {
    var lenis = window.__lenis;
    if (lenis) {
      var p = Math.min(lenis.progress, 1);
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      // Add subtle velocity glow: faster scroll = brighter bar
      var vel = Math.abs(lenis.velocity || 0);
      var glow = Math.min(vel * 0.15, 1);
      var bright = Math.round(60 + glow * 195);
      bar.style.boxShadow = '0 0 ' + (8 + glow * 20) + 'px rgba(58,134,255,' + (0.15 + glow * 0.45).toFixed(2) + ')';
      bar.style.background = 'linear-gradient(90deg, #3a86ff, hsl(215, 100%, ' + bright + '%))';
    } else {
      var h = document.documentElement;
      var p = (h.scrollTop / (h.scrollHeight - h.clientHeight)) || 0;
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }
  }
  if (window.__lenis) {
    window.__lenis.on('scroll', u);
  } else {
    addEventListener('scroll', u, { passive: true });
  }
  u();
  // Re-bind if lenis loads later
  setTimeout(function () {
    if (window.__lenis) window.__lenis.on('scroll', u);
  }, 2000);
})();

/* ===== fade-up + stagger + image scale (CSS) ===== */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = document.querySelectorAll('.fade-up');
  if (reduce) { els.forEach(function (e) { e.classList.add('in') }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
  // Cards use sticky stacking only — no fade-up delay needed
  document.querySelectorAll('.skill').forEach(function (el, i) { el.style.transitionDelay = (i * 38) + 'ms'; });
  document.querySelectorAll('.exp-card').forEach(function (el, i) { el.style.transitionDelay = (i * 140) + 'ms'; });
  els.forEach(function (el) { io.observe(el); });
  /* instantly reveal elements already in viewport to avoid first-scroll flash */
  var vh = window.innerHeight;
  els.forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.top < vh * 0.92 && r.bottom > 0) { el.classList.add('in'); io.unobserve(el); }
  });
  /* pro-step staggered scroll reveal */
  (function () {
    var steps = document.querySelectorAll('.pro-step');
    if (!steps.length) return;
    steps.forEach(function (el, i) { el.style.transitionDelay = (i * 140) + 'ms'; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    steps.forEach(function (el) { io.observe(el); });
    /* instantly reveal pro-steps already in viewport */
    var vh = window.innerHeight;
    steps.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) { el.classList.add('in'); io.unobserve(el); }
    });
  })();
  /* process line fills after all steps visible */
  (function () {
    var line = document.querySelector('.pro-flow-line');
    if (!line) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { line.style.height = '100%'; io.disconnect(); }
      });
    }, { threshold: 0.1 });
    var last = document.querySelector('.pro-step:last-child .pro-step-body');
    if (last) io.observe(last);
  })();

  /* Core Expertise scroll animation */
  (function () {
    var caps = document.querySelectorAll('.cap-card');
    if (!caps.length) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { caps.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    caps.forEach(function (el) { io.observe(el); });
    /* instantly reveal cards already in viewport */
    var vh = window.innerHeight;
    caps.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.88 && r.bottom > 0) { el.classList.add('in'); io.unobserve(el); }
    });
  })();
})();


/* ===== custom cursor + shade ===== */
(function () {
  var coarse = window.matchMedia('(pointer:coarse)').matches || innerWidth < 980;
  if (coarse) return;
  document.body.classList.add('custom-cursor-active');
  var dot = document.getElementById('crDot');
  var ring = document.getElementById('crRing');
  var glow = document.getElementById('crGlow');
  var label = document.getElementById('crLabel');
  if (!dot || !ring) return;
  var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, gx = mx, gy = my;
  addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
    if (label) { label.style.left = mx + 'px'; label.style.top = (my - 46) + 'px'; }
  }, { passive: true });
  (function loop() {
    rx += (mx - rx) * 0.22; ry += (my - ry) * 0.22;
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    gx += (mx - gx) * 0.078; gy += (my - gy) * 0.078;
    glow.style.left = gx + 'px'; glow.style.top = gy + 'px';
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a,button,.btn,.skill,.h-item,.nav-cta,input').forEach(function (el) {
    el.addEventListener('mouseenter', function () { document.body.classList.add('cr-hover') });
    el.addEventListener('mouseleave', function () { document.body.classList.remove('cr-hover') });
  });
  document.querySelectorAll('.pro,.view-target').forEach(function (el) {
    el.addEventListener('mouseenter', function () { document.body.classList.add('cr-hover', 'cr-view'); if (label) label.textContent = 'View'; });
    el.addEventListener('mouseleave', function () { document.body.classList.remove('cr-hover', 'cr-view'); });
  });
})();



/* ===== aurora background ===== */
(function () {
  var c = document.getElementById('bg-aurora'); if (!c || !c.getContext) return;
  var x = c.getContext('2d', { alpha: true });
  var W, H, d = Math.min(window.devicePixelRatio || 1, 1.2), t = 0;
  function rs() { W = c.width = innerWidth * d; H = c.height = innerHeight * d; c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px'; }
  rs(); addEventListener('resize', rs);
  var blobs = [
    { hx: .72, hy: .16, r: .40, h: 215, s: .31 },
    { hx: .20, hy: .60, r: .33, h: 266, s: .21 },
    { hx: .52, hy: .8, r: .29, h: 198, s: .26 }
  ];
  var stars = [];
  for (var i = 0; i < 38; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: 0.7 + Math.random() * 1.1,
      speed: 0.015 + Math.random() * 0.035,
      phase: Math.random() * Math.PI * 2,
      depth: 0.25 + Math.random() * 0.75,
      ci: Math.floor(Math.random() * 4)
    });
  }
  var mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener('mousemove', function (e) {
    tx = (e.clientX / window.innerWidth - 0.5) * 24;
    ty = (e.clientY / window.innerHeight - 0.5) * 24;
  }, { passive: true });

  var frameSkip = 0;
  (function draw() {
    if (++frameSkip % 2) { requestAnimationFrame(draw); return; }
    t += 0.0072;
    mx += (tx - mx) * 0.08;
    my += (ty - my) * 0.08;
    x.clearRect(0, 0, W, H);
    stars.forEach(function (s) {
      var sx = s.x * W - mx * s.depth * d;
      var sy = s.y * H - my * s.depth * d;
      var op = 0.06 + Math.sin(t * s.speed * 10 + s.phase) * 0.14;
      var colors = [
        [0, 242, 254],
        [58, 134, 255],
        [34, 211, 154],
        [255, 255, 255]
      ];
      var c = colors[s.ci % colors.length];
      x.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + op.toFixed(3) + ')';
      x.shadowBlur = s.size * 3 * d;
      x.shadowColor = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.5)';
      x.beginPath();
      x.arc(sx, sy, s.size * d, 0, Math.PI * 2);
      x.fill();
      x.shadowBlur = 0;
    });
    blobs.forEach(function (b, i) {
      var bx = W * (b.hx + Math.sin(t * b.s + i) * 0.032);
      var by = H * (b.hy + Math.cos(t * b.s * 1.22 + i * 1.1) * 0.028);
      var rad = Math.min(W, H) * b.r;
      var g = x.createRadialGradient(bx, by, 0, bx, by, rad);
      g.addColorStop(0, 'hsla(' + b.h + ',72%,60%,0.084)');
      g.addColorStop(0.5, 'hsla(' + (b.h + 7) + ',58%,52%,0.034)');
      g.addColorStop(1, 'rgba(8,10,14,0)');
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, rad, 0, Math.PI * 2); x.fill();
    });
    x.strokeStyle = 'rgba(90,126,170,0.042)'; x.lineWidth = 1 * d;
    var step = 94 * d;
    for (var y = 0; y < H; y += step) {
      x.beginPath();
      for (var px = 0; px <= W; px += 64) { var wy = y + Math.sin(px * 0.0029 + t * 1.14) * 11 * d; px === 0 ? x.moveTo(px, wy) : x.lineTo(px, wy); }
      x.stroke();
    }
    requestAnimationFrame(draw);
  })();
})();

/* ===== 3D HERO — Three.js ===== */
(function () {
  var canvas = document.getElementById('hero3d');
  if (!canvas || typeof THREE === 'undefined' || window.__portfolioStaticMode) return;
  try {
  var parent = canvas.parentElement;
  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x10141c, 0.047);

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 5.08);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.85));
  function rs() {
    var w = parent.clientWidth, h = parent.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  rs(); addEventListener('resize', rs);

  scene.add(new THREE.AmbientLight(0xaac8ff, 0.52));
  var k1 = new THREE.DirectionalLight(0xb8d8ff, 1.08); k1.position.set(2.7, 2.7, 4); scene.add(k1);
  var k2 = new THREE.DirectionalLight(0x3a86ff, 0.92); k2.position.set(-3, -1.7, 2.3); scene.add(k2);
  var rim = new THREE.PointLight(0x3a86ff, 1.62, 20); rim.position.set(0, 0, 3.25); scene.add(rim);

  var geo = new THREE.TorusKnotGeometry(1.06, 0.32, 210, 28, 2, 3);
  var mat = new THREE.MeshPhysicalMaterial({
    color: 0x3a86ff, metalness: 0.15, roughness: 0.24,
    clearcoat: 1, clearcoatRoughness: 0.14,
    emissive: 0x0a1a38, emissiveIntensity: 0.22,
    transparent: true, opacity: 0.975
  });
  var knot = new THREE.Mesh(geo, mat);
  var group = new THREE.Group();
  group.add(knot);
  scene.add(group);
  var wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x7ab8ff, wireframe: true, transparent: true, opacity: 0.15 }));
  wire.scale.setScalar(1.0015); knot.add(wire);

  var pG = new THREE.BufferGeometry();
  var pc = 500, pa = new Float32Array(pc * 3);
  for (var i = 0; i < pc; i++) {
    var r = 2.45 + Math.random() * 0.9;
    var th = Math.random() * Math.PI * 2;
    var ph = Math.acos(2 * Math.random() - 1);
    pa[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pa[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pa[i * 3 + 2] = r * Math.cos(ph);
  }
  pG.setAttribute('position', new THREE.BufferAttribute(pa, 3));
  var points = new THREE.Points(pG, new THREE.PointsMaterial({ color: 0x6fa8ff, size: 0.017, transparent: true, opacity: .68, sizeAttenuation: true }));
  scene.add(points);

  var mx = 0, my = 0, tx = 0, ty = 0, zoom = 5.08;

  function pt(e) {
    var r = parent.getBoundingClientRect();
    var cx = e.clientX ?? (e.touches && e.touches[0].clientX) ?? r.left + r.width / 2;
    var cy = e.clientY ?? (e.touches && e.touches[0].clientY) ?? r.top + r.height / 2;
    tx = ((cx - r.left) / r.width - .5) * 2;
    ty = ((cy - r.top) / r.height - .5) * -2;
  }

  parent.addEventListener('mousemove', pt, { passive: true });
  parent.addEventListener('touchmove', pt, { passive: true });

  // Smart zoom on scroll: only blocks page scroll while zooming is active
  parent.addEventListener('wheel', function (e) {
    var oldZoom = zoom;
    zoom += e.deltaY * 0.0022;
    zoom = Math.max(3.5, Math.min(8.0, zoom));

    if (zoom !== oldZoom) {
      e.preventDefault();
    }
  }, { passive: false });

  var isHeroVisible = true;
  var animId = null;
  var last = performance.now(), frames = 0, fpsEl = document.getElementById('hFps');

  function anim(now) {
    if (!isHeroVisible) {
      animId = null;
      return;
    }
    animId = requestAnimationFrame(anim);

    var t = now * 0.001;
    mx += (tx - mx) * 0.055; my += (ty - my) * 0.055;
    knot.rotation.y += 0.0036 + Math.abs(mx) * 0.002;
    knot.rotation.x = 0.16 + my * 0.4;
    knot.rotation.z += 0.0013;
    knot.scale.setScalar(1 + Math.sin(t * 1.15) * 0.014);
    points.rotation.y -= 0.0008;
    points.rotation.x = my * 0.065;
    camera.position.x += (mx * 0.78 - camera.position.x) * 0.036;
    camera.position.y += (my * 0.48 - camera.position.y) * 0.036;
    camera.position.z += (zoom - camera.position.z) * 0.074;
    camera.lookAt(0, 0, 0);
    rim.intensity = 1.5 + Math.sin(t * 2.18) * 0.24;
    renderer.render(scene, camera);
    frames++;
    if (now - last > 520) { var f = Math.round(frames * 1000 / (now - last)); frames = 0; last = now; if (fpsEl) fpsEl.textContent = f + 'fps'; }
  }

  if (window.IntersectionObserver) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        isHeroVisible = entry.isIntersecting;
        if (isHeroVisible && !animId) {
          animId = requestAnimationFrame(anim);
        }
      });
    }, { threshold: 0 });
    obs.observe(parent);
  } else {
    animId = requestAnimationFrame(anim);
  }
  } catch (e) {
    // If WebGL fails here, fail silently instead of halting every script
    // block that runs after this one (e.g. mobile menu wiring).
    if (canvas) canvas.style.display = 'none';
  }
})();




/* ===== STICKY STACK OPTIMIZATION ===== */
/* Removed abrupt stack--unpinned observer — now handled natively by padding + GPU-accelerated sticky */

/* ===== RESUME DOWNLOAD — CINEMATIC ZOOM TRANSITION ===== */
(function () {
  var overlay = document.createElement('div');
  overlay.id = 'resumeTransition';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-live', 'polite');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<div class="rt-wipes" aria-hidden="true"><span></span><span></span><span></span><span></span></div><div class="rt-kicker">Resume · Mohib Ahmad</div><div class="rt-loader"><div class="rt-ring"></div><div class="rt-ring rt-ring-2"></div><div class="rt-ring rt-ring-3"></div><div class="rt-core"><span></span><span></span><span></span></div></div><div class="rt-text">Preparing resume</div><div class="rt-progress"><span></span></div><div class="rt-sub">Flutter Developer</div>';
  document.body.appendChild(overlay);

  var style = document.createElement('style');
  style.textContent = '\
    #resumeTransition {\
      position: fixed;\
      inset: 0;\
      z-index: 9999;\
      display: flex;\
      flex-direction: column;\
      align-items: center;\
      justify-content: center;\
      background: radial-gradient(circle at 50% 42%, rgba(58,134,255,0), rgba(6,8,12,0));\
      backdrop-filter: blur(0);\
      -webkit-backdrop-filter: blur(0);\
      opacity: 0;\
      pointer-events: none;\
      transition: opacity .5s cubic-bezier(0.22,1,0.36,1), background .65s cubic-bezier(0.22,1,0.36,1), backdrop-filter .65s ease;\
    }\
    #resumeTransition.active {\
      opacity: 1;\
      pointer-events: auto;\
      background: radial-gradient(circle at 50% 42%, rgba(28,70,138,0.28), rgba(6,8,12,0.97) 58%);\
      backdrop-filter: blur(14px);\
      -webkit-backdrop-filter: blur(14px);\
    }\
    #resumeTransition > :not(.rt-wipes) { position: relative; z-index: 2; }\
    .rt-wipes {\
      position: absolute;\
      inset: 0;\
      z-index: 1;\
      display: grid;\
      grid-template-rows: repeat(4,1fr);\
      overflow: hidden;\
      pointer-events: none;\
    }\
    .rt-wipes span {\
      background: linear-gradient(90deg, transparent, rgba(58,134,255,.16), rgba(0,242,254,.08), transparent);\
      border-block: 1px solid rgba(127,223,255,.04);\
      transform: translateX(-110%);\
      transition: transform .65s cubic-bezier(.22,1,.36,1);\
    }\
    .rt-wipes span:nth-child(even) { transform: translateX(110%); transition-delay: .08s; }\
    .rt-wipes span:nth-child(3) { transition-delay: .16s; }\
    .rt-wipes span:nth-child(4) { transition-delay: .24s; }\
    #resumeTransition.active .rt-wipes span { transform: translateX(0); }\
    #resumeTransition.complete .rt-wipes { opacity: .25; transition: opacity .45s; }\
    .rt-kicker {\
      margin-bottom: 24px;\
      color: #5f8fde;\
      font-size: 9px;\
      font-weight: 800;\
      letter-spacing: .22em;\
      text-transform: uppercase;\
      opacity: 0;\
      transform: translateY(10px);\
      transition: opacity .35s .1s, transform .35s .1s cubic-bezier(.22,1,.36,1);\
    }\
    #resumeTransition.active .rt-kicker {\
      opacity: 1;\
      transform: translateY(0);\
    }\
    .rt-loader {\
      position: relative;\
      width: 80px;\
      height: 80px;\
      margin-bottom: 28px;\
    }\
    .rt-ring {\
      position: absolute;\
      inset: 0;\
      border: 2px solid rgba(58,134,255,0.08);\
      border-top-color: #3a86ff;\
      border-radius: 50%;\
      opacity: 0;\
      transform: scale(0.4) rotate(0deg);\
      transition: opacity .3s .1s, transform .4s .1s cubic-bezier(0.22,1,0.36,1);\
    }\
    .rt-ring-2 {\
      inset: 8px;\
      border-top-color: #00f2fe;\
      transition-delay: .18s;\
    }\
    .rt-ring-3 {\
      inset: 16px;\
      border-top-color: #22d39a;\
      transition-delay: .25s;\
    }\
    .rt-core {\
      position: absolute;\
      inset: 25px;\
      display: flex;\
      flex-direction: column;\
      justify-content: center;\
      gap: 4px;\
      padding: 0 9px;\
      border-radius: 8px;\
      background: linear-gradient(145deg, rgba(255,255,255,.12), rgba(255,255,255,.025));\
      border: 1px solid rgba(255,255,255,.14);\
      box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 10px 30px rgba(0,0,0,.35);\
      opacity: 0;\
      transform: scale(.7);\
      transition: opacity .3s .25s, transform .4s .25s cubic-bezier(.22,1,.36,1);\
    }\
    .rt-core span { height: 2px; border-radius: 2px; background: rgba(180,211,255,.7); }\
    .rt-core span:nth-child(2) { width: 72%; }\
    .rt-core span:nth-child(3) { width: 48%; }\
    #resumeTransition.active .rt-core { opacity: 1; transform: scale(1); }\
    #resumeTransition.active .rt-ring {\
      opacity: 1;\
      transform: scale(1) rotate(0deg);\
      animation: rtSpin 1.8s linear infinite;\
    }\
    #resumeTransition.active .rt-ring-2 {\
      animation-direction: reverse;\
      animation-duration: 2.4s;\
    }\
    #resumeTransition.active .rt-ring-3 {\
      animation-duration: 3s;\
    }\
    .rt-text {\
      font-size: 13px;\
      font-weight: 700;\
      letter-spacing: 0.18em;\
      text-transform: uppercase;\
      color: #fff;\
      opacity: 0;\
      transform: translateY(12px);\
      transition: opacity .35s .18s, transform .35s .18s cubic-bezier(0.22,1,0.36,1);\
    }\
    #resumeTransition.active .rt-text {\
      opacity: 1;\
      transform: translateY(0);\
    }\
    .rt-progress {\
      width: 180px;\
      height: 2px;\
      margin-top: 20px;\
      overflow: hidden;\
      border-radius: 2px;\
      background: rgba(255,255,255,.07);\
      opacity: 0;\
      transition: opacity .25s .25s;\
    }\
    .rt-progress span {\
      display: block;\
      width: 100%;\
      height: 100%;\
      transform: scaleX(0);\
      transform-origin: left;\
      background: linear-gradient(90deg,#3a86ff,#00f2fe,#22d39a);\
      box-shadow: 0 0 16px rgba(0,242,254,.65);\
    }\
    #resumeTransition.active .rt-progress { opacity: 1; }\
    #resumeTransition.active .rt-progress span { animation: rtProgress .9s cubic-bezier(.22,1,.36,1) forwards; }\
    #resumeTransition.complete .rt-progress span { transform: scaleX(1); }\
    #resumeTransition.complete .rt-ring { border-top-color: #22d39a; }\
    .rt-sub {\
      font-size: 11px;\
      font-weight: 600;\
      letter-spacing: 0.1em;\
      color: #4a6a9a;\
      margin-top: 10px;\
      opacity: 0;\
      transform: translateY(8px);\
      transition: opacity .3s .3s, transform .3s .3s cubic-bezier(0.22,1,0.36,1);\
    }\
    #resumeTransition.active .rt-sub {\
      opacity: 1;\
      transform: translateY(0);\
    }\
    @keyframes rtSpin {\
      to { transform: scale(1) rotate(360deg); }\
    }\
    @keyframes rtProgress { to { transform: scaleX(1); } }\
    body.resume-zooming .page {\
      animation: resumePageZoom 1.5s cubic-bezier(0.22,1,0.36,1) forwards;\
    }\
    @keyframes resumePageZoom {\
      0%   { transform: scale(1) translateZ(0); filter: blur(0) brightness(1); opacity: 1; }\
      30%  { transform: scale(0.975) translateZ(0); filter: blur(2px) brightness(0.75); opacity: 0.94; }\
      66%  { transform: scale(0.95) translateZ(0); filter: blur(7px) brightness(0.42); opacity: 0.68; }\
      100% { transform: scale(1) translateZ(0); filter: blur(0) brightness(1); opacity: 1; }\
    }\
    body.resume-zooming .hero-3d,\
    body.resume-zooming .pro,\
    body.resume-zooming .skill {\
      animation: resumeElementFade 1.5s cubic-bezier(0.22,1,0.36,1) forwards;\
    }\
    @keyframes resumeElementFade {\
      0%   { opacity: 1; transform: scale(1); }\
      40%  { opacity: 0.3; transform: scale(0.95); }\
      100% { opacity: 1; transform: scale(1); }\
    }\
  ';
  document.head.appendChild(style);

  var isAnimating = false;
  var resumeLinks = document.querySelectorAll('a[href="resume.html"]');

  resumeLinks.forEach(function (el) {
    el.addEventListener('click', function (e) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      e.preventDefault();
      if (isAnimating) return;
      isAnimating = true;

      var text = overlay.querySelector('.rt-text');
      var sub = overlay.querySelector('.rt-sub');
      text.textContent = 'Preparing resume';
      sub.textContent = 'Flutter Developer';
      overlay.classList.remove('complete');
      overlay.setAttribute('aria-hidden', 'false');
      void overlay.offsetWidth;

      requestAnimationFrame(function () {
        document.body.style.overflow = 'hidden';
        document.body.classList.add('resume-zooming');
        overlay.classList.add('active');
        if (window.__lenis) window.__lenis.stop();
      });

      setTimeout(function () {
        overlay.classList.add('complete');
        text.textContent = 'Resume ready';
        sub.textContent = 'Opening document';
      }, 900);

      setTimeout(function () {
        window.location.href = 'resume.html';
      }, 1400);
    });
  });

  // History restoration keeps the portfolio in memory. Fade the existing
  // transition away instead of replaying the loader when returning.
  window.addEventListener('pageshow', function () {
    if (!overlay.classList.contains('active')) return;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.remove('active', 'complete');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('resume-zooming');
        document.body.style.overflow = '';
        if (window.__lenis) window.__lenis.start();
        isAnimating = false;
      });
    });
  });
})();

/* ===== MOBILE MENU TOGGLE ===== */
(function () {
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;

  var links = menu.querySelectorAll('a');
  var lenis = window.__lenis;

  function closeMenu() {
    menu.classList.remove('active');
    menu.setAttribute('aria-hidden', 'true');
    menu.setAttribute('inert', '');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
  }

  function openMenu() {
    menu.classList.add('active');
    menu.removeAttribute('inert');
    menu.setAttribute('aria-hidden', 'false');
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();
  }

  // Re-grab lenis ref since it may init after this IIFE
  function getLenis() {
    return window.__lenis;
  }

  toggle.addEventListener('click', function () {
    var isOpen = menu.classList.contains('active');
    lenis = getLenis();
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  links.forEach(function (link) {
    link.addEventListener('click', function () {
      lenis = getLenis();
      closeMenu();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('active')) {
      lenis = getLenis();
      closeMenu();
    }
  });
})();

function copyEmail(btn) {
  navigator.clipboard.writeText('mohibahmad338@gmail.com').then(function () {
    var tooltip = btn.querySelector('.copy-tooltip');
    if (tooltip) {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateX(-50%) translateY(0)';
      setTimeout(function () {
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateX(-50%) translateY(4px)';
      }, 1600);
    }
  });
}



/* ===== BUTTON CLICK RIPPLE EFFECT ===== */
(function () {
  document.querySelectorAll('.btn, .nav-toggle').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      if (btn.classList.contains('resume-trigger')) return;
      var rect = btn.getBoundingClientRect();
      var ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      var size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 600);
    });
  });
})();

/* ===== CARD SMOOTH SCROLL — parallax & reveal via Lenis ===== */
function initCardParallax(lenis) {
  if (!lenis || window.__portfolioStaticMode) return;

  var cards = document.querySelectorAll('.pro');
  if (!cards.length) return;

  // Collect card visual elements once for performance
  var visuals = [];
  cards.forEach(function (card) {
    visuals.push({
      el: card,
      inner: card.querySelector('.pc-visual-inner'),
      img: card.querySelector('.pc-img'),
      body: card.querySelector('.pc-body')
    });
  });

  function update() {
    var vh = window.innerHeight;
    var vCenter = vh / 2;

    for (var i = 0; i < visuals.length; i++) {
      var v = visuals[i];
      if (!v.el) continue;

      var rect = v.el.getBoundingClientRect();
      // Only process cards that are somewhat visible
      if (rect.bottom < -200 || rect.top > vh + 200) {
        if (v.inner) v.inner.style.transform = '';
        continue;
      }

      var cardCenter = rect.top + rect.height / 2;
      // Normalize distance from viewport center (-1 to 1)
      var dist = (cardCenter - vCenter) / (vh * 0.6);
      var normalized = Math.max(-1.2, Math.min(1.2, dist));

      // Subtle parallax on the visual inner container
      if (v.inner) {
        var offset = normalized * 6;
        v.inner.style.transform = 'translateY(' + offset.toFixed(1) + 'px)';
      }

      // Subtle shadow/glow shift based on card position relative to center
      // Cards near center get slightly more prominent shadow
      var centerProximity = 1 - Math.min(1, Math.abs(normalized) * 0.8);
      var shadowIntensity = 0.35 + centerProximity * 0.25;
      v.el.style.setProperty('--stack-shadow', shadowIntensity.toFixed(2));
    }
  }

  // Throttled update for performance — but drive it from a continuous rAF loop
  // so high-refresh displays (120Hz) animate the cards every frame, not only
  // on scroll ticks.
  var ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(function () {
        update();
        ticking = false;
      });
      ticking = true;
    }
  }

  // Continuous rAF loop keeps parallax buttery at 120fps / high refresh rates
  var running = true;
  function rafLoop() {
    if (!running) return;
    requestAnimationFrame(rafLoop);
    update();
  }
  requestAnimationFrame(rafLoop);
  lenis.on('scroll', onScroll);
  // Run once on init
  update();

  // Clean up on page unload
  window.addEventListener('beforeunload', function () {
    running = false;
    if (lenis && lenis.off) lenis.off('scroll', onScroll);
  });
}

/* ===== PROJECT CARD SMOOTH REVEAL ===== */
(function () {
  var projects = document.querySelectorAll('.pro');
  if (!projects.length) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    projects.forEach(function (e) { e.classList.add('in'); });
    return;
  }

  // SIMPLE APPROACH: After preloader ends, reveal all cards with staggered
  // delays. The CSS transition handles the animation (opacity 0->1,
  // translateY 36px->0). We force a reflow before adding .in to ensure the
  // browser has committed the initial state (opacity:0) so the transition plays.
  // For cards scrolled into view later: use a simple scroll handler.

  var revealed = {};

  function revealCard(el, i) {
    if (el.classList.contains('in')) return;
    // Force reflow so browser commits initial opacity:0 / translateY
    void el.offsetHeight;
    el.classList.add('in');
  }

  function checkCards() {
    var vh = window.innerHeight;
    projects.forEach(function (el, i) {
      if (revealed[i]) return;
      var rect = el.getBoundingClientRect();
      // Use a generous threshold since sticky cards are always partially visible
      if (rect.top < vh * 0.85) {
        revealed[i] = true;
        revealCard(el, i);
      }
    });
  }

  function revealWhenReady() {
    if (!window.__pageReady) {
      document.addEventListener('page:ready', revealWhenReady, { once: true });
      return;
    }

    // Wait for preloader to fully disappear (800ms fade + buffer)
    setTimeout(function () {
      // Reveal ALL cards with staggered delays based on their CSS transition-delay
      projects.forEach(function (el, i) {
        setTimeout(function () {
          revealCard(el, i);
        }, i * 80);
      });
    }, 900);

    // Bind Lenis scroll for subsequent scroll-driven reveals
    function bindLenis() {
      var lenis = window.__lenis;
      if (lenis) {
        lenis.on('scroll', checkCards);
      } else {
        var poll = setInterval(function () {
          lenis = window.__lenis;
          if (lenis) {
            clearInterval(poll);
            lenis.on('scroll', checkCards);
            checkCards();
          }
        }, 200);
      }
    }
    bindLenis();
  }
  revealWhenReady();
})();
