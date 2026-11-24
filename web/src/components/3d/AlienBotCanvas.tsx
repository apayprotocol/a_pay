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

    const W = el.clientWidth || 120;
    const H = el.clientHeight || 120;

    // ── 1. Scene & Camera (Calibrated for High-Impact Cyber Face Only View) ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
    camera.position.set(0, 0, 2.85);

    // ── 2. WebGL Renderer with High-DPI Clamping ────────────────────────────
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = isDark ? 1.5 : 1.7;
      el.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('WebGL initialization failed in AlienBotCanvas:', err);
      return;
    }

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

    // ── 4. Cinematic Studio & Rim Lighting ──────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 1.0 : 2.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, isDark ? 4.2 : 5.5);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x0052ff, isDark ? 8.0 : 6.0);
    rimLight.position.set(-3, -1, -2);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x00f0ff, isDark ? 4.5 : 4.0);
    fillLight.position.set(2, -2, 2.5);
    scene.add(fillLight);

    const topGlow = new THREE.PointLight(0x00f0ff, isDark ? 4.5 : 3.5, 6);
    topGlow.position.set(0, 1.2, 1);
    scene.add(topGlow);

    // ── 5. Materials: Day = Base Cobalt Blue, Night = Stealth Cyber Obsidian ──
    const armorMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x0b1120 : 0x0052ff,
      metalness: isDark ? 0.88 : 0.42,
      roughness: isDark ? 0.15 : 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.95,
      envMap,
      envMapIntensity: isDark ? 1.8 : 2.0,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0xffffff : 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.05,
      envMap,
      envMapIntensity: 2.5,
    });

    const jointMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x1e293b : 0x334155,
      metalness: 0.92,
      roughness: 0.2,
    });

    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x050811,
      metalness: 0.35,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      reflectivity: 1.0,
      envMap,
      envMapIntensity: 2.2,
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x00f5ff,
      emissive: 0x00f5ff,
      emissiveIntensity: isDark ? 6.5 : 7.2,
      roughness: 0.05,
      metalness: 0.2,
    });

    const hudRingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: isDark ? 6.0 : 7.0,
      roughness: 0.0,
    });

    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const plasmaMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: isDark ? 4.8 : 5.2,
      roughness: 0.05,
      metalness: 0.8,
    });

    // ── 6. Construct 3D Cyber Face Only Model ───────────────────────────────
    const mascotGroup = new THREE.Group();
    scene.add(mascotGroup);

    const headGroup = new THREE.Group();
    // Centered vertically so chin and antenna orb are balanced inside camera viewport
    headGroup.position.set(0, -0.3, 0);
    mascotGroup.add(headGroup);

    // 1. Aerodynamic Mecha Head Sphere
    const headGeo = new THREE.SphereGeometry(0.52, 48, 36);
    const headMesh = new THREE.Mesh(headGeo, armorMat);
    headMesh.scale.set(1.08, 0.98, 0.98);
    headGroup.add(headMesh);

    // 2. Glossy OLED Cyber Face Display Screen
    const visorGeo = new THREE.SphereGeometry(0.524, 40, 30, 0, Math.PI * 2, 0.2, 0.82);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.rotation.x = Math.PI * 0.48;
    visorMesh.position.set(0, 0.02, 0.015);
    visorMesh.scale.set(0.94, 0.78, 1.02);
    headGroup.add(visorMesh);

    // 3. Expressive Cyber HUD Eye System
    const eyeGroup = new THREE.Group();
    headGroup.add(eyeGroup);

    const eyeGeo = new THREE.SphereGeometry(0.082, 28, 20);
    const hudRingGeo = new THREE.TorusGeometry(0.048, 0.007, 16, 28);
    const glintGeo = new THREE.SphereGeometry(0.018, 12, 12);

    // Left Eye
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.155, 0.025, 0.535);
    leftEye.scale.set(1.05, 1.25, 0.32);
    leftEye.rotation.z = -0.06;
    eyeGroup.add(leftEye);

    const leftHudRing = new THREE.Mesh(hudRingGeo, hudRingMat);
    leftHudRing.position.set(-0.155, 0.025, 0.545);
    eyeGroup.add(leftHudRing);

    const leftGlint = new THREE.Mesh(glintGeo, glintMat);
    leftGlint.position.set(-0.135, 0.05, 0.55);
    eyeGroup.add(leftGlint);

    // Right Eye
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.155, 0.025, 0.535);
    rightEye.scale.set(1.05, 1.25, 0.32);
    rightEye.rotation.z = 0.06;
    eyeGroup.add(rightEye);

    const rightHudRing = new THREE.Mesh(hudRingGeo, hudRingMat);
    rightHudRing.position.set(0.155, 0.025, 0.545);
    eyeGroup.add(rightHudRing);

    const rightGlint = new THREE.Mesh(glintGeo, glintMat);
    rightGlint.position.set(0.175, 0.05, 0.55);
    eyeGroup.add(rightGlint);

    // 4. Turbine Ear Pods with glowing plasma cores
    const earHousingGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.1, 20);
    const earCoreGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.11, 16);
    const earRimGeo = new THREE.TorusGeometry(0.13, 0.012, 12, 28);

    const leftEar = new THREE.Mesh(earHousingGeo, jointMat);
    leftEar.rotation.z = Math.PI / 2;
    leftEar.position.set(-0.56, 0.02, 0);
    headGroup.add(leftEar);

    const leftEarRim = new THREE.Mesh(earRimGeo, chromeMat);
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

    // 5. High-Tech Antenna with Levitating Quantum Crystal Orb
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(0.04, 0.46, 0);
    headGroup.add(antennaGroup);

    const swivelGeo = new THREE.SphereGeometry(0.04, 14, 14);
    const swivel = new THREE.Mesh(swivelGeo, chromeMat);
    antennaGroup.add(swivel);

    const stemLowerGeo = new THREE.CylinderGeometry(0.02, 0.028, 0.28, 14);
    const stemLower = new THREE.Mesh(stemLowerGeo, jointMat);
    stemLower.position.set(0.02, 0.13, 0);
    stemLower.rotation.z = 0.2;
    antennaGroup.add(stemLower);

    const kneeGeo = new THREE.SphereGeometry(0.03, 14, 14);
    const knee = new THREE.Mesh(kneeGeo, chromeMat);
    knee.position.set(0.07, 0.26, 0.02);
    antennaGroup.add(knee);

    const stemUpperGeo = new THREE.CylinderGeometry(0.016, 0.02, 0.22, 14);
    const stemUpper = new THREE.Mesh(stemUpperGeo, jointMat);
    stemUpper.position.set(0.12, 0.36, 0.03);
    stemUpper.rotation.z = -0.36;
    antennaGroup.add(stemUpper);

    const emitterRingGeo = new THREE.TorusGeometry(0.05, 0.008, 10, 20);
    const emitterRing = new THREE.Mesh(emitterRingGeo, chromeMat);
    emitterRing.position.set(0.18, 0.46, 0.04);
    emitterRing.rotation.x = Math.PI / 3;
    antennaGroup.add(emitterRing);

    const orbGeo = new THREE.SphereGeometry(0.095, 24, 24);
    const orb = new THREE.Mesh(orbGeo, plasmaMat);
    orb.position.set(0.18, 0.54, 0.04);
    antennaGroup.add(orb);

    const gyroRingGeo = new THREE.TorusGeometry(0.13, 0.008, 10, 28);
    const gyroRing = new THREE.Mesh(gyroRingGeo, chromeMat);
    gyroRing.position.copy(orb.position);
    antennaGroup.add(gyroRing);

    // ── 7. Interactive Pointer Tracker ──────────────────────────────────────
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

      // Head & Visor follow cursor / pointer
      headGroup.rotation.y = curRotY * 0.7;
      headGroup.rotation.x = curRotX * 0.48;

      // Micro parallax for cyber eyes
      eyeGroup.position.x = curRotY * 0.035;
      eyeGroup.position.y = curRotX * 0.025;

      // Dynamic Eye Color & Pulse Logic
      if (hoverRef.current) {
        const hoverWave = (Math.sin(elapsed * 5.0) + 1) * 0.5;
        const targetColor = hoverElectricBlue.clone().lerp(hoverViolet, hoverWave);
        currentEyeColor.lerp(targetColor, 0.15);
        eyeMat.emissive.copy(currentEyeColor);
        eyeMat.color.copy(currentEyeColor);
        eyeMat.emissiveIntensity = 5.5 + Math.sin(elapsed * 6.0) * 1.5;

        leftEye.scale.set(1.15, 1.35, 0.35);
        rightEye.scale.set(1.15, 1.35, 0.35);
        leftHudRing.rotation.z += 0.05;
        rightHudRing.rotation.z -= 0.05;
      } else {
        const idleWave = (Math.sin(elapsed * 2.5) + 1) * 0.5;
        const targetColor = idleCyan.clone().lerp(idleBlue, idleWave * 0.4);
        currentEyeColor.lerp(targetColor, 0.08);
        eyeMat.emissive.copy(currentEyeColor);
        eyeMat.color.copy(currentEyeColor);
        eyeMat.emissiveIntensity = 4.5 + Math.sin(elapsed * 3.0) * 1.0;

        leftEye.scale.set(1.05, 1.25, 0.32);
        rightEye.scale.set(1.05, 1.25, 0.32);
        leftHudRing.rotation.z += 0.015;
        rightHudRing.rotation.z -= 0.015;
      }

      // Realistic Cyber Eye Blink
      blinkTimer += delta;
      if (blinkTimer > 3.6 + Math.sin(elapsed * 0.4) * 0.8) {
        const bProg = (blinkTimer - 3.6) / 0.15;
        const bScale = bProg < 0.5 ? 1 - bProg * 2 : (bProg - 0.5) * 2;
        leftEye.scale.y = Math.max(0.06, bScale * 1.25);
        rightEye.scale.y = Math.max(0.06, bScale * 1.25);
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

      // Gentle Head Bobbing
      const floatHeight = Math.sin(elapsed * 2.0) * 0.03;
      headGroup.position.y = -0.3 + floatHeight;
      headGroup.rotation.z = Math.sin(elapsed * 1.4) * 0.015;

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

      headGeo.dispose();
      visorGeo.dispose();
      eyeGeo.dispose();
      hudRingGeo.dispose();
      glintGeo.dispose();
      earHousingGeo.dispose();
      earCoreGeo.dispose();
      earRimGeo.dispose();
      swivelGeo.dispose();
      stemLowerGeo.dispose();
      kneeGeo.dispose();
      stemUpperGeo.dispose();
      emitterRingGeo.dispose();
      orbGeo.dispose();
      gyroRingGeo.dispose();

      armorMat.dispose();
      chromeMat.dispose();
      jointMat.dispose();
      visorMat.dispose();
      eyeMat.dispose();
      hudRingMat.dispose();
      glintMat.dispose();
      plasmaMat.dispose();
    };
  }, [isDark]);

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none pointer-events-none">
      <div ref={mountRef} className="w-full h-full flex items-center justify-center" />
    </div>
  );
}
