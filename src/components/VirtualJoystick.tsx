import React, { useRef, useState } from 'react';

interface VirtualJoystickProps {
  onMove: (dx: number, dy: number) => void;
  onJump: () => void;
  onInteract: () => void;
  nearbyLabel: string | null;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  onJump,
  onInteract,
  nearbyLabel
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const maxRadius = 42;

  const updateFromClientXY = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    setKnobPos({ x: dx, y: dy });
    onMove(dx / maxRadius, dy / maxRadius);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    updateFromClientXY(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    e.stopPropagation();
    updateFromClientXY(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div className="fixed inset-x-0 bottom-24 z-20 pointer-events-none flex items-end justify-between px-5 sm:px-8">
      {/* Left Virtual Joystick for Roblox-style 3D Avatar Movement */}
      <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
        <div
          ref={containerRef}
          role="slider"
          aria-label="Joystick Pergerakan Avatar 3D"
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-valuenow={Math.round((knobPos.x / maxRadius) * 100)}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-28 h-28 rounded-full bg-slate-900/85 border-2 border-sky-400/50 shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        >
          {/* Directional arrows on joystick base */}
          <span className="absolute top-1.5 text-[10px] font-bold text-sky-300/70">▲</span>
          <span className="absolute bottom-1.5 text-[10px] font-bold text-sky-300/70">▼</span>
          <span className="absolute left-2 text-[10px] font-bold text-sky-300/70">◀</span>
          <span className="absolute right-2 text-[10px] font-bold text-sky-300/70">▶</span>

          {/* Inner ring */}
          <div className="w-14 h-14 rounded-full border border-slate-700/80" />

          {/* Draggable Thumb Stick */}
          <div
            style={{
              transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`
            }}
            className={`w-12 h-12 rounded-full border-2 transition-transform duration-75 flex items-center justify-center shadow-md ${
              active
                ? 'bg-amber-400 border-white text-slate-950 scale-105'
                : 'bg-sky-500 border-sky-200 text-white'
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v20M2 12h20" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <span className="text-[11px] font-semibold tracking-wide text-slate-300 bg-slate-900/90 px-2.5 py-0.5 rounded border border-slate-700">
          JOYSTICK / WASD
        </span>
      </div>

      {/* Right Action Buttons (Interact with Station + Jump) */}
      <div className="flex items-end gap-3 pointer-events-auto">
        {nearbyLabel && (
          <button
            type="button"
            onClick={onInteract}
            className="px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-lg border-2 border-amber-200 transition-transform active:scale-95 whitespace-nowrap shrink-0 flex items-center gap-2"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Buka: {nearbyLabel} [E]</span>
          </button>
        )}

        <button
          type="button"
          aria-label="Lompat Avatar"
          onClick={onJump}
          className="w-16 h-16 rounded-full bg-slate-900/90 hover:bg-slate-800 border-2 border-amber-400/70 text-amber-300 font-bold text-xs shadow-lg flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-95 shrink-0"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px]">LOMPAT</span>
        </button>
      </div>
    </div>
  );
};
