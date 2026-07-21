(function () {
  'use strict';

  if (window.AntigravityTransition) return;

  var activeScene = null;

  function injectStyles() {
    if (document.getElementById('agTransitionStyles')) return;
    var style = document.createElement('style');
    style.id = 'agTransitionStyles';
    style.textContent = [
      '.ag-transition{position:fixed;inset:0;z-index:12000;overflow:hidden;opacity:0;visibility:hidden;pointer-events:none;background:radial-gradient(circle at var(--ag-x,50%) var(--ag-y,50%),rgba(58,134,255,.18),rgba(5,8,13,.94) 34%,#05080d 72%);transition:opacity .28s ease,visibility 0s linear .28s}',
      '.ag-transition.is-active{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .28s ease,visibility 0s}',
      '.ag-transition.is-releasing{opacity:0;pointer-events:none;transition:opacity .72s cubic-bezier(.22,1,.36,1)}',
      '.ag-transition canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:crosshair}',
      '.ag-transition::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at var(--ag-x,50%) var(--ag-y,50%),transparent 0 12%,rgba(5,8,13,.1) 35%,rgba(5,8,13,.46) 100%)}',
      '.ag-transition.ag-background{z-index:0;opacity:.40;visibility:visible;pointer-events:none;background:radial-gradient(circle at var(--ag-x,50%) var(--ag-y,38%),rgba(58,134,255,.075),transparent 32%),radial-gradient(circle at 82% 18%,rgba(34,211,154,.04),transparent 28%);transition:none}',
      '.ag-transition.ag-background::after{display:none}',
      '.ag-transition.ag-background canvas{cursor:default;pointer-events:none}',
      'body.ag-has-antigravity{background:#0b0d13}',
      'body.ag-has-antigravity>main,body.ag-has-antigravity>footer{position:relative;z-index:1}',
      '.ag-copy{position:absolute;z-index:2;left:50%;bottom:clamp(38px,8vh,86px);transform:translate(-50%,18px);display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;opacity:0;transition:opacity .42s .12s ease,transform .55s .12s cubic-bezier(.22,1,.36,1);pointer-events:none}',
      '.ag-transition.is-active .ag-copy{opacity:1;transform:translate(-50%,0)}',
      '.ag-transition.is-releasing .ag-copy{opacity:0;transform:translate(-50%,-12px);transition-delay:0s}',
      '.ag-copy span{font:700 10px/1 Inter,system-ui,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#7faeff}',
      '.ag-copy strong{font:750 clamp(20px,3vw,34px)/1.05 Inter,system-ui,sans-serif;letter-spacing:-.03em;color:#f5f8ff;text-shadow:0 0 32px rgba(58,134,255,.34)}',
      '.ag-copy i{display:block;width:86px;height:1px;margin-top:8px;background:linear-gradient(90deg,transparent,#3a86ff,#00e5ff,transparent);box-shadow:0 0 14px rgba(58,134,255,.8);transform-origin:center;animation:agPulse 1s ease-in-out infinite alternate}',
      'body.ag-transition-lock{overflow:hidden}',
      '@keyframes agPulse{from{transform:scaleX(.45);opacity:.48}to{transform:scaleX(1.2);opacity:1}}',
      '@media(prefers-reduced-motion:reduce){.ag-transition canvas{display:none}.ag-copy i{animation:none}.ag-transition,.ag-copy{transition-duration:.01ms!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function easeOut(value) {
    return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
  }

  function disposeActive() {
    if (!activeScene) return;
    activeScene.destroy();
    activeScene = null;
  }

  function makeScene(options) {
    injectStyles();
    disposeActive();

    var isBackground = options.mode === 'background';
    var overlay = document.createElement('div');
    overlay.className = 'ag-transition' + (isBackground ? ' ag-background is-active' : '');
    if (isBackground) {
      overlay.setAttribute('aria-hidden', 'true');
    } else {
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-live', 'polite');
    }
    overlay.style.setProperty('--ag-x', (options.x / window.innerWidth * 100).toFixed(2) + '%');
    overlay.style.setProperty('--ag-y', (options.y / window.innerHeight * 100).toFixed(2) + '%');

    var canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    overlay.appendChild(canvas);
    if (!isBackground) {
      var copy = document.createElement('div');
      copy.className = 'ag-copy';
      copy.innerHTML = '<span>' + (options.mode === 'arrive' ? 'Interactive project · Loaded' : 'Entering project · 3D field') + '</span><strong></strong><i></i>';
      copy.querySelector('strong').textContent = options.label || 'Project Detail';
      overlay.appendChild(copy);
    }
    document.body.appendChild(overlay);
    document.body.classList.add(isBackground ? 'ag-has-antigravity' : 'ag-transition-lock');

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canRender = !reduced && typeof window.THREE !== 'undefined';
    var renderer = null;
    var scene = null;
    var camera = null;
    var mesh = null;
    var geometry = null;
    var material = null;
    var particles = [];
    var dummy = null;
    var raf = 0;
    var start = performance.now();
    var pointer = { x: options.x, y: options.y };
    var smoothPointer = { x: options.x, y: options.y };

    function pointerMove(event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      overlay.style.setProperty('--ag-x', (event.clientX / window.innerWidth * 100).toFixed(2) + '%');
      overlay.style.setProperty('--ag-y', (event.clientY / window.innerHeight * 100).toFixed(2) + '%');
    }

    var pointerTarget = isBackground ? window : overlay;
    pointerTarget.addEventListener('pointermove', pointerMove, { passive: true });

    function worldSize() {
      var height = 2 * Math.tan((35 * Math.PI / 180) / 2) * 50;
      return { width: height * (window.innerWidth / window.innerHeight), height: height };
    }

    function screenToWorld(x, y) {
      var size = worldSize();
      return {
        x: (x / window.innerWidth - 0.5) * size.width,
        y: -(y / window.innerHeight - 0.5) * size.height
      };
    }

    function resize() {
      if (!renderer || !camera) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }

    if (canRender) {
      try {
        var THREE = window.THREE;
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
        renderer.setClearColor(0x000000, 0);
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 120);
        camera.position.set(0, 0, 50);
        resize();

        var count = options.count || (window.innerWidth < 700 ? 140 : 230);
        geometry = new THREE.CylinderGeometry(0.065, 0.065, 0.42, 5, 1);
        material = new THREE.MeshBasicMaterial({ color: isBackground ? 0xffffff : (options.color || 0x4f85f7), vertexColors: isBackground, transparent: true, opacity: isBackground ? 0.78 : 0.94 });
        mesh = new THREE.InstancedMesh(geometry, material, count);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(mesh);
        dummy = new THREE.Object3D();

        var size = worldSize();
        var initialCenter = screenToWorld(options.x, options.y);
        var themePalette = [new THREE.Color(0x3a86ff), new THREE.Color(0x4f85f7), new THREE.Color(0x00d9ff), new THREE.Color(0x22d39a)];
        for (var i = 0; i < count; i++) {
          var angle = Math.random() * Math.PI * 2;
          var ring = 5.6 + (Math.random() - 0.5) * 1.8;
          var base = {
            x: (Math.random() - 0.5) * size.width * 1.2,
            y: (Math.random() - 0.5) * size.height * 1.2,
            z: (Math.random() - 0.5) * 16
          };
          particles.push({
            angle: angle,
            ring: ring,
            phase: Math.random() * 100,
            speed: 0.55 + Math.random() * 0.8,
            variance: 0.55 + Math.random() * 0.9,
            base: base,
            x: options.mode === 'arrive' ? initialCenter.x + Math.cos(angle) * ring : base.x,
            y: options.mode === 'arrive' ? initialCenter.y + Math.sin(angle) * ring : base.y,
            z: options.mode === 'arrive' ? Math.sin(angle * 2) * 2 : base.z
          });
          if (isBackground && mesh.setColorAt) {
            var colorIndex = Math.random() < 0.72 ? Math.floor(Math.random() * 2) : (Math.random() < 0.72 ? 2 : 3);
            mesh.setColorAt(i, themePalette[colorIndex]);
          }
        }
        if (isBackground && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      } catch (error) {
        canRender = false;
        canvas.style.display = 'none';
      }
    }

    function frame(now) {
      var elapsed = (now - start) / 1000;
      smoothPointer.x += (pointer.x - smoothPointer.x) * 0.055;
      smoothPointer.y += (pointer.y - smoothPointer.y) * 0.055;

      if (canRender && renderer && mesh) {
        var center = screenToWorld(smoothPointer.x, smoothPointer.y);
        var progress = options.mode === 'arrive'
          ? 1 - easeOut(elapsed / 0.92)
          : easeOut(elapsed / 0.78);

        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          var orbit = p.angle + elapsed * 0.34 * p.speed;
          var wave = Math.sin(elapsed * 3.2 + p.phase) * 0.55;
          var radius = p.ring + wave;
          var ringX = center.x + Math.cos(orbit) * radius;
          var ringY = center.y + Math.sin(orbit) * radius;
          var ringZ = Math.sin(orbit * 2 + elapsed) * 2.3;
          var particleProgress = progress;
          var baseX = p.base.x;
          var baseY = p.base.y;
          var baseZ = p.base.z;
          if (isBackground) {
            baseX += Math.sin(elapsed * p.speed + p.phase) * 0.16;
            baseY += Math.cos(elapsed * p.speed * 0.8 + p.phase) * 0.12;
            var dx = baseX - center.x;
            var dy = baseY - center.y;
            particleProgress = easeOut(clamp(1 - Math.sqrt(dx * dx + dy * dy) / 12, 0, 1));
          }
          var targetX = baseX + (ringX - baseX) * particleProgress;
          var targetY = baseY + (ringY - baseY) * particleProgress;
          var targetZ = baseZ + (ringZ - baseZ) * particleProgress;
          p.x += (targetX - p.x) * 0.13;
          p.y += (targetY - p.y) * 0.13;
          p.z += (targetZ - p.z) * 0.13;
          dummy.position.set(p.x, p.y, p.z);
          dummy.lookAt(center.x, center.y, p.z);
          dummy.rotateX(Math.PI / 2);
          var pulse = (0.72 + Math.sin(elapsed * 4.2 + p.phase) * 0.2) * p.variance;
          dummy.scale.set(pulse, pulse, pulse);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
        mesh.rotation.z = elapsed * 0.035;
        renderer.render(scene, camera);
      }

      raf = requestAnimationFrame(frame);
    }

    function destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      pointerTarget.removeEventListener('pointermove', pointerMove);
      if (geometry) geometry.dispose();
      if (material) material.dispose();
      if (renderer) renderer.dispose();
      overlay.remove();
      document.body.classList.remove('ag-transition-lock');
      document.body.classList.remove('ag-has-antigravity');
      if (activeScene && activeScene.overlay === overlay) activeScene = null;
    }

    window.addEventListener('resize', resize, { passive: true });
    requestAnimationFrame(function () { overlay.classList.add('is-active'); });
    if (canRender) raf = requestAnimationFrame(frame);

    activeScene = { overlay: overlay, destroy: destroy };
    return activeScene;
  }

  function launch(href, options) {
    if (activeScene || !href) return;
    options = options || {};
    var x = Number.isFinite(options.x) ? options.x : window.innerWidth / 2;
    var y = Number.isFinite(options.y) ? options.y : window.innerHeight / 2;
    var label = options.label || 'Project Detail';

    try {
      sessionStorage.setItem('portfolio:antigravity-entry', JSON.stringify({
        x: x / window.innerWidth,
        y: y / window.innerHeight,
        label: label
      }));
    } catch (error) { }

    makeScene({ mode: 'launch', x: x, y: y, label: label });
    window.setTimeout(function () { window.location.href = href; }, 1080);
  }

  function arrive() {
    var data = null;
    try {
      data = JSON.parse(sessionStorage.getItem('portfolio:antigravity-entry') || 'null');
      sessionStorage.removeItem('portfolio:antigravity-entry');
    } catch (error) { }
    if (!data) return false;

    var sceneControl = makeScene({
      mode: 'arrive',
      x: clamp(data.x || 0.5, 0, 1) * window.innerWidth,
      y: clamp(data.y || 0.5, 0, 1) * window.innerHeight,
      label: data.label || 'Project Detail'
    });
    window.setTimeout(function () {
      if (sceneControl && sceneControl.overlay) sceneControl.overlay.classList.add('is-releasing');
    }, 180);
    window.setTimeout(function () {
      if (sceneControl) sceneControl.destroy();
    }, 980);
    return true;
  }

  function bindLinks(selector) {
    document.querySelectorAll(selector).forEach(function (link) {
      if (link.dataset.antigravityBound === 'true') return;
      link.dataset.antigravityBound = 'true';
      link.addEventListener('click', function (event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var href = link.getAttribute('href');
        if (!href) return;
        event.preventDefault();
        var rect = link.getBoundingClientRect();
        var title = link.querySelector('.pc-shot-title, .proj-nav-name');
        launch(href, {
          x: Number.isFinite(event.clientX) && event.clientX > 0 ? event.clientX : rect.left + rect.width / 2,
          y: Number.isFinite(event.clientY) && event.clientY > 0 ? event.clientY : rect.top + Math.min(rect.height, window.innerHeight) / 2,
          label: title ? title.textContent.trim() : 'Project Detail'
        });
      });
    });
  }

  function mountBackground(options) {
    options = options || {};
    return makeScene({
      mode: 'background',
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.38,
      count: options.count || (window.innerWidth < 700 ? 140 : 230),
      color: options.color || 0x4f85f7
    });
  }

  window.addEventListener('pageshow', function (event) {
    if (event.persisted && activeScene && !activeScene.overlay.classList.contains('ag-background')) disposeActive();
  });

  window.AntigravityTransition = {
    launch: launch,
    arrive: arrive,
    bindLinks: bindLinks,
    mountBackground: mountBackground,
    destroy: disposeActive
  };
})();
