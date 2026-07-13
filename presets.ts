import * as THREE from 'three';
import type {
  CreatureDefinition,
  LimbDefinition,
  LimbRuntimePose,
  LocomotionTuning,
} from '../core/types';
import { attachmentNormalLocal, attachmentPointLocal, classifyLimbs, effectiveRole } from '../core/anatomy';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { CreatureRenderer } from '../render/CreatureRenderer';
import type { DebugRenderer } from '../render/DebugRenderer';
import { BalanceSolver, type BalanceResult } from './BalanceSolver';
import { GaitPlanner, type GaitPlan, type PlannedLeg } from './GaitPlanner';
import { solveFabrik } from './IK';
import { clamp01, damp, data3, smoothstep, v3 } from '../utils/math';

export interface MovementInput {
  forward: number;
  right: number;
  run: boolean;
  turn: number;
}

export interface LocomotionSnapshot {
  speed: number;
  gait: string;
  stability: number;
  canStand: boolean;
  state: 'idle' | 'starting' | 'walking' | 'fast walk' | 'turning' | 'stopping' | 'stumble';
  bodyPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  balance: BalanceResult;
  poses: LimbRuntimePose[];
}

interface LegState {
  planned: PlannedLeg;
  phase: number;
  wasSwing: boolean;
  planted: boolean;
  footWorld: THREE.Vector3;
  swingStart: THREE.Vector3;
  swingTarget: THREE.Vector3;
  groundNormal: THREE.Vector3;
}

const DEFAULT_BALANCE: BalanceResult = {
  centreOfMass: new THREE.Vector3(0, 1, 0),
  projectedCentre: new THREE.Vector3(),
  supportPolygon: [],
  supportCentroid: new THREE.Vector3(),
  error: new THREE.Vector3(),
  stability: 0,
  canStand: false,
};

export class LocomotionController {
  private creature: CreatureDefinition | null = null;
  private gaitPlan: GaitPlan = { name: 'No gait', legs: [], cycleScale: 1 };
  private legStates = new Map<string, LegState>();
  private poses: LimbRuntimePose[] = [];
  private readonly gaitPlanner = new GaitPlanner();
  private readonly balanceSolver = new BalanceSolver();
  private balance: BalanceResult = DEFAULT_BALANCE;
  private input: MovementInput = { forward: 0, right: 0, run: false, turn: 0 };
  private clickTarget: THREE.Vector3 | null = null;
  private globalPhase = 0;
  private yaw = 0;
  private yawVelocity = 0;
  private currentSpeed = 0;
  private velocity = new THREE.Vector3();
  private desiredVelocity = new THREE.Vector3();
  private previousVelocity = new THREE.Vector3();
  private rootHeight = 0;
  private modeActive = false;
  private time = 0;
  private stumbleTime = 0;
  private unstableDuration = 0;
  private state: LocomotionSnapshot['state'] = 'idle';

  constructor(
    private readonly physics: PhysicsWorld,
    private readonly renderer: CreatureRenderer,
    private readonly debugRenderer: DebugRenderer,
    public readonly tuning: LocomotionTuning,
  ) {}

  setCreature(creature: CreatureDefinition): void {
    this.creature = creature;
    this.gaitPlan = this.gaitPlanner.plan(creature, this.tuning.stanceRatio);
    this.resetRuntimeFeet();
  }

  setActive(active: boolean): void {
    this.modeActive = active;
    this.renderer.setEditMode(!active);
    if (active) this.resetRuntimeFeet();
  }

  setInput(input: MovementInput): void {
    this.input = input;
    if (Math.abs(input.forward) + Math.abs(input.right) > 0.05) this.clickTarget = null;
  }

  setClickTarget(target: THREE.Vector3 | null): void {
    this.clickTarget = target?.clone() ?? null;
  }

  resetPosition(): void {
    this.renderer.root.position.set(0, 0, 0);
    this.renderer.root.quaternion.identity();
    this.rootHeight = 0;
    this.yaw = 0;
    this.currentSpeed = 0;
    this.velocity.set(0, 0, 0);
    this.desiredVelocity.set(0, 0, 0);
    this.globalPhase = 0;
    this.stumbleTime = 0;
    this.unstableDuration = 0;
    this.state = 'idle';
    this.resetRuntimeFeet();
  }

