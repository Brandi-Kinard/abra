import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

function injectXRMode(html: string): string {
  var result = html;
  // Remove old vr-mode-ui attribute (superseded by xr-mode-ui in A-Frame 1.6+)
  result = result.replace(/\s+vr-mode-ui="[^"]*"/gi, '');
  // Remove any existing xr-mode-ui to avoid duplicates
  result = result.replace(/\s+xr-mode-ui="[^"]*"/gi, '');
  // Remove any existing ar-hit-test to avoid duplicates
  result = result.replace(/\s+ar-hit-test="[^"]*"/gi, '');
  // Remove any existing webxr to ensure anchors is included
  result = result.replace(/\s+webxr="[^"]*"/gi, '');
  // Add all XR attributes
  result = result.replace(/<a-scene/i,
    '<a-scene xr-mode-ui="XRMode: xr"' +
    ' webxr="requiredFeatures: local-floor; optionalFeatures: hand-tracking, hit-test, layers, dom-overlay, anchors"');
  return result;
}

function injectEnhancements(html: string): string {
  // CSS goes in <head> or before </head>
  // D-pad is display:flex by default, JS hides it on desktop
  var css = `
<style>
#dpad-wrap {
  position: fixed !important;
  bottom: 80px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  z-index: 999999 !important;
  display: flex !important;
  gap: 8px !important;
  pointer-events: auto !important;
  -webkit-user-select: none !important;
  user-select: none !important;
}
#dpad-wrap.dpad-hidden {
  display: none !important;
}
#dpad-wrap .dp {
  width: 56px !important;
  height: 56px !important;
  border-radius: 50% !important;
  border: 2px solid rgba(255,255,255,0.5) !important;
  background: rgba(0,0,0,0.5) !important;
  color: white !important;
  font-size: 22px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  backdrop-filter: blur(6px) !important;
  -webkit-backdrop-filter: blur(6px) !important;
  touch-action: none !important;
  cursor: pointer !important;
  padding: 0 !important;
  margin: 0 !important;
  line-height: 1 !important;
}
#dpad-wrap .dp:active {
  background: rgba(100,100,255,0.6) !important;
  border-color: rgba(100,100,255,0.9) !important;
}
#ios-ar-btn {
  position: fixed; bottom: 16px; right: 16px; z-index: 999999;
  display: none;
  padding: 10px 16px; border-radius: 8px;
  background: rgba(0,0,0,0.7); color: white; font-size: 14px;
  border: 1px solid rgba(255,255,255,0.3);
  backdrop-filter: blur(6px); cursor: pointer;
}
</style>`;

  // D-pad HTML + movement script + AR mode script
  var dpadAndScripts = `
<div id="dpad-wrap">
  <button class="dp" data-dir="l">&#8592;</button>
  <button class="dp" data-dir="f">&#8593;</button>
  <button class="dp" data-dir="b">&#8595;</button>
  <button class="dp" data-dir="r">&#8594;</button>
</div>
<script>
(function(){
  // ---- Touch detection: hide D-pad on non-touch devices ----
  var dpadEl = document.getElementById('dpad-wrap');
  if (dpadEl) {
    // Start hidden, show on first touch OR if touchscreen detected
    dpadEl.classList.add('dpad-hidden');
    var hasTouchScreen = ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0);
    if (hasTouchScreen) {
      dpadEl.classList.remove('dpad-hidden');
    }
    // Fallback: show on first touch event
    window.addEventListener('touchstart', function showDpad() {
      dpadEl.classList.remove('dpad-hidden');
      window.removeEventListener('touchstart', showDpad);
    }, {once: true, passive: true});
  }

  // ---- Movement ----
  var speed = 0.15, moveInterval = null;

  function getRig() { return document.getElementById('rig'); }
  function getCam() { return document.querySelector('[camera]'); }

  function doMove(dir) {
    var rig = getRig(), cam = getCam();
    if (!rig || !cam) return;
    var rot = cam.object3D.rotation;
    var pos = rig.getAttribute('position');
    var p = {x: pos.x, y: pos.y, z: pos.z};
    if (dir === 'f') { p.x -= Math.sin(rot.y) * speed; p.z -= Math.cos(rot.y) * speed; }
    else if (dir === 'b') { p.x += Math.sin(rot.y) * speed; p.z += Math.cos(rot.y) * speed; }
    else if (dir === 'l') { p.x -= Math.cos(rot.y) * speed; p.z += Math.sin(rot.y) * speed; }
    else if (dir === 'r') { p.x += Math.cos(rot.y) * speed; p.z -= Math.sin(rot.y) * speed; }
    rig.setAttribute('position', p);
  }

  function startM(dir) {
    if (moveInterval) return;
    doMove(dir);
    moveInterval = setInterval(function() { doMove(dir); }, 33);
  }
  function stopM() { clearInterval(moveInterval); moveInterval = null; }

  function initDpad() {
    var btns = document.querySelectorAll('#dpad-wrap .dp');
    if (!btns.length) { setTimeout(initDpad, 500); return; }
    btns.forEach(function(btn) {
      var dir = btn.getAttribute('data-dir');
      btn.addEventListener('touchstart', function(e) {
        e.preventDefault(); e.stopPropagation(); startM(dir);
      }, {passive: false, capture: true});
      btn.addEventListener('touchend', function(e) {
        e.stopPropagation(); stopM();
      }, {capture: true});
      btn.addEventListener('touchcancel', function(e) {
        e.stopPropagation(); stopM();
      }, {capture: true});
      btn.addEventListener('mousedown', function(e) {
        e.stopPropagation(); startM(dir);
      });
      btn.addEventListener('mouseup', function(e) {
        e.stopPropagation(); stopM();
      });
    });
  }

  // ---- Custom AR placement component (replaces ar-hit-test) ----
  if (typeof AFRAME !== 'undefined' && !AFRAME.components['ar-place']) {
    AFRAME.registerComponent('ar-place', {
      init: function() {
        this.placed = false; this.hitTestSource = null; this.reticle = null;
        var self = this; var scene = this.el;
        scene.addEventListener('enter-vr', function() {
          var dpad = document.getElementById('dpad-wrap');
          if (dpad) dpad.classList.add('dpad-hidden');
          if (!scene.is('ar-mode')) return;
          self.startAR();
        });
        scene.addEventListener('exit-vr', function() { self.stopAR(); });
      },
      startAR: function() {
        var scene = this.el; this.placed = false;
        var ct = document.getElementById('scene-content');
        var rt = document.getElementById('ar-root');
        var sk = document.getElementById('sky');
        var gd = document.getElementById('ground');
        if (ct) ct.setAttribute('scale', '0.2 0.2 0.2');
        if (sk) sk.setAttribute('visible', false);
        if (gd) gd.setAttribute('visible', false);
        if (rt) rt.object3D.visible = false;
        this.reticle = document.createElement('a-entity');
        this.reticle.setAttribute('geometry', 'primitive: ring; radiusInner: 0.08; radiusOuter: 0.1');
        this.reticle.setAttribute('material', 'color: white; shader: flat; opacity: 0.8');
        this.reticle.setAttribute('rotation', '-90 0 0');
        this.reticle.object3D.visible = false;
        scene.appendChild(this.reticle);
        var self = this;
        var session = scene.renderer.xr.getSession();
        if (!session) return;
        session.requestReferenceSpace('viewer').then(function(vs) {
          return session.requestHitTestSource({space: vs});
        }).then(function(src) { self.hitTestSource = src; })
        .catch(function() { if (rt) rt.object3D.visible = true; });
        session.addEventListener('select', function onSel() {
          if (self.placed) return; self.placed = true;
          session.removeEventListener('select', onSel);
          if (rt && self.reticle && self.reticle.object3D.visible) {
            var p = self.reticle.object3D.position;
            rt.object3D.position.set(p.x, p.y, p.z);
          }
          if (rt) rt.object3D.visible = true;
          if (self.reticle && self.reticle.parentNode) { self.reticle.parentNode.removeChild(self.reticle); self.reticle = null; }
          if (self.hitTestSource) { self.hitTestSource.cancel(); self.hitTestSource = null; }
        });
      },
      stopAR: function() {
        var ct = document.getElementById('scene-content');
        var rt = document.getElementById('ar-root');
        var sk = document.getElementById('sky');
        var gd = document.getElementById('ground');
        var dpad = document.getElementById('dpad-wrap');
        if (ct) ct.setAttribute('scale', '1 1 1');
        if (rt) { rt.object3D.visible = true; rt.object3D.position.set(0,0,0); }
        if (sk) sk.setAttribute('visible', true);
        if (gd) gd.setAttribute('visible', true);
        if (dpad) { var ht = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0); if (ht) dpad.classList.remove('dpad-hidden'); }
        if (this.reticle && this.reticle.parentNode) { this.reticle.parentNode.removeChild(this.reticle); this.reticle = null; }
        if (this.hitTestSource) { this.hitTestSource.cancel(); this.hitTestSource = null; }
        this.placed = false;
      },
      tick: function() {
        if (this.placed || !this.hitTestSource || !this.reticle) return;
        var frame = this.el.frame;
        if (!frame) return;
        var ref = this.el.renderer.xr.getReferenceSpace();
        if (!ref) return;
        try {
          var results = frame.getHitTestResults(this.hitTestSource);
          if (results.length > 0) {
            var pose = results[0].getPose(ref);
            if (pose) {
              this.reticle.object3D.visible = true;
              var p = pose.transform.position;
              this.reticle.object3D.position.set(p.x, p.y, p.z);
            }
          }
        } catch(e) {}
      }
    });
  }

  // ---- AR surface placement setup ----
  function setupAR() {
    var scene = document.querySelector('a-scene');
    if (!scene) return;

    // If scene lacks ar-root wrapper (old template), create it dynamically
    if (!document.getElementById('ar-root')) {
      var arRoot = document.createElement('a-entity');
      arRoot.id = 'ar-root';
      var sceneContent = document.createElement('a-entity');
      sceneContent.id = 'scene-content';
      arRoot.appendChild(sceneContent);
      var toMove = [];
      for (var i = 0; i < scene.children.length; i++) {
        var child = scene.children[i];
        if (!child.tagName) continue;
        var tag = child.tagName.toLowerCase();
        if (tag === 'a-sky' || child.id === 'rig' || child.id === 'sky' ||
            tag === 'a-assets' || tag === 'canvas') continue;
        toMove.push(child);
      }
      for (var j = 0; j < toMove.length; j++) {
        sceneContent.appendChild(toMove[j]);
      }
      scene.insertBefore(arRoot, scene.firstChild);
    }

    // Add custom AR placement component
    scene.setAttribute('ar-place', '');
  }

  // ---- Wait for scene to be ready ----
  var sceneEl = document.querySelector('a-scene');
  if (sceneEl && sceneEl.hasLoaded) {
    initDpad(); setupAR();
  } else if (sceneEl) {
    sceneEl.addEventListener('loaded', function() { initDpad(); setupAR(); });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      var s = document.querySelector('a-scene');
      if (s) {
        if (s.hasLoaded) { initDpad(); setupAR(); }
        else s.addEventListener('loaded', function() { initDpad(); setupAR(); });
      }
    });
  }
})();
</script>`;

  var importmap = '<script type="importmap">\n' +
    '{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}\n' +
    '</script>';

  var iosARButton = `
<button id="ios-ar-btn">View in AR</button>
<script type="module">
(async function(){
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!isIOS) return;
  var hasXR = false;
  if (navigator.xr && navigator.xr.isSessionSupported) {
    try { hasXR = await navigator.xr.isSessionSupported('immersive-ar'); } catch(e) {}
    if (!hasXR) { try { hasXR = await navigator.xr.isSessionSupported('immersive-vr'); } catch(e) {} }
  }
  if (hasXR) return;
  var btn = document.getElementById('ios-ar-btn');
  if (btn) btn.style.display = 'block';
  btn.addEventListener('click', async function() {
    btn.textContent = 'Preparing AR\\u2026';
    btn.disabled = true;
    try {
      var { USDZExporter } = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/exporters/USDZExporter.js');
      var scene = document.querySelector('a-scene');
      var exporter = new USDZExporter();
      var exportGroup = new THREE.Group();
      scene.object3D.children.forEach(function(child) {
        exportGroup.add(child.clone(true));
      });
      exportGroup.scale.set(0.05, 0.05, 0.05);
      // Remove ground plane and sky from export
      var toRemove = [];
      exportGroup.traverse(function(obj) {
        if (!obj.isMesh) return;
        var geo = obj.geometry;
        if (!geo || !geo.parameters) return;
        if ((geo.type === 'PlaneGeometry' || geo.type === 'PlaneBufferGeometry') && (geo.parameters.width > 10 || geo.parameters.height > 10)) toRemove.push(obj);
        if ((geo.type === 'SphereGeometry' || geo.type === 'SphereBufferGeometry') && geo.parameters.radius > 50) toRemove.push(obj);
      });
      toRemove.forEach(function(obj) { if (obj.parent) obj.parent.remove(obj); });
      var exportWrapper = new THREE.Scene();
      exportWrapper.add(exportGroup);
      exportWrapper.updateMatrixWorld(true);
      var buffer = await exporter.parse(exportWrapper);
      var blob = new Blob([buffer], { type: 'model/vnd.usdz+zip' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.rel = 'ar';
      a.href = url;
      var img = document.createElement('img');
      a.appendChild(img);
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1000);
    } catch(e) {
      console.error('AR export failed:', e);
      btn.textContent = 'AR unavailable';
    }
    btn.textContent = 'View in AR';
    btn.disabled = false;
  });
})();
</script>`;

  var result = injectXRMode(html);

  // Inject importmap + CSS into <head>
  var headClose = result.toLowerCase().indexOf('</head>');
  if (headClose !== -1) {
    result = result.slice(0, headClose) + importmap + '\n' + css + '\n' + result.slice(headClose);
  } else {
    result = importmap + '\n' + css + '\n' + result;
  }

  // Inject D-pad, iOS AR button, and scripts before </body>
  var bodyClose = result.toLowerCase().lastIndexOf('</body>');
  if (bodyClose !== -1) {
    result = result.slice(0, bodyClose) + dpadAndScripts + '\n' + iosARButton + '\n' + result.slice(bodyClose);
  } else {
    var htmlClose = result.toLowerCase().lastIndexOf('</html>');
    if (htmlClose !== -1) {
      result = result.slice(0, htmlClose) + dpadAndScripts + '\n' + iosARButton + '\n' + result.slice(htmlClose);
    } else {
      result = result + dpadAndScripts + '\n' + iosARButton;
    }
  }

  return result;
}

export async function POST(request: Request) {
  try {
    var body = await request.json();
    var html = body.html as string;

    if (!html) {
      return NextResponse.json({ error: "No HTML provided" }, { status: 400 });
    }

    var enhancedHtml = injectEnhancements(html);

    var id = nanoid(10);
    var pathname = "scenes/" + id + ".html";
    var blob = await put(pathname, enhancedHtml, {
      access: "public",
      contentType: "text/html",
    });

    return NextResponse.json({ url: "/scene/" + id, blobUrl: blob.url });
  } catch (error) {
    console.error("Share failed:", error);
    return NextResponse.json({ error: "Share failed" }, { status: 500 });
  }
}
