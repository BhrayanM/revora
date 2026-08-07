import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MotionWrapperProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  once?: boolean;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.5,
}: MotionWrapperProps) {
  const style: CSSProperties = {
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    animationFillMode: "both",
  };

  return (
    <div className={cn("animate-fade-in", className)} style={style}>
      {children}
    </div>
  );
}

export function SlideUp({
  children,
  className,
  delay = 0,
  duration = 0.5,
}: MotionWrapperProps) {
  const style: CSSProperties = {
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    animationFillMode: "both",
  };

  return (
    <div className={cn("animate-slide-up", className)} style={style}>
      {children}
    </div>
  );
}

export function ScaleIn({
  children,
  className,
  delay = 0,
  duration = 0.4,
}: MotionWrapperProps) {
  const style: CSSProperties = {
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    animationFillMode: "both",
  };

  return (
    <div className={cn("animate-scale-in", className)} style={style}>
      {children}
    </div>
  );
}

interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerChildren({
  children,
  className,
  staggerDelay = 0.1,
}: StaggerChildrenProps) {
  return (
    <div
      className={cn(className)}
      style={{ "--stagger-delay": `${staggerDelay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
