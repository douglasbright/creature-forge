import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CreatureStore } from '../core/CreatureStore';
import type { CreatureRenderer } from '../render/CreatureRenderer';
import type { BodySegmentDefinition, LimbDefinition, Vec3Data } from '../core/types';
import { getBodySegment, mirrorNormal, normalFromPoint } from '../core/anatomy';
import { uid, data3, v3 } from '../utils/math';

export type PalettePart =
  | 'leg-basic'
  | 'leg-long'
  | 'leg-three'
  | 'arm-basic'
  | 'arm-long'
  | 'balance-arm'
  | 'tail'
  | 'eye'
  | 'horn'
  | 'ear'
  | 'fin';

export interface AttachmentHit {
  bodyId: string;
  worldPoint: THREE.Vector3;
  localPoint: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface EditorSelection {
  type: 'body' | 'limb' | 'decoration' | null;
  id: string | null;
}

export class EditorController {
  readonly transform: TransformControls;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private enabled = true;
  private surfaceDragging = false;
  private draggedLimbId: string | null = null;
  private selected: EditorSelection = { type: null, id: null };
  private onSelectionChanged: (selection: EditorSelection) => void = () => undefined;

  constructor(
    camera: THREE.Camera,
    private readonly domElement: HTMLElement,
    private readonly scene: THREE.Scene,
    private readonly orbit: OrbitControls,
    private readonly renderer: CreatureRenderer,
    private readonly store: CreatureStore,
  ) {
    this.transform = new TransformControls(camera, domElement);
    this.transform.setMode('translate');
    this.transform.setSpace('local');
    this.transform.size = 0.72;
    this.scene.add(this.transform.getHelper());

    this.transform.addEventListener('dragging-changed', (event) => {
      this.orbit.enabled = !Boolean(event.value);
    });
    this.transform.addEventListener('mouseDown', () => this.store.beginTransaction());
    this.transform.addEventListener('mouseUp', () => this.commitBodyTransform());

    domElement.addEventListener('pointerdown', this.handlePointerDown);
    domElement.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.domElement.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('keydown', this.handleKeyDown);
    this.transform.dispose();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.transform.enabled = enabled;
    this.transform.getHelper().visible = enabled && this.selected.type === 'body';
    if (!enabled) this.renderer.showAttachmentPreview(null);
  }

  onSelection(listener: (selection: EditorSelection) => void): void {
    this.onSelectionChanged = listener;
  }

  getSelection(): EditorSelection {
    return { ...this.selected };
  }

  setTransformMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.transform.setMode(mode);
    this.transform.setSpace(mode === 'translate' ? 'world' : 'local');
  }

  reattachSelection(): void {
    if (this.selected.type === 'body' && this.selected.id) {
      const mesh = this.renderer.getBodyMesh(this.selected.id);
      if (mesh) {
        this.transform.attach(mesh);
        this.transform.getHelper().visible = this.enabled;
      }
    } else {
      this.transform.detach();
      this.transform.getHelper().visible = false;
    }
    this.renderer.setSelected(this.selected.id);
  }

  select(type: EditorSelection['type'], id: string | null): void {
    this.selected = { type, id };
    this.reattachSelection();
    this.onSelectionChanged(this.getSelection());
  }

  getAttachmentAt(clientX: number, clientY: number, part?: PalettePart): AttachmentHit | null {
    this.setPointer(clientX, clientY);
    this.raycaster.setFromCamera(this.pointer, this.getCamera());
    const bodyHits = this.raycaster.intersectObjects(this.renderer.getBodyMeshes(), false);
    for (const hit of bodyHits) {
      const bodyId = String(hit.object.userData.id ?? '');
      const body = getBodySegment(this.store.value, bodyId);
      if (!body) continue;
      const decorationPart = part === 'eye' || part === 'horn' || part === 'ear' || part === 'fin';
      const valid = decorationPart
        ? true
        : part === 'tail'
          ? body.kind === 'torso'
          : body.kind === 'torso' || body.kind === 'neck';
      if (!valid) continue;
      const localPoint = this.renderer.worldToLocal(hit.point);
      const normal = normalFromPoint(body, localPoint);
      return { bodyId, worldPoint: hit.point.clone(), localPoint, normal };
    }
    return null;
  }

