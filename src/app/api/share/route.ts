import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

function injectEnhancements(html: string): string {
  // Mobile D-pad controls + AR mode sky/ground hiding
  var injection = `
<style>
#dpad-controls {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999999;
  display: none;
  gap: 8px;
  pointer-events: auto;
}
#dpad-controls button {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.5);
  background: rgba(0,0,0,0.45);
  color: white;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
}
#dpad-controls button:active {
  background: rgba(100,100,255,0.6);
  border-color: rgba(100,100,255,0.9);
}
@media (hover: none) and (pointer: coarse) {
  #dpad-controls { display: flex !important; }
}
</style>
<div id="dpad-controls">
  <button data-dir="l">&#8592;</button>
  <button data-dir="f">&#8593;</button>
  <button data-dir="b">&#8595;</button>
  <button data-dir="r">&#8594;</button>
</div>
<script>
(function(){
  var speed = 0.15, interval = null;
  function getRig() { return document.getElementById('rig'); }
  function getCam() { return document.querySelector('[camera]'); }
  function move(dir) {
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
  function startMove(dir) { if (interval) return; move(dir); interval = setInterval(function() { move(dir); }, 33); }
  function stopMove() { clearInterval(interval); interval = null; }

  function initDpad() {
    var btns = document.querySelectorAll('#dpad-controls button');
    btns.forEach(function(btn) {
      var dir = btn.getAttribute('data-dir');
      btn.addEventListener('touchstart', function(e) { e.preventDefault(); e.stopPropagation(); startMove(dir); }, {passive: false});
      btn.addEventListener('touchend', function(e) { e.stopPropagation(); stopMove(); });
      btn.addEventListener('touchcancel', function(e) { e.stopPropagation(); stopMove(); });
      btn.addEventListener('mousedown', function(e) { e.stopPropagation(); startMove(dir); });
      btn.addEventListener('mouseup', function(e) { e.stopPropagation(); stopMove(); });
    });
  }

  // AR mode: hide sky and make ground semi-transparent
  function setupAR() {
    var scene = document.querySelector('a-scene');
    if (!scene) return;
    scene.addEventListener('enter-vr', function() {
      if (scene.is('ar-mode')) {
        var sky = document.getElementById('sky');
        var ground = document.getElementById('ground');
        if (sky) sky.setAttribute('visible', false);
        if (ground) ground.setAttribute('material', 'opacity', 0.2);
      }
    });
    scene.addEventListener('exit-vr', function() {
      var sky = document.getElementById('sky');
      var ground = document.getElementById('ground');
      if (sky) sky.setAttribute('visible', true);
      if (ground) ground.setAttribute('material', 'opacity', 1);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { initDpad(); setupAR(); });
  } else {
    initDpad();
    setupAR();
  }
})();
</script>`;

  // Inject before </body>, </html>, or append
  var lower = html.toLowerCase();
  if (lower.indexOf('</body>') !== -1) {
    return html.replace(/<\/body>/i, injection + '\n</body>');
  } else if (lower.indexOf('</html>') !== -1) {
    return html.replace(/<\/html>/i, injection + '\n</html>');
  }
  return html + injection;
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
