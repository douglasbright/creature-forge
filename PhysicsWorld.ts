import type {
  BodySegmentDefinition,
  CreatureDefinition,
  DecorationDefinition,
  LimbDefinition,
  LimbRole,
  Vec3Data,
} from './types';
import { uid } from '../utils/math';

const colours = {
  body: '#67cf79',
  belly: '#f5cfa6',
  accent: '#ff9b67',
  eyes: '#1f2940',
};

function segment(
  id: string,
  kind: BodySegmentDefinition['kind'],
  name: string,
  position: Vec3Data,
  scale: Vec3Data,
  parentId: string | null = null,
  rotation: Vec3Data = { x: 0, y: 0, z: 0 },
): BodySegmentDefinition {
  return {
    id,
    kind,
    name,
    position,
    rotation,
    scale,
    parentId,
    massDensity: kind === 'head' ? 0.85 : kind === 'tail' ? 0.45 : 1,
  };
}

function limb(
  id: string,
  name: string,
  side: LimbDefinition['side'],
  bodyId: string,
  normal: Vec3Data,
  lengths: number[],
  role: LimbRole,
  pairId?: string,
  radius = 0.13,
): LimbDefinition {
  return {
    id,
    pairId,
    name,
    side,
    role,
    attachment: { bodyId, normal },
    bendDirection: { x: 0, y: 0, z: side === 'left' ? 1 : -1 },
    endEffectorScale:
      role === 'locomotion' || role === 'support'
        ? { x: 0.26, y: 0.11, z: 0.38 }
        : { x: 0.2, y: 0.14, z: 0.2 },
    segments: lengths.map((length, index) => ({
      id: `${id}-seg-${index}`,
      length,
      radius: radius * (1 - index * 0.12),
      taper: 0.85,
    })),
  };
}

function eyes(headId: string, y = 0.14, z = 0.48): DecorationDefinition[] {
  return [
    {
      id: uid('eye'),
      kind: 'eye',
      bodyId: headId,
      normal: { x: -0.35, y, z },
      scale: { x: 0.16, y: 0.2, z: 0.12 },
      colour: '#ffffff',
    },
    {
      id: uid('eye'),
      kind: 'eye',
      bodyId: headId,
      normal: { x: 0.35, y, z },
      scale: { x: 0.16, y: 0.2, z: 0.12 },
      colour: '#ffffff',
    },
  ];
}

function base(name: string, body: BodySegmentDefinition[], limbs: LimbDefinition[], decorations: DecorationDefinition[]): CreatureDefinition {
  return {
    version: 1,
    id: uid('creature'),
    name,
    symmetry: true,
    body,
    limbs,
    decorations,
    palette: { ...colours },
  };
}

function biped(): CreatureDefinition {
  const torso = 'torso-main';
  const chest = 'torso-chest';
  const neck = 'neck-main';
  const head = 'head-main';
  const tailA = 'tail-a';
  const tailB = 'tail-b';
  const legPair = uid('pair');
  const armPair = uid('pair');
  return base(
    'Springback',
    [
      segment(torso, 'torso', 'Pelvis', { x: 0, y: 1.42, z: 0 }, { x: 0.55, y: 0.62, z: 0.48 }),
      segment(chest, 'torso', 'Chest', { x: 0, y: 2.06, z: 0.04 }, { x: 0.68, y: 0.74, z: 0.52 }, torso),
      segment(neck, 'neck', 'Neck', { x: 0, y: 2.66, z: 0.12 }, { x: 0.28, y: 0.42, z: 0.28 }, chest),
      segment(head, 'head', 'Head', { x: 0, y: 3.05, z: 0.23 }, { x: 0.56, y: 0.48, z: 0.54 }, neck),
      segment(tailA, 'tail', 'Tail 1', { x: 0, y: 1.48, z: -0.54 }, { x: 0.24, y: 0.2, z: 0.52 }, torso, { x: -0.25, y: 0, z: 0 }),
      segment(tailB, 'tail', 'Tail 2', { x: 0, y: 1.66, z: -1.0 }, { x: 0.16, y: 0.14, z: 0.42 }, tailA, { x: -0.48, y: 0, z: 0 }),
    ],
    [
      limb('leg-l', 'Left leg', 'left', torso, { x: -0.72, y: -0.35, z: 0.05 }, [0.72, 0.72], 'locomotion', legPair, 0.16),
      limb('leg-r', 'Right leg', 'right', torso, { x: 0.72, y: -0.35, z: 0.05 }, [0.72, 0.72], 'locomotion', legPair, 0.16),
      limb('arm-l', 'Left arm', 'left', chest, { x: -0.82, y: 0.08, z: 0.08 }, [0.58, 0.56], 'manipulator', armPair, 0.12),
      limb('arm-r', 'Right arm', 'right', chest, { x: 0.82, y: 0.08, z: 0.08 }, [0.58, 0.56], 'manipulator', armPair, 0.12),
    ],
    eyes(head),
  );
}

