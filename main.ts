import * as THREE from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';

function roundedBoxGeometry(width: number, height: number, depth: number, radius = 0.08): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: radius * 0.55,
    bevelThickness: radius * 0.55,
    curveSegments: 4,
  });
  geometry.center();
  return geometry;
}

export class TestArena {
  readonly group = new THREE.Group();
  readonly editorPlatform = new THREE.Group();
  readonly colliderDebug = new THREE.Group();
  private readonly dynamicMaterial = new THREE.MeshStandardMaterial({
    color: '#f8ad62',
    roughness: 0.66,
    metalness: 0.02,
  });

  constructor(
    private readonly scene: THREE.Scene,
    private readonly physics: PhysicsWorld,
  ) {
    this.group.name = 'Test arena';
    this.editorPlatform.name = 'Editor platform';
    this.colliderDebug.name = 'Collider debug';
    this.scene.add(this.group, this.editorPlatform, this.colliderDebug);
  }

  build(): void {
    this.buildEditorStage();
    this.buildGround();
    this.buildSlope();
    this.buildUnevenGround();
    this.buildSteps();
    this.buildObstacles();
    this.buildScenery();
    this.group.visible = false;
  }

  setMode(mode: 'edit' | 'test'): void {
    this.group.visible = mode === 'test';
    this.editorPlatform.visible = mode === 'edit';
  }

