import type { CreatureDefinition, RigDefinition, RigJoint } from '../core/types';
import { attachmentPointLocal } from '../core/anatomy';
import { data3 } from '../utils/math';

export class RigBuilder {
  build(creature: CreatureDefinition): RigDefinition {
    const joints: RigJoint[] = [];
    const bodyJointIds = new Map<string, string>();
    const limbJointIds = new Map<string, string[]>();

    for (const body of creature.body) {
      const jointId = `joint-${body.id}`;
      bodyJointIds.set(body.id, jointId);
      joints.push({
        id: jointId,
        parentId: body.parentId ? `joint-${body.parentId}` : null,
        semantic: body.kind,
        localPosition: { ...body.position },
        preferredBend: body.kind === 'tail' ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 },
        minAngle: body.kind === 'tail' ? -1.2 : -0.55,
        maxAngle: body.kind === 'tail' ? 1.2 : 0.55,
      });
    }

    for (const limb of creature.limbs) {
      const ids: string[] = [];
      let parentId = bodyJointIds.get(limb.attachment.bodyId) ?? null;
      const root = attachmentPointLocal(creature, limb);
      const rootId = `joint-${limb.id}-root`;
      joints.push({
        id: rootId,
        parentId,
        semantic: `${limb.side}-${limb.role}-root`,
        localPosition: data3(root),
        preferredBend: { ...limb.bendDirection },
        minAngle: -1.7,
        maxAngle: 1.7,
      });
      ids.push(rootId);
      parentId = rootId;

      limb.segments.forEach((segment, index) => {
        const id = `joint-${limb.id}-${index}`;
        joints.push({
          id,
          parentId,
          semantic: index === limb.segments.length - 1 ? 'end-effector' : 'limb-joint',
          localPosition: { x: 0, y: -segment.length, z: 0 },
          preferredBend: { ...limb.bendDirection },
          minAngle: index === 0 ? -1.45 : 0.05,
          maxAngle: index === 0 ? 1.45 : 2.75,
        });
        ids.push(id);
        parentId = id;
      });
      limbJointIds.set(limb.id, ids);
    }

    return { joints, bodyJointIds, limbJointIds };
  }
}
