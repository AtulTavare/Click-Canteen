import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';
import { Clock } from 'lucide-react';

interface AnalogClockPickerProps {
  value: string; // HH:mm in 24h
  onChange: (value: string) => void;
}

export default function AnalogClockPicker({ value, onChange }: AnalogClockPickerProps) {
  const [internalHour, setInternalHour] = useState(12);
  const [internalMinute, setInternalMinute] = useState(0);
  const [isPM, setIsPM] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  const [activeHand, setActiveHand] = useState<'hour' | 'minute' | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        setIsPM(h >= 12);
        setInternalHour(h % 12 === 0 ? 12 : h % 12);
        setInternalMinute(m);
      }
    } else if (!initialized) {
      // Default to now + 30 mins
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      const h = now.getHours();
      const m = now.getMinutes();
      setIsPM(h >= 12);
      setInternalHour(h % 12 === 0 ? 12 : h % 12);
      setInternalMinute(m);
      
      const hhStr = h.toString().padStart(2, '0');
      const mmStr = m.toString().padStart(2, '0');
      onChange(`${hhStr}:${mmStr}`);
      setInitialized(true);
    }
  }, [value, onChange, initialized]);

  const updateTime = (h: number, m: number, pm: boolean) => {
    let hh = pm ? (h % 12) + 12 : (h % 12);
    const hhStr = hh.toString().padStart(2, '0');
    const mmStr = m.toString().padStart(2, '0');
    onChange(`${hhStr}:${mmStr}`);
  };

  const setPM = (pm: boolean) => {
    setIsPM(pm);
    updateTime(internalHour, internalMinute, pm);
  };

  // Drag logic
  const handlePointerDown = (e: React.PointerEvent<SVGElement>, hand: 'hour' | 'minute') => {
    e.stopPropagation();
    setActiveHand(hand);
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!activeHand || !svgRef.current) return;
    
    // SVG coordinate space
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    
    if (!cursorPt) return;

    // SVG center is at 50,50 (for viewBox 0 0 100 100)
    const dx = cursorPt.x - 50;
    const dy = cursorPt.y - 50;
    
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    
    if (activeHand === 'hour') {
      let h = Math.round(angle / 30);
      if (h === 0) h = 12;
      if (h !== internalHour) {
        setInternalHour(h);
        updateTime(h, internalMinute, isPM);
      }
    } else if (activeHand === 'minute') {
      let m = Math.round(angle / 6);
      if (m === 60) m = 0;
      if (m !== internalMinute) {
        setInternalMinute(m);
        updateTime(internalHour, m, isPM);
      }
    }
  };

  const handlePointerUp = () => {
    setActiveHand(null);
  };

  // Convert angles to SVG coordinates
  function getCoordinatesForAngle(angle: number, length: number, cx = 50, cy = 50) {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: cx + length * Math.cos(rad),
      y: cy + length * Math.sin(rad)
    };
  }

  const hourAngle = (internalHour % 12) * 30 + (internalMinute / 60) * 30;
  const hourCoords = getCoordinatesForAngle(hourAngle, 22);

  const minuteAngle = internalMinute * 6;
  const minuteCoords = getCoordinatesForAngle(minuteAngle, 35);

  const timeStr = `${internalHour}:${internalMinute.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;

  return (
    <div className="flex flex-col items-center select-none touch-none bg-slate-50 rounded-[2rem] p-6 shadow-sm">
      {/* Readable Time */}
      <h3 className="text-4xl font-black text-slate-800 mb-6 tracking-tight">{timeStr}</h3>
      
      {/* Clock SVG */}
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="w-56 h-56 max-w-full drop-shadow-sm mb-8 bg-white rounded-full border-[6px] border-slate-100 touch-none shadow-inner"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Clock Face Numbers */}
        {[...Array(12)].map((_, i) => {
          const num = i === 0 ? 12 : i;
          const pos = getCoordinatesForAngle(i * 30, 40);
          const isMain = num % 3 === 0;
          return (
            <text
              key={i}
              x={pos.x}
              y={pos.y}
              dominantBaseline="central"
              textAnchor="middle"
              className={cn("pointer-events-none fill-current focus:outline-none", isMain ? "font-bold text-[8px] text-slate-900" : "font-medium text-[6px] text-slate-400")}
            >
              {num}
            </text>
          );
        })}

        {/* Center Dot */}
        <circle cx="50" cy="50" r="2.5" className="fill-purple-600 pointer-events-none z-20 relative" />

        {/* Hour Hand */}
        <g 
          className="cursor-pointer outline-none"
          onPointerDown={(e) => handlePointerDown(e, 'hour')}
        >
          {/* Visible line */}
          <line 
            x1="50" y1="50" x2={hourCoords.x} y2={hourCoords.y} 
            className="stroke-slate-800 transition-colors" strokeWidth="3.5" strokeLinecap="round" 
            style={{ stroke: activeHand === 'hour' ? '#9333ea' : '#1e293b' }}
          />
          {/* Thicker invisible line for touch target */}
          <line 
            x1="50" y1="50" x2={hourCoords.x} y2={hourCoords.y} 
            className="stroke-transparent hover:stroke-purple-600/20 transition-colors" strokeWidth="16" strokeLinecap="round" 
          />
        </g>

        {/* Minute Hand */}
        <g 
          className="cursor-pointer outline-none"
          onPointerDown={(e) => handlePointerDown(e, 'minute')}
        >
          {/* Visible line */}
          <line 
            x1="50" y1="50" x2={minuteCoords.x} y2={minuteCoords.y} 
            className="stroke-purple-600" strokeWidth="2.5" strokeLinecap="round" 
            style={{ stroke: activeHand === 'minute' ? '#a855f7' : '#9333ea' }}
          />
          {/* Thicker invisible line for touch target */}
          <line 
            x1="50" y1="50" x2={minuteCoords.x} y2={minuteCoords.y} 
            className="stroke-transparent hover:stroke-purple-600/20 transition-colors" strokeWidth="16" strokeLinecap="round" 
          />
        </g>
        
        {/* Decorative center cap over hands */}
        <circle cx="50" cy="50" r="1.5" className="fill-white pointer-events-none" />
      </svg>

      {/* AM/PM Toggle */}
      <div className="flex bg-white p-1.5 rounded-2xl w-full max-w-[200px] mb-6 shadow-sm border border-slate-100">
        <button 
          onClick={() => setPM(false)}
          className={cn("flex-1 py-2.5 rounded-xl font-black text-sm transition-all", !isPM ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          AM
        </button>
        <button 
          onClick={() => setPM(true)}
          className={cn("flex-1 py-2.5 rounded-xl font-black text-sm transition-all", isPM ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}
        >
          PM
        </button>
      </div>

      {/* Manual Input field */}
      <div className="w-full relative mt-2">
        <label className="absolute -top-2 left-4 px-1 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest z-10">Manual Edit</label>
        <input 
          type="time"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white px-5 py-4 font-black text-slate-800 outline-none rounded-2xl border-2 border-slate-100 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-center text-lg shadow-inner"
        />
      </div>
    </div>
  );
}