  previewPalettePart(clientX: number, clientY: number, part?: PalettePart): AttachmentHit | null {
    if (!this.enabled) return null;
    const hit = this.getAttachmentAt(clientX, clientY, part);
    if (!hit) {
      this.renderer.createCandidateMarkers(this.store.value, null);
      return null;
    }
    let mirrorPoint: THREE.Vector3 | null = null;
    if (this.store.value.symmetry && Math.abs(hit.normal.x) > 0.05) {
      const body = getBodySegment(this.store.value, hit.bodyId);
      if (body) {
        const mirroredNormal = v3(mirrorNormal(data3(hit.normal)));
        const centre = v3(body.position);
        const scale = v3(body.scale);
        const quaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(body.rotation.x, body.rotation.y, body.rotation.z),
        );
        const localSurface = new THREE.Vector3(
          mirroredNormal.x * scale.x,
          mirroredNormal.y * scale.y,
          mirroredNormal.z * scale.z,
        ).applyQuaternion(quaternion).add(centre);
        mirrorPoint = this.renderer.localToWorld(localSurface);
      }
    }
    this.renderer.showAttachmentPreview(hit.worldPoint, mirrorPoint);
    return hit;
  }

  clearPalettePreview(): void {
    this.renderer.showAttachmentPreview(null);
  }

  addPalettePart(part: PalettePart, hit: AttachmentHit): void {
    if (part === 'tail') {
      this.addTail(hit.bodyId);
      return;
    }
    if (part === 'eye' || part === 'horn' || part === 'ear' || part === 'fin') {
      this.addDecoration(part, hit);
      return;
    }
    this.addLimb(part, hit);
  }

  duplicateSelected(): void {
    if (this.selected.type !== 'limb' || !this.selected.id) return;
    const source = this.store.value.limbs.find((limb) => limb.id === this.selected.id);
    if (!source) return;
    const copyId = uid('limb');
    this.store.update((draft) => {
      const copied = structuredClone(source);
      copied.id = copyId;
      copied.pairId = undefined;
      copied.name = `${source.name} copy`;
      copied.attachment.normal.z += 0.18;
      copied.segments.forEach((segment, index) => (segment.id = `${copyId}-seg-${index}`));
      draft.limbs.push(copied);
    }, 'duplicate limb');
    this.select('limb', copyId);
  }

  mirrorSelected(): void {
    if (this.selected.type !== 'limb' || !this.selected.id) return;
    const source = this.store.value.limbs.find((limb) => limb.id === this.selected.id);
    if (!source) return;
    const mirrorId = uid('limb');
    const pairId = source.pairId ?? uid('pair');
    this.store.update((draft) => {
      const original = draft.limbs.find((limb) => limb.id === source.id);
      if (original) original.pairId = pairId;
      const copied = structuredClone(source);
      copied.id = mirrorId;
      copied.pairId = pairId;
      copied.side = source.side === 'left' ? 'right' : source.side === 'right' ? 'left' : 'center';
      copied.name = `Mirrored ${source.name}`;
      copied.attachment.normal = mirrorNormal(source.attachment.normal);
      copied.bendDirection.x *= -1;
      copied.segments.forEach((segment, index) => (segment.id = `${mirrorId}-seg-${index}`));
      draft.limbs.push(copied);
    }, 'mirror limb');
    this.select('limb', mirrorId);
  }

  deleteSelected(): void {
    if (!this.selected.id || !this.selected.type) return;
    const id = this.selected.id;
    if (this.selected.type === 'limb') {
      this.store.update((draft) => {
        const limb = draft.limbs.find((entry) => entry.id === id);
        const removeIds = new Set([id]);
        if (draft.symmetry && limb?.pairId) {
          draft.limbs.filter((entry) => entry.pairId === limb.pairId).forEach((entry) => removeIds.add(entry.id));
        }
        draft.limbs = draft.limbs.filter((entry) => !removeIds.has(entry.id));
      }, 'delete limb');
    } else if (this.selected.type === 'decoration') {
      this.store.update((draft) => {
        draft.decorations = draft.decorations.filter((entry) => entry.id !== id);
      }, 'delete decoration');
    } else if (this.selected.type === 'body') {
      const body = getBodySegment(this.store.value, id);
      if (!body || body.kind === 'head' || (!body.parentId && body.kind === 'torso')) return;
      this.store.update((draft) => {
        const deleting = draft.body.find((entry) => entry.id === id);
        if (!deleting) return;
        for (const child of draft.body.filter((entry) => entry.parentId === id)) child.parentId = deleting.parentId;
        const fallback = deleting.parentId ?? draft.body.find((entry) => entry.kind === 'torso')?.id ?? '';
        for (const limb of draft.limbs.filter((entry) => entry.attachment.bodyId === id)) {
          limb.attachment.bodyId = fallback;
        }
        draft.decorations = draft.decorations.filter((entry) => entry.bodyId !== id);
        draft.body = draft.body.filter((entry) => entry.id !== id);
      }, 'delete body segment');
    }
    this.select(null, null);
  }

  private addLimb(part: Exclude<PalettePart, 'tail' | 'eye' | 'horn' | 'ear' | 'fin'>, hit: AttachmentHit): void {
    const pairId = this.store.value.symmetry && Math.abs(hit.normal.x) > 0.05 ? uid('pair') : undefined;
    const primaryId = uid('limb');
    const definitions: Record<typeof part, { lengths: number[]; role: LimbDefinition['role']; radius: number; name: string }> = {
      'leg-basic': { lengths: [0.58, 0.58], role: 'auto', radius: 0.13, name: 'Adaptive leg' },
      'leg-long': { lengths: [0.74, 0.7], role: 'locomotion', radius: 0.14, name: 'Long leg' },
      'leg-three': { lengths: [0.43, 0.46, 0.4], role: 'locomotion', radius: 0.115, name: 'Three-joint leg' },
      'arm-basic': { lengths: [0.48, 0.46], role: 'manipulator', radius: 0.1, name: 'Grasping arm' },
      'arm-long': { lengths: [0.64, 0.58], role: 'manipulator', radius: 0.105, name: 'Long arm' },
      'balance-arm': { lengths: [0.54, 0.5], role: 'balance', radius: 0.095, name: 'Balance arm' },
    };
    const config = definitions[part];
    const make = (id: string, normal: Vec3Data, side: LimbDefinition['side']): LimbDefinition => ({
      id,
      pairId,
      name: config.name,
      side,
      role: config.role,
      attachment: { bodyId: hit.bodyId, normal },
      bendDirection: { x: 0, y: 0, z: side === 'left' ? 1 : -1 },
      endEffectorScale:
        config.role === 'manipulator' || config.role === 'balance'
          ? { x: 0.18, y: 0.14, z: 0.18 }
          : { x: 0.24, y: 0.1, z: 0.34 },
      segments: config.lengths.map((length, index) => ({
        id: `${id}-seg-${index}`,
        length,
        radius: config.radius * (1 - index * 0.1),
        taper: 0.84,
      })),
    });

    const primarySide = hit.normal.x < -0.05 ? 'left' : hit.normal.x > 0.05 ? 'right' : 'center';
    this.store.update((draft) => {
      draft.limbs.push(make(primaryId, data3(hit.normal), primarySide));
      if (pairId) {
        const mirrorId = uid('limb');
        draft.limbs.push(
          make(
            mirrorId,
            mirrorNormal(data3(hit.normal)),
            primarySide === 'left' ? 'right' : primarySide === 'right' ? 'left' : 'center',
          ),
        );
      }
    }, 'attach limb');
    this.clearPalettePreview();
    this.select('limb', primaryId);
  }

  private addTail(bodyId: string): void {
    const existing = this.store.value.body.filter((segment) => segment.kind === 'tail');
    if (existing.length) return;
    const body = getBodySegment(this.store.value, bodyId) ?? this.store.value.body.find((entry) => entry.kind === 'torso');
    if (!body) return;
    const firstId = uid('tail');
    const secondId = uid('tail');
    this.store.update((draft) => {
      draft.body.push(
        {
          id: firstId,
          kind: 'tail',
          name: 'Tail base',
          position: { x: body.position.x, y: body.position.y + 0.05, z: body.position.z - body.scale.z * 1.1 },
          rotation: { x: -0.2, y: 0, z: 0 },
          scale: { x: 0.2, y: 0.16, z: 0.55 },
          parentId: body.id,
          massDensity: 0.45,
        },
        {
          id: secondId,
          kind: 'tail',
          name: 'Tail tip',
          position: { x: body.position.x, y: body.position.y + 0.18, z: body.position.z - body.scale.z * 1.85 },
          rotation: { x: -0.35, y: 0, z: 0 },
          scale: { x: 0.13, y: 0.11, z: 0.45 },
          parentId: firstId,
          massDensity: 0.35,
        },
      );
    }, 'add tail');
    this.select('body', firstId);
  }

  private addDecoration(part: 'eye' | 'horn' | 'ear' | 'fin', hit: AttachmentHit): void {
    const id = uid(part);
    const kind = part;
    const scale = part === 'eye'
      ? { x: 0.14, y: 0.18, z: 0.1 }
      : part === 'horn'
        ? { x: 0.13, y: 0.38, z: 0.13 }
        : part === 'ear'
          ? { x: 0.18, y: 0.32, z: 0.09 }
          : { x: 0.13, y: 0.34, z: 0.42 };
    this.store.update((draft) => {
      draft.decorations.push({
        id,
        kind,
        bodyId: hit.bodyId,
        normal: data3(hit.normal),
        scale,
        colour: part === 'eye' ? '#ffffff' : draft.palette.accent,
      });
      if (draft.symmetry && Math.abs(hit.normal.x) > 0.05) {
        draft.decorations.push({
          id: uid(part),
          kind,
          bodyId: hit.bodyId,
          normal: mirrorNormal(data3(hit.normal)),
          scale: { ...scale },
          colour: part === 'eye' ? '#ffffff' : draft.palette.accent,
        });
      }
    }, `add ${part}`);
    this.select('decoration', id);
  }

  private commitBodyTransform(): void {
    if (this.selected.type !== 'body' || !this.selected.id) {
      this.store.cancelTransaction();
      return;
    }
    const id = this.selected.id;
    const mesh = this.renderer.getBodyMesh(id);
    if (!mesh) {
      this.store.cancelTransaction();
      return;
    }
    const position = data3(mesh.position);
    const rotation = { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z };
    const scale = {
      x: Math.max(0.12, Math.abs(mesh.scale.x)),
      y: Math.max(0.12, Math.abs(mesh.scale.y)),
      z: Math.max(0.12, Math.abs(mesh.scale.z)),
    };
    this.store.preview((draft) => {
      const body = draft.body.find((entry) => entry.id === id);
      if (!body) return;
      body.position = position;
      body.rotation = rotation;
      body.scale = scale;
    }, 'body transform preview');
    this.store.commitTransaction('body transform');
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (!this.enabled || event.button !== 0 || this.transform.dragging) return;
    this.setPointer(event.clientX, event.clientY);
    this.raycaster.setFromCamera(this.pointer, this.getCamera());
    const hits = this.raycaster.intersectObjects(this.renderer.getSelectableObjects(), false);
    const hit = hits.find((entry) => entry.object.userData.selectable === 'limb-root') ?? hits[0];
    if (!hit) {
      this.select(null, null);
      return;
    }
    const selectable = String(hit.object.userData.selectable ?? '');
    const id = String(hit.object.userData.id ?? '');
    if (selectable === 'body') this.select('body', id);
    else if (selectable === 'limb') this.select('limb', id);
    else if (selectable === 'decoration') this.select('decoration', id);
    else if (selectable === 'limb-root') {
      this.select('limb', id);
      this.surfaceDragging = true;
      this.draggedLimbId = id;
      this.store.beginTransaction();
      this.orbit.enabled = false;
      this.domElement.setPointerCapture(event.pointerId);
    }
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.enabled || !this.surfaceDragging || !this.draggedLimbId) return;
    const hit = this.getAttachmentAt(event.clientX, event.clientY);
    if (!hit) return;
    const limbId = this.draggedLimbId;
    this.store.preview((draft) => {
      const limb = draft.limbs.find((entry) => entry.id === limbId);
      if (!limb) return;
      limb.attachment.bodyId = hit.bodyId;
      limb.attachment.normal = data3(hit.normal);
      if (draft.symmetry && limb.pairId) {
        for (const paired of draft.limbs.filter((entry) => entry.pairId === limb.pairId && entry.id !== limb.id)) {
          paired.attachment.bodyId = hit.bodyId;
          paired.attachment.normal = mirrorNormal(data3(hit.normal));
        }
      }
    }, 'move attachment preview');
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.surfaceDragging) return;
    this.surfaceDragging = false;
    this.draggedLimbId = null;
    this.orbit.enabled = true;
    this.store.commitTransaction('move limb attachment');
    if (this.domElement.hasPointerCapture(event.pointerId)) this.domElement.releasePointerCapture(event.pointerId);
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select')) return;
      this.deleteSelected();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.shiftKey ? this.store.redo() : this.store.undo();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.store.redo();
    }
  };

  private setPointer(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getCamera(): THREE.Camera {
    return this.transform.camera;
  }
}
