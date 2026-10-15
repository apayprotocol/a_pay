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

    const W = el.clientWidth || 160;
    const H = el.clientHeight || 160;

    // ── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    // ── Camera ───────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(32, W / H, 0.05, 80);
    camera.position.set(0, 0.08, 4.6);

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.1 : 1.5;
    renderer.shadowMap.enabled = false;
    el.appendChild(renderer.domElement);

    // ── Environment map (procedural gradient sphere for reflections) ──────────
    const pmremGen = new THREE.PMREMGenerator(renderer);
    pmremGen.compileCubemapShader();

    // Procedural DataTexture gradient — zero network cost, zero external deps
    const buildEnvMap = (dark: boolean) => {
      const size = 64;
      const px = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const t = y / (size - 1);
          const i = (y * size + x) * 4;
          if (dark) {
            px[i] = Math.round(2 + t * 8);
            px[i + 1] = Math.round(5 + t * 12);
            px[i + 2] = Math.round(20 + t * 22);
          } else {
            px[i] = Math.round(220 - t * 28);
            px[i + 1] = Math.round(232 - t * 18);
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
    scene.background = null;

    // ── Adaptive Lights ───────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, isDark ? 0.5 : 1.2);
    scene.add(ambient);

    // Key light
    const key = new THREE.DirectionalLight(0xffffff, isDark ? 2.5 : 4.5);
    key.position.set(3, 5, 4);
    scene.add(key);

    // Rim light — blue cobalt accent
    const rim = new THREE.DirectionalLight(0x0052ff, isDark ? 6.0 : 2.5);
    rim.position.set(-4, -1, -3);
    scene.add(rim);

    // Cyan under-fill
    const fill = new THREE.DirectionalLight(0x00eeff, isDark ? 4.0 : 1.2);
    fill.position.set(1, -4, 2);
    scene.add(fill);

    // Animated glow point
    const glowPt = new THREE.PointLight(0x0052ff, isDark ? 5.0 : 2.0, 6);
    glowPt.position.set(0, 1.4, 1.2);
    scene.add(glowPt);

    // Warm top light (day only)
    const top = new THREE.DirectionalLight(0xfff4e0, isDark ? 0 : 2.5);
    top.position.set(0, 8, 2);
    scene.add(top);

    // ── Material Factory ──────────────────────────────────────────────────────

    // Ceramic / porcelain body
    const ceramicMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0xd0ddf5 : 0xeef4ff,
      metalness: 0.0,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.7,
      envMap,
      envMapIntensity: isDark ? 1.6 : 0.9,
    });

    // Cobalt Blue suit — deep satin
    const suitMat = new THREE.MeshPhysicalMaterial({
      color: 0x0042d0,
      metalness: 0.15,
      roughness: 0.38,
      clearcoat: 0.6,
      clearcoatRoughness: 0.25,
      reflectivity: 0.5,
      envMap,
      envMapIntensity: 0.8,
    });

    // Glass visor — refraction + tint
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x001033,
      metalness: 0.0,
      roughness: 0.0,
      transmission: 0.72,
      thickness: 0.4,
      ior: 1.52,
      reflectivity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      envMap,
      envMapIntensity: isDark ? 3.0 : 1.8,
    });

    // Emissive cyan — eyes, antenna orb, hover ring
    const cyanMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x00eeff : 0x0080ff,
      emissive: isDark ? 0x00ddff : 0x0055ff,
      emissiveIntensity: isDark ? 3.5 : 1.8,
      roughness: 0.0,
      metalness: 0.3,
      envMap,
      envMapIntensity: 0.5,
    });

    // Telegram official blue (badge)
    const tgBlueMat = new THREE.MeshPhysicalMaterial({
      color: 0x229ed9,
      metalness: 0.1,
      roughness: 0.22,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      envMap,
      envMapIntensity: 0.7,
    });

    // Paper plane — satin white
    const planeMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: isDark ? 1.2 : 0.4,
      metalness: 0.0,
      roughness: 0.12,
      clearcoat: 0.8,
      clearcoatRoughness: 0.05,
    });

    // Dark joint / collar — titanium
    const jointMat = new THREE.MeshPhysicalMaterial({
      color: 0x131a2e,
      metalness: 0.92,
      roughness: 0.12,
      clearcoat: 0.5,
      reflectivity: 1.0,
      envMap,
      envMapIntensity: 1.2,
    });

    // ── Root mascot group ─────────────────────────────────────────────────────
    const mascot = new THREE.Group();
    scene.add(mascot);

    // ─────────────────────────────────────────────────────────────────────────
    // HEAD
    // ─────────────────────────────────────────────────────────────────────────
    const headG = new THREE.Group();
    headG.position.set(0, 0.48, 0);
    mascot.add(headG);

    // High-poly smooth head sphere
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 64, 48), ceramicMat);
    headMesh.scale.set(1.06, 0.98, 0.97);
    headG.add(headMesh);

    // Smooth cheek pads (subtle organic inflation)
    const cheekGeo = new THREE.SphereGeometry(0.22, 32, 24);
    const lCheek = new THREE.Mesh(cheekGeo, ceramicMat);
    lCheek.position.set(-0.42, -0.1, 0.24);
    lCheek.scale.set(0.7, 0.6, 0.55);
    headG.add(lCheek);
    const rCheek = lCheek.clone();
    rCheek.position.set(0.42, -0.1, 0.24);
    headG.add(rCheek);

    // Glass visor — asymmetric organic shell
    const visorGeo = new THREE.SphereGeometry(0.52, 48, 36, 0, Math.PI * 2, 0.28, 1.1);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.rotation.x = Math.PI * 0.52;
    visor.position.set(0, -0.02, 0.06);
    visor.scale.set(0.9, 0.72, 0.88);
    headG.add(visor);

    // Visor chrome rim — thin torus
    const vRimGeo = new THREE.TorusGeometry(0.44, 0.012, 12, 80, Math.PI * 1.1);
    const vRim = new THREE.Mesh(vRimGeo, jointMat);
    vRim.rotation.x = Math.PI * 0.52;
    vRim.position.set(0, -0.02, 0.06);
    headG.add(vRim);

    // Eyes — glowing capsules behind visor
    const eyeGeo = new THREE.CapsuleGeometry(0.038, 0.095, 16, 20);
    const lEye = new THREE.Mesh(eyeGeo, cyanMat);
    lEye.position.set(-0.155, -0.03, 0.46);
    lEye.rotation.z = -0.18;
    headG.add(lEye);
    const rEye = lEye.clone();
    rEye.position.set(0.155, -0.03, 0.46);
    rEye.rotation.z = 0.18;
    headG.add(rEye);

    // Pupil micro-dots
    const pupilGeo = new THREE.SphereGeometry(0.022, 12, 12);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lPupil = new THREE.Mesh(pupilGeo, pupilMat);
    lPupil.position.set(-0.155, -0.03, 0.492);
    headG.add(lPupil);
    const rPupil = lPupil.clone();
    rPupil.position.set(0.155, -0.03, 0.492);
    headG.add(rPupil);

    // Ear pods — smooth oblate spheroid
    const earGeo = new THREE.SphereGeometry(0.13, 32, 24);
    const lEar = new THREE.Mesh(earGeo, jointMat);
    lEar.scale.set(0.42, 0.75, 0.7);
    lEar.position.set(-0.54, 0.04, 0.02);
    headG.add(lEar);
    const lEarGlow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 16), cyanMat);
    lEarGlow.position.set(-0.558, 0.04, 0.02);
    headG.add(lEarGlow);
    const rEar = lEar.clone();
    rEar.position.set(0.54, 0.04, 0.02);
    headG.add(rEar);
    const rEarGlow = lEarGlow.clone();
    rEarGlow.position.set(0.558, 0.04, 0.02);
    headG.add(rEarGlow);

    // ── Antenna ────────────────────────────────────────────────────────────────
    const antennaG = new THREE.Group();
    antennaG.position.set(0.05, 0.44, 0);
    headG.add(antennaG);

    // Flexible stem — smooth tapered cylinder
    const stemGeo = new THREE.CylinderGeometry(0.016, 0.026, 0.34, 20, 4);
    const stem = new THREE.Mesh(stemGeo, jointMat);
    stem.position.set(0, 0.17, 0);
    stem.rotation.z = 0.22;
    antennaG.add(stem);

    // Elbow joint
    const elbowGeo = new THREE.SphereGeometry(0.032, 20, 16);
    const elbow = new THREE.Mesh(elbowGeo, jointMat);
    elbow.position.set(0.05, 0.34, 0.02);
    antennaG.add(elbow);

    // Upper stem — thinner
    const stem2Geo = new THREE.CylinderGeometry(0.012, 0.017, 0.22, 16, 4);
    const stem2 = new THREE.Mesh(stem2Geo, jointMat);
    stem2.position.set(0.1, 0.46, 0.04);
    stem2.rotation.z = -0.38;
    antennaG.add(stem2);

    // Orb — glowing crystal sphere with internal glow
    const orbGeo = new THREE.SphereGeometry(0.088, 40, 32);
    const orbMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x00bbff : 0x0066ff,
      emissive: isDark ? 0x00aaff : 0x0044cc,
      emissiveIntensity: isDark ? 3.0 : 1.5,
      transmission: 0.6,
      thickness: 0.3,
      roughness: 0.0,
      metalness: 0.0,
      ior: 1.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      envMap,
      envMapIntensity: isDark ? 2.5 : 1.2,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(0.18, 0.58, 0.07);
    antennaG.add(orb);

    // Orb halo ring
    const orbHaloGeo = new THREE.TorusGeometry(0.11, 0.008, 12, 48);
    const orbHalo = new THREE.Mesh(orbHaloGeo, cyanMat);
    orbHalo.position.copy(orb.position);
    orbHalo.rotation.x = 0.6;
    orbHalo.rotation.z = 0.3;
    antennaG.add(orbHalo);

    // ─────────────────────────────────────────────────────────────────────────
    // BODY
    // ─────────────────────────────────────────────────────────────────────────
    const bodyG = new THREE.Group();
    bodyG.position.set(0, -0.18, 0);
    mascot.add(bodyG);

    // Torso — smooth tapered cylinder (high segments)
    const torsoMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.43, 0.56, 48, 6, false),
      suitMat,
    );
    bodyG.add(torsoMesh);

    // Shoulder roundings
    const shoulderGeo = new THREE.SphereGeometry(0.18, 28, 20);
    const lShoulderCap = new THREE.Mesh(shoulderGeo, suitMat);
    lShoulderCap.scale.set(0.85, 0.65, 0.75);
    lShoulderCap.position.set(-0.36, 0.24, 0);
    bodyG.add(lShoulderCap);
    const rShoulderCap = lShoulderCap.clone();
    rShoulderCap.position.set(0.36, 0.24, 0);
    bodyG.add(rShoulderCap);

    // Neck collar — smooth ring
    const collarGeo = new THREE.TorusGeometry(0.22, 0.055, 20, 48);
    const collar = new THREE.Mesh(collarGeo, jointMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.3, 0);
    bodyG.add(collar);

    // Chest detail — subtle inset panel
    const panelGeo = new THREE.CapsuleGeometry(0.08, 0.12, 12, 20);
    const panelMat = new THREE.MeshPhysicalMaterial({
      color: 0x0035b0,
      metalness: 0.2,
      roughness: 0.3,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
    });
    const panelL = new THREE.Mesh(panelGeo, panelMat);
    panelL.position.set(-0.16, 0.1, 0.31);
    panelL.rotation.z = 0.2;
    panelL.scale.set(0.7, 0.7, 0.4);
    bodyG.add(panelL);
    const panelR = panelL.clone();
    panelR.position.set(0.16, 0.1, 0.31);
    panelR.rotation.z = -0.2;
    bodyG.add(panelR);

    // ── Telegram Emblem ────────────────────────────────────────────────────────
    const tgG = new THREE.Group();
    tgG.position.set(0, 0.02, 0.38);
    bodyG.add(tgG);

    // Badge circle — smooth disc
    const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.022, 48), tgBlueMat);
    badge.rotation.x = Math.PI / 2;
    badge.position.z = 0.002;
    tgG.add(badge);

    // Badge rim
    const badgeRimGeo = new THREE.TorusGeometry(0.133, 0.006, 12, 48);
    const badgeRim = new THREE.Mesh(badgeRimGeo, jointMat);
    tgG.add(badgeRim);

    // Paper plane — smooth extruded shape
    const ppShape = new THREE.Shape();
    ppShape.moveTo(0.075, 0.022);
    ppShape.quadraticCurveTo(0.04, 0.01, -0.065, 0.065);
    ppShape.lineTo(-0.038, 0.008);
    ppShape.quadraticCurveTo(-0.018, -0.012, -0.06, -0.065);
    ppShape.closePath();

    const ppGeo = new THREE.ExtrudeGeometry(ppShape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 4,
    });
    ppGeo.center();
    const plane = new THREE.Mesh(ppGeo, planeMat);
    plane.position.set(0, 0, 0.024);
    plane.rotation.z = 0.18;
    tgG.add(plane);

    // ── Arms ───────────────────────────────────────────────────────────────────
    // Left arm — smooth capsule
    const armGeo = new THREE.CapsuleGeometry(0.076, 0.26, 12, 24);
    const lArm = new THREE.Mesh(armGeo, suitMat);
    lArm.position.set(-0.43, 0.02, 0.04);
    lArm.rotation.z = 0.42;
    lArm.rotation.x = 0.12;
    bodyG.add(lArm);

    const lHandGeo = new THREE.SphereGeometry(0.086, 28, 20);
    const lHand = new THREE.Mesh(lHandGeo, ceramicMat);
    lHand.position.set(-0.52, -0.18, 0.1);
    bodyG.add(lHand);

    // Right arm — waving group
    const rArmG = new THREE.Group();
    rArmG.position.set(0.42, 0.14, 0.04);
    bodyG.add(rArmG);

    const rUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.2, 12, 24), suitMat);
    rUpperArm.position.set(0.09, 0.09, 0.04);
    rUpperArm.rotation.z = -0.75;
    rUpperArm.rotation.x = 0.28;
    rArmG.add(rUpperArm);

    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.082, 28, 20), ceramicMat);
    rHand.position.set(0.24, 0.26, 0.1);
    rArmG.add(rHand);

    // Holographic palm ring
    const palmRingGeo = new THREE.TorusGeometry(0.066, 0.009, 10, 36);
    const palmRing = new THREE.Mesh(palmRingGeo, cyanMat);
    palmRing.position.set(0.24, 0.26, 0.16);
    palmRing.rotation.x = Math.PI / 3.5;
    rArmG.add(palmRing);

    // ── Levitation energy ring ─────────────────────────────────────────────────
    const hRingGeo = new THREE.TorusGeometry(0.52, 0.012, 16, 96);
    const hRing = new THREE.Mesh(hRingGeo, cyanMat);
    hRing.rotation.x = Math.PI / 2;
    hRing.position.set(0, -0.58, 0);
    mascot.add(hRing);

    // Outer orbit ring (thinner, tilted)
    const outerRingGeo = new THREE.TorusGeometry(0.7, 0.007, 10, 120);
    const outerRing = new THREE.Mesh(outerRingGeo, cyanMat);
    outerRing.rotation.x = Math.PI / 2.4;
    outerRing.rotation.z = 0.3;
    outerRing.position.set(0, -0.5, 0);
    mascot.add(outerRing);

    // Orbiting micro-drone (single bright dot)
    const droneMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x0088ff,
      emissiveIntensity: isDark ? 5.0 : 2.5,
    });
    const drone = new THREE.Mesh(new THREE.OctahedronGeometry(0.038, 1), droneMat);
    mascot.add(drone);

    // ── Interaction state ──────────────────────────────────────────────────────
    let mx = 0;
    let my = 0;
    let curRotY = 0;
    let curRotX = 0;

    const onPointerMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width) * 2 - 1;
      my = -(((e.clientY - r.top) / r.height) * 2 - 1);
      mx = Math.max(-1, Math.min(1, mx));
      my = Math.max(-1, Math.min(1, my));
    };
    window.addEventListener('mousemove', onPointerMove, { passive: true });

    // ── Visibility gate ────────────────────────────────────────────────────────
    let visible = true;
    const onVis = () => {
      visible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVis);

    // ── Blink state ────────────────────────────────────────────────────────────
    let blinkTimer = 0;

    // ── Render loop ────────────────────────────────────────────────────────────
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!visible) return;

      const t = clock.getElapsedTime();
      const dt = clock.getDelta();

      // Dynamic exposure based on theme
      renderer.toneMappingExposure = isDarkRef.current ? 1.1 : 1.5;

      // Smooth mouse follow
      curRotY += (mx * 0.42 - curRotY) * 0.06;
      curRotX += (-my * 0.32 - curRotX) * 0.06;

      // Head tracking
      headG.rotation.y = curRotY * 0.65;
      headG.rotation.x = curRotX * 0.45;

      // Eye micro-tracking
      lEye.position.x = -0.155 + curRotY * 0.032;
      lEye.position.y = -0.03 + curRotX * 0.022;
      rEye.position.x = 0.155 + curRotY * 0.032;
      rEye.position.y = -0.03 + curRotX * 0.022;
      lPupil.position.x = -0.155 + curRotY * 0.036;
      lPupil.position.y = -0.03 + curRotX * 0.026;
      rPupil.position.x = 0.155 + curRotY * 0.036;
      rPupil.position.y = -0.03 + curRotX * 0.026;

      // Realistic blink
      blinkTimer += dt;
      if (blinkTimer > 3.8 + Math.sin(t * 0.3) * 0.8) {
        const bProg = (blinkTimer - 3.8) / 0.14;
        const bScale = bProg < 0.5 ? 1 - bProg * 2 : (bProg - 0.5) * 2;
        lEye.scale.y = Math.max(0.08, bScale);
        rEye.scale.y = Math.max(0.08, bScale);
        if (blinkTimer > 4.1) blinkTimer = 0;
      } else {
        lEye.scale.y = 1;
        rEye.scale.y = 1;
      }

      // Breathing / levitation
      const breathe = Math.sin(t * 1.85) * 0.055;
      mascot.position.y = breathe;
      mascot.rotation.z = Math.sin(t * 1.2) * 0.018;

      // Subtle idle sway
      mascot.rotation.y = curRotY * 0.12 + Math.sin(t * 0.6) * 0.025;

      // Wave animation (fast on hover)
      const waveSpd = hoverRef.current ? 8.0 : 2.8;
      const waveAmp = hoverRef.current ? 0.38 : 0.12;
      rArmG.rotation.z = Math.sin(t * waveSpd) * waveAmp;
      rArmG.rotation.x = Math.sin(t * waveSpd * 0.7) * waveAmp * 0.4;

      // Palm ring spin
      palmRing.rotation.z += 0.06;

      // Hover energy ring pulse
      const pulse = 1 + Math.sin(t * 3.2) * 0.07;
      hRing.scale.setScalar(pulse);
      hRing.rotation.z += 0.018;
      outerRing.rotation.y += 0.022;
      outerRing.rotation.z += 0.008;

      // Orbiting drone
      const dAngle = t * 2.1;
      drone.position.set(
        Math.cos(dAngle) * 0.7,
        Math.sin(dAngle * 0.5) * 0.18 - 0.5,
        Math.sin(dAngle) * 0.7,
      );
      drone.rotation.x += 0.07;
      drone.rotation.y += 0.05;

      // Antenna orb pulse
      const oPulse = (isDarkRef.current ? 3.0 : 1.5) + Math.sin(t * 4.2) * 0.8;
      orbMat.emissiveIntensity = oPulse;
      orbHalo.rotation.z += 0.025;

      // Cyan mats pulse together
      cyanMat.emissiveIntensity = (isDarkRef.current ? 3.5 : 1.8) + Math.sin(t * 5.0) * 0.6;

      // Glow point animation
      glowPt.intensity = (isDarkRef.current ? 5.0 : 2.0) + Math.sin(t * 3.8) * 1.2;
      glowPt.position.set(Math.sin(t * 1.3) * 0.4, 1.4 + Math.sin(t * 2.1) * 0.2, 1.2);

      renderer.render(scene, camera);
    };

    animate();

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Cleanup ────────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      pmremGen.dispose();
      envMap.dispose();
      renderer.dispose();

      for (const m of [
        ceramicMat,
        suitMat,
        visorMat,
        cyanMat,
        tgBlueMat,
        planeMat,
        jointMat,
        orbMat,
        panelMat,
        droneMat,
      ]) {
        m.dispose();
      }
    };
  }, [isDark]);

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none pointer-events-none">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
