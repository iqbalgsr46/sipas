"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "next-themes";

interface DayData {
  label: string;
  total: number;
}

/** Catmull-Rom → Cubic Bezier conversion for smooth organic curves */
function catmullRomToBezier(pts: { x: number; y: number }[], tension = 0.4): string {
  if (pts.length < 2) return "";

  // Duplicate endpoints to handle edge cases
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M ${pts[0].x},${pts[0].y}`;

  for (let i = 1; i < pts.length; i++) {
    const p0 = p[i - 1];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2];

    const cp1x = p1.x + ((p2.x - p0.x) * tension) / 2;
    const cp1y = p1.y + ((p2.y - p0.y) * tension) / 2;
    const cp2x = p2.x - ((p3.x - p1.x) * tension) / 2;
    const cp2y = p2.y - ((p3.y - p1.y) * tension) / 2;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

export default function RealtimeChart() {
  const [liveCount, setLiveCount] = useState(0);
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [avgDaily, setAvgDaily] = useState(0);
  const [avgWeekly, setAvgWeekly] = useState(0);
  const [avgMonthly, setAvgMonthly] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const [pulse, setPulse] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // SVG colors based on theme
  const svgColors = {
    tooltipBg: isDark ? "#1d2939" : "#ffffff",
    tooltipBorder: isDark ? "#344054" : "#e2e8f0",
    tooltipText: isDark ? "#94a3b8" : "#475569",
    tooltipTextStrong: isDark ? "#e2e8f0" : "#1e293b",
    labelBg: isDark ? "#1d2939" : "#f1f5f9",
    labelBorder: isDark ? "#344054" : "#cbd5e1",
    labelText: isDark ? "#94a3b8" : "#334155",
    dashLine: isDark ? "#475467" : "#94a3b8",
    dotStroke: isDark ? "#111827" : "white",
  };

  useEffect(() => {
    fetchChartData();

    const channel = supabase
      .channel("realtime_surat_activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "surat_masuk" }, () => {
        setLiveCount((c) => c + 1);
        setPulse(true);
        setTimeout(() => setPulse(false), 900);
        fetchChartData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "surat_keluar" }, () => {
        setLiveCount((c) => c + 1);
        setPulse(true);
        setTimeout(() => setPulse(false), 900);
        fetchChartData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchChartData() {
    try {
      const days: DayData[] = [];
      const now = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(d);   end.setHours(23, 59, 59, 999);
        const label = d.toLocaleDateString("id-ID", { weekday: "short" });

        const [{ count: masuk }, { count: keluar }] = await Promise.all([
          supabase.from("surat_masuk").select("*", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
          supabase.from("surat_keluar").select("*", { count: "exact", head: true }).gte("created_at", start.toISOString()).lte("created_at", end.toISOString()),
        ]);

        days.push({ label, total: (masuk || 0) + (keluar || 0) });
      }

      setChartData(days);

      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const [{ count: todayMasuk }, { count: todayKeluar }] = await Promise.all([
        supabase.from("surat_masuk").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
        supabase.from("surat_keluar").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
      ]);
      setLiveCount((todayMasuk || 0) + (todayKeluar || 0));

      const dailyAvg = Math.round(days.reduce((s, d) => s + d.total, 0) / 7);
      setAvgDaily(dailyAvg);
      setAvgWeekly(dailyAvg * 7);
      setAvgMonthly(dailyAvg * 30);
    } catch { /* silently fail */ }
  }

  // Build SVG sparkline path
  const width = 500;
  const height = 150;
  const padX = 10;
  const topPad = 40;  // Room for top tooltip
  const botPad = 26;  // Room for bottom x-axis label

  const maxVal = Math.max(...chartData.map((d) => d.total), 5); // Ensure some variation even if low
  const maxAxisVal = maxVal * 1.2;

  const points = chartData.map((d, i) => {
    const x = padX + (i / Math.max(chartData.length - 1, 1)) * (width - padX * 2);
    const y = topPad + (1 - d.total / maxAxisVal) * (height - topPad - botPad);
    return { x, y, ...d, i };
  });

  const linePath = catmullRomToBezier(points, 0.25);
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x},${height - botPad} L ${points[0].x},${height - botPad} Z`
      : "";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6 md:p-8 flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[17px] font-bold text-slate-800 dark:text-white">Aktivitas Surat</h3>
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 transition-colors">
          <span className="material-symbols-outlined text-[20px]">more_vert</span>
        </button>
      </div>

      {/* Live Count */}
      <div className="flex items-center gap-3 mb-2">
        <div className="relative flex items-center justify-center w-[34px] h-[34px] rounded-full bg-red-100 dark:bg-red-500/20">
          <span className={`absolute w-2.5 h-2.5 rounded-full bg-red-400 opacity-75 ${pulse ? "animate-ping" : ""}`} />
          <span className="relative w-2.5 h-2.5 rounded-full bg-red-500" />
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="text-[38px] font-bold text-slate-900 dark:text-white leading-none tracking-tight">{liveCount}</span>
          <span className="text-[15px] font-medium text-slate-500 dark:text-slate-400">Surat hari ini</span>
        </div>
      </div>

      {/* Smooth Wave Chart */}
      <div
        className="relative -mx-4 overflow-visible"
        onMouseLeave={() => { setTooltip(null); setHoveredIdx(null); }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          style={{ maxHeight: 180 }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="sipas-wave-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#465FFF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#465FFF" stopOpacity="0.0" />
            </linearGradient>
            <filter id="shadow-sm" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* Area fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#sipas-wave-grad)"
              style={{ transition: "d 0.5s ease-in-out" }}
            />
          )}

          {/* Smooth line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#465FFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: "d 0.5s ease-in-out" }}
            />
          )}

          {/* Invisible hover columns */}
          {points.map((p, i) => {
            const segW = width / Math.max(chartData.length, 1);
            return (
              <rect
                key={`hover-${i}`}
                x={p.x - segW / 2}
                y={0}
                width={segW}
                height={height}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => {
                  setHoveredIdx(i);
                  setTooltip({ x: p.x, y: p.y, label: p.label, value: p.total });
                }}
              />
            );
          })}

          {/* Hover states */}
          <g 
            className="transition-opacity duration-300 ease-out" 
            style={{ opacity: hoveredIdx !== null ? 1 : 0, pointerEvents: "none" }}
          >
            {(() => {
              // Gunakan point terakhir yang di-hover (atau point 0) agar SVG tidak error
              const p = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : points[0] || {x:0, y:0, label:'', total:0};
              const axisY = height - botPad + 12;
              return (
                <>
                  {/* Dashed line spanning from top to bottom axis */}
                  <line
                    x1={p.x} y1={10} x2={p.x} y2={axisY}
                    stroke={svgColors.dashLine} strokeWidth="1"
                    strokeDasharray="4 3"
                    style={{ transition: "all 0.3s cubic-bezier(0.25, 1, 0.5, 1)" }}
                  />
                  
                  {/* Point dot on the curve */}
                  <circle 
                    cx={p.x} cy={p.y} r="4.5" fill="#465FFF" stroke={svgColors.dotStroke} strokeWidth="2.5" filter="url(#shadow-sm)" 
                    style={{ transition: "all 0.3s cubic-bezier(0.25, 1, 0.5, 1)" }}
                  />

                  {/* X-axis label box (Bottom) */}
                  <g 
                    style={{ 
                      transform: `translate(${p.x}px, ${axisY}px)`,
                      transition: "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)"
                    }}
                  >
                    {/* Caret pointing up */}
                    <path d="M -4,5 L 0,1 L 4,5 Z" fill={svgColors.labelBg} stroke={svgColors.labelBorder} strokeWidth="1" />
                    {/* Rectangle body */}
                    <rect x="-18" y="4" width="36" height="20" rx="3" fill={svgColors.labelBg} stroke={svgColors.labelBorder} strokeWidth="1" />
                    {/* Hide inner stroke line under caret */}
                    <path d="M -3,5 L 3,5" stroke={svgColors.labelBg} strokeWidth="2" />
                    <text x="0" y="18" textAnchor="middle" fontSize="10.5" fill={svgColors.labelText} fontWeight="500">
                      {p.label}
                    </text>
                  </g>

                  {/* Tooltip box (Top right offset) */}
                  <g 
                    style={{ 
                      transform: `translate(${Math.min(p.x + 12, width - 96)}px, ${Math.max(p.y - 35, 10)}px)`,
                      transition: "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)"
                    }}
                  >
                    <rect x="0" y="0" width="88" height="48" rx="6" fill={svgColors.tooltipBg} stroke={svgColors.tooltipBorder} strokeWidth="1" filter="url(#shadow-sm)" />
                    <text x="12" y="18" fontSize="11" fill={svgColors.tooltipText} fontWeight="500">
                      {p.label}
                    </text>
                    <circle cx="16" cy="34" r="4" fill="#465FFF" />
                    <text x="26" y="38" fontSize="11.5" fill={svgColors.tooltipText} fontWeight="400">
                      Surat: <tspan fontWeight="600" fill={svgColors.tooltipTextStrong} className="ml-0.5">{p.total}</tspan>
                    </text>
                  </g>
                </>
              );
            })()}
          </g>
        </svg>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex flex-col items-center min-w-[90px]">
          <p className="text-[20px] md:text-[22px] font-bold text-slate-900 dark:text-white leading-none mb-1.5">{avgDaily}</p>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">Rata-rata, Harian</p>
        </div>
        <div className="w-px h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div className="flex flex-col items-center min-w-[90px]">
          <p className="text-[20px] md:text-[22px] font-bold text-slate-900 dark:text-white leading-none mb-1.5">{avgWeekly}</p>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">Rata-rata, Mingguan</p>
        </div>
        <div className="w-px h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div className="flex flex-col items-center min-w-[90px]">
          <p className="text-[20px] md:text-[22px] font-bold text-slate-900 dark:text-white leading-none mb-1.5">{avgMonthly}</p>
          <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">Rata-rata, Bulanan</p>
        </div>
      </div>
    </div>
  );
}
