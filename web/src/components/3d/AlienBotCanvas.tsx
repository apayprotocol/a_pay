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
    camera.position.set(0, 0.06, 3.95);

    // ── 2. WebGL Renderer with High-DPI Clamping ────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.5 : 1.7;
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
            px[i] = Math.round(10 + t * 25);
            px[i + 1] = Math.round(20 + t * 40);
            px[i + 2] = Math.round(60 + t * 80);
          } else {
            px[i] = Math.round(210 + t * 35);
            px[i + 1] = Math.round(225 + t * 25);
            px[i + 2] = Math.round(245 + t * 10);
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

    // ── 4. Cinematic Studio & Rim Lighting (Day & Night Calibrated) ────────
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 1.0 : 2.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, isDark ? 3.8 : 5.5);
    keyLight.position.set(4, 5, 4.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x0052ff, isDark ? 8.0 : 6.0);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x00f0ff, isDark ? 4.5 : 4.0);
    fillLight.position.set(2, -3, 3);
    scene.add(fillLight);

    const topGlow = new THREE.PointLight(0x00f0ff, isDark ? 4.5 : 3.5, 7);
    topGlow.position.set(0, 1.8, 1);
    scene.add(topGlow);

    // ── 5. Materials: Daytime Arctic Ceramic & Nighttime Stealth Obsidian ──
    const armorMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x0b1120 : 0xf8fafc, // Obsidian Stealth at Night, Arctic Pearl Ceramic at Day
      metalness: isDark ? 0.88 : 0.32,
      roughness: isDark ? 0.15 : 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.95,
      envMap,
      envMapIntensity: isDark ? 1.8 : 1.5,
    });

    // Dark sleek titanium bezel trim (Contrasting frame lines for razor sharpness)
    const bezelMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e293b : 0x0f172a,
      metalness: 0.95,
      roughness: 0.2,
      envMap,
      envMapIntensity: 1.5,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0xffffff : 0xe2e8f0,
      metalness: 0.98,
      roughness: 0.05,
      envMap,
      envMapIntensity: 2.5,
    });

    const suitMat = new THREE.MeshPhysicalMaterial({
      color: 0x0052ff, // Base Cobalt Blue
      metalness: 0.55,
      roughness: 0.2,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      envMap,
      envMapIntensity: 1.8,
    });

    // Deep curved cyber glass visor
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x020617 : 0x071126,
      metalness: 0.2,
      roughness: 0.02,
      transmission: 0.68,
      thickness: 0.45,
      ior: 1.55,
      reflectivity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      envMap,
      envMapIntensity: 2.8,
    });

    // Dynamic Cyber HUD Eye Material (Interactive Color Logic)
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x00f5ff,
      emissive: 0x00f5ff,
      emissiveIntensity: isDark ? 6.0 : 6.8, // Punchy and luminous in daylight
      roughness: 0.05,
      metalness: 0.2,
    });

    // Inner glowing HUD ring
    const hudRingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: isDark ? 5.5 : 6.5,
      roughness: 0.0,
    });

    // Plasma Material for thruster and conduits
    const plasmaMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: isDark ? 4.8 : 5.2,
      roughness: 0.05,
      metalness: 0.8,
    });

    const planeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.2,
      metalness: 0.1,
      roughness: 0.1,
    });

    const jointMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e293b : 0x334155,
      metalness: 0.92,
      roughness: 0.2,
    });

    // ── 6. Construct High-End 3D Alien Mascot Model ────────────────────────
    const mascotGroup = new THREE.Group();
    scene.add(mascotGroup);

    // =========================================================================
    // A. SEAMLESS AERODYNAMIC HEAD & EXPRESSIVE CYBER HUD EYES
    // =========================================================================
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.46, 0);
    mascotGroup.add(headGroup);

    // 1. Aerodynamic Mecha Head Sphere (Smooth, unbroken curvature)
    const headGeo = new THREE.SphereGeometry(0.52, 64, 48);
    const headMesh = new THREE.Mesh(headGeo, armorMat);
    headMesh.scale.set(1.08, 0.98, 0.98);
    headGroup.add(headMesh);

    // 2. Seamless Deep Cyber Visor (Flush with helmet, no protruding white brow!)
    const visorGeo = new THREE.SphereGeometry(0.505, 48, 36, 0, Math.PI * 2, 0.3, 1.0);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.rotation.x = Math.PI * 0.52;
    visorMesh.position.set(0, -0.02, 0.06);
    visorMesh.scale.set(0.92, 0.74, 0.9);
    headGroup.add(visorMesh);

    // Subtle dark titanium bezel collar (replaces clumsy white chrome rim)
    const vRimGeo = new THREE.TorusGeometry(0.46, 0.012, 16, 80, Math.PI * 1.1);
    const vRim = new THREE.Mesh(vRimGeo, bezelMat);
    vRim.rotation.x = Math.PI * 0.52;
    vRim.position.set(0, -0.02, 0.06);
    headGroup.add(vRim);

    // =========================================================================
    // 3. UPGRADED EXPRESSIVE CYBER HUD EYE SYSTEM
    // =========================================================================
    const eyeGroup = new THREE.Group();
    headGroup.add(eyeGroup);

    // Left Cyber Eye (Smooth rounded aperture, highly expressive)
    const eyeGeo = new THREE.SphereGeometry(0.082, 32, 24);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.16, -0.035, 0.45);
    leftEye.scale.set(1.15, 0.88, 0.35);
    leftEye.rotation.z = -0.06;
    eyeGroup.add(leftEye);

    // Left Inner Glowing HUD Reticle Ring
    const hudRingGeo = new THREE.TorusGeometry(0.046, 0.007, 12, 32);
    const leftHudRing = new THREE.Mesh(hudRingGeo, hudRingMat);
    leftHudRing.position.set(-0.16, -0.035, 0.485);
    eyeGroup.add(leftHudRing);

    // Left Specular Glint (Living spark of intelligence)
    const glintGeo = new THREE.SphereGeometry(0.016, 12, 12);
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftGlint = new THREE.Mesh(glintGeo, glintMat);
    leftGlint.position.set(-0.14, -0.015, 0.49);
    eyeGroup.add(leftGlint);

    // Right Cyber Eye
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.16, -0.035, 0.45);
    rightEye.scale.set(1.15, 0.88, 0.35);
    rightEye.rotation.z = 0.06;
    eyeGroup.add(rightEye);

    // Right Inner Glowing HUD Reticle Ring
    const rightHudRing = new THREE.Mesh(hudRingGeo, hudRingMat);
    rightHudRing.position.set(0.16, -0.035, 0.485);
    eyeGroup.add(rightHudRing);

    // Right Specular Glint
    const rightGlint = new THREE.Mesh(glintGeo, glintMat);
    rightGlint.position.set(0.18, -0.015, 0.49);
    eyeGroup.add(rightGlint);

    // 4. Audio Turbine Ear Pods with glowing plasma cores
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

    // 5. High-Tech Articulated Reddit Antenna with Levitating Quantum Crystal Orb
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(0.04, 0.46, 0);
    headGroup.add(antennaGroup);

    const swivel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), chromeMat);
    antennaGroup.add(swivel);

    const stemLower = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.28, 16), jointMat);
    stemLower.position.set(0.02, 0.13, 0);
    stemLower.rotation.z = 0.2;
    antennaGroup.add(stemLower);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 16), chromeMat);
    knee.position.set(0.07, 0.26, 0.02);
    antennaGroup.add(knee);

    const stemUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.22, 16), jointMat);
    stemUpper.position.set(0.12, 0.36, 0.03);
    stemUpper.rotation.z = -0.36;
    antennaGroup.add(stemUpper);

    const emitterRing = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 12, 24), chromeMat);
    emitterRing.position.set(0.18, 0.46, 0.04);
    emitterRing.rotation.x = Math.PI / 3;
    antennaGroup.add(emitterRing);

    const orbGeo = new THREE.SphereGeometry(0.095, 32, 32);
    const orb = new THREE.Mesh(orbGeo, plasmaMat);
    orb.position.set(0.18, 0.54, 0.04);
    antennaGroup.add(orb);

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

    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.44, 0.56, 48, 6);
    const torsoMesh = new THREE.Mesh(torsoGeo, armorMat);
    bodyGroup.add(torsoMesh);

    const pauldronGeo = new THREE.SphereGeometry(0.2, 32, 24);
    const leftPauldron = new THREE.Mesh(pauldronGeo, suitMat);
    leftPauldron.scale.set(0.9, 0.7, 0.8);
    leftPauldron.position.set(-0.36, 0.24, 0);
    bodyGroup.add(leftPauldron);

    const rightPauldron = leftPauldron.clone();
    rightPauldron.position.set(0.36, 0.24, 0);
    bodyGroup.add(rightPauldron);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.05, 16, 48), jointMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.3, 0);
    bodyGroup.add(collar);

    const veinGeo = new THREE.BoxGeometry(0.02, 0.26, 0.015);
    const leftVein = new THREE.Mesh(veinGeo, plasmaMat);
    leftVein.position.set(-0.16, 0.06, 0.36);
    leftVein.rotation.z = -0.15;
    bodyGroup.add(leftVein);

    const rightVein = new THREE.Mesh(veinGeo, plasmaMat);
    rightVein.position.set(0.16, 0.06, 0.36);
    rightVein.rotation.z = 0.15;
    bodyGroup.add(rightVein);

    // Central Glowing Hexagonal Telegram Arc Reactor
    const reactorGroup = new THREE.Group();
    reactorGroup.position.set(0, 0.02, 0.38);
    bodyGroup.add(reactorGroup);

    const hexBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 6), chromeMat);
    hexBezel.rotation.x = Math.PI / 2;
    reactorGroup.add(hexBezel);

    const tgPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.035, 24), suitMat);
    tgPlate.rotation.x = Math.PI / 2;
    reactorGroup.add(tgPlate);

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
    const armGeo = new THREE.CapsuleGeometry(0.076, 0.28, 12, 24);
    const leftArm = new THREE.Mesh(armGeo, suitMat);
    leftArm.position.set(-0.44, 0.02, 0.04);
    leftArm.rotation.z = 0.44;
    leftArm.rotation.x = 0.14;
    bodyGroup.add(leftArm);

    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.088, 24, 20), armorMat);
    leftHand.position.set(-0.54, -0.18, 0.12);
    bodyGroup.add(leftHand);

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

    const palmHolo = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.01, 10, 36), plasmaMat);
    palmHolo.position.set(0.26, 0.28, 0.18);
    palmHolo.rotation.x = Math.PI / 3.5;
    rightArmGroup.add(palmHolo);

    const miniBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 1), planeMat);
    miniBeacon.position.set(0.26, 0.38, 0.18);
    rightArmGroup.add(miniBeacon);

    // =========================================================================
    // D. LEVITATION BASE & DUAL COUNTER-ROTATING GYROSCOPES
    // =========================================================================
    const thrusterRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.016, 16, 96), plasmaMat);
    thrusterRing.rotation.x = Math.PI / 2;
    thrusterRing.position.set(0, -0.58, 0);
    mascotGroup.add(thrusterRing);

    const gyroOrbit = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.009, 12, 120), chromeMat);
    gyroOrbit.rotation.x = Math.PI / 2.3;
    gyroOrbit.rotation.z = 0.35;
    gyroOrbit.position.set(0, -0.5, 0);
    mascotGroup.add(gyroOrbit);

    const droneGeo = new THREE.OctahedronGeometry(0.04, 1);
    const drone1 = new THREE.Mesh(droneGeo, plasmaMat);
    const drone2 = new THREE.Mesh(droneGeo, chromeMat);
    mascotGroup.add(drone1);
    mascotGroup.add(drone2);

    // Soft Levitation Ground Shadow Disc
    const shadowGeo = new THREE.PlaneGeometry(1.3, 1.3);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, isDark ? 'rgba(0, 240, 255, 0.28)' : 'rgba(0, 82, 255, 0.22)');
      grad.addColorStop(0.35, isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(15, 23, 42, 0.16)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 64, 64);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: isDark ? 0.75 : 0.85,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, -0.66, 0);
    scene.add(shadowPlane);

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

    // Color definitions for dynamic eye logic
    const idleCyan = new THREE.Color(0x00f5ff);
    const idleBlue = new THREE.Color(0x0052ff);
    const hoverViolet = new THREE.Color(0x8b5cf6);
    const hoverElectricBlue = new THREE.Color(0x38bdf8);
    const currentEyeColor = new THREE.Color(0x00f5ff);

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

      // Micro parallax for eyes
      eyeGroup.position.x = curRotY * 0.035;
      eyeGroup.position.y = curRotX * 0.025;

      // ── DYNAMIC CYBER EYE COLOR & PULSE LOGIC ──
      if (hoverRef.current) {
        // When hovered: Energize eyes into electric violet-blue pulse with high intensity
        const hoverWave = (Math.sin(elapsed * 5.0) + 1) * 0.5;
        const targetColor = hoverElectricBlue.clone().lerp(hoverViolet, hoverWave);
        currentEyeColor.lerp(targetColor, 0.15);
        eyeMat.emissive.copy(currentEyeColor);
        eyeMat.color.copy(currentEyeColor);
        eyeMat.emissiveIntensity = 5.5 + Math.sin(elapsed * 6.0) * 1.5;

        // Attentive wide eye scale on hover
        leftEye.scale.set(1.22, 0.96, 0.35);
        rightEye.scale.set(1.22, 0.96, 0.35);
        leftHudRing.rotation.z += 0.05;
        rightHudRing.rotation.z -= 0.05;
      } else {
        // When idle: Gentle oceanic cyan-blue cybernetic pulse
        const idleWave = (Math.sin(elapsed * 2.5) + 1) * 0.5;
        const targetColor = idleCyan.clone().lerp(idleBlue, idleWave * 0.4);
        currentEyeColor.lerp(targetColor, 0.08);
        eyeMat.emissive.copy(currentEyeColor);
        eyeMat.color.copy(currentEyeColor);
        eyeMat.emissiveIntensity = 4.0 + Math.sin(elapsed * 3.0) * 0.8;

        leftEye.scale.set(1.15, 0.88, 0.35);
        rightEye.scale.set(1.15, 0.88, 0.35);
        leftHudRing.rotation.z += 0.015;
        rightHudRing.rotation.z -= 0.015;
      }

      // Realistic Cyber Eye Blink
      blinkTimer += delta;
      if (blinkTimer > 3.6 + Math.sin(elapsed * 0.4) * 0.8) {
        const bProg = (blinkTimer - 3.6) / 0.15;
        const bScale = bProg < 0.5 ? 1 - bProg * 2 : (bProg - 0.5) * 2;
        leftEye.scale.y = Math.max(0.06, bScale * 0.88);
        rightEye.scale.y = Math.max(0.06, bScale * 0.88);
        leftHudRing.scale.y = Math.max(0.06, bScale);
        rightHudRing.scale.y = Math.max(0.06, bScale);
        leftGlint.visible = bScale > 0.4;
        rightGlint.visible = bScale > 0.4;
        if (blinkTimer > 3.9) {
          blinkTimer = 0;
          leftGlint.visible = true;
          rightGlint.visible = true;
        }
      }

      // Friendly wave gesture
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

      // Dynamic Levitation Shadow Breathing
      const shadowScale = 1.0 - floatHeight * 1.2;
      shadowPlane.scale.set(shadowScale, shadowScale, shadowScale);

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

      shadowGeo.dispose();
      shadowTex.dispose();
      shadowMat.dispose();

      for (const m of [
        armorMat,
        bezelMat,
        chromeMat,
        suitMat,
        visorMat,
        eyeMat,
        hudRingMat,
        plasmaMat,
        planeMat,
        jointMat,
        glintMat,
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
