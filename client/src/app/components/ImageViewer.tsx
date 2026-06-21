import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

/* Full-screen image viewer with zoom (buttons + scroll), drag-to-pan, and
   optional prev/next when multiple images are passed. Renders into a portal
   so it overlays everything. Close via X, backdrop click, or Escape. */
export function ImageViewer({
  images,
  startIndex = 0,
  onClose,
}: {
  images: string[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ active: boolean; x: number; y: number; ox: number; oy: number }>({
    active: false, x: 0, y: 0, ox: 0, oy: 0,
  });

  const MIN = 1, MAX = 5, STEP = 0.5;
  const reset = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, []);
  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX, +(z + STEP).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => {
    const n = Math.max(MIN, +(z - STEP).toFixed(2));
    if (n === MIN) setOffset({ x: 0, y: 0 });
    return n;
  }), []);
  const prev = useCallback(() => { setIndex((i) => (i - 1 + images.length) % images.length); reset(); }, [images.length, reset]);
  const next = useCallback(() => { setIndex((i) => (i + 1) % images.length); reset(); }, [images.length, reset]);

  // Keyboard shortcuts + lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && images.length > 1) prev();
      else if (e.key === "ArrowRight" && images.length > 1) next();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-" || e.key === "_") zoomOut();
      else if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; };
  }, [images.length, onClose, prev, next, zoomIn, zoomOut, reset]);

  const onWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) zoomIn(); else zoomOut();
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    drag.current = { active: true, x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    setOffset({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) });
  };
  const onPointerUp = () => { drag.current.active = false; };

  const btn: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 9999,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)",
    cursor: "pointer", backdropFilter: "blur(6px)",
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Toolbar */}
      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8, zIndex: 2 }}>
        <button title="Zoom out (-)" onClick={zoomOut} style={btn}><ZoomOut className="w-5 h-5" /></button>
        <button title="Reset (0)" onClick={reset} style={btn}><RotateCcw className="w-[18px] h-[18px]" /></button>
        <button title="Zoom in (+)" onClick={zoomIn} style={btn}><ZoomIn className="w-5 h-5" /></button>
        <button title="Close (Esc)" onClick={onClose} style={btn}><X className="w-5 h-5" /></button>
      </div>

      {/* Zoom level badge */}
      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 22, left: 16, color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600 }}>
        {Math.round(zoom * 100)}%{images.length > 1 ? `  ·  ${index + 1} / ${images.length}` : ""}
      </div>

      {/* Prev / next */}
      {images.length > 1 && (
        <>
          <button title="Previous (←)" onClick={(e) => { e.stopPropagation(); prev(); }} style={{ ...btn, position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button title="Next (→)" onClick={(e) => { e.stopPropagation(); next(); }} style={{ ...btn, position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)" }}>
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Image */}
      <img
        src={images[index]}
        alt=""
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onDoubleClick={() => (zoom > 1 ? reset() : setZoom(2))}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          maxWidth: "92vw", maxHeight: "88vh", objectFit: "contain",
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transition: drag.current.active ? "none" : "transform 0.15s ease-out",
          cursor: zoom > 1 ? (drag.current.active ? "grabbing" : "grab") : "zoom-in",
          touchAction: "none", userSelect: "none",
        }}
      />
    </div>,
    document.body
  );
}
