"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PreviewPanelProps {
  code: string | null;
  isGenerating?: boolean;
  isMobile?: boolean;
}

export default function PreviewPanel({ code, isGenerating, isMobile }: PreviewPanelProps) {
  const [showScene, setShowScene] = useState(false);
  const [displayCode, setDisplayCode] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [inXR, setInXR] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBlobUrlRef = useRef<string | null>(null);

  useEffect(function () {
    if (code && code !== displayCode) {
      setShowScene(false);
      var timeout = setTimeout(function () {
        setDisplayCode(code);
        setShowScene(true);
      }, 300);
      return function () { clearTimeout(timeout); };
    }
    if (!code && displayCode) {
      setShowScene(false);
      setDisplayCode(null);
    }
  }, [code, displayCode]);

  // Convert HTML to blob URL for proper WebXR support
  useEffect(function () {
    if (!displayCode) {
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
      setBlobUrl(null);
      return;
    }

    var injected = injectBaseHref(injectXRMode(injectARPlacement(injectQuickLookAR(injectMoveListener(displayCode)))));
    var blob = new Blob([injected], { type: "text/html" });
    var url = URL.createObjectURL(blob);

    // Revoke previous blob URL
    if (prevBlobUrlRef.current) {
      URL.revokeObjectURL(prevBlobUrlRef.current);
    }
    prevBlobUrlRef.current = url;
    setBlobUrl(url);

    return function () {
      // Don't revoke here — let the next render handle it
      // to avoid revoking while iframe is still loading
    };
  }, [displayCode]);

  // Ensure a-scene has XR mode UI, webxr features, and ar-hit-test config
  function injectXRMode(html: string): string {
    var result = html;
    result = result.replace(/\s+vr-mode-ui="[^"]*"/gi, '');
    result = result.replace(/\s+xr-mode-ui="[^"]*"/gi, '');
    result = result.replace(/\s+ar-hit-test="[^"]*"/gi, '');
    result = result.replace(/\s+webxr="[^"]*"/gi, '');
    result = result.replace(/<a-scene/i,
      '<a-scene xr-mode-ui="XRMode: xr"' +
      ' webxr="requiredFeatures: local-floor; optionalFeatures: hand-tracking, hit-test, layers, dom-overlay, anchors"');
    return result;
  }

  // Inject custom AR placement component + ar-root wrapper + XR postMessage
  function injectARPlacement(html: string): string {
    var arScript = '<script>\n' +
      '(function(){\n' +
      '  if(typeof AFRAME!=="undefined"&&!AFRAME.components["ar-place"]){\n' +
      '    AFRAME.registerComponent("ar-place",{\n' +
      '      init:function(){this.placed=false;this.hitTestSource=null;this.reticle=null;\n' +
      '        var self=this,scene=this.el;\n' +
      '        scene.addEventListener("enter-vr",function(){if(!scene.is("ar-mode"))return;self.startAR();});\n' +
      '        scene.addEventListener("exit-vr",function(){self.stopAR();});\n' +
      '      },\n' +
      '      startAR:function(){\n' +
      '        var scene=this.el;this.placed=false;\n' +
      '        var ct=document.getElementById("scene-content"),rt=document.getElementById("ar-root");\n' +
      '        var sk=document.getElementById("sky"),gd=document.getElementById("ground");\n' +
      '        if(ct)ct.setAttribute("scale","0.2 0.2 0.2");\n' +
      '        if(sk)sk.setAttribute("visible",false);if(gd)gd.setAttribute("visible",false);\n' +
      '        if(rt)rt.object3D.visible=false;\n' +
      '        this.reticle=document.createElement("a-entity");\n' +
      '        this.reticle.setAttribute("geometry","primitive:ring;radiusInner:0.08;radiusOuter:0.1");\n' +
      '        this.reticle.setAttribute("material","color:white;shader:flat;opacity:0.8");\n' +
      '        this.reticle.setAttribute("rotation","-90 0 0");this.reticle.object3D.visible=false;\n' +
      '        scene.appendChild(this.reticle);var self=this;\n' +
      '        var session=scene.renderer.xr.getSession();if(!session)return;\n' +
      '        session.requestReferenceSpace("viewer").then(function(vs){\n' +
      '          return session.requestHitTestSource({space:vs});\n' +
      '        }).then(function(src){self.hitTestSource=src;})\n' +
      '        .catch(function(){if(rt)rt.object3D.visible=true;});\n' +
      '        session.addEventListener("select",function onSel(){\n' +
      '          if(self.placed)return;self.placed=true;session.removeEventListener("select",onSel);\n' +
      '          if(rt&&self.reticle&&self.reticle.object3D.visible){\n' +
      '            var p=self.reticle.object3D.position;rt.object3D.position.set(p.x,p.y,p.z);}\n' +
      '          if(rt)rt.object3D.visible=true;\n' +
      '          if(self.reticle&&self.reticle.parentNode){self.reticle.parentNode.removeChild(self.reticle);self.reticle=null;}\n' +
      '          if(self.hitTestSource){self.hitTestSource.cancel();self.hitTestSource=null;}\n' +
      '        });\n' +
      '      },\n' +
      '      stopAR:function(){\n' +
      '        var ct=document.getElementById("scene-content"),rt=document.getElementById("ar-root");\n' +
      '        var sk=document.getElementById("sky"),gd=document.getElementById("ground");\n' +
      '        if(ct)ct.setAttribute("scale","1 1 1");\n' +
      '        if(rt){rt.object3D.visible=true;rt.object3D.position.set(0,0,0);}\n' +
      '        if(sk)sk.setAttribute("visible",true);if(gd)gd.setAttribute("visible",true);\n' +
      '        if(this.reticle&&this.reticle.parentNode){this.reticle.parentNode.removeChild(this.reticle);this.reticle=null;}\n' +
      '        if(this.hitTestSource){this.hitTestSource.cancel();this.hitTestSource=null;}\n' +
      '        this.placed=false;\n' +
      '      },\n' +
      '      tick:function(){\n' +
      '        if(this.placed||!this.hitTestSource||!this.reticle)return;\n' +
      '        var frame=this.el.frame;if(!frame)return;\n' +
      '        var ref=this.el.renderer.xr.getReferenceSpace();if(!ref)return;\n' +
      '        try{var r=frame.getHitTestResults(this.hitTestSource);\n' +
      '          if(r.length>0){var pose=r[0].getPose(ref);if(pose){\n' +
      '            this.reticle.object3D.visible=true;var p=pose.transform.position;\n' +
      '            this.reticle.object3D.position.set(p.x,p.y,p.z);\n' +
      '          }}\n' +
      '        }catch(e){}\n' +
      '      }\n' +
      '    });\n' +
      '  }\n' +
      '  function setup(){\n' +
      '    var scene=document.querySelector("a-scene");if(!scene)return;\n' +
      '    if(!document.getElementById("ar-root")){\n' +
      '      var ar=document.createElement("a-entity");ar.id="ar-root";\n' +
      '      var sc=document.createElement("a-entity");sc.id="scene-content";ar.appendChild(sc);\n' +
      '      var mv=[];for(var i=0;i<scene.children.length;i++){\n' +
      '        var c=scene.children[i];if(!c.tagName)continue;var t=c.tagName.toLowerCase();\n' +
      '        if(t==="a-sky"||c.id==="rig"||c.id==="sky"||t==="a-assets"||t==="canvas")continue;mv.push(c);}\n' +
      '      for(var j=0;j<mv.length;j++)sc.appendChild(mv[j]);scene.insertBefore(ar,scene.firstChild);}\n' +
      '    scene.setAttribute("ar-place","");\n' +
      '    scene.addEventListener("enter-vr",function(){window.parent.postMessage({type:"xr-enter"},"*");});\n' +
      '    scene.addEventListener("exit-vr",function(){window.parent.postMessage({type:"xr-exit"},"*");});\n' +
      '  }\n' +
      '  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();\n' +
      '})();\n' +
      '</script>';
    return html.replace('</body>', arScript + '\n</body>');
  }

  // Inject iOS AR Quick Look fallback (USDZ export) for devices without WebXR AR
  function injectQuickLookAR(html: string): string {
    var importmap = '<script type="importmap">\n' +
      '{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"}}\n' +
      '</script>';
    var css = '<style>\n' +
      '#ios-ar-btn {\n' +
      '  position: fixed; bottom: 16px; right: 16px; z-index: 999999;\n' +
      '  display: none;\n' +
      '  padding: 10px 16px; border-radius: 8px;\n' +
      '  background: rgba(0,0,0,0.7); color: white; font-size: 14px;\n' +
      '  border: 1px solid rgba(255,255,255,0.3);\n' +
      '  backdrop-filter: blur(6px); cursor: pointer;\n' +
      '}\n' +
      '</style>';
    var arScript = '<button id="ios-ar-btn">View in AR</button>\n' +
      '<script type="module">\n' +
      '(async function(){\n' +
      '  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||\n' +
      '    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);\n' +
      '  if (!isIOS) return;\n' +
      '  var hasXR = false;\n' +
      '  if (navigator.xr && navigator.xr.isSessionSupported) {\n' +
      '    try { hasXR = await navigator.xr.isSessionSupported("immersive-ar"); } catch(e) {}\n' +
      '    if (!hasXR) { try { hasXR = await navigator.xr.isSessionSupported("immersive-vr"); } catch(e) {} }\n' +
      '  }\n' +
      '  if (hasXR) return;\n' +
      '  var btn = document.getElementById("ios-ar-btn");\n' +
      '  if (btn) btn.style.display = "block";\n' +
      '  btn.addEventListener("click", async function() {\n' +
      '    btn.textContent = "Preparing AR\\u2026";\n' +
      '    btn.disabled = true;\n' +
      '    try {\n' +
      '      var { USDZExporter } = await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/exporters/USDZExporter.js");\n' +
      '      var scene = document.querySelector("a-scene");\n' +
      '      var exporter = new USDZExporter();\n' +
      '      var exportGroup = new THREE.Group();\n' +
      '      scene.object3D.children.forEach(function(child) {\n' +
      '        exportGroup.add(child.clone(true));\n' +
      '      });\n' +
      '      exportGroup.scale.set(0.05, 0.05, 0.05);\n' +
      '      var toRm=[];\n' +
      '      exportGroup.traverse(function(o){if(!o.isMesh)return;var g=o.geometry;if(!g||!g.parameters)return;\n' +
      '        if((g.type==="PlaneGeometry"||g.type==="PlaneBufferGeometry")&&(g.parameters.width>10||g.parameters.height>10))toRm.push(o);\n' +
      '        if((g.type==="SphereGeometry"||g.type==="SphereBufferGeometry")&&g.parameters.radius>50)toRm.push(o);});\n' +
      '      toRm.forEach(function(o){if(o.parent)o.parent.remove(o);});\n' +
      '      var exportWrapper = new THREE.Scene();\n' +
      '      exportWrapper.add(exportGroup);\n' +
      '      exportWrapper.updateMatrixWorld(true);\n' +
      '      var buffer = await exporter.parse(exportWrapper);\n' +
      '      var blob = new Blob([buffer], { type: "model/vnd.usdz+zip" });\n' +
      '      var url = URL.createObjectURL(blob);\n' +
      '      var a = document.createElement("a");\n' +
      '      a.rel = "ar";\n' +
      '      a.href = url;\n' +
      '      var img = document.createElement("img");\n' +
      '      a.appendChild(img);\n' +
      '      document.body.appendChild(a);\n' +
      '      a.click();\n' +
      '      setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1000);\n' +
      '    } catch(e) {\n' +
      '      console.error("AR export failed:", e);\n' +
      '      btn.textContent = "AR unavailable";\n' +
      '    }\n' +
      '    btn.textContent = "View in AR";\n' +
      '    btn.disabled = false;\n' +
      '  });\n' +
      '})();\n' +
      '</script>';
    var result = html.replace('</head>', importmap + '\n' + css + '\n</head>');
    result = result.replace('</body>', arScript + '\n</body>');
    return result;
  }

  // Inject <base href> so relative paths (/models/...) resolve against the app origin
  function injectBaseHref(html: string): string {
    return html.replace('<head>', '<head>\n<base href="' + window.location.origin + '/">');
  }

  // Inject a postMessage listener into the scene HTML so we can control movement from React
  function injectMoveListener(html: string): string {
    var moveScript = '<script>\n' +
      'window.addEventListener("message", function(e) {\n' +
      '  if (!e.data || e.data.type !== "move") return;\n' +
      '  var rig = document.getElementById("rig");\n' +
      '  var cam = document.querySelector("[camera]");\n' +
      '  if (!rig || !cam) return;\n' +
      '  var rot = cam.object3D.rotation;\n' +
      '  var pos = rig.getAttribute("position");\n' +
      '  var speed = 0.15;\n' +
      '  var dir = e.data.dir;\n' +
      '  if (dir === "forward") {\n' +
      '    pos.x -= Math.sin(rot.y) * speed;\n' +
      '    pos.z -= Math.cos(rot.y) * speed;\n' +
      '  } else if (dir === "back") {\n' +
      '    pos.x += Math.sin(rot.y) * speed;\n' +
      '    pos.z += Math.cos(rot.y) * speed;\n' +
      '  } else if (dir === "left") {\n' +
      '    pos.x -= Math.cos(rot.y) * speed;\n' +
      '    pos.z += Math.sin(rot.y) * speed;\n' +
      '  } else if (dir === "right") {\n' +
      '    pos.x += Math.cos(rot.y) * speed;\n' +
      '    pos.z -= Math.sin(rot.y) * speed;\n' +
      '  }\n' +
      '  rig.setAttribute("position", pos);\n' +
      '});\n' +
      '</script>';
    return html.replace('</body>', moveScript + '\n</body>');
  }

  var startMove = useCallback(function (dir: string) {
    if (moveIntervalRef.current) return;
    function sendMove() {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'move', dir: dir }, '*');
      }
    }
    sendMove();
    moveIntervalRef.current = setInterval(sendMove, 33);
  }, []);

  var stopMove = useCallback(function () {
    if (moveIntervalRef.current) {
      clearInterval(moveIntervalRef.current);
      moveIntervalRef.current = null;
    }
  }, []);

  useEffect(function () {
    return function () {
      if (moveIntervalRef.current) clearInterval(moveIntervalRef.current);
    };
  }, []);

  // Listen for XR enter/exit from iframe to hide/show D-pad
  useEffect(function () {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data.type !== 'string') return;
      if (e.data.type === 'xr-enter') setInXR(true);
      if (e.data.type === 'xr-exit') setInXR(false);
    }
    window.addEventListener('message', onMessage);
    return function () { window.removeEventListener('message', onMessage); };
  }, []);

  if (!displayCode || (isGenerating && !code)) {
    return (
      <div className="mesh-bg flex h-full flex-col items-center justify-center gap-4">
        <div className="text-center">
          {isGenerating ? (
            <>
              <div className="mb-3 animate-gentle-pulse text-4xl">✦</div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Building your experience...
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                Your 3D scene will appear here
              </p>
            </>
          ) : (
            <>
              <div className="mb-3 text-5xl opacity-15 animate-slow-spin">✦</div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
                Your scene will appear here
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>
                Describe any scene and watch it come to life
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {blobUrl && (
        <iframe
          ref={iframeRef}
          src={blobUrl}
          allow="xr-spatial-tracking; camera; gyroscope; accelerometer"
          className="h-full w-full border-0 transition-opacity duration-300"
          style={{ opacity: showScene ? 1 : 0, touchAction: "none" }}
          title="A-Frame Preview"
        />
      )}

      {isMobile && !inXR && (
        <div className="absolute bottom-[80px] left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {[
            { dir: "left", label: "←" },
            { dir: "forward", label: "↑" },
            { dir: "back", label: "↓" },
            { dir: "right", label: "→" },
          ].map(function (btn) {
            return (
              <button
                key={btn.dir}
                onTouchStart={function (e) { e.preventDefault(); startMove(btn.dir); }}
                onTouchEnd={stopMove}
                onTouchCancel={stopMove}
                onMouseDown={function () { startMove(btn.dir); }}
                onMouseUp={stopMove}
                onMouseLeave={stopMove}
                className="flex items-center justify-center w-12 h-12 rounded-full border-2 select-none active:bg-white/20"
                style={{
                  borderColor: "rgba(255,255,255,0.4)",
                  backgroundColor: "rgba(0,0,0,0.35)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                  color: "white",
                  fontSize: "18px",
                  touchAction: "none",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="pointer-events-none absolute top-3 left-3 rounded-md border px-2 py-1 text-[10px] font-medium uppercase tracking-wider"
           style={{
             backgroundColor: "rgba(0,0,0,0.5)",
             borderColor: "rgba(255,255,255,0.15)",
             color: "rgba(255,255,255,0.7)",
             backdropFilter: "blur(4px)",
           }}>
        Live Preview
      </div>
    </div>
  );
}