  recover(): void {
    this.stumbleTime = 0;
    this.unstableDuration = 0;
    this.state = 'idle';
    this.renderer.root.rotation.set(0, this.yaw, 0);
    this.resetRuntimeFeet();
  }

  replan(): void {
    if (!this.creature) return;
    this.gaitPlan = this.gaitPlanner.plan(this.creature, this.tuning.stanceRatio);
    this.resetRuntimeFeet();
  }

  update(delta: number, camera: THREE.Camera): LocomotionSnapshot {
    this.time += delta;
    if (!this.creature) return this.snapshot();
    if (!this.modeActive) {
      this.updateIdleEditor(delta);
      return this.snapshot();
    }

    if (this.stumbleTime > 0) {
      this.updateStumble(delta);
      return this.snapshot();
    }

    const root = this.renderer.root;
    this.computeDesiredVelocity(camera);
    const desiredSpeed = this.desiredVelocity.length();
    const acceleration = desiredSpeed > this.currentSpeed ? 4.2 : 5.8;
    this.currentSpeed = damp(this.currentSpeed, desiredSpeed, acceleration, delta);

    if (this.desiredVelocity.lengthSq() > 1e-5) {
      const desiredYaw = Math.atan2(this.desiredVelocity.x, this.desiredVelocity.z);
      const yawDifference = Math.atan2(Math.sin(desiredYaw - this.yaw), Math.cos(desiredYaw - this.yaw));
      this.yawVelocity = damp(this.yawVelocity, yawDifference * 5.2, 8, delta);
      this.yaw += this.yawVelocity * delta;
    } else if (Math.abs(this.input.turn) > 0.05) {
      this.yawVelocity = damp(this.yawVelocity, this.input.turn * 1.8, 9, delta);
      this.yaw += this.yawVelocity * delta;
    } else {
      this.yawVelocity = damp(this.yawVelocity, 0, 6, delta);
    }

    this.previousVelocity.copy(this.velocity);
    const targetVelocity = this.desiredVelocity.lengthSq() > 0
      ? this.desiredVelocity.clone().normalize().multiplyScalar(this.currentSpeed)
      : new THREE.Vector3();
    this.velocity.lerp(targetVelocity, 1 - Math.exp(-5.5 * delta));

    const obstacleScale = this.computeObstacleSpeedScale();
    root.position.addScaledVector(this.velocity, delta * obstacleScale);

    const footHeight = this.averagePlantedHeight();
    const ground = this.physics.raycastGround(root.position, 2.4, 5.5);
    const targetRootHeight = Number.isFinite(footHeight) ? footHeight : ground?.point.y ?? 0;
    this.rootHeight = damp(this.rootHeight, targetRootHeight, this.tuning.bodySpring, delta);

    const turningInPlace = Math.abs(this.input.turn) > 0.05;
    const moving = this.currentSpeed > 0.08 || turningInPlace;
    if (moving) {
      const speedFactor = THREE.MathUtils.clamp(this.currentSpeed / 1.5, 0.35, 1.75);
      this.globalPhase = (this.globalPhase + (delta / (this.tuning.stepDuration * this.gaitPlan.cycleScale)) * speedFactor) % 1;
    }

    const accelerationVector = this.velocity.clone().sub(this.previousVelocity).divideScalar(Math.max(0.001, delta));
    const localAcceleration = accelerationVector.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.yaw);
    const balanceLean = this.balance.error.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.yaw);
    const slopePitch = ground ? Math.atan2(ground.normal.z, ground.normal.y) * 0.42 : 0;
    const slopeRoll = ground ? -Math.atan2(ground.normal.x, ground.normal.y) * 0.42 : 0;
    const pitch = THREE.MathUtils.clamp(
      slopePitch - localAcceleration.z * 0.018 - balanceLean.z * this.tuning.balanceCorrection * 0.09,
      -0.3,
      0.3,
    );
    const roll = THREE.MathUtils.clamp(
      slopeRoll - this.yawVelocity * Math.min(0.12, this.currentSpeed * 0.07) +
        balanceLean.x * this.tuning.balanceCorrection * 0.1,
      -0.28,
      0.28,
    );
    const bob = moving ? Math.sin(this.globalPhase * Math.PI * 2 * Math.max(1, this.gaitPlan.legs.length / 2)) * 0.018 : Math.sin(this.time * 2) * 0.008;
    root.position.y = this.rootHeight + bob;
    root.quaternion.setFromEuler(new THREE.Euler(pitch, this.yaw, roll, 'YXZ'));
    root.updateMatrixWorld(true);

    this.updateLegs(delta, moving);
    this.updateArms(delta, moving);
    this.balance = this.balanceSolver.calculate(this.creature, root, this.poses);
    this.renderer.updateSecondaryMotion(
      this.time,
      this.currentSpeed,
      this.yawVelocity,
      this.balance.error.clone().multiplyScalar(this.tuning.tailCounterbalance),
    );
    this.debugRenderer.update(this.creature, root, this.poses, this.balance, this.velocity);

    if (moving && this.balance.stability < 0.055) this.unstableDuration += delta;
    else this.unstableDuration = Math.max(0, this.unstableDuration - delta * 2);
    if (this.unstableDuration > 1.15) this.triggerStumble();

    this.updateState(desiredSpeed, moving, turningInPlace);
    return this.snapshot();
  }

  getGaitPlan(): GaitPlan {
    return this.gaitPlan;
  }

  getBalanceSolver(): BalanceSolver {
    return this.balanceSolver;
  }

  private resetRuntimeFeet(): void {
    this.legStates.clear();
    this.poses = [];
    if (!this.creature) return;
    this.renderer.root.updateMatrixWorld(true);
    this.gaitPlan = this.gaitPlanner.plan(this.creature, this.tuning.stanceRatio);

    for (const planned of this.gaitPlan.legs) {
      const rootWorld = this.renderer.localToWorld(attachmentPointLocal(this.creature, planned.limb));
      const ground = this.physics.isReady
        ? this.physics.raycastGround(rootWorld, 2.2, 5)
        : null;
      const foot = ground?.point.clone() ?? new THREE.Vector3(rootWorld.x, 0.04, rootWorld.z);
      foot.y += 0.045;
      this.legStates.set(planned.limb.id, {
        planned,
        phase: planned.phaseOffset,
        wasSwing: false,
        planted: true,
        footWorld: foot.clone(),
        swingStart: foot.clone(),
        swingTarget: foot.clone(),
        groundNormal: ground?.normal.clone() ?? new THREE.Vector3(0, 1, 0),
      });
    }

    this.updateLegs(0, false);
    this.updateArms(0, false);
    this.balance = this.balanceSolver.calculate(this.creature, this.renderer.root, this.poses);
  }

  private computeDesiredVelocity(camera: THREE.Camera): void {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-5) forward.set(0, 0, 1);
    forward.normalize();
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    let inputVector = forward.multiplyScalar(this.input.forward).add(right.multiplyScalar(this.input.right));
    if (this.clickTarget) {
      inputVector = this.clickTarget.clone().sub(this.renderer.root.position);
      inputVector.y = 0;
      if (inputVector.length() < 0.22) {
        this.clickTarget = null;
        inputVector.set(0, 0, 0);
      }
    }

    if (inputVector.lengthSq() > 1) inputVector.normalize();
    const speed = this.input.run ? 2.65 : 1.55;
    this.desiredVelocity.copy(inputVector).multiplyScalar(speed);
  }

  private computeObstacleSpeedScale(): number {
    if (this.velocity.lengthSq() < 0.01) return 1;
    const direction = this.velocity.clone().normalize();
    const root = this.renderer.root.position;
    const lowHit = this.physics.raycast(root.clone().add(new THREE.Vector3(0, 0.22, 0)), direction, 0.72);
    if (!lowHit) return 1;
    const highHit = this.physics.raycast(
      root.clone().add(new THREE.Vector3(0, this.tuning.maxStepHeight + 0.28, 0)),
      direction,
      0.72,
    );
    if (!highHit) return 0.62;
    return 0.05;
  }

  private updateLegs(delta: number, moving: boolean): void {
    if (!this.creature) return;
    const nextPoses: LimbRuntimePose[] = this.poses.filter((pose) => !this.legStates.has(pose.limbId));
    for (const state of this.legStates.values()) {
      const { planned } = state;
      const phase = moving ? (this.globalPhase + planned.phaseOffset) % 1 : state.phase;
      state.phase = phase;
      const swing = moving && phase >= planned.stanceRatio;
      const transitionedToSwing = swing && !state.wasSwing;
      const transitionedToStance = !swing && state.wasSwing;

      if (transitionedToSwing) {
        state.planted = false;
        state.swingStart.copy(state.footWorld);
        const target = this.computeFootTarget(planned.limb);
        state.swingTarget.copy(target.point);
        state.groundNormal.copy(target.normal);
      }
      if (transitionedToStance) {
        state.footWorld.copy(state.swingTarget);
        state.planted = true;
      }

      if (swing) {
        const swingT = clamp01((phase - planned.stanceRatio) / Math.max(0.001, 1 - planned.stanceRatio));
        const eased = smoothstep(0, 1, swingT);
        state.footWorld.lerpVectors(state.swingStart, state.swingTarget, eased);
        const rise = Math.sin(Math.PI * swingT);
        const terrainRise = Math.max(0, state.swingTarget.y - state.swingStart.y);
        state.footWorld.y += rise * Math.max(this.tuning.stepHeight, terrainRise + 0.09);
      }
      state.wasSwing = swing;

      const rootWorld = this.renderer.getAttachmentWorld(planned.limb);
      const lengths = planned.limb.segments.map((segment) => segment.length);
      const bend = v3(planned.limb.bendDirection).applyQuaternion(this.renderer.root.quaternion);
      const points = solveFabrik(rootWorld, state.footWorld, lengths, bend, 9);
      this.renderer.applyLimbPose(planned.limb.id, points);
      this.renderer.setEndEffectorNormal(planned.limb.id, state.groundNormal);
      nextPoses.push({
        limbId: planned.limb.id,
        points: points.map(data3),
        footTarget: data3(state.footWorld),
        planted: state.planted,
        phase,
      });
    }
    this.poses = nextPoses;
  }

  private updateArms(_delta: number, moving: boolean): void {
    if (!this.creature) return;
    const { arms, decorative } = classifyLimbs(this.creature);
    const nonLegs = [...arms, ...decorative];
    for (const limb of nonLegs) {
      const rootWorld = this.renderer.getAttachmentWorld(limb);
      const lengths = limb.segments.map((segment) => segment.length);
      const totalLength = lengths.reduce((sum, length) => sum + length, 0);
      const side = limb.side === 'left' ? -1 : limb.side === 'right' ? 1 : 0;
      const role = effectiveRole(this.creature, limb);
      let target: THREE.Vector3;

      if (role === 'decorative') {
        const normal = attachmentNormalLocal(this.creature, limb).applyQuaternion(this.renderer.root.quaternion);
        target = rootWorld.clone().addScaledVector(normal, totalLength * 0.86);
      } else {
        const sameSideLegs = this.gaitPlan.legs.filter((entry) => entry.limb.side === limb.side);
        const legPhase = sameSideLegs.length
          ? (this.globalPhase + sameSideLegs[0]!.phaseOffset) % 1
          : this.globalPhase + (side < 0 ? 0 : 0.5);
        const swing = moving ? Math.sin(legPhase * Math.PI * 2) * this.currentSpeed * this.tuning.armSwing : 0;
        const balance = this.balance.error.clone().multiplyScalar(this.tuning.balanceCorrection * 0.8);
        const localTarget = new THREE.Vector3(
          side * (0.25 + totalLength * 0.12),
          -totalLength * 0.76 + Math.sin(this.time * 2 + side) * 0.025,
          0.12 - swing * 0.22,
        );
        localTarget.x += balance.x * (role === 'balance' ? 1.3 : 0.5);
        localTarget.z += balance.z * (role === 'balance' ? 1.1 : 0.35) - this.yawVelocity * side * 0.12;
        target = rootWorld.clone().add(localTarget.applyQuaternion(this.renderer.root.quaternion));
      }

      const bend = v3(limb.bendDirection).applyQuaternion(this.renderer.root.quaternion);
      const points = solveFabrik(rootWorld, target, lengths, bend, 8);
      this.renderer.applyLimbPose(limb.id, points);
      const pose: LimbRuntimePose = {
        limbId: limb.id,
        points: points.map(data3),
        footTarget: data3(points[points.length - 1]!),
        planted: false,
        phase: this.globalPhase,
      };
      const existingIndex = this.poses.findIndex((entry) => entry.limbId === limb.id);
      if (existingIndex >= 0) this.poses[existingIndex] = pose;
      else this.poses.push(pose);
    }
  }

  private computeFootTarget(limb: LimbDefinition): { point: THREE.Vector3; normal: THREE.Vector3 } {
    const attachment = this.renderer.getAttachmentWorld(limb);
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const strideScale = this.currentSpeed < 0.08 ? 0 : THREE.MathUtils.clamp(this.currentSpeed / 1.55, 0.25, 1.5);
    const legCountScale = 1 / Math.max(1, Math.sqrt(this.gaitPlan.legs.length / 2));
    const velocityLead = this.velocity.clone().multiplyScalar(this.tuning.stepDuration * 0.28);
    const target = new THREE.Vector3(attachment.x, this.renderer.root.position.y, attachment.z)
      .addScaledVector(forward, this.tuning.stepLength * strideScale * legCountScale)
      .add(velocityLead);
    const ground = this.physics.raycastGround(target, 2.5, 6);
    if (ground) {
      const slopeDegrees = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(ground.normal.y, -1, 1)));
      if (slopeDegrees > this.tuning.maxSlopeDegrees) {
        const current = this.legStates.get(limb.id)?.footWorld;
        return {
          point: current?.clone() ?? new THREE.Vector3(target.x, this.renderer.root.position.y + 0.045, target.z),
          normal: new THREE.Vector3(0, 1, 0),
        };
      }
      const maxHeightDelta = this.tuning.maxStepHeight;
      const currentHeight = this.legStates.get(limb.id)?.footWorld.y ?? ground.point.y;
      if (ground.point.y - currentHeight > maxHeightDelta) {
        return {
          point: new THREE.Vector3(target.x, currentHeight, target.z).addScaledVector(forward, -0.18),
          normal: new THREE.Vector3(0, 1, 0),
        };
      }
      return { point: ground.point.add(new THREE.Vector3(0, 0.045, 0)), normal: ground.normal };
    }
    return { point: new THREE.Vector3(target.x, 0.045, target.z), normal: new THREE.Vector3(0, 1, 0) };
  }

  private averagePlantedHeight(): number {
    const planted = [...this.legStates.values()].filter((state) => state.planted);
    if (!planted.length) return Number.NaN;
    return planted.reduce((sum, state) => sum + state.footWorld.y - 0.045, 0) / planted.length;
  }

  private updateIdleEditor(delta: number): void {
    const root = this.renderer.root;
    root.position.y = damp(root.position.y, 0, 6, delta);
    root.rotation.x = damp(root.rotation.x, 0, 6, delta);
    root.rotation.z = damp(root.rotation.z, 0, 6, delta);
    root.updateMatrixWorld(true);
    if (this.creature) {
      this.renderer.updateSecondaryMotion(this.time, 0, 0, new THREE.Vector3());
      this.balance = this.balanceSolver.calculate(this.creature, root, this.poses);
      this.debugRenderer.update(this.creature, root, this.poses, this.balance, this.velocity.set(0, 0, 0));
    }
  }

  private triggerStumble(): void {
    this.stumbleTime = 1.55;
    this.currentSpeed = 0;
    this.velocity.multiplyScalar(0.15);
    this.state = 'stumble';
  }

  private updateStumble(delta: number): void {
    this.stumbleTime -= delta;
    const root = this.renderer.root;
    const progress = 1 - clamp01(this.stumbleTime / 1.55);
    root.rotation.z = Math.sin(progress * Math.PI) * 0.65 * (this.balance.error.x >= 0 ? 1 : -1);
    root.rotation.x = Math.sin(progress * Math.PI) * 0.3;
    root.position.y = this.rootHeight - Math.sin(progress * Math.PI) * 0.14;
    this.renderer.updateSecondaryMotion(this.time, 0, 0, this.balance.error);
    if (this.stumbleTime <= 0) this.recover();
  }

  private updateState(desiredSpeed: number, moving: boolean, turningInPlace: boolean): void {
    if (turningInPlace && this.currentSpeed < 0.12) {
      this.state = 'turning';
    } else if (!moving && desiredSpeed < 0.05) {
      this.state = this.currentSpeed > 0.08 ? 'stopping' : 'idle';
    } else if (this.currentSpeed < 0.45) {
      this.state = 'starting';
    } else if (this.input.run || this.currentSpeed > 1.9) {
      this.state = 'fast walk';
    } else {
      this.state = 'walking';
    }
  }

  private snapshot(): LocomotionSnapshot {
    return {
      speed: this.currentSpeed,
      gait: this.gaitPlan.name,
      stability: this.balance.stability,
      canStand: this.balance.canStand,
      state: this.state,
      bodyPosition: this.renderer.root.position.clone(),
      velocity: this.velocity.clone(),
      balance: this.balance,
      poses: this.poses,
    };
  }
}
