import * as THREE from 'three';
import type { CreatureDefinition, CreatureStats, LimbRuntimePose } from '../core/types';
import { classifyLimbs } from '../core/anatomy';
import { convexHullXZ, pointInPolygonXZ, polygonAreaXZ, v3 } from '../utils/math';
import type { GaitPlan } from './GaitPlanner';

export interface BalanceResult {
  centreOfMass: THREE.Vector3;
  projectedCentre: THREE.Vector3;
  supportPolygon: THREE.Vector3[];
  supportCentroid: THREE.Vector3;
  error: THREE.Vector3;
  stability: number;
  canStand: boolean;
}

export class BalanceSolver {
  calculate(
    creature: CreatureDefinition,
    root: THREE.Object3D,
    limbPoses: LimbRuntimePose[],
  ): BalanceResult {
    const localCentre = new THREE.Vector3();
    let totalMass = 0;

    for (const body of creature.body) {
      const scale = v3(body.scale);
      const volume = (4 / 3) * Math.PI * scale.x * scale.y * scale.z;
      const mass = volume * body.massDensity;
      localCentre.addScaledVector(v3(body.position), mass);
      totalMass += mass;
    }

    for (const limb of creature.limbs) {
      const pose = limbPoses.find((entry) => entry.limbId === limb.id);
      if (pose && pose.points.length > 1) {
        for (let index = 0; index < limb.segments.length; index += 1) {
          const a = v3(pose.points[index]!);
          const b = v3(pose.points[index + 1]!);
          const segment = limb.segments[index]!;
          const mass = Math.PI * segment.radius * segment.radius * segment.length * 0.72;
          const worldMid = a.add(b).multiplyScalar(0.5);
          const localMid = root.worldToLocal(worldMid.clone());
          localCentre.addScaledVector(localMid, mass);
          totalMass += mass;
        }
      }
    }

    if (totalMass > 0) localCentre.multiplyScalar(1 / totalMass);
    const centreOfMass = root.localToWorld(localCentre.clone());
    const projectedCentre = centreOfMass.clone();
    projectedCentre.y = 0;

    const planted = limbPoses
      .filter((pose) => pose.planted)
      .map((pose) => v3(pose.footTarget));
    const supportPolygon = convexHullXZ(planted);
    const supportCentroid = planted.length
      ? planted.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / planted.length)
      : centreOfMass.clone().setY(0);
    const error = supportCentroid.clone().sub(projectedCentre);
    error.y = 0;

    const area = polygonAreaXZ(supportPolygon);
    const inside = supportPolygon.length >= 3 ? pointInPolygonXZ(projectedCentre, supportPolygon) : false;
    let stability = 0;
    if (planted.length === 1) stability = Math.max(0, 0.22 - error.length() * 0.35);
    else if (planted.length === 2) stability = Math.max(0, 0.38 - error.length() * 0.32);
    else stability = THREE.MathUtils.clamp((inside ? 0.55 : 0.24) + area * 0.22 - error.length() * 0.18, 0, 1);

    return {
      centreOfMass,
      projectedCentre,
      supportPolygon,
      supportCentroid,
      error,
      stability,
      canStand: planted.length >= 2 && (inside || error.length() < 0.42),
    };
  }

  estimateStats(creature: CreatureDefinition, gaitPlan: GaitPlan): CreatureStats {
    const { legs, arms } = classifyLimbs(creature);
    let totalMass = 0;
    const weighted = new THREE.Vector3();
    for (const body of creature.body) {
      const scale = v3(body.scale);
      const mass = (4 / 3) * Math.PI * scale.x * scale.y * scale.z * body.massDensity;
      totalMass += mass;
      weighted.addScaledVector(v3(body.position), mass);
    }
    for (const limb of creature.limbs) {
      for (const segment of limb.segments) {
        totalMass += Math.PI * segment.radius * segment.radius * segment.length * 0.72;
      }
    }
    const com = totalMass > 0 ? weighted.multiplyScalar(1 / totalMass) : new THREE.Vector3();
    const feetSpread = legs.length
      ? legs.reduce((sum, limb) => sum + Math.abs(limb.attachment.normal.x), 0) / legs.length
      : 0;
    const stability = THREE.MathUtils.clamp(0.12 + legs.length * 0.11 + feetSpread * 0.24 - com.y * 0.05, 0, 1);
    const shortestLeg = legs.length
      ? Math.min(...legs.map((limb) => limb.segments.reduce((sum, segment) => sum + segment.length, 0)))
      : 0;
    return {
      mass: totalMass,
      legCount: legs.length,
      armCount: arms.length,
      centreOfMassHeight: com.y,
      stability,
      maxStepHeight: shortestLeg * 0.3,
      suggestedGait: gaitPlan.name,
      canStand: legs.length >= 2 && shortestLeg > 0.5,
    };
  }
}
