'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AlienBotCanvasProps {
  isHovered?: boolean;
}

export function AlienBotCanvas({ isHovered = false }: AlienBotCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(isHovered);
  hoverRef.current = isHovered;

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 140;
    const height = currentMount.clientHeight || 140;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 4.2);

    // 2. WebGL Renderer with High-Performance & Retina Clamping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    currentMount.appendChild(renderer.domElement);

    // 3. Lighting Setup (Cyber Studio & Cobalt Rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    // Base Cobalt Blue Rim Light
    const blueRimLight = new THREE.DirectionalLight(0x0052ff, 4.5);
    blueRimLight.position.set(-4, -2, -2);
    scene.add(blueRimLight);

    // Cyan Fill Light
    const cyanLight = new THREE.DirectionalLight(0x00f0ff, 2.5);
    cyanLight.position.set(2, -3, 2);
    scene.add(cyanLight);

    // Top Halo Light
    const topGlowLight = new THREE.PointLight(0x00f0ff, 3.0, 5);
    topGlowLight.position.set(0, 1.8, 1);
    scene.add(topGlowLight);

    // 4. Materials
    // A. White Ceramic Armor (Alien Head & Limbs)
    const ceramicMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.15,
      roughness: 0.18,
    });

    // B. Base Cobalt Blue Mecha Suit (T-Shirt/Hoodie)
    const suitMat = new THREE.MeshStandardMaterial({
      color: 0x0052ff,
      metalness: 0.35,
      roughness: 0.4,
    });

    // C. Dark Cyber Glass (Visor)
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x07080b,
      metalness: 0.9,
      roughness: 0.05,
    });

    // D. Glowing Cyan Energy Core & Eyes
    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.6,
      roughness: 0.1,
    });

    // E. Crisp Pure White (Telegram Paper Plane)
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.9,
      metalness: 0.2,
      roughness: 0.2,
    });

    // F. Gunmetal Dark Joints & Collar
    const darkJointMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.25,
    });

    // 5. Construct Alien Robot Mascot Model
    const mascotGroup = new THREE.Group();
    scene.add(mascotGroup);

    // === HEAD GROUP ===
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.42, 0);
    mascotGroup.add(headGroup);

    // Main Cute Rounded Alien Head (Snoo-inspired silhouette)
    const headGeo = new THREE.SphereGeometry(0.52, 32, 32);
    const headMesh = new THREE.Mesh(headGeo, ceramicMat);
    headMesh.scale.set(1.08, 0.96, 0.98);
    headGroup.add(headMesh);

    // Dark Curved Visor Face Plate
    const visorGeo = new THREE.SphereGeometry(0.48, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.42);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.rotation.x = Math.PI / 2 + 0.12;
    visorMesh.position.set(0, -0.04, 0.14);
    visorMesh.scale.set(0.92, 0.75, 0.92);
    headGroup.add(visorMesh);

    // Expressive Glowing Cyber Eyes (Left & Right)
    const eyeGeo = new THREE.CapsuleGeometry(0.045, 0.08, 8, 16);
    const leftEye = new THREE.Mesh(eyeGeo, cyanGlowMat);
    leftEye.position.set(-0.16, -0.04, 0.48);
    leftEye.rotation.z = -0.15;
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, cyanGlowMat);
    rightEye.position.set(0.16, -0.04, 0.48);
    rightEye.rotation.z = 0.15;
    headGroup.add(rightEye);

    // Side Alien Mecha Ears / Audio Pods
    const earGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16);
    const leftEar = new THREE.Mesh(earGeo, darkJointMat);
    leftEar.rotation.z = Math.PI / 2;
    leftEar.position.set(-0.56, 0.02, 0);
    headGroup.add(leftEar);

    const leftEarCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.09, 16),
      cyanGlowMat,
    );
    leftEarCore.rotation.z = Math.PI / 2;
    leftEarCore.position.set(-0.57, 0.02, 0);
    headGroup.add(leftEarCore);

    const rightEar = new THREE.Mesh(earGeo, darkJointMat);
    rightEar.rotation.z = Math.PI / 2;
    rightEar.position.set(0.56, 0.02, 0);
    headGroup.add(rightEar);

    const rightEarCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.09, 16),
      cyanGlowMat,
    );
    rightEarCore.rotation.z = Math.PI / 2;
    rightEarCore.position.set(0.57, 0.02, 0);
    headGroup.add(rightEarCore);

    // Iconic Reddit/Alien Curved Antenna with Glowing Crystal Orb
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(0, 0.46, 0);
    headGroup.add(antennaGroup);

    // Antenna Base Stem
    const stemLowerGeo = new THREE.CylinderGeometry(0.022, 0.03, 0.22, 12);
    const stemLower = new THREE.Mesh(stemLowerGeo, darkJointMat);
    stemLower.position.set(0, 0.1, 0);
    stemLower.rotation.z = 0.18;
    antennaGroup.add(stemLower);

    // Antenna Upper Stem (Curving forward/right)
    const stemUpperGeo = new THREE.CylinderGeometry(0.02, 0.022, 0.18, 12);
    const stemUpper = new THREE.Mesh(stemUpperGeo, darkJointMat);
    stemUpper.position.set(0.07, 0.24, 0.04);
    stemUpper.rotation.z = -0.32;
    antennaGroup.add(stemUpper);

    // Antenna Glowing Plasma Crystal Orb
    const orbGeo = new THREE.SphereGeometry(0.095, 20, 20);
    const orbMesh = new THREE.Mesh(orbGeo, cyanGlowMat);
    orbMesh.position.set(0.14, 0.35, 0.06);
    antennaGroup.add(orbMesh);

    // Micro Energy Ring around Antenna Orb
    const orbRingGeo = new THREE.TorusGeometry(0.12, 0.012, 8, 24);
    const orbRing = new THREE.Mesh(orbRingGeo, darkJointMat);
    orbRing.rotation.x = Math.PI / 3;
    orbRing.position.set(0.14, 0.35, 0.06);
    antennaGroup.add(orbRing);

    // === BODY & T-SHIRT / HOODIE GROUP ===
    const bodyGroup = new THREE.Group();
    bodyGroup.position.set(0, -0.22, 0);
    mascotGroup.add(bodyGroup);

    // Cute Chunky Robot Torso (Wearing Base Cobalt Blue T-Shirt)
    const torsoGeo = new THREE.CylinderGeometry(0.34, 0.44, 0.52, 24);
    const torsoMesh = new THREE.Mesh(torsoGeo, suitMat);
    torsoMesh.position.set(0, 0, 0);
    bodyGroup.add(torsoMesh);

    // Neck Collar / Titanium Joint
    const collarGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.12, 20);
    const collarMesh = new THREE.Mesh(collarGeo, darkJointMat);
    collarMesh.position.set(0, 0.28, 0);
    bodyGroup.add(collarMesh);

    // === 3D TELEGRAM EMBLEM ON T-SHIRT ===
    const telegramEmblemGroup = new THREE.Group();
    telegramEmblemGroup.position.set(0, 0.02, 0.36);
    telegramEmblemGroup.rotation.x = -0.15; // match torso slope
    bodyGroup.add(telegramEmblemGroup);

    // Blue Circle Badge Backing
    const badgeGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.025, 24);
    const badgeMat = new THREE.MeshStandardMaterial({
      color: 0x229ed9, // Official Telegram Blue
      metalness: 0.2,
      roughness: 0.3,
    });
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.rotation.x = Math.PI / 2;
    telegramEmblemGroup.add(badgeMesh);

    // 3D Telegram Paper Plane Shape
    const planeShape = new THREE.Shape();
    // Paper Plane Vertices
    planeShape.moveTo(0.08, 0.03); // Nose tip
    planeShape.lineTo(-0.07, 0.07); // Top wing tip
    planeShape.lineTo(-0.04, 0.01); // Inner fold
    planeShape.lineTo(-0.07, -0.07); // Bottom wing tip
    planeShape.closePath();

    const planeGeo = new THREE.ExtrudeGeometry(planeShape, {
      depth: 0.015,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2,
    });
    planeGeo.center();
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.rotation.z = 0.2; // iconic paper plane angle
    planeMesh.position.set(0, 0, 0.02);
    planeMesh.scale.set(1.1, 1.1, 1.1);
    telegramEmblemGroup.add(planeMesh);

    // === ARMS & HANDS ===
    // Left Arm (Friendly Resting on Hip/Side)
    const leftArmGeo = new THREE.CapsuleGeometry(0.08, 0.24, 8, 16);
    const leftArm = new THREE.Mesh(leftArmGeo, suitMat);
    leftArm.position.set(-0.44, 0.02, 0);
    leftArm.rotation.z = 0.35;
    bodyGroup.add(leftArm);

    const leftHandGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const leftHand = new THREE.Mesh(leftHandGeo, ceramicMat);
    leftHand.position.set(-0.52, -0.16, 0.05);
    bodyGroup.add(leftHand);

    // Right Arm (Interactive Friendly Wave)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.42, 0.12, 0);
    bodyGroup.add(rightArmGroup);

    const rightUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.22, 8, 16), suitMat);
    rightUpperArm.position.set(0.08, 0.08, 0.05);
    rightUpperArm.rotation.z = -0.7;
    rightUpperArm.rotation.x = 0.3;
    rightArmGroup.add(rightUpperArm);

    const rightHand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), ceramicMat);
    rightHand.position.set(0.24, 0.24, 0.1);
    rightArmGroup.add(rightHand);

    // Holographic mini pulse disc in right palm
    const miniPulse = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 20), cyanGlowMat);
    miniPulse.position.set(0.24, 0.24, 0.15);
    miniPulse.rotation.x = Math.PI / 4;
    rightArmGroup.add(miniPulse);

    // === LEVITATION ENERGY RING (Under mascot) ===
    const hoverRingGeo = new THREE.TorusGeometry(0.55, 0.015, 12, 48);
    const hoverRing = new THREE.Mesh(hoverRingGeo, cyanGlowMat);
    hoverRing.rotation.x = Math.PI / 2;
    hoverRing.position.set(0, -0.62, 0);
    mascotGroup.add(hoverRing);

    // 6. Interactive Mouse / Pointer Tracker
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentRotY = 0;
    let currentRotX = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = currentMount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetMouseX = Math.max(-1, Math.min(1, x));
      targetMouseY = Math.max(-1, Math.min(1, y));
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });

    // 7. Render Loop with Visibility & Performance Throttling
    let animId: number;
    let isTabVisible = true;
    const clock = new THREE.Clock();

    const handleVisibility = () => {
      isTabVisible = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let blinkTimer = 0;
    let isBlinking = false;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isTabVisible) return;

      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Smooth mouse follow interpolation
      currentRotY += (targetMouseX * 0.45 - currentRotY) * 0.08;
      currentRotX += (-targetMouseY * 0.35 - currentRotX) * 0.08;

      // Head subtly tracks cursor
      headGroup.rotation.y = currentRotY * 0.7;
      headGroup.rotation.x = currentRotX * 0.5;

      // Eye capsules micro-track cursor
      leftEye.position.x = -0.16 + currentRotY * 0.04;
      leftEye.position.y = -0.04 + currentRotX * 0.03;
      rightEye.position.x = 0.16 + currentRotY * 0.04;
      rightEye.position.y = -0.04 + currentRotX * 0.03;

      // Cute robotic eye blink logic (blinks every ~4-5 seconds)
      blinkTimer += delta;
      if (blinkTimer > 4.2) {
        isBlinking = true;
        leftEye.scale.y = 0.1;
        rightEye.scale.y = 0.1;
        if (blinkTimer > 4.35) {
          isBlinking = false;
          leftEye.scale.y = 1.0;
          rightEye.scale.y = 1.0;
          blinkTimer = 0;
        }
      }

      // Friendly right hand waving animation (faster when hovered)
      const waveSpeed = hoverRef.current ? 7.5 : 3.2;
      const waveAngle = Math.sin(elapsed * waveSpeed) * (hoverRef.current ? 0.35 : 0.15);
      rightArmGroup.rotation.z = waveAngle;
      miniPulse.rotation.z += 0.05;

      // Zero-Gravity Levitation (Smooth Bobbing)
      const floatHeight = Math.sin(elapsed * 2.2) * 0.06;
      mascotGroup.position.y = floatHeight;
      mascotGroup.rotation.z = Math.sin(elapsed * 1.5) * 0.02;

      // Hover ring pulse
      hoverRing.scale.setScalar(1.0 + Math.sin(elapsed * 3.0) * 0.06);
      hoverRing.rotation.z += 0.015;

      // Orb antenna pulse
      const orbPulse = 2.2 + Math.sin(elapsed * 4.0) * 0.8;
      cyanGlowMat.emissiveIntensity = orbPulse;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 9. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);

      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }

      // Dispose geometries & materials
      headGeo.dispose();
      visorGeo.dispose();
      eyeGeo.dispose();
      earGeo.dispose();
      stemLowerGeo.dispose();
      stemUpperGeo.dispose();
      orbGeo.dispose();
      orbRingGeo.dispose();
      torsoGeo.dispose();
      collarGeo.dispose();
      badgeGeo.dispose();
      planeGeo.dispose();
      planeShape.extractPoints(5);
      leftArmGeo.dispose();
      leftHandGeo.dispose();
      hoverRingGeo.dispose();

      ceramicMat.dispose();
      suitMat.dispose();
      visorMat.dispose();
      cyanGlowMat.dispose();
      planeMat.dispose();
      darkJointMat.dispose();
      badgeMat.dispose();

      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none pointer-events-none">
      <div ref={mountRef} className="w-full h-full flex items-center justify-center" />
    </div>
  );
}
