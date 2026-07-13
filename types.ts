import * as THREE from 'three';
import type { CreatureDefinition, LimbDefinition } from '../core/types';
import { attachmentPointLocal, classifyLimbs } from '../core/anatomy';

export interface PlannedLeg {
  limb: LimbDefinition;
  phaseOffset: number;
  stanceRatio: number;
  order: number;
}

export interface GaitPlan {
  name: string;
  legs: PlannedLeg[];
  cycleScale: number;
}

export class GaitPlanner {
  plan(creature: CreatureDefinition, baseStanceRatio: number): GaitPlan {
    const { legs } = classifyLimbs(creature);
    const count = legs.length;
    if (count === 0) return { name: 'No viable gait', legs: [], cycleScale: 1 };

    const annotated = legs.map((limb) => ({
      limb,
      point: attachmentPointLocal(creature, limb),
    }));
    const centre = annotated
      .reduce((sum, entry) => sum.add(entry.point), new THREE.Vector3())
      .multiplyScalar(1 / count);

    if (count === 2) {
      const sorted = annotated.sort((a, b) => a.point.x - b.point.x);
      return {
        name: 'Alternating biped walk',
        cycleScale: 1,
        legs: sorted.map((entry, index) => ({
          limb: entry.limb,
          phaseOffset: index * 0.5,
          stanceRatio: Math.max(0.58, baseStanceRatio),
          order: index,
        })),
      };
    }

    if (count === 4) {
      const sorted = annotated.sort((a, b) => {
        const angleA = Math.atan2(a.point.z - centre.z, a.point.x - centre.x);
        const angleB = Math.atan2(b.point.z - centre.z, b.point.x - centre.x);
        return angleA - angleB;
      });
      return {
        name: 'Four-beat stability walk',
        cycleScale: 1.15,
        legs: sorted.map((entry, index) => ({
          limb: entry.limb,
          phaseOffset: index / 4,
          stanceRatio: Math.max(0.68, baseStanceRatio),
          order: index,
        })),
      };
    }

    if (count === 6) {
      const bySide = [...annotated].sort((a, b) => a.point.z - b.point.z);
      return {
        name: 'Adaptive tripod gait',
        cycleScale: 1.25,
        legs: bySide.map((entry, index) => {
          const sideBit = entry.point.x < centre.x ? 0 : 1;
          const row = Math.floor(index / 2);
          const group = (row + sideBit) % 2;
          return {
            limb: entry.limb,
            phaseOffset: group * 0.5,
            stanceRatio: Math.max(0.66, baseStanceRatio),
            order: index,
          };
        }),
      };
    }

    const sorted = annotated.sort((a, b) => {
      const angleA = Math.atan2(a.point.z - centre.z, a.point.x - centre.x);
      const angleB = Math.atan2(b.point.z - centre.z, b.point.x - centre.x);
      return angleA - angleB;
    });
    const stanceRatio = Math.max(baseStanceRatio, Math.min(0.82, 0.6 + count * 0.025));
    return {
      name: count === 8 ? 'Eight-leg ripple gait' : `${count}-leg adaptive wave`,
      cycleScale: 1.35,
      legs: sorted.map((entry, index) => ({
        limb: entry.limb,
        phaseOffset: index / count,
        stanceRatio,
        order: index,
      })),
    };
  }
}
