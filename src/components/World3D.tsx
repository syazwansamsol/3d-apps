import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  RESPONSIBILITY_STATIONS,
  type ResponsibilityStation
} from '../data/pemimpinCilikData';
import { playJumpSound, playTokenCollectSound } from '../utils/sound';

export interface World3DProps {
  gameState: 'title' | 'playing' | 'paused' | 'gameover';
  equippedHat: string;
  equippedTie: string;
  equippedBack: string;
  equippedGlasses: string;
  completedCheckpoints: string[];
  joystickInputRef: React.MutableRefObject<{ dx: number; dy: number }>;
  jumpTriggerRef: React.MutableRefObject<boolean>;
  onNearbyStationChange: (station: ResponsibilityStation | null) => void;
  onStationInteract: (station: ResponsibilityStation) => void;
  onCollectWorldToken: (amount: number) => void;
}

// Pre-allocated math helpers outside render loop (Zero GC)
const _forward = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _lookAtPos = new THREE.Vector3();

function createProceduralCheckerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#3b4c63';
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      if (((x + y) / 32) % 2 === 0) {
        ctx.fillRect(x + 2, y + 2, 28, 28);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  return tex;
}

function createRobloxFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  // Warm skin tone base
  ctx.fillStyle = '#f6c391';
  ctx.fillRect(0, 0, 256, 256);

  // Friendly confident Pengawas eyebrows
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(62, 82);
  ctx.lineTo(100, 86);
  ctx.moveTo(156, 86);
  ctx.lineTo(194, 82);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(82, 114, 14, 0, Math.PI * 2);
  ctx.arc(174, 114, 14, 0, Math.PI * 2);
  ctx.fill();

  // Eye shine highlights
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(77, 109, 4.5, 0, Math.PI * 2);
  ctx.arc(169, 109, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Cheerful confident smile
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(128, 148, 32, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLabelSprite(text: string, borderColorHex: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = borderColorHex;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(12, 16, 488, 96, 24);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 32), 256, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4.6, 1.15, 1);
  sprite.renderOrder = 20;
  return sprite;
}

