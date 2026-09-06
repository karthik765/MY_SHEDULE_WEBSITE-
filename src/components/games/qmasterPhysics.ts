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

// Projects a point onto a segment (clamped to its extent), and also reports
// where the *unclamped* projection actually fell (rawT — negative before
// the start, >1 past the end) and the segment's own unit tangent, so the
// caller can tell a genuine face hit apart from a corner/endpoint hit and
// know which way the line points there.
interface Projection extends Point {
  rawT: number;
  tx: number;
  ty: number;
}
function projectOnSegment(px: number, py: number, seg: Segment): Projection {
  const abx = seg.x2 - seg.x1;
  const aby = seg.y2 - seg.y1;
  const len = Math.hypot(abx, aby);
  const lenSq = abx * abx + aby * aby;
  const rawT = lenSq === 0 ? 0 : ((px - seg.x1) * abx + (py - seg.y1) * aby) / lenSq;
  const t = clamp(rawT, 0, 1);
  return {
    x: seg.x1 + abx * t,
    y: seg.y1 + aby * t,
    rawT,
    tx: len === 0 ? 0 : abx / len,
    ty: len === 0 ? 0 : aby / len,
  };
}

export function pathToSegments(path: Point[]): Segment[] {
  return path.slice(0, -1).map((p, i) => ({ x1: p.x, y1: p.y, x2: path[i + 1].x, y2: path[i + 1].y }));
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  // How long (seconds) the ball has been in contact with something while
  // moving too slowly to be "rolling" — see the stall-escape check in
  // stepBall. Threaded through frame to frame; callers never set it.
  stuckT?: number;
}

// Resolves a ball/surface contact by sliding it along the surface's tangent
// instead of bouncing it off the normal. A pure normal-reflection ("ricochet")
// response leaves the ball with no reliable way to pick up horizontal speed
// from a sloped drawn line — worst case, a ball falling straight down (vx=0)
// onto a line can bounce straight up and down forever at the same x, never
// making progress toward a goal. Projecting onto the tangent and only
// damping the inward-normal component lets gravity's pull, re-applied every
// step, keep converting into tangential motion — the ball rolls down a
// slope like a real ramp instead of ricocheting off it.
function resolveContact(ball: { x: number; y: number; vx: number; vy: number }, nx: number, ny: number, dist: number): void {
  ball.x += nx * (BALL_R - dist);
  ball.y += ny * (BALL_R - dist);
  const tx = -ny;
  const ty = nx;
  const vn = ball.vx * nx + ball.vy * ny;
  const vt = ball.vx * tx + ball.vy * ty;
  const nvn = vn < 0 ? -vn * 0.25 : vn; // moving into the surface: small bounce only, no ricochet
  const nvt = vt * 0.9995; // moving along the surface: keep it (light rolling friction) — a ball resting on a
  // floor/ramp is in contact almost every frame, so even a small per-frame factor compounds hard over a
  // multi-second roll; this keeps ~75% of speed after a full 10s continuous roll instead of gutting it to ~7%.
  ball.vx = nvn * nx + nvt * tx;
  ball.vy = nvn * ny + nvt * ty;
}

