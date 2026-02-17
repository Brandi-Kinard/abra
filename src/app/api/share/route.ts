import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

function injectEnhancements(html: string): string {
  // CSS goes in <head> or before </head>
  // D-pad is display:flex by default, JS hides it on desktop
  var css = `
<style>
#dpad-wrap {
  position: fixed !important;
  bottom: 24px !important;
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

  // ---- AR mode: hide sky and make ground transparent ----
  function setupAR() {
    var scene = document.querySelector('a-scene');
    if (!scene) return;
    scene.addEventListener('enter-vr', function() {
      if (scene.is('ar-mode')) {
        var sky = document.getElementById('sky');
        var ground = document.getElementById('ground');
        if (sky) sky.setAttribute('visible', false);
        if (ground) ground.setAttribute('material', 'opacity', 0.2);
        var dpad = document.getElementById('dpad-wrap');
        if (dpad) dpad.classList.add('dpad-hidden');
      }
    });
    scene.addEventListener('exit-vr', function() {
      var sky = document.getElementById('sky');
      var ground = document.getElementById('ground');
      if (sky) sky.setAttribute('visible', true);
      if (ground) ground.setAttribute('material', 'opacity', 1);
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

  var result = html;

  // Inject CSS into <head>
  var headClose = result.toLowerCase().indexOf('</head>');
  if (headClose !== -1) {
    result = result.slice(0, headClose) + css + '\n' + result.slice(headClose);
  } else {
    result = css + '\n' + result;
  }

  // Inject D-pad and scripts before </body>
  var bodyClose = result.toLowerCase().lastIndexOf('</body>');
  if (bodyClose !== -1) {
    result = result.slice(0, bodyClose) + dpadAndScripts + '\n' + result.slice(bodyClose);
  } else {
    var htmlClose = result.toLowerCase().lastIndexOf('</html>');
    if (htmlClose !== -1) {
      result = result.slice(0, htmlClose) + dpadAndScripts + '\n' + result.slice(htmlClose);
    } else {
      result = result + dpadAndScripts;
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