function forwardBiped(): CreatureDefinition {
  const pelvis = 'torso-pelvis';
  const bodyA = 'torso-mid';
  const bodyB = 'torso-front';
  const neck = 'neck-main';
  const head = 'head-main';
  const tailA = 'tail-a';
  const tailB = 'tail-b';
  const legPair = uid('pair');
  const armPair = uid('pair');
  return base(
    'Dashbeak',
    [
      segment(pelvis, 'torso', 'Hips', { x: 0, y: 1.36, z: -0.28 }, { x: 0.58, y: 0.54, z: 0.58 }),
      segment(bodyA, 'torso', 'Body', { x: 0, y: 1.65, z: 0.22 }, { x: 0.66, y: 0.56, z: 0.7 }, pelvis, { x: 0.12, y: 0, z: 0 }),
      segment(bodyB, 'torso', 'Shoulders', { x: 0, y: 1.88, z: 0.74 }, { x: 0.6, y: 0.48, z: 0.58 }, bodyA, { x: 0.22, y: 0, z: 0 }),
      segment(neck, 'neck', 'Neck', { x: 0, y: 2.18, z: 1.08 }, { x: 0.27, y: 0.34, z: 0.3 }, bodyB, { x: 0.25, y: 0, z: 0 }),
      segment(head, 'head', 'Head', { x: 0, y: 2.44, z: 1.35 }, { x: 0.5, y: 0.42, z: 0.58 }, neck),
      segment(tailA, 'tail', 'Tail 1', { x: 0, y: 1.42, z: -0.9 }, { x: 0.25, y: 0.2, z: 0.72 }, pelvis, { x: -0.14, y: 0, z: 0 }),
      segment(tailB, 'tail', 'Tail 2', { x: 0, y: 1.58, z: -1.55 }, { x: 0.14, y: 0.12, z: 0.62 }, tailA, { x: -0.2, y: 0, z: 0 }),
    ],
    [
      limb('leg-l', 'Left runner leg', 'left', pelvis, { x: -0.72, y: -0.4, z: 0.08 }, [0.68, 0.72], 'locomotion', legPair, 0.15),
      limb('leg-r', 'Right runner leg', 'right', pelvis, { x: 0.72, y: -0.4, z: 0.08 }, [0.68, 0.72], 'locomotion', legPair, 0.15),
      limb('arm-l', 'Left balance arm', 'left', bodyB, { x: -0.8, y: -0.05, z: 0.1 }, [0.46, 0.48], 'balance', armPair, 0.1),
      limb('arm-r', 'Right balance arm', 'right', bodyB, { x: 0.8, y: -0.05, z: 0.1 }, [0.46, 0.48], 'balance', armPair, 0.1),
    ],
    eyes(head, 0.1, 0.5),
  );
}

function quadruped(): CreatureDefinition {
  const rear = 'torso-rear';
  const middle = 'torso-mid';
  const front = 'torso-front';
  const neck = 'neck-main';
  const head = 'head-main';
  const tailA = 'tail-a';
  const tailB = 'tail-b';
  const pairs = [uid('pair'), uid('pair')];
  return base(
    'Mosskip',
    [
      segment(rear, 'torso', 'Rear torso', { x: 0, y: 1.25, z: -0.62 }, { x: 0.68, y: 0.58, z: 0.72 }),
      segment(middle, 'torso', 'Middle torso', { x: 0, y: 1.34, z: 0 }, { x: 0.74, y: 0.62, z: 0.78 }, rear),
      segment(front, 'torso', 'Front torso', { x: 0, y: 1.43, z: 0.68 }, { x: 0.7, y: 0.66, z: 0.72 }, middle),
      segment(neck, 'neck', 'Neck', { x: 0, y: 1.72, z: 1.2 }, { x: 0.33, y: 0.42, z: 0.4 }, front, { x: 0.22, y: 0, z: 0 }),
      segment(head, 'head', 'Head', { x: 0, y: 1.98, z: 1.55 }, { x: 0.58, y: 0.48, z: 0.62 }, neck),
      segment(tailA, 'tail', 'Tail 1', { x: 0, y: 1.35, z: -1.24 }, { x: 0.22, y: 0.18, z: 0.62 }, rear),
      segment(tailB, 'tail', 'Tail 2', { x: 0, y: 1.48, z: -1.78 }, { x: 0.14, y: 0.12, z: 0.5 }, tailA, { x: -0.2, y: 0, z: 0 }),
    ],
    [
      limb('rear-l', 'Left rear leg', 'left', rear, { x: -0.72, y: -0.42, z: -0.12 }, [0.58, 0.58], 'locomotion', pairs[0], 0.14),
      limb('rear-r', 'Right rear leg', 'right', rear, { x: 0.72, y: -0.42, z: -0.12 }, [0.58, 0.58], 'locomotion', pairs[0], 0.14),
      limb('front-l', 'Left front leg', 'left', front, { x: -0.72, y: -0.45, z: 0.1 }, [0.62, 0.58], 'locomotion', pairs[1], 0.14),
      limb('front-r', 'Right front leg', 'right', front, { x: 0.72, y: -0.45, z: 0.1 }, [0.62, 0.58], 'locomotion', pairs[1], 0.14),
    ],
    eyes(head, 0.1, 0.5),
  );
}

