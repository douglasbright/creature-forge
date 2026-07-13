import * as THREE from 'three';

const tempA = new THREE.Vector3();
const tempB = new THREE.Vector3();

export function solveFabrik(
  root: THREE.Vector3,
  target: THREE.Vector3,
  lengths: number[],
  bendDirection: THREE.Vector3,
  iterations = 8,
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [root.clone()];
  const direction = target.clone().sub(root);
  const distance = direction.length();
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  const initialDirection = distance > 1e-5 ? direction.normalize() : new THREE.Vector3(0, -1, 0);
  const bend = bendDirection.clone().normalize();

  let cursor = root.clone();
  lengths.forEach((length, index) => {
    const curve = Math.sin(((index + 1) / lengths.length) * Math.PI) * Math.min(0.25, totalLength * 0.18);
    cursor = cursor
      .clone()
      .addScaledVector(initialDirection, length)
      .addScaledVector(bend, curve);
    points.push(cursor);
  });

  if (distance >= totalLength - 1e-4) {
    cursor.copy(root);
    for (let index = 0; index < lengths.length; index += 1) {
      cursor = cursor.clone().addScaledVector(initialDirection, lengths[index]!);
      points[index + 1] = cursor;
    }
    return points;
  }

  const rootAnchor = root.clone();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    points[points.length - 1]!.copy(target);
    for (let index = points.length - 2; index >= 0; index -= 1) {
      const next = points[index + 1]!;
      const current = points[index]!;
      tempA.copy(current).sub(next).normalize();
      current.copy(next).addScaledVector(tempA, lengths[index]!);
    }

    points[0]!.copy(rootAnchor);
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index]!;
      const next = points[index + 1]!;
      tempA.copy(next).sub(current).normalize();
      next.copy(current).addScaledVector(tempA, lengths[index]!);
    }

    if (points[points.length - 1]!.distanceToSquared(target) < 1e-6) break;
  }

  if (points.length > 2) {
    const axis = tempA.copy(target).sub(root).normalize();
    const planeNormal = tempB.copy(axis).cross(bend).normalize();
    if (planeNormal.lengthSq() > 1e-5) {
      for (let index = 1; index < points.length - 1; index += 1) {
        const point = points[index]!;
        const relative = point.clone().sub(root);
        const projected = relative.clone().sub(planeNormal.clone().multiplyScalar(relative.dot(planeNormal)));
        point.copy(root).add(projected);
      }
    }
  }

  return points;
}