// Advances a ball one physics step against static rect obstacles and the
// player's drawn line segments. Mutates nothing — returns the next state.
// `escapeStall` (default true) controls the stuck-in-a-corner rescue below —
// levels whose win condition IS the ball coming to rest (Q Master's "Catch
// the Ball") pass false so a legitimately settled ball doesn't get shoved
// back into motion right as it's about to win.
export function stepBall(ball: Ball, dt: number, obstacles: Rect[], segments: Segment[], bounds: { left: number; right: number }, escapeStall: boolean = true): Ball {
  let { x, y, vx, vy } = ball;
  vy += GRAVITY * dt;
  x += vx * dt;
  y += vy * dt;

  if (x - BALL_R < bounds.left) { x = bounds.left + BALL_R; vx *= -0.4; }
  if (x + BALL_R > bounds.right) { x = bounds.right - BALL_R; vx *= -0.4; }

  const next: Ball = { x, y, vx, vy };
  let contacted = false;
  let sumNx = 0;
  let sumNy = 0;

  for (const o of obstacles) {
    const cx = clamp(next.x, o.x, o.x + o.w);
    const cy = clamp(next.y, o.y, o.y + o.h);
    const dx = next.x - cx;
    const dy = next.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < BALL_R) {
      const nx = dist === 0 ? 0 : dx / dist;
      const ny = dist === 0 ? -1 : dy / dist;
      resolveContact(next, nx, ny, dist);
      contacted = true;
      sumNx += nx;
      sumNy += ny;
    }
  }

  for (const seg of segments) {
    const proj = projectOnSegment(next.x, next.y, seg);
    const dx = next.x - proj.x;
    const dy = next.y - proj.y;
    const dist = Math.hypot(dx, dy);
    if (dist >= BALL_R) continue;

    // The ball is past this segment's far endpoint and still heading further
    // that way (along the segment's own direction) — it's rolling off the
    // end of the line, not hitting a wall. A thin drawn line doesn't
    // continue past where the player stopped drawing, so there's nothing
    // here to bounce off; let it fly. Treating the endpoint as a solid
    // corner instead (the old behavior) could reflect a fast-moving ball's
    // velocity almost arbitrarily — including backwards — right as it's
    // about to reach the goal. Same idea, mirrored, for the segment's start.
    const forwardSpeed = next.vx * proj.tx + next.vy * proj.ty;
    if ((proj.rawT >= 1 && forwardSpeed > 0) || (proj.rawT <= 0 && forwardSpeed < 0)) continue;

    let nx = dist === 0 ? 0 : dx / dist;
    let ny = dist === 0 ? -1 : dy / dist;
    // A ball landing dead-center on a segment's endpoint (rather than its
    // sloped face) has a normal pointing straight up with no sideways
    // component — a genuine balance point, like a real ball balanced on a
    // knife edge. Real physics engines break this with a perturbation; here
    // we break it deliberately, using the segment's own slope direction so
    // the ball rolls the way the drawn line actually points, and with
    // enough of a push to matter on this frame — a near-zero nudge just
    // trickles out over the better part of a second, which reads as "the
    // ball barely moves."
    if (Math.abs(nx) < 0.05) {
      const dir = proj.tx >= 0 ? 1 : -1;
      nx = dir * 0.6;
      ny = -Math.sqrt(Math.max(0, 1 - nx * nx));
    }
    resolveContact(next, nx, ny, dist);
    contacted = true;
    sumNx += nx;
    sumNy += ny;
  }

  // Wedging between two surfaces (e.g. a drawn line's corner against an
  // obstacle) can otherwise reach a stable dead point — every step's gravity
  // exactly cancelled by contact correction, ball motionless for the rest of
  // the time limit with zero chance to recover. If it's been essentially
  // stationary while touching something for a third of a second, give it a
  // firm push out of the corner (away from the surfaces pinning it, i.e.
  // along their combined outward normal) so it can keep going instead of
  // silently burning the clock.
  const speed = Math.hypot(next.vx, next.vy);
  if (escapeStall && contacted && speed < 18) {
    next.stuckT = (ball.stuckT ?? 0) + dt;
  } else {
    next.stuckT = 0;
  }
  if (escapeStall && next.stuckT > 0.35) {
    const nLen = Math.hypot(sumNx, sumNy);
    const ex = nLen > 1e-6 ? sumNx / nLen : 0;
    const ey = nLen > 1e-6 ? sumNy / nLen : -1;
    next.vx += ex * 110;
    next.vy += ey * 110 + 40; // slight downward bias so it can also fall through a gap, not just skitter sideways
    next.stuckT = 0;
  }

  return next;
}

export function svgPoint(e: PointerEvent<SVGSVGElement>, width: number, height: number): Point {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * width,
    y: ((e.clientY - rect.top) / rect.height) * height,
  };
}
