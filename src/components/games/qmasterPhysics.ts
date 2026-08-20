// Shared freehand-draw + gravity simulation helpers for the "Queue Master
// Games" tab — every level in that tab draws a line and lets a small
// hand-rolled physics step resolve it, inspired by (not copied from) Q
// Remastered's "draw anything, gravity solves it" hook.

import type { PointerEvent } from "react";

export const GRAVITY = 620; // px/s^2
export const BALL_R = 10;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function closestOnSegment(px: number, py: number, seg: Segment): Point {
  const abx = seg.x2 - seg.x1;
  const aby = seg.y2 - seg.y1;
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : clamp(((px - seg.x1) * abx + (py - seg.y1) * aby) / lenSq, 0, 1);
  return { x: seg.x1 + abx * t, y: seg.y1 + aby * t };
}

export function pathToSegments(path: Point[]): Segment[] {
  return path.slice(0, -1).map((p, i) => ({ x1: p.x, y1: p.y, x2: path[i + 1].x, y2: path[i + 1].y }));
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// Advances a ball one physics step against static rect obstacles and the
// player's drawn line segments. Mutates nothing — returns the next state.
export function stepBall(ball: Ball, dt: number, obstacles: Rect[], segments: Segment[], bounds: { left: number; right: number }): Ball {
  let { x, y, vx, vy } = ball;
  vy += GRAVITY * dt;
  x += vx * dt;
  y += vy * dt;

  if (x - BALL_R < bounds.left) { x = bounds.left + BALL_R; vx *= -0.4; }
  if (x + BALL_R > bounds.right) { x = bounds.right - BALL_R; vx *= -0.4; }

  for (const o of obstacles) {
    const cx = clamp(x, o.x, o.x + o.w);
    const cy = clamp(y, o.y, o.y + o.h);
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < BALL_R) {
      const nx = dist === 0 ? 0 : dx / dist;
      const ny = dist === 0 ? -1 : dy / dist;
      x += nx * (BALL_R - dist);
      y += ny * (BALL_R - dist);
      const vn = vx * nx + vy * ny;
      vx = (vx - 1.6 * vn * nx) * 0.9;
      vy = (vy - 1.6 * vn * ny) * 0.9;
    }
  }

  for (const seg of segments) {
    const cp = closestOnSegment(x, y, seg);
    const dx = x - cp.x;
    const dy = y - cp.y;
    const dist = Math.hypot(dx, dy);
    if (dist < BALL_R) {
      const nx = dist === 0 ? 0 : dx / dist;
      const ny = dist === 0 ? -1 : dy / dist;
      x += nx * (BALL_R - dist);
      y += ny * (BALL_R - dist);
      const vn = vx * nx + vy * ny;
      vx = (vx - 1.6 * vn * nx) * 0.85;
      vy = (vy - 1.6 * vn * ny) * 0.85;
    }
  }

  return { x, y, vx, vy };
}

export function svgPoint(e: PointerEvent<SVGSVGElement>, width: number, height: number): Point {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * width,
    y: ((e.clientY - rect.top) / rect.height) * height,
  };
}
