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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const moveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  var injectedCode = injectMoveListener(displayCode);

  return (
    <div className="relative h-full w-full">
      <iframe
        ref={iframeRef}
        srcDoc={injectedCode}
        allow="xr-spatial-tracking; camera; gyroscope; accelerometer"
        className="h-full w-full border-0 transition-opacity duration-300"
        style={{ opacity: showScene ? 1 : 0, touchAction: "none" }}
        title="A-Frame Preview"
      />

      {isMobile && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex gap-2">
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

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border px-2 py-1 text-[10px] font-medium uppercase tracking-wider"
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