export const World3D: React.FC<World3DProps> = ({
  gameState,
  equippedHat,
  equippedTie,
  equippedBack,
  equippedGlasses,
  completedCheckpoints,
  joystickInputRef,
  jumpTriggerRef,
  onNearbyStationChange,
  onStationInteract,
  onCollectWorldToken
}) => {
  const canvasMountRef = useRef<HTMLDivElement>(null);

  // Store mutable callbacks & props in refs so React HUD updates never tear down the WebGL canvas
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const callbacksRef = useRef({
    onNearbyStationChange,
    onStationInteract,
    onCollectWorldToken
  });
  callbacksRef.current = {
    onNearbyStationChange,
    onStationInteract,
    onCollectWorldToken
  };

  const avatarAttachmentsRef = useRef<{
    hatGroup: THREE.Group | null;
    tieMesh: THREE.Mesh | null;
    backGroup: THREE.Group | null;
    glassesGroup: THREE.Group | null;
    stationRings: Map<string, THREE.Mesh>;
  }>({
    hatGroup: null,
    tieMesh: null,
    backGroup: null,
    glassesGroup: null,
    stationRings: new Map()
  });

  // Update avatar accessories dynamically without recreating the scene
  useEffect(() => {
    const { hatGroup, tieMesh, backGroup, glassesGroup } = avatarAttachmentsRef.current;
    if (hatGroup) {
      hatGroup.children.forEach((child) => {
        child.visible = child.name === equippedHat;
      });
    }
    if (tieMesh) {
      const mat = tieMesh.material as THREE.MeshStandardMaterial;
      if (equippedTie === 'tie_gold_crest') {
        mat.color.setHex(0xf59e0b);
        mat.metalness = 0.7;
        mat.roughness = 0.2;
      } else if (equippedTie === 'tie_sapphire_ribbon') {
        mat.color.setHex(0x06b6d4);
        mat.metalness = 0.5;
        mat.roughness = 0.25;
      } else {
        mat.color.setHex(0xdc2626); // Red Pengawas tie from textbook
        mat.metalness = 0.15;
        mat.roughness = 0.5;
      }
    }
    if (backGroup) {
      backGroup.children.forEach((child) => {
        child.visible = child.name === equippedBack;
      });
    }
    if (glassesGroup) {
      glassesGroup.children.forEach((child) => {
        child.visible = child.name === equippedGlasses;
      });
    }
  }, [equippedHat, equippedTie, equippedBack, equippedGlasses]);

  // Update station ring colors when completed
  useEffect(() => {
    const { stationRings } = avatarAttachmentsRef.current;
    stationRings.forEach((ringMesh, id) => {
      const mat = ringMesh.material as THREE.MeshStandardMaterial;
      if (completedCheckpoints.includes(id)) {
        mat.emissive.setHex(0x10b981);
        mat.color.setHex(0x34d399);
      }
    });
  }, [completedCheckpoints]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // Detect software WebGL per threejs skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x38bdf8);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x38bdf8, 0.012);

    // Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      55,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      160
    );
    camera.position.set(0, 6.2, 17.5);
    camera.lookAt(0, 2.1, 6.0);

    // 3-Point Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x1e293b, 0.85);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
    sunLight.position.set(18, 32, 22);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    const d = 28;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 90;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.65);
    rimLight.position.set(-20, 15, -18);
    scene.add(rimLight);

    // Ground & School Courtyard
    const checkerTex = createProceduralCheckerTexture();
    checkerTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.88,
      metalness: 0.05
    });
    const grassFloor = new THREE.Mesh(new THREE.CylinderGeometry(58, 60, 1, 48), grassMat);
    grassFloor.position.y = -0.5;
    grassFloor.receiveShadow = true;
    scene.add(grassFloor);

    // Paved School Assembly Plaza (offset Y by +0.02 to prevent Z-fighting)
    const plazaMat = new THREE.MeshStandardMaterial({
      map: checkerTex,
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.15
    });
    const plazaMesh = new THREE.Mesh(new THREE.BoxGeometry(38, 0.08, 38), plazaMat);
    plazaMesh.position.set(0, 0.02, 0);
    plazaMesh.receiveShadow = true;
    scene.add(plazaMesh);

    // Golden Courtyard Border Trim
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.6
    });
    const pathwayMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 0.09, 26), borderMat);
    pathwayMesh.position.set(0, 0.025, 6);
    scene.add(pathwayMesh);

    // LANDMARK 1: Main School Gate ("Pintu Pagar Sekolah" + Loceng Sekolah) at Z = +21
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 21);

    const pillarGeo = new THREE.BoxGeometry(1.6, 5.5, 1.6);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6, metalness: 0.1 });
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-4.5, 2.75, 0);
    leftPillar.castShadow = true;
    gateGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(4.5, 2.75, 0);
    rightPillar.castShadow = true;
    gateGroup.add(rightPillar);

    const archBeam = new THREE.Mesh(
      new THREE.BoxGeometry(11.4, 1.2, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.35, metalness: 0.4 })
    );
    archBeam.position.set(0, 5.8, 0);
    archBeam.castShadow = true;
    gateGroup.add(archBeam);

    // Golden School Bell ("Loceng Sekolah")
    const bellMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 1.1, 16),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.18,
        metalness: 0.85,
        emissive: 0x78350f,
        emissiveIntensity: 0.3
      })
    );
    bellMesh.position.set(0, 4.7, 0);
    gateGroup.add(bellMesh);

    const gateSign = createLabelSprite('PINTU PAGAR SEKOLAH & LOCENG', '#f59e0b');
    gateSign.position.set(0, 7.3, 0);
    gateGroup.add(gateSign);
    scene.add(gateGroup);

    // LANDMARK 2: Central School Pavilion & Flagpole at (0, 0, -4)
    const flagpoleGroup = new THREE.Group();
    flagpoleGroup.position.set(0, 0, -4);
    const poleBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.7, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.3 })
    );
    poleBase.position.y = 0.3;
    flagpoleGroup.add(poleBase);

    const poleShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 9, 12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.8 })
    );
    poleShaft.position.y = 4.5;
    flagpoleGroup.add(poleShaft);

    const flagBanner = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.2, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4, metalness: 0.2 })
    );
    flagBanner.position.set(1.15, 8.2, 0);
    flagpoleGroup.add(flagBanner);
    scene.add(flagpoleGroup);

    // Decorative Instanced Trees around the outdoor perimeter (Natural barrier per threejs skill)
    const treeCount = 28;
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 2.2, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const canopyGeo = new THREE.ConeGeometry(1.9, 4.2, 9);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.65 });

    const instancedTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const instancedCanopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
    const dummy = new THREE.Object3D();
    const tintColor = new THREE.Color();

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const radius = 25 + (i % 3) * 3.5;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius;
      const scale = 0.88 + (i % 4) * 0.1;

      dummy.position.set(tx, 1.1 * scale, tz);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      instancedTrunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, 3.6 * scale, tz);
      dummy.updateMatrix();
      instancedCanopies.setMatrixAt(i, dummy.matrix);

      tintColor.setHSL(0.36 + (i % 5) * 0.015, 0.72, 0.36 + (i % 3) * 0.04);
      instancedCanopies.setColorAt(i, tintColor);
    }
    instancedTrunks.computeBoundingSphere();
    instancedCanopies.computeBoundingSphere();
    scene.add(instancedTrunks);
    scene.add(instancedCanopies);

    // 5 Interactive "Tanggungjawab Ketua Pengawas" Stations
    const stationMeshes: { station: ResponsibilityStation; floatingCrystal: THREE.Mesh }[] = [];
    avatarAttachmentsRef.current.stationRings.clear();

    RESPONSIBILITY_STATIONS.forEach((st) => {
      const stGroup = new THREE.Group();
      stGroup.position.set(st.position[0], 0, st.position[2]);

      // Base Pedestal
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.4, 0.45, 24),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 })
      );
      pedestal.position.y = 0.225;
      pedestal.receiveShadow = true;
      stGroup.add(pedestal);

      // Glowing Ring
      const isDone = completedCheckpoints.includes(st.id);
      const ringMat = new THREE.MeshStandardMaterial({
        color: isDone ? 0x34d399 : st.threeColor,
        emissive: isDone ? 0x10b981 : st.threeColor,
        emissiveIntensity: 0.65,
        roughness: 0.2,
        metalness: 0.6
      });
      const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.12, 12, 32), ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.48;
      stGroup.add(ringMesh);
      avatarAttachmentsRef.current.stationRings.set(st.id, ringMesh);

      // Floating Book / Crystal Monument
      const crystalMesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.85, 0),
        new THREE.MeshStandardMaterial({
          color: st.threeColor,
          emissive: st.threeColor,
          emissiveIntensity: 0.35,
          roughness: 0.15,
          metalness: 0.75
        })
      );
      crystalMesh.position.y = 2.4;
      crystalMesh.castShadow = true;
      stGroup.add(crystalMesh);

      // Station Floating Label
      const labelSprite = createLabelSprite(`${st.number}. ${st.title}`, st.colorHex);
      labelSprite.position.set(0, 4.1, 0);
      stGroup.add(labelSprite);

      scene.add(stGroup);
      stationMeshes.push({ station: st, floatingCrystal: crystalMesh });
    });

    // Collectible World Tokens (8 golden tokens around the plaza)
    interface WorldTokenCoin {
      mesh: THREE.Mesh;
      collected: boolean;
      respawnTimer: number;
    }
    const worldCoins: WorldTokenCoin[] = [];
    const coinGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.14, 16);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
      roughness: 0.15,
      metalness: 0.9
    });

    const coinCoords: [number, number][] = [
      [0, 5],
      [0, 0],
      [-6, 4],
      [6, 4],
      [-8, -4],
      [8, -4],
      [-5, -12],
      [5, -12]
    ];
    coinCoords.forEach(([cx, cz]) => {
      const m = new THREE.Mesh(coinGeo, coinMat);
      m.position.set(cx, 1.0, cz);
      scene.add(m);
      worldCoins.push({ mesh: m, collected: false, respawnTimer: 0 });
    });

    // =========================================================================
    // COMPOSITE 12-PART PROCEDURAL ROBLOX PENGAWAS AVATAR (Razi / Murid)
    // =========================================================================
    const playerGroup = new THREE.Group();
    playerGroup.position.set(0, 0, 8.0); // Spawn on open path in front of the school gate facing courtyard
    playerGroup.rotation.y = Math.PI; // Facing -Z (into the courtyard)

    // Contact shadow disc directly beneath avatar
    const shadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 24),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.42,
        depthWrite: false
      })
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.04;
    playerGroup.add(shadowDisc);

    const avatarBodyGroup = new THREE.Group();
    playerGroup.add(avatarBodyGroup);

    // Materials matching Razi's Pengawas uniform from the textbook image:
    // Sky-blue shirt (#60a5fa), dark navy pants (#1e293b), red tie (#dc2626), black shoes
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.55, metalness: 0.1 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.1 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf6c391, roughness: 0.6, metalness: 0.05 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.3 });

    // 1 & 2. Left and Right Legs (with pivots at hip for walking animation)
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(-0.26, 0.95, 0);
    const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.85, 0.44), pantsMat);
    leftLegMesh.position.y = -0.42;
    leftLegMesh.castShadow = true;
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.54), shoeMat);
    leftShoe.position.set(0, -0.82, 0.05);
    leftLegPivot.add(leftLegMesh, leftShoe);
    avatarBodyGroup.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(0.26, 0.95, 0);
    const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.85, 0.44), pantsMat);
    rightLegMesh.position.y = -0.42;
    rightLegMesh.castShadow = true;
    const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.54), shoeMat);
    rightShoe.position.set(0, -0.82, 0.05);
    rightLegPivot.add(rightLegMesh, rightShoe);
    avatarBodyGroup.add(rightLegPivot);

    // 3. Torso (Sky-blue Pengawas uniform shirt)
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.15, 0.52), shirtMat);
    torsoMesh.position.y = 1.52;
    torsoMesh.castShadow = true;
    avatarBodyGroup.add(torsoMesh);

    // 4. Pengawas Name Tag & School Crest on Chest
    const badgeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.1, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.2, metalness: 0.8 })
    );
    badgeMesh.position.set(-0.26, 1.82, 0.27);
    avatarBodyGroup.add(badgeMesh);

    // 5. Tie (Red Pengawas Tie default, customizable via Blind Box)
    const tieMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.2 });
    const tieMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.06), tieMat);
    tieMesh.position.set(0, 1.58, 0.27);
    avatarBodyGroup.add(tieMesh);
    avatarAttachmentsRef.current.tieMesh = tieMesh;

    // 6 & 7. Left & Right Arms (Sky-blue sleeves + hands)
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(-0.72, 1.98, 0);
    const leftSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.72, 0.38), shirtMat);
    leftSleeve.position.y = -0.32;
    leftSleeve.castShadow = true;
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.32), skinMat);
    leftHand.position.y = -0.76;
    leftArmPivot.add(leftSleeve, leftHand);
    avatarBodyGroup.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(0.72, 1.98, 0);
    const rightSleeve = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.72, 0.38), shirtMat);
    rightSleeve.position.y = -0.32;
    rightSleeve.castShadow = true;
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.32), skinMat);
    rightHand.position.y = -0.76;
    // Risalah Tanggungjawab held in right hand!
    const risalahPamphlet = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.38, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
    );
    risalahPamphlet.position.set(0.16, -0.82, 0.12);
    rightArmPivot.add(rightSleeve, rightHand, risalahPamphlet);
    avatarBodyGroup.add(rightArmPivot);

    // 8. Roblox Blocky Head with Face Texture on +Z
    const faceTex = createRobloxFaceTexture();
    const headMaterials = [
      skinMat, // right
      skinMat, // left
      skinMat, // top
      skinMat, // bottom
      new THREE.MeshStandardMaterial({ map: faceTex, color: 0xffffff, roughness: 0.5 }), // front (+Z)
      skinMat // back
    ];
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.82, 0.82), headMaterials);
    headMesh.position.y = 2.54;
    headMesh.castShadow = true;
    avatarBodyGroup.add(headMesh);

    // 9. Neat Student Hair
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.24, 0.88), hairMat);
    hairTop.position.set(0, 2.98, 0);
    avatarBodyGroup.add(hairTop);

    // 10. Customizable Hats Group (Blind Box)
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 3.08, 0);

    // Beret Ketua Pengawas Emas
    const beretMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.48, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.7 })
    );
    beretMesh.name = 'hat_beret_gold';
    beretMesh.visible = equippedHat === 'hat_beret_gold';
    hatGroup.add(beretMesh);

    // Topi Cendekiawan Bestari (Mortarboard)
    const mortarGroup = new THREE.Group();
    mortarGroup.name = 'hat_mortarboard';
    mortarGroup.visible = equippedHat === 'hat_mortarboard';
    const mortarCap = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.08, 1.15),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.3, metalness: 0.4 })
    );
    mortarCap.position.y = 0.12;
    const mortarTassel = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.35, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 })
    );
    mortarTassel.position.set(0.52, -0.02, 0.4);
    mortarGroup.add(mortarCap, mortarTassel);
    hatGroup.add(mortarGroup);

    // Mahkota Suri Teladan (Crown)
    const crownGroup = new THREE.Group();
    crownGroup.name = 'hat_crown_teladan';
    crownGroup.visible = equippedHat === 'hat_crown_teladan';
    const crownRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.46, 0.36, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.35,
        metalness: 0.9,
        roughness: 0.15
      })
    );
    crownGroup.add(crownRing);
    hatGroup.add(crownGroup);

    avatarBodyGroup.add(hatGroup);
    avatarAttachmentsRef.current.hatGroup = hatGroup;

    // 11. Customizable Back Group (Schoolbag / Rocket Jetpack / Glowing Wings)
    const backGroup = new THREE.Group();
    backGroup.position.set(0, 1.6, -0.32);

    const schoolbag = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.82, 0.36),
      new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.45, metalness: 0.2 })
    );
    schoolbag.name = 'back_schoolbag_pro';
    schoolbag.visible = equippedBack === 'back_schoolbag_pro';
    backGroup.add(schoolbag);

    const jetpackGroup = new THREE.Group();
    jetpackGroup.name = 'back_jetpack_literasi';
    jetpackGroup.visible = equippedBack === 'back_jetpack_literasi';
    const thrusterMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.35,
      metalness: 0.75,
      roughness: 0.2
    });
    const leftThruster = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.85, 12), thrusterMat);
    leftThruster.position.x = -0.25;
    const rightThruster = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.85, 12), thrusterMat);
    rightThruster.position.x = 0.25;
    jetpackGroup.add(leftThruster, rightThruster);
    backGroup.add(jetpackGroup);

    const wingsGroup = new THREE.Group();
    wingsGroup.name = 'back_wings_aurora';
    wingsGroup.visible = equippedBack === 'back_wings_aurora';
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.15
    });
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.08), wingMat);
    leftWing.position.set(-0.78, 0.18, -0.05);
    leftWing.rotation.z = 0.28;
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.08), wingMat);
    rightWing.position.set(0.78, 0.18, -0.05);
    rightWing.rotation.z = -0.28;
    wingsGroup.add(leftWing, rightWing);
    backGroup.add(wingsGroup);

    avatarBodyGroup.add(backGroup);
    avatarAttachmentsRef.current.backGroup = backGroup;

    // 12. Customizable Glasses Group
    const glassesGroup = new THREE.Group();
    glassesGroup.position.set(0, 2.58, 0.43);

    const scholarGlasses = new THREE.Mesh(
      new THREE.BoxGeometry(0.74, 0.2, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.7, roughness: 0.2 })
    );
    scholarGlasses.name = 'glasses_scholar';
    scholarGlasses.visible = equippedGlasses === 'glasses_scholar';
    glassesGroup.add(scholarGlasses);

    const holoVisor = new THREE.Mesh(
      new THREE.BoxGeometry(0.84, 0.26, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 0.75,
        metalness: 0.9,
        roughness: 0.1
      })
    );
    holoVisor.name = 'glasses_holo_visor';
    holoVisor.visible = equippedGlasses === 'glasses_holo_visor';
    glassesGroup.add(holoVisor);

    avatarBodyGroup.add(glassesGroup);
    avatarAttachmentsRef.current.glassesGroup = glassesGroup;

    scene.add(playerGroup);

    // Pre-compile shaders on hardware GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Keyboard Input Listeners on window
    const keysPressed = new Set<string>();
    let jumpVelocity = 0;
    let isGrounded = true;
    let walkDistance = 0;
    let lastNearbyId: string | null = null;
    let currentNearbyStation: ResponsibilityStation | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      const code = e.code;
      keysPressed.add(code);

      if (code === 'Space' && isGrounded && gameStateRef.current === 'playing') {
        jumpVelocity = 8.2;
        isGrounded = false;
        playJumpSound();
      }
      if (code === 'KeyE' && currentNearbyStation && gameStateRef.current === 'playing') {
        callbacksRef.current.onStationInteract(currentNearbyStation);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.code);
    };

    const handleBlur = () => {
      keysPressed.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    // Responsive ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    });
    resizeObserver.observe(container);

    // Game Loop with Software-WebGL `afterDraw` Pacing per threejs skill
    let frameId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);
      const elapsed = now * 0.001;

      // Animate floating station crystals & coins
      for (let i = 0; i < stationMeshes.length; i++) {
        const item = stationMeshes[i];
        item.floatingCrystal.rotation.y = elapsed * 1.4 + i;
        item.floatingCrystal.position.y = 2.35 + Math.sin(elapsed * 2.2 + i) * 0.22;
      }

      for (let i = 0; i < worldCoins.length; i++) {
        const coin = worldCoins[i];
        if (!coin.collected) {
          coin.mesh.rotation.z = elapsed * 2.5 + i;
          coin.mesh.position.y = 1.0 + Math.sin(elapsed * 3 + i) * 0.15;
        } else {
          coin.respawnTimer -= dt;
          if (coin.respawnTimer <= 0) {
            coin.collected = false;
            coin.mesh.visible = true;
          }
        }
      }

      if (gameStateRef.current === 'title') {
        // Live World Camera Tour during Title Screen
        const tourAngle = elapsed * 0.22;
        camera.position.set(Math.sin(tourAngle) * 24, 11, Math.cos(tourAngle) * 24);
        camera.lookAt(0, 2, 0);
      } else if (gameStateRef.current === 'playing') {
        // Handle jump trigger from mobile button
        if (jumpTriggerRef.current && isGrounded) {
          jumpVelocity = 8.2;
          isGrounded = false;
          jumpTriggerRef.current = false;
          playJumpSound();
        } else {
          jumpTriggerRef.current = false;
        }

        // Combine WASD/Arrow keys + Virtual Joystick
        let moveX = joystickInputRef.current.dx;
        let moveZ = joystickInputRef.current.dy;

        if (keysPressed.has('KeyW') || keysPressed.has('ArrowUp')) moveZ -= 1;
        if (keysPressed.has('KeyS') || keysPressed.has('ArrowDown')) moveZ += 1;
        if (keysPressed.has('KeyA') || keysPressed.has('ArrowLeft')) moveX -= 1;
        if (keysPressed.has('KeyD') || keysPressed.has('ArrowRight')) moveX += 1;

        const len = Math.hypot(moveX, moveZ);
        if (len > 1) {
          moveX /= len;
          moveZ /= len;
        }

        const speed = 7.8;
        if (len > 0.05) {
          playerGroup.position.x = THREE.MathUtils.clamp(
            playerGroup.position.x + moveX * speed * dt,
            -21,
            21
          );
          playerGroup.position.z = THREE.MathUtils.clamp(
            playerGroup.position.z + moveZ * speed * dt,
            -21,
            21
          );

          // Smoothly rotate avatar toward movement direction
          const targetAngle = Math.atan2(moveX, moveZ);
          const diff = Math.atan2(
            Math.sin(targetAngle - playerGroup.rotation.y),
            Math.cos(targetAngle - playerGroup.rotation.y)
          );
          playerGroup.rotation.y += diff * (1 - Math.exp(-12 * dt));

          // Sync limb swing to distance traveled (never skate!)
          walkDistance += len * speed * dt * 3.2;
          const swing = Math.sin(walkDistance) * 0.65;
          leftLegPivot.rotation.x = swing;
          rightLegPivot.rotation.x = -swing;
          leftArmPivot.rotation.x = -swing * 0.8;
          rightArmPivot.rotation.x = swing * 0.8;
        } else {
          // Damp limbs back to neutral stance
          const dampFactor = 1 - Math.exp(-10 * dt);
          leftLegPivot.rotation.x = THREE.MathUtils.lerp(leftLegPivot.rotation.x, 0, dampFactor);
          rightLegPivot.rotation.x = THREE.MathUtils.lerp(rightLegPivot.rotation.x, 0, dampFactor);
          leftArmPivot.rotation.x = THREE.MathUtils.lerp(leftArmPivot.rotation.x, 0, dampFactor);
          rightArmPivot.rotation.x = THREE.MathUtils.lerp(rightArmPivot.rotation.x, 0, dampFactor);
        }

        // Vertical Jump Physics
        if (!isGrounded) {
          avatarBodyGroup.position.y += jumpVelocity * dt;
          jumpVelocity -= 22.0 * dt;
          if (avatarBodyGroup.position.y <= 0) {
            avatarBodyGroup.position.y = 0;
            jumpVelocity = 0;
            isGrounded = true;
          }
        }

        // Check world token pickups
        for (let i = 0; i < worldCoins.length; i++) {
          const coin = worldCoins[i];
          if (!coin.collected) {
            const distSq =
              Math.pow(playerGroup.position.x - coin.mesh.position.x, 2) +
              Math.pow(playerGroup.position.z - coin.mesh.position.z, 2);
            if (distSq < 2.2) {
              coin.collected = true;
              coin.mesh.visible = false;
              coin.respawnTimer = 18;
              playTokenCollectSound();
              callbacksRef.current.onCollectWorldToken(5);
            }
          }
        }

        // Check proximity to Responsibility Stations
        let closestStation: ResponsibilityStation | null = null;
        let minDist = 4.2;
        for (let i = 0; i < RESPONSIBILITY_STATIONS.length; i++) {
          const st = RESPONSIBILITY_STATIONS[i];
          const dSt = Math.hypot(
            playerGroup.position.x - st.position[0],
            playerGroup.position.z - st.position[2]
          );
          if (dSt < minDist) {
            minDist = dSt;
            closestStation = st;
          }
        }

        const nextId = closestStation ? closestStation.id : null;
        if (nextId !== lastNearbyId) {
          lastNearbyId = nextId;
          currentNearbyStation = closestStation;
          callbacksRef.current.onNearbyStationChange(closestStation);
        }

        // Smooth 3rd-person Chase Camera with Exponential Damping
        _forward.set(0, 6.4, 10.5);
        _targetCamPos.copy(playerGroup.position).add(_forward);
        const camDamp = 1 - Math.exp(-6.5 * dt);
        camera.position.lerp(_targetCamPos, camDamp);

        _lookAtPos.set(playerGroup.position.x, playerGroup.position.y + 2.1, playerGroup.position.z - 1.5);
        camera.lookAt(_lookAtPos);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={canvasMountRef}
      data-testid="world-3d-canvas"
      className="fixed inset-0 w-full h-full z-0 overflow-hidden bg-slate-950"
    />
  );
};
