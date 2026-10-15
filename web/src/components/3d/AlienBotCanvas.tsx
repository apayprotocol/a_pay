'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AlienBotCanvasProps {
  isHovered?: boolean;
  isDark?: boolean;
}

export function AlienBotCanvas({ isHovered = false, isDark = false }: AlienBotCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(isHovered);
  const isDarkRef = useRef(isDark);
  hoverRef.current = isHovered;
  isDarkRef.current = isDark;

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth || 180;
    const H = el.clientHeight || 180;

    // ── 1. Scene & Camera ──────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 100);
    camera.position.set(0, 0.15, 4.8);

    // ── 2. WebGL Renderer with High-DPI Clamping ────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.4 : 1.6;
    el.appendChild(renderer.domElement);

    // ── 3. Procedural Studio Environment for PBR Reflections ────────────────
    const pmremGen = new THREE.PMREMGenerator(renderer);
    pmremGen.compileCubemapShader();

    const buildEnvMap = (dark: boolean) => {
      const size = 64;
      const px = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const t = y / (size - 1);
          const i = (y * size + x) * 4;
          if (dark) {
            // Night cyber reflection
            px[i] = Math.round(10 + t * 25);
            px[i + 1] = Math.round(20 + t * 40);
            px[i + 2] = Math.round(60 + t * 80);
          } else {
            // High-contrast day studio reflection
            px[i] = Math.round(180 + t * 50);
            px[i + 1] = Math.round(200 + t * 45);
            px[i + 2] = 255;
          }
          px[i + 3] = 255;
        }
      }
      const src = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
      src.needsUpdate = true;
      const rt = pmremGen.fromEquirectangular(src);
      src.dispose();
      return rt.texture;
    };

    const envMap = buildEnvMap(isDark);
    scene.environment = envMap;

    // ── 4. Cinematic Studio & Rim Lighting ─────────────────────────────────
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 1.0 : 1.8);
    scene.add(ambientLight);

    // Main Studio Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, isDark ? 3.8 : 5.0);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    // Base Cobalt Blue Razor Rim Light (Intense contrast edge)
    const rimLight = new THREE.DirectionalLight(0x0052ff, isDark ? 6.5 : 8.0);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    // Cyber Cyan Fill
    const fillLight = new THREE.DirectionalLight(0x00f0ff, isDark ? 3.5 : 4.5);
    fillLight.position.set(2, -3, 3);
    scene.add(fillLight);

    // Top Reactor Glow Light
    const topGlow = new THREE.PointLight(0x00f0ff, isDark ? 4.0 : 3.0, 7);
    topGlow.position.set(0, 1.8, 1);
    scene.add(topGlow);

    // ── 5. Materials: Contrast-Inverted (Day = Stealth Obsidian, Night = Pearl Ceramic) ──
    // A. Main Armor Material:
    //    DAY: Glossy Stealth Obsidian Black (High contrast on white page)
    //    NIGHT: Luminous Pearl White Ceramic (High contrast on dark page)
    const armorMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0xf1f5f9 : 0x0a0e1a, // White on dark, Black on white!
      metalness: isDark ? 0.2 : 0.88,
      roughness: isDark ? 0.12 : 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      reflectivity: 0.9,
      envMap,
      envMapIntensity: isDark ? 1.2 : 2.2,
    });

    // B. Mirror Chrome Razor Trim
    const chromeMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0xffffff : 0xe2e8f0,
      metalness: 0.98,
      roughness: 0.05,
      envMap,
      envMapIntensity: 2.5,
    });

    // C. Base Cobalt Blue Suit / Pauldron Plates
    const suitMat = new THREE.MeshPhysicalMaterial({
      color: 0x0052ff,
      metalness: 0.45,
      roughness: 0.25,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      envMap,
      envMapIntensity: 1.5,
    });

    // D. Curved Dark Glass Visor
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x030712 : 0x020617,
      metalness: 0.1,
      roughness: 0.02,
      transmission: 0.75,
      thickness: 0.5,
      ior: 1.6,
      reflectivity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      envMap,
      envMapIntensity: 3.0,
    });

    // E. Glowing Electric Cyan Plasma (Eyes, Reactor, Energy Veins)
    const plasmaMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: isDark ? 3.8 : 4.5,
      roughness: 0.05,
      metalness: 0.8,
    });

    // F. Pure White Telegram Paper Plane Emblem
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.2,
      metalness: 0.1,
      roughness: 0.1,
    });

    // G. Gunmetal Tactical Joint Material
    const jointMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.92,
      roughness: 0.2,
    });

    // ── 6. Construct High-End 3D Alien Mascot Model ────────────────────────
    const mascotGroup = new THREE.Group();
    scene.add(mascotGroup);

    // =========================================================================
    // A. SCULPTED HIGH-TECH HEAD & HELMET
    // =========================================================================
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.46, 0);
    mascotGroup.add(headGroup);

    // 1. Aerodynamic Mecha Head Sphere (64x48 segments for ultra-smooth silhouette)
    const headGeo = new THREE.SphereGeometry(0.52, 64, 48);
    const headMesh = new THREE.Mesh(headGeo, armorMat);
    headMesh.scale.set(1.08, 0.98, 0.98);
    headGroup.add(headMesh);

    // 2. Sculpted Helmet Brow Plate (Gives intelligent, heroic mecha look)
    const browShape = new THREE.Shape();
    browShape.moveTo(-0.45, 0);
    browShape.quadraticCurveTo(0, 0.18, 0.45, 0);
    browShape.lineTo(0.38, -0.12);
    browShape.quadraticCurveTo(0, 0.02, -0.38, -0.12);
    browShape.closePath();

    const browGeo = new THREE.ExtrudeGeometry(browShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 3,
    });
    browGeo.center();
    const brow = new THREE.Mesh(browGeo, chromeMat);
    brow.position.set(0, 0.16, 0.48);
    brow.rotation.x = -0.15;
    headGroup.add(brow);

    // 3. Deep Glossy Curved Cyber Visor
    const visorGeo = new THREE.SphereGeometry(0.49, 48, 36, 0, Math.PI * 2, 0.28, 1.05);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.rotation.x = Math.PI * 0.52;
    visorMesh.position.set(0, -0.02, 0.08);
    visorMesh.scale.set(0.92, 0.74, 0.9);
    headGroup.add(visorMesh);

    // Visor Razor Chrome Frame Trim
    const vRimGeo = new THREE.TorusGeometry(0.45, 0.014, 16, 80, Math.PI * 1.15);
    const vRim = new THREE.Mesh(vRimGeo, chromeMat);
    vRim.rotation.x = Math.PI * 0.52;
    vRim.position.set(0, -0.02, 0.08);
    headGroup.add(vRim);

    // 4. Expressive Digital HUD Cyan Eyes (Wide capsule glow)
    const eyeGeo = new THREE.CapsuleGeometry(0.045, 0.11, 16, 24);
    const leftEye = new THREE.Mesh(eyeGeo, plasmaMat);
    leftEye.position.set(-0.16, -0.04, 0.48);
    leftEye.rotation.z = -0.22;
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, plasmaMat);
    rightEye.position.set(0.16, -0.04, 0.48);
    rightEye.rotation.z = 0.22;
    headGroup.add(rightEye);

    // Eye Spark Pupils (Diamond shine)
    const sparkGeo = new THREE.OctahedronGeometry(0.025, 0);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lSpark = new THREE.Mesh(sparkGeo, sparkMat);
    lSpark.position.set(-0.16, -0.03, 0.52);
    headGroup.add(lSpark);

    const rSpark = new THREE.Mesh(sparkGeo, sparkMat);
    rSpark.position.set(0.16, -0.03, 0.52);
    headGroup.add(rSpark);

    // 5. Audio Turbine Ear Pods (Mecha side pods with glowing plasma cores)
    const earHousingGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.1, 24);
    const earCoreGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.11, 16);

    const leftEar = new THREE.Mesh(earHousingGeo, jointMat);
    leftEar.rotation.z = Math.PI / 2;
    leftEar.position.set(-0.56, 0.02, 0);
    headGroup.add(leftEar);

    const leftEarRim = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 12, 32), chromeMat);
    leftEarRim.rotation.y = Math.PI / 2;
    leftEarRim.position.set(-0.61, 0.02, 0);
    headGroup.add(leftEarRim);

    const leftEarGlow = new THREE.Mesh(earCoreGeo, plasmaMat);
    leftEarGlow.rotation.z = Math.PI / 2;
    leftEarGlow.position.set(-0.57, 0.02, 0);
    headGroup.add(leftEarGlow);

    const rightEar = leftEar.clone();
    rightEar.position.set(0.56, 0.02, 0);
    headGroup.add(rightEar);

    const rightEarRim = leftEarRim.clone();
    rightEarRim.position.set(0.61, 0.02, 0);
    headGroup.add(rightEarRim);

    const rightEarGlow = leftEarGlow.clone();
    rightEarGlow.position.set(0.57, 0.02, 0);
    headGroup.add(rightEarGlow);

    // 6. High-Tech Articulated Reddit Antenna with Levitating Quantum Crystal Orb
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(0.04, 0.46, 0);
    headGroup.add(antennaGroup);

    // Antenna Base Swivel Joint
    const swivelGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const swivel = new THREE.Mesh(swivelGeo, chromeMat);
    antennaGroup.add(swivel);

    // Lower Curved Arm
    const stemLower = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.28, 16), jointMat);
    stemLower.position.set(0.02, 0.13, 0);
    stemLower.rotation.z = 0.2;
    antennaGroup.add(stemLower);

    // Knee Pivot Joint
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), chromeMat);
    knee.position.set(0.07, 0.26, 0.02);
    antennaGroup.add(knee);

    // Upper Bracket Arm
    const stemUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.22, 16), jointMat);
    stemUpper.position.set(0.12, 0.36, 0.03);
    stemUpper.rotation.z = -0.36;
    antennaGroup.add(stemUpper);

    // Magnetic Emitter Ring
    const emitterRing = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 12, 24), chromeMat);
    emitterRing.position.set(0.18, 0.46, 0.04);
    emitterRing.rotation.x = Math.PI / 3;
    antennaGroup.add(emitterRing);

    // Levitating Quantum Crystal Orb (Glowing beacon)
    const orbGeo = new THREE.SphereGeometry(0.095, 32, 32);
    const orb = new THREE.Mesh(orbGeo, plasmaMat);
    orb.position.set(0.18, 0.54, 0.04);
    antennaGroup.add(orb);

    // Orbiting Micro Gyroscope Ring around Antenna Orb
    const gyroRingGeo = new THREE.TorusGeometry(0.13, 0.008, 12, 36);
    const gyroRing = new THREE.Mesh(gyroRingGeo, chromeMat);
    gyroRing.position.copy(orb.position);
    antennaGroup.add(gyroRing);

    // =========================================================================
    // B. MECHA EXOSUIT TORSO & TELEGRAM ARC REACTOR
    // =========================================================================
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.22, 0);
    mascotGroup.add(bodyGroup);

    // 1. Sleek Tapered Mecha Torso
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.44, 0.56, 48, 6);
    const torsoMesh = new THREE.Mesh(torsoGeo, armorMat);
    bodyGroup.add(torsoMesh);

    // 2. Base Cobalt Blue Shoulder Armor Pauldrons
    const pauldronGeo = new THREE.SphereGeometry(0.2, 32, 24);
    const leftPauldron = new THREE.Mesh(pauldronGeo, suitMat);
    leftPauldron.scale.set(0.9, 0.7, 0.8);
    leftPauldron.position.set(-0.36, 0.24, 0);
    bodyGroup.add(leftPauldron);

    const rightPauldron = leftPauldron.clone();
    rightPauldron.position.set(0.36, 0.24, 0);
    bodyGroup.add(rightPauldron);

    // 3. Heavy Titanium Collar Joint
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.05, 16, 48), jointMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.3, 0);
    bodyGroup.add(collar);

    // 4. Glowing Blue Energy Veins / Conduits (Running down chest)
    const veinGeo = new THREE.BoxGeometry(0.02, 0.26, 0.015);
    const leftVein = new THREE.Mesh(veinGeo, plasmaMat);
    leftVein.position.set(-0.16, 0.06, 0.36);
    leftVein.rotation.z = -0.15;
    bodyGroup.add(leftVein);

    const rightVein = new THREE.Mesh(veinGeo, plasmaMat);
    rightVein.position.set(0.16, 0.06, 0.36);
    rightVein.rotation.z = 0.15;
    bodyGroup.add(rightVein);

    // 5. Central Glowing Hexagonal Telegram Arc Reactor (Heart of the Mascot)
    const reactorGroup = new THREE.Group();
    reactorGroup.position.set(0, 0.02, 0.38);
    bodyGroup.add(reactorGroup);

    // Chrome Hexagonal Bezel
    const hexBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 6), chromeMat);
    hexBezel.rotation.x = Math.PI / 2;
    reactorGroup.add(hexBezel);

    // Blue Telegram Core Plate
    const tgPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.035, 24), suitMat);
    tgPlate.rotation.x = Math.PI / 2;
    reactorGroup.add(tgPlate);

    // Luminous Extruded 3D Telegram Paper Plane
    const planeShape = new THREE.Shape();
    planeShape.moveTo(0.08, 0.02);
    planeShape.lineTo(-0.065, 0.065);
    planeShape.lineTo(-0.035, 0.005);
    planeShape.lineTo(-0.065, -0.065);
    planeShape.closePath();

    const planeGeo = new THREE.ExtrudeGeometry(planeShape, {
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 3,
    });
    planeGeo.center();
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.rotation.z = 0.18;
    planeMesh.position.set(0, 0, 0.03);
    planeMesh.scale.set(1.15, 1.15, 1.15);
    reactorGroup.add(planeMesh);

    // =========================================================================
    // C. ARTICULATED MECHA ARMS & HOLOGRAPHIC WAVE
    // =========================================================================
    // 1. Left Arm (Stylish rest pose on hip)
    const armGeo = new THREE.CapsuleGeometry(0.076, 0.28, 12, 24);
    const leftArm = new THREE.Mesh(armGeo, suitMat);
    leftArm.position.set(-0.44, 0.02, 0.04);
    leftArm.rotation.z = 0.44;
    leftArm.rotation.x = 0.14;
    bodyGroup.add(leftArm);

    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.088, 24, 20), armorMat);
    leftHand.position.set(-0.54, -0.18, 0.12);
    bodyGroup.add(leftHand);

    // 2. Right Arm (Friendly interactive waving arm)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.42, 0.14, 0.04);
    bodyGroup.add(rightArmGroup);

    const rightUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.22, 12, 24), suitMat);
    rightUpperArm.position.set(0.1, 0.1, 0.04);
    rightUpperArm.rotation.z = -0.78;
    rightUpperArm.rotation.x = 0.28;
    rightArmGroup.add(rightUpperArm);

    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 24, 20), armorMat);
    rightHand.position.set(0.26, 0.28, 0.1);
    rightArmGroup.add(rightHand);

    // Floating Holographic Energy Disc in Right Palm
    const palmHolo = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.01, 10, 36), plasmaMat);
    palmHolo.position.set(0.26, 0.28, 0.18);
    palmHolo.rotation.x = Math.PI / 3.5;
    rightArmGroup.add(palmHolo);

    // Mini Orbiting Telegram Beacon above palm
    const miniBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 1), planeMat);
    miniBeacon.position.set(0.26, 0.38, 0.18);
    rightArmGroup.add(miniBeacon);

    // =========================================================================
    // D. LEVITATION BASE & DUAL COUNTER-ROTATING GYROSCOPES
    // =========================================================================
    // Ion Thruster Ring (Base glowing ring)
    const thrusterRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.016, 16, 96), plasmaMat);
    thrusterRing.rotation.x = Math.PI / 2;
    thrusterRing.position.set(0, -0.58, 0);
    mascotGroup.add(thrusterRing);

    // Outer Chrome Gyroscopic Orbital Ring
    const gyroOrbit = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.009, 12, 120), chromeMat);
    gyroOrbit.rotation.x = Math.PI / 2.3;
    gyroOrbit.rotation.z = 0.35;
    gyroOrbit.position.set(0, -0.5, 0);
    mascotGroup.add(gyroOrbit);

    // 2 Orbiting Quantum Micro-Drones
    const droneGeo = new THREE.OctahedronGeometry(0.04, 1);
    const drone1 = new THREE.Mesh(droneGeo, plasmaMat);
    const drone2 = new THREE.Mesh(droneGeo, chromeMat);
    mascotGroup.add(drone1);
    mascotGroup.add(drone2);

    // ── 7. Interactive Mouse / Pointer Tracker ──────────────────────────────
    let targetX = 0;
    let targetY = 0;
    let curRotY = 0;
    let curRotX = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = Math.max(-1, Math.min(1, x));
      targetY = Math.max(-1, Math.min(1, y));
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });

    // ── 8. Visibility Gate ──────────────────────────────────────────────────
    let isVisible = true;
    const handleVis = () => {
      isVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVis);

    // ── 9. Render & Animation Loop ──────────────────────────────────────────
    let animId = 0;
    const clock = new THREE.Clock();
    let blinkTimer = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Smooth tracking interpolation
      curRotY += (targetX * 0.48 - curRotY) * 0.07;
      curRotX += (-targetY * 0.36 - curRotX) * 0.07;

      // Head & Visor follow cursor
      headGroup.rotation.y = curRotY * 0.7;
      headGroup.rotation.x = curRotX * 0.48;

      // Eyes follow cursor with subtle parallax
      leftEye.position.x = -0.16 + curRotY * 0.035;
      leftEye.position.y = -0.04 + curRotX * 0.025;
      rightEye.position.x = 0.16 + curRotY * 0.035;
      rightEye.position.y = -0.04 + curRotX * 0.025;
      lSpark.position.x = -0.16 + curRotY * 0.04;
      lSpark.position.y = -0.03 + curRotX * 0.03;
      rSpark.position.x = 0.16 + curRotY * 0.04;
      rSpark.position.y = -0.03 + curRotX * 0.03;

      // Realistic Cyber Eye Blink
      blinkTimer += delta;
      if (blinkTimer > 3.6 + Math.sin(elapsed * 0.4) * 0.8) {
        const bProg = (blinkTimer - 3.6) / 0.15;
        const bScale = bProg < 0.5 ? 1 - bProg * 2 : (bProg - 0.5) * 2;
        leftEye.scale.y = Math.max(0.08, bScale);
        rightEye.scale.y = Math.max(0.08, bScale);
        if (blinkTimer > 3.9) blinkTimer = 0;
      } else {
        leftEye.scale.y = 1;
        rightEye.scale.y = 1;
      }

      // Friendly wave gesture (faster and wider on hover)
      const waveSpeed = hoverRef.current ? 8.5 : 3.0;
      const waveAmp = hoverRef.current ? 0.42 : 0.14;
      rightArmGroup.rotation.z = Math.sin(elapsed * waveSpeed) * waveAmp;
      rightArmGroup.rotation.x = Math.sin(elapsed * waveSpeed * 0.8) * waveAmp * 0.5;

      palmHolo.rotation.z += 0.08;
      miniBeacon.rotation.y += 0.06;
      miniBeacon.position.y = 0.38 + Math.sin(elapsed * 4.0) * 0.03;

      // Floating Levitation Bobbing
      const floatHeight = Math.sin(elapsed * 2.0) * 0.06;
      mascotGroup.position.y = floatHeight;
      mascotGroup.rotation.z = Math.sin(elapsed * 1.4) * 0.015;

      // Thruster ring pulse
      const thrusterPulse = 1.0 + Math.sin(elapsed * 3.5) * 0.08;
      thrusterRing.scale.setScalar(thrusterPulse);
      thrusterRing.rotation.z += 0.02;

      // Counter-rotating outer gyroscope
      gyroOrbit.rotation.y += 0.018;
      gyroOrbit.rotation.z += 0.009;

      // Orbiting Drones
      const a1 = elapsed * 2.0;
      drone1.position.set(
        Math.cos(a1) * 0.72,
        Math.sin(a1 * 0.6) * 0.16 - 0.5,
        Math.sin(a1) * 0.72,
      );
      drone1.rotation.x += 0.08;
      drone1.rotation.y += 0.06;

      const a2 = a1 + Math.PI;
      drone2.position.set(
        Math.cos(a2) * 0.72,
        Math.sin(a2 * 0.6) * 0.16 - 0.5,
        Math.sin(a2) * 0.72,
      );
      drone2.rotation.x -= 0.08;
      drone2.rotation.y -= 0.06;

      // Antenna Gyro & Plasma Pulse
      gyroRing.rotation.x += 0.03;
      gyroRing.rotation.y += 0.04;
      const orbPulse = (isDarkRef.current ? 3.8 : 4.5) + Math.sin(elapsed * 4.5) * 1.0;
      plasmaMat.emissiveIntensity = orbPulse;

      renderer.render(scene, camera);
    };

    animate();

    // ── 10. Resize ──────────────────────────────────────────────────────────
    const handleResize = () => {
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // ── 11. Cleanup ─────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVis);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);

      pmremGen.dispose();
      envMap.dispose();
      renderer.dispose();

      for (const m of [
        armorMat,
        chromeMat,
        suitMat,
        visorMat,
        plasmaMat,
        planeMat,
        jointMat,
        sparkMat,
      ]) {
        m.dispose();
      }
    };
  }, [isDark]);

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none pointer-events-none">
      <div ref={mountRef} className="w-full h-full flex items-center justify-center" />
    </div>
  );
}
