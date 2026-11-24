import { useMemo, useState } from "react";
import { ChartLine } from "lucide-react";
import type { Range, SeriesPoint } from "@/lib/stats";
import { RANGES } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Panel, SectionHeader } from "@/components/ui/primitives";

const SERIES = [
  { key: "projects" as const, label: "Projects", color: "#a855f7" },
  { key: "scripts" as const, label: "Scripts", color: "#22d3ee" },
  { key: "content" as const, label: "Content", color: "#34d399" },
];

const W = 640;
const H = 210;
const PAD = { top: 14, right: 12, bottom: 24, left: 28 };

function buildPath(values: number[], max: number): string {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = values.length > 1 ? innerW / (values.length - 1) : innerW;
  const points = values.map((v, i) => ({
    x: PAD.left + i * step,
    y: PAD.top + innerH - (max === 0 ? 0 : (v / max) * innerH),
  }));
  if (!points.length) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export function PerformanceChart({
  points,
  range,
  onRange,
  hasData,
}: {
  points: SeriesPoint[];
  range: Range;
  onRange: (r: Range) => void;
  hasData: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => {
    const peak = Math.max(1, ...points.map((p) => Math.max(p.projects, p.scripts, p.content)));
    return Math.ceil(peak / 4) * 4;
  }, [points]);

  const innerW = W - PAD.left - PAD.right;
  const step = points.length > 1 ? innerW / (points.length - 1) : innerW;
  const tickStep = Math.max(1, Math.floor(points.length / 6));

  return (
    <Panel className="p-4">
      <SectionHeader
        icon={<ChartLine size={16} />}
        title="Your Content Performance"
        subtitle="Created items from your saved workspace"
        right={
          <div className="flex rounded-lg border border-[#2a1e4d] bg-[#080414]/80 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRange(r)}
                className={cn(
                  "rounded-md px-2 py-1 text-[10.5px] font-semibold transition",
                  r === range ? "bg-brand-gradient text-white shadow-glow-sm" : "text-[#8e86b1] hover:text-white",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[10.5px] text-[#a29ac4]">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="relative mt-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[170px] w-full sm:h-[196px]" role="img" aria-label="Content performance line chart">
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {[0, 1, 2, 3, 4].map((i) => {
            const y = PAD.top + ((H - PAD.top - PAD.bottom) / 4) * i;
            const value = Math.round((max / 4) * (4 - i));
            return (
              <g key={i}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#231a44" strokeWidth="1" />
                <text x={PAD.left - 7} y={y + 3} textAnchor="end" fontSize="8" fill="#6f679a">
                  {value}
                </text>
              </g>
            );
          })}

          {SERIES.map((s) => {
            const values = points.map((p) => p[s.key]);
            const d = buildPath(values, max);
            if (!d) return null;
            const last = values[values.length - 1];
            const x = PAD.left + (values.length - 1) * step;
            return (
              <g key={s.key}>
                <path d={`${d} L ${x} ${H - PAD.bottom} L ${PAD.left} ${H - PAD.bottom} Z`} fill={`url(#area-${s.key})`} />
                <path d={d} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" opacity={0.95} />
                <circle cx={x} cy={PAD.top + (H - PAD.top - PAD.bottom) - (max ? (last / max) * (H - PAD.top - PAD.bottom) : 0)} r="3" fill={s.color} stroke="#0b0619" strokeWidth="1.5" />
              </g>
            );
          })}

          {points.map((p, i) =>
            i % tickStep === 0 ? (
              <text key={`${p.label}-${i}`} x={PAD.left + i * step} y={H - 6} textAnchor="middle" fontSize="8.5" fill="#6f679a">
                {p.label}
              </text>
            ) : null,
          )}

          {hover !== null && (
            <line
              x1={PAD.left + hover * step}
              y1={PAD.top}
              x2={PAD.left + hover * step}
              y2={H - PAD.bottom}
              stroke="#8b5cf6"
              strokeDasharray="3 3"
              strokeWidth="1"
              opacity="0.6"
            />
          )}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={innerW}
            height={H - PAD.top - PAD.bottom}
            fill="transparent"
            onMouseMove={(e) => {
              const rect = (e.target as SVGRectElement).getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              setHover(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))));
            }}
            onMouseLeave={() => setHover(null)}
          />
        </svg>

        {!hasData && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            <p className="text-[12px] font-medium text-[#c2bbdd]">No activity in this range yet</p>
            <p className="max-w-[230px] text-[10.5px] leading-relaxed text-[#7c749f]">
              Saved projects, scripts and content appear here. Nothing is added automatically.
            </p>
          </div>
        )}

        {hover !== null && points[hover] && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-[128px] rounded-lg border border-[#322559] bg-[#0b0619]/95 p-2 text-[10.5px] shadow-xl"
            style={{ left: `calc(${((PAD.left + hover * step) / W) * 100}% - 60px)` }}
          >
            <p className="mb-1 font-semibold text-white">{points[hover].label}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-3 text-[#a29ac4]">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="font-mono text-white">{points[hover][s.key]}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
