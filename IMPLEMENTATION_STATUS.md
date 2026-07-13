import * as THREE from 'three';
import type { Vec3Data } from '../core/types';

export const EPSILON = 1e-5;

export function v3(data: Vec3Data): THREE.Vector3 {
  return new THREE.Vector3(data.x, data.y, data.z);
}

export function data3(vector: THREE.Vector3): Vec3Data {
  return { x: vector.x, y: vector.y, z: vector.z };
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-5)}`;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / Math.max(EPSILON, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function damp(current: number, target: number, lambda: number, delta: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta));
}

export function dampVector(
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  delta: number,
): THREE.Vector3 {
  return current.lerp(target, 1 - Math.exp(-lambda * delta));
}

export function ellipsoidSurfacePoint(
  centre: THREE.Vector3,
  scale: THREE.Vector3,
  normalInput: THREE.Vector3,
): THREE.Vector3 {
  const normal = normalInput.clone().normalize();
  const denominator = Math.sqrt(
    (normal.x * normal.x) / (scale.x * scale.x) +
      (normal.y * normal.y) / (scale.y * scale.y) +
      (normal.z * normal.z) / (scale.z * scale.z),
  );
  const radius = denominator > EPSILON ? 1 / denominator : 1;
  return centre.clone().addScaledVector(normal, radius);
}

export function closestPointOnSegment2D(
  point: THREE.Vector2,
  a: THREE.Vector2,
  b: THREE.Vector2,
): THREE.Vector2 {
  const ab = b.clone().sub(a);
  const t = clamp01(point.clone().sub(a).dot(ab) / Math.max(EPSILON, ab.lengthSq()));
  return a.clone().addScaledVector(ab, t);
}

export function convexHullXZ(points: THREE.Vector3[]): THREE.Vector3[] {
  if (points.length <= 2) return points.map((point) => point.clone());
  const sorted = points
    .map((point) => point.clone())
    .sort((a, b) => (a.x === b.x ? a.z - b.z : a.x - b.x));

  const cross = (o: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) =>
    (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);

  const lower: THREE.Vector3[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper: THREE.Vector3[] = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

export function pointInPolygonXZ(point: THREE.Vector3, polygon: THREE.Vector3[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const intersects =
      pi.z > point.z !== pj.z > point.z &&
      point.x < ((pj.x - pi.x) * (point.z - pi.z)) / Math.max(EPSILON, pj.z - pi.z) + pi.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function polygonAreaXZ(points: THREE.Vector3[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    area += a.x * b.z - b.x * a.z;
  }
  return Math.abs(area) * 0.5;
}
