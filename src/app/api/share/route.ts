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
    ' webxr="requiredFeatures: local-floor; optionalFeatures: hand-tracking, hit-test, layers, dom-overlay, anchors"' +
    ' ar-hit-test="target: #ar-root; type: map; mapSize: 0.3 0.3"');
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
      // Move all scene children except sky, camera rig, assets into wrapper
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

    scene.addEventListener('enter-vr', function() {
      // Hide D-pad in any immersive mode (AR or VR)
      var dpad = document.getElementById('dpad-wrap');
      if (dpad) dpad.classList.add('dpad-hidden');
      // AR-specific: scale down for table-top, hide sky/ground
      if (!scene.is('ar-mode')) return;
      var content = document.getElementById('scene-content');
      var arRoot = document.getElementById('ar-root');
      var sky = document.getElementById('sky');
      var ground = document.getElementById('ground');
      if (content) content.setAttribute('scale', '0.05 0.05 0.05');
      if (sky) sky.setAttribute('visible', false);
      if (ground) ground.setAttribute('visible', false);
    });
    scene.addEventListener('exit-vr', function() {
      // Restore D-pad on exit
      var dpad = document.getElementById('dpad-wrap');
      if (dpad) {
        var hasTouchScreen = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (hasTouchScreen) dpad.classList.remove('dpad-hidden');
      }
      // Restore AR state
      var content = document.getElementById('scene-content');
      var arRoot = document.getElementById('ar-root');
      var sky = document.getElementById('sky');
      var ground = document.getElementById('ground');
      if (content) content.setAttribute('scale', '1 1 1');
      if (sky) sky.setAttribute('visible', true);
      if (ground) ground.setAttribute('visible', true);
    });
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
      var exportScene = scene.object3D.clone(true);
      exportScene.scale.set(0.1, 0.1, 0.1);
      exportScene.updateMatrixWorld(true);
      var buffer = await exporter.parse(exportScene);
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
