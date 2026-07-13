import * as THREE from 'three';
import type {
  BodySegmentDefinition,
  CreatureDefinition,
  LimbDefinition,
  LimbRole,
} from './types';
import { data3, ellipsoidSurfacePoint, v3 } from '../utils/math';

export function getBodySegment(creature: CreatureDefinition, id: string): BodySegmentDefinition | undefined {
  return creature.body.find((segment) => segment.id === id);
}

export function attachmentPointLocal(creature: CreatureDefinition, limb: LimbDefinition): THREE.Vector3 {
  const body = getBodySegment(creature, limb.attachment.bodyId);
  if (!body) return new THREE.Vector3();
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(body.rotation.x, body.rotation.y, body.rotation.z),
  );
  const normal = v3(limb.attachment.normal).normalize();
  return ellipsoidSurfacePoint(new THREE.Vector3(), v3(body.scale), normal)
    .applyQuaternion(quaternion)
    .add(v3(body.position));
}


export function attachmentNormalLocal(creature: CreatureDefinition, limb: LimbDefinition): THREE.Vector3 {
  const body = getBodySegment(creature, limb.attachment.bodyId);
  const normal = v3(limb.attachment.normal).normalize();
  if (!body) return normal;
  return normal.applyQuaternion(
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(body.rotation.x, body.rotation.y, body.rotation.z),
    ),
  ).normalize();
}

export function inferLimbRole(creature: CreatureDefinition, limb: LimbDefinition): Exclude<LimbRole, 'auto'> {
  const root = attachmentPointLocal(creature, limb);
  const totalLength = limb.segments.reduce((sum, segment) => sum + segment.length, 0);
  const estimatedReachY = root.y - totalLength;
  const downwardFacing = attachmentNormalLocal(creature, limb).y < 0.15;
  const reachesGround = estimatedReachY < 0.35;
  const torsoCentre = creature.body
    .filter((segment) => segment.kind === 'torso')
    .reduce((sum, segment) => sum.add(v3(segment.position)), new THREE.Vector3())
    .multiplyScalar(1 / Math.max(1, creature.body.filter((segment) => segment.kind === 'torso').length));

  if (reachesGround && downwardFacing) {
    return root.z < torsoCentre.z - 0.65 ? 'support' : 'locomotion';
  }
  if (root.y > torsoCentre.y + 0.25) return 'manipulator';
  if (Math.abs(root.x) > 0.55 && totalLength > 0.65) return 'balance';
  return 'decorative';
}

export function effectiveRole(creature: CreatureDefinition, limb: LimbDefinition): Exclude<LimbRole, 'auto'> {
  return limb.role === 'auto' ? inferLimbRole(creature, limb) : limb.role;
}

export function classifyLimbs(creature: CreatureDefinition): {
  legs: LimbDefinition[];
  arms: LimbDefinition[];
  decorative: LimbDefinition[];
} {
  const legs: LimbDefinition[] = [];
  const arms: LimbDefinition[] = [];
  const decorative: LimbDefinition[] = [];
  for (const limb of creature.limbs) {
    const role = effectiveRole(creature, limb);
    limb.inferredRole = role;
    if (role === 'locomotion' || role === 'support') legs.push(limb);
    else if (role === 'manipulator' || role === 'balance') arms.push(limb);
    else decorative.push(limb);
  }
  return { legs, arms, decorative };
}

export function mirrorNormal(normal: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  return { x: -normal.x, y: normal.y, z: normal.z };
}

export function closestBodySurface(
  creature: CreatureDefinition,
  localPoint: THREE.Vector3,
  allowedKinds: BodySegmentDefinition['kind'][] = ['torso', 'neck'],
): { body: BodySegmentDefinition; point: THREE.Vector3; normal: THREE.Vector3; distance: number } | null {
  let best: { body: BodySegmentDefinition; point: THREE.Vector3; normal: THREE.Vector3; distance: number } | null = null;
  for (const body of creature.body) {
    if (!allowedKinds.includes(body.kind)) continue;
    const centre = v3(body.position);
    const rotation = new THREE.Euler(body.rotation.x, body.rotation.y, body.rotation.z);
    const inverseQuaternion = new THREE.Quaternion().setFromEuler(rotation).invert();
    const relative = localPoint.clone().sub(centre).applyQuaternion(inverseQuaternion);
    const scale = v3(body.scale);
    const normal = new THREE.Vector3(
      relative.x / Math.max(0.001, scale.x * scale.x),
      relative.y / Math.max(0.001, scale.y * scale.y),
      relative.z / Math.max(0.001, scale.z * scale.z),
    ).normalize();
    const localSurface = ellipsoidSurfacePoint(new THREE.Vector3(), scale, normal);
    const point = localSurface.applyQuaternion(inverseQuaternion.clone().invert()).add(centre);
    const worldNormal = normal.applyQuaternion(inverseQuaternion.clone().invert()).normalize();
    const distance = point.distanceTo(localPoint);
    if (!best || distance < best.distance) best = { body, point, normal: worldNormal, distance };
  }
  return best;
}

export function normalFromPoint(body: BodySegmentDefinition, localPoint: THREE.Vector3): THREE.Vector3 {
  const centre = v3(body.position);
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(body.rotation.x, body.rotation.y, body.rotation.z),
  );
  const relative = localPoint.clone().sub(centre).applyQuaternion(quaternion.clone().invert());
  const scale = v3(body.scale);
  return new THREE.Vector3(
    relative.x / Math.max(0.001, scale.x * scale.x),
    relative.y / Math.max(0.001, scale.y * scale.y),
    relative.z / Math.max(0.001, scale.z * scale.z),
  ).normalize();
}

export function updateAttachmentFromPoint(
  creature: CreatureDefinition,
  limbId: string,
  bodyId: string,
  localPoint: THREE.Vector3,
): void {
  const limb = creature.limbs.find((entry) => entry.id === limbId);
  const body = getBodySegment(creature, bodyId);
  if (!limb || !body) return;
  limb.attachment.bodyId = bodyId;
  limb.attachment.normal = data3(normalFromPoint(body, localPoint));
}