  private addBox(
    position: THREE.Vector3,
    size: THREE.Vector3,
    material: THREE.Material,
    rotation = new THREE.Quaternion(),
    rounded = true,
  ): THREE.Mesh {
    const geometry = rounded
      ? roundedBoxGeometry(size.x, size.y, size.z, Math.min(0.12, size.y * 0.2))
      : new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.quaternion.copy(rotation);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.physics.addFixedCuboid(position, size.clone().multiplyScalar(0.5), rotation);

    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z)),
      new THREE.LineBasicMaterial({ color: '#ffd45f', transparent: true, opacity: 0.8 }),
    );
    wire.position.copy(position);
    wire.quaternion.copy(rotation);
    this.colliderDebug.add(wire);
    return mesh;
  }

  private buildEditorStage(): void {
    const baseMaterial = new THREE.MeshStandardMaterial({ color: '#dae4ee', roughness: 0.82 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: '#a9bacb', roughness: 0.74 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.4, 0.38, 64), trimMaterial);
    base.position.y = -0.19;
    base.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.12, 0.24, 64), baseMaterial);
    top.position.y = 0.05;
    top.receiveShadow = true;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.72, 0.035, 8, 64),
      new THREE.MeshStandardMaterial({ color: '#8ca3b8', roughness: 0.45 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.19;
    this.editorPlatform.add(base, top, ring);
  }

  private buildGround(): void {
    const groundMaterial = new THREE.MeshStandardMaterial({ color: '#87b96b', roughness: 0.96 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
    this.physics.addFixedCuboid(new THREE.Vector3(0, -0.16, 0), new THREE.Vector3(17, 0.16, 17));
  }

  private buildSlope(): void {
    const slopeMaterial = new THREE.MeshStandardMaterial({ color: '#9cc47d', roughness: 0.92 });
    const angle = -THREE.MathUtils.degToRad(12);
    const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(angle, 0, 0));
    this.addBox(new THREE.Vector3(-4.4, 0.55, 0.8), new THREE.Vector3(3.4, 0.32, 5.2), slopeMaterial, rotation);
  }

  private buildUnevenGround(): void {
    const material = new THREE.MeshStandardMaterial({ color: '#78aa65', roughness: 0.95 });
    for (let x = 0; x < 4; x += 1) {
      for (let z = 0; z < 4; z += 1) {
        const height = 0.08 + ((x * 13 + z * 7) % 4) * 0.055;
        const position = new THREE.Vector3(2.2 + x * 0.8, height / 2, -3.6 + z * 0.8);
        this.addBox(position, new THREE.Vector3(0.82, height, 0.82), material);
      }
    }
  }

  private buildSteps(): void {
    const material = new THREE.MeshStandardMaterial({ color: '#b5b28d', roughness: 0.88 });
    const stepHeight = 0.22;
    for (let index = 0; index < 6; index += 1) {
      const size = new THREE.Vector3(2.1, stepHeight * (index + 1), 0.58);
      const position = new THREE.Vector3(5.7, size.y / 2, 1.7 + index * 0.58);
      this.addBox(position, size, material);
    }
  }

  private buildObstacles(): void {
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: '#7e8f91', roughness: 0.9 });
    const woodMaterial = new THREE.MeshStandardMaterial({ color: '#8b694b', roughness: 0.94 });
    this.addBox(new THREE.Vector3(0.4, 0.16, 4.5), new THREE.Vector3(1.3, 0.32, 0.7), stoneMaterial);
    this.addBox(new THREE.Vector3(2.1, 0.24, 4.65), new THREE.Vector3(0.8, 0.48, 0.8), stoneMaterial);
    this.addBox(new THREE.Vector3(-1.9, 0.27, 4.2), new THREE.Vector3(3.2, 0.32, 0.38), woodMaterial);
    this.addBox(new THREE.Vector3(-0.4, 0.68, -5.4), new THREE.Vector3(0.85, 0.24, 5.3), stoneMaterial);

    for (let index = 0; index < 4; index += 1) {
      const size = new THREE.Vector3(0.42 + index * 0.04, 0.42, 0.42 + index * 0.03);
      const mesh = new THREE.Mesh(roundedBoxGeometry(size.x, size.y, size.z, 0.08), this.dynamicMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(3.2 + index * 0.65, 0.75 + index * 0.25, 2.4);
      this.group.add(mesh);
      this.physics.addDynamicCuboid(mesh.position.clone(), size.clone().multiplyScalar(0.5), mesh);
    }
  }

  private buildScenery(): void {
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#796044', roughness: 1 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: '#5e9f5f', roughness: 0.95 });
    const rockMaterial = new THREE.MeshStandardMaterial({ color: '#6f7f80', roughness: 0.96 });

    const random = mulberry32(41592);
    for (let index = 0; index < 34; index += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 8 + random() * 7;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (Math.abs(x) < 7 && Math.abs(z) < 7) continue;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.8, 7), trunkMaterial);
      trunk.position.y = 0.9;
      trunk.castShadow = true;
      tree.add(trunk);
      const crownCount = 3 + Math.floor(random() * 3);
      for (let c = 0; c < crownCount; c += 1) {
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62 + random() * 0.3, 1), leafMaterial);
        crown.position.set((random() - 0.5) * 0.55, 1.8 + random() * 0.65, (random() - 0.5) * 0.55);
        crown.scale.y = 0.8 + random() * 0.45;
        crown.castShadow = true;
        tree.add(crown);
      }
      tree.position.set(x, 0, z);
      tree.rotation.y = random() * Math.PI * 2;
      this.group.add(tree);
    }

    for (let index = 0; index < 22; index += 1) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2 + random() * 0.35, 0), rockMaterial);
      rock.position.set((random() - 0.5) * 26, 0.15, (random() - 0.5) * 26);
      rock.scale.set(1, 0.5 + random() * 0.6, 1.1);
      rock.rotation.set(random(), random(), random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.group.add(rock);
    }

    const grassGeometry = new THREE.ConeGeometry(0.055, 0.35, 4);
    const grassMaterial = new THREE.MeshStandardMaterial({ color: '#6b9c55', roughness: 1 });
    const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, 240);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let index = 0; index < 240; index += 1) {
      const x = (random() - 0.5) * 31;
      const z = (random() - 0.5) * 31;
      quaternion.setFromEuler(new THREE.Euler(0, random() * Math.PI * 2, (random() - 0.5) * 0.2));
      scale.setScalar(0.6 + random() * 0.8);
      matrix.compose(new THREE.Vector3(x, 0.18, z), quaternion, scale);
      grass.setMatrixAt(index, matrix);
    }
    grass.castShadow = true;
    this.group.add(grass);
  }
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
