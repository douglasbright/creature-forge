export type Vec3Data = { x: number; y: number; z: number };
export type EulerData = { x: number; y: number; z: number };

export type BodyKind = 'torso' | 'neck' | 'head' | 'tail';
export type LimbRole =
  | 'auto'
  | 'locomotion'
  | 'support'
  | 'manipulator'
  | 'balance'
  | 'decorative';
export type LimbSide = 'left' | 'right' | 'center';

export interface BodySegmentDefinition {
  id: string;
  kind: BodyKind;
  name: string;
  position: Vec3Data;
  rotation: EulerData;
  scale: Vec3Data;
  parentId: string | null;
  massDensity: number;
  colour?: string;
}

export interface LimbSegmentDefinition {
  id: string;
  length: number;
  radius: number;
  taper: number;
}

export interface LimbAttachment {
  bodyId: string;
  normal: Vec3Data;
}

export interface LimbDefinition {
  id: string;
  pairId?: string;
  name: string;
  side: LimbSide;
  role: LimbRole;
  inferredRole?: Exclude<LimbRole, 'auto'>;
  attachment: LimbAttachment;
  segments: LimbSegmentDefinition[];
  bendDirection: Vec3Data;
  endEffectorScale: Vec3Data;
  colour?: string;
}

export interface DecorationDefinition {
  id: string;
  kind: 'eye' | 'ear' | 'horn' | 'fin' | 'crest';
  bodyId: string;
  normal: Vec3Data;
  scale: Vec3Data;
  colour?: string;
}

export interface CreatureDefinition {
  version: 1;
  id: string;
  name: string;
  symmetry: boolean;
  body: BodySegmentDefinition[];
  limbs: LimbDefinition[];
  decorations: DecorationDefinition[];
  palette: {
    body: string;
    belly: string;
    accent: string;
    eyes: string;
  };
}

export interface RigJoint {
  id: string;
  parentId: string | null;
  semantic: string;
  localPosition: Vec3Data;
  preferredBend: Vec3Data;
  minAngle: number;
  maxAngle: number;
}

export interface RigDefinition {
  joints: RigJoint[];
  bodyJointIds: Map<string, string>;
  limbJointIds: Map<string, string[]>;
}

export interface LimbRuntimePose {
  limbId: string;
  points: Vec3Data[];
  footTarget: Vec3Data;
  planted: boolean;
  phase: number;
}

export interface CreatureStats {
  mass: number;
  legCount: number;
  armCount: number;
  centreOfMassHeight: number;
  stability: number;
  maxStepHeight: number;
  suggestedGait: string;
  canStand: boolean;
}

export interface DebugFlags {
  skeleton: boolean;
  colliders: boolean;
  centreOfMass: boolean;
  supportPolygon: boolean;
  footTargets: boolean;
  raycasts: boolean;
  gaitPhase: boolean;
  jointLimits: boolean;
  bodyVelocity: boolean;
  frameRate: boolean;
}

export interface LocomotionTuning {
  stepLength: number;
  stepHeight: number;
  stepDuration: number;
  stanceRatio: number;
  bodySpring: number;
  balanceCorrection: number;
  armSwing: number;
  tailCounterbalance: number;
  maxSlopeDegrees: number;
  maxStepHeight: number;
}
