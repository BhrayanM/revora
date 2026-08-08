"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  className?: string;
}

export function BarChart({ data, height = 200, className }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn("flex items-end gap-3", className)} style={{ height }}>
      {maxValue === 0 && (
        <div className="flex w-full items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">No data yet</p>
        </div>
      )}
      {maxValue > 0 &&
        data.map((item) => (
          <div
            key={item.label}
            className="flex flex-1 flex-col items-center gap-1.5 justify-end h-full"
          >
            <span className="text-xs font-medium text-muted-foreground">
              {item.value}
            </span>
            <div
              className="w-full rounded-t-md transition-all duration-500"
              style={{
                height: `${(item.value / maxValue) * 80}%`,
                backgroundColor: item.color || "var(--color-primary)",
                opacity: 0.85,
              }}
            />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
    </div>
  );
}

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  className?: string;
}

export function LineChart({
  data,
  height = 200,
  color = "var(--color-primary)",
  className,
}: LineChartProps) {
  const gradientId = useId();
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data
    .map((item, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((item.value - minValue) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ height, width: "100%" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={`url(#${gradientId})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between">
        {data.map((item) => (
          <span key={item.label} className="text-xs text-muted-foreground">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface DonutChartProps {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  className?: string;
}

export function DonutChart({
  segments,
  size = 160,
  className,
}: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  const slices = segments.reduce(
    (acc, segment) => {
      const prevPercent = acc.cumulativePercent;
      const percent = (segment.value / total) * 100;
      const newCumulative = prevPercent + percent;

      const startAngle = (prevPercent / 100) * 360;
      const endAngle = (newCumulative / 100) * 360;

      const startRad = ((startAngle - 90) * Math.PI) / 180;
      const endRad = ((endAngle - 90) * Math.PI) / 180;

      const r = 40;
      const cx = 50;
      const cy = 50;

      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);

      const largeArc = percent > 50 ? 1 : 0;

      acc.slices.push({
        path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        color: segment.color,
        label: segment.label,
        value: segment.value,
        percent,
      });

      return { slices: acc.slices, cumulativePercent: newCumulative };
    },
    {
      slices: [] as {
        path: string;
        color: string;
        label: string;
        value: number;
        percent: number;
      }[],
      cumulativePercent: 0,
    },
  ).slices;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
        {slices.map((slice) => (
          <path
            key={slice.label}
            d={slice.path}
            fill={slice.color}
            className="transition-all duration-300 hover:opacity-80"
          />
        ))}
        <circle cx="50" cy="50" r="25" fill="var(--surface)" />
        <text
          x="50"
          y="48"
          textAnchor="middle"
          className="fill-foreground text-sm font-bold"
          fontSize="8"
        >
          {total}
        </text>
        <text
          x="50"
          y="56"
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="5"
        >
          Leads
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div
              className="size-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-xs text-muted-foreground">
              {s.label} ({s.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