function multiLeg(count: 6 | 8): CreatureDefinition {
  const bodyIds = ['torso-rear', 'torso-mid', 'torso-front'];
  const head = 'head-main';
  const body = [
    segment(bodyIds[0]!, 'torso', 'Rear shell', { x: 0, y: 1.12, z: -0.62 }, { x: 0.72, y: 0.5, z: 0.75 }),
    segment(bodyIds[1]!, 'torso', 'Middle shell', { x: 0, y: 1.18, z: 0 }, { x: 0.82, y: 0.54, z: 0.78 }, bodyIds[0]!),
    segment(bodyIds[2]!, 'torso', 'Front shell', { x: 0, y: 1.22, z: 0.65 }, { x: 0.72, y: 0.5, z: 0.72 }, bodyIds[1]!),
    segment('neck-main', 'neck', 'Neck', { x: 0, y: 1.5, z: 1.17 }, { x: 0.28, y: 0.34, z: 0.32 }, bodyIds[2]!),
    segment(head, 'head', 'Head', { x: 0, y: 1.7, z: 1.48 }, { x: 0.52, y: 0.42, z: 0.55 }, 'neck-main'),
    segment('tail-a', 'tail', 'Tail', { x: 0, y: 1.2, z: -1.3 }, { x: 0.18, y: 0.14, z: 0.6 }, bodyIds[0]!),
  ];
  const limbs: LimbDefinition[] = [];
  const rows = count / 2;
  for (let row = 0; row < rows; row += 1) {
    const bodyIndex = Math.round((row / Math.max(1, rows - 1)) * 2);
    const bodyId = bodyIds[bodyIndex]!;
    const zBias = rows === 4 ? (row % 2 === 0 ? -0.22 : 0.22) : 0;
    const pair = uid('pair');
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? -1 : 1;
      limbs.push(
        limb(
          `leg-${row}-${side}`,
          `${side} leg ${row + 1}`,
          side,
          bodyId,
          { x: 0.74 * sign, y: -0.48, z: zBias },
          [0.5, 0.52],
          'locomotion',
          pair,
          0.115,
        ),
      );
    }
  }
  return base(count === 6 ? 'Tripodoodle' : 'Octopuff', body, limbs, eyes(head, 0.08, 0.5));
}

function roundBody(): CreatureDefinition {
  const torso = 'torso-main';
  const head = 'head-main';
  const legPair = uid('pair');
  return base(
    'Pebblehop',
    [
      segment(torso, 'torso', 'Round body', { x: 0, y: 1.42, z: 0 }, { x: 0.95, y: 1.0, z: 0.86 }),
      segment('neck-main', 'neck', 'Short neck', { x: 0, y: 2.22, z: 0.18 }, { x: 0.3, y: 0.24, z: 0.28 }, torso),
      segment(head, 'head', 'Head', { x: 0, y: 2.48, z: 0.28 }, { x: 0.62, y: 0.5, z: 0.58 }, 'neck-main'),
    ],
    [
      limb('leg-l', 'Left leg', 'left', torso, { x: -0.62, y: -0.62, z: 0.08 }, [0.52, 0.5], 'locomotion', legPair, 0.16),
      limb('leg-r', 'Right leg', 'right', torso, { x: 0.62, y: -0.62, z: 0.08 }, [0.52, 0.5], 'locomotion', legPair, 0.16),
    ],
    eyes(head),
  );
}

export const PRESETS: Record<string, () => CreatureDefinition> = {
  biped,
  forwardBiped,
  quadruped,
  hexapod: () => multiLeg(6),
  octopod: () => multiLeg(8),
  roundBody,
};

export const PRESET_LABELS: Record<keyof typeof PRESETS, string> = {
  biped: 'Upright biped',
  forwardBiped: 'Forward biped',
  quadruped: 'Quadruped',
  hexapod: 'Six legs',
  octopod: 'Eight legs',
  roundBody: 'Round hopper',
};

export function createDefaultCreature(): CreatureDefinition {
  return biped();
}
