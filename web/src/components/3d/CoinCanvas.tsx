'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function CoinCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 340;
    const height = currentMount.clientHeight || 340;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 0, 4.8);

    // 2. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    currentMount.appendChild(renderer.domElement);

    // 3. Cinematic Cyber Studio Lighting
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
    keyLight.position.set(4, 5, 4.5);
    scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x00f0ff, 5.0);
    cyanRim.position.set(-5, -4, -2);
    scene.add(cyanRim);

    const purpleFill = new THREE.DirectionalLight(0x818cf8, 3.5);
    purpleFill.position.set(-3, 4, 3);
    scene.add(purpleFill);

    const frontReactorLight = new THREE.PointLight(0x38bdf8, 6.0, 8);
    frontReactorLight.position.set(0, 0, 1.8);
    scene.add(frontReactorLight);

    const backReactorLight = new THREE.PointLight(0x38bdf8, 6.0, 8);
    backReactorLight.position.set(0, 0, -1.8);
    scene.add(backReactorLight);

    // 4. Robotic / Mecha Materials
    // Gunmetal Dark Titanium Armor
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.95,
      roughness: 0.16,
    });

    // Mirror-Polished Liquid Platinum Chrome (Razor Edge)
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.05,
    });

    // Intense Cyber Cyan Plasma (Mecha energy veins)
    const plasmaMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.8,
      roughness: 0.1,
      metalness: 0.9,
    });

    // Core Quantum Crystal (Prism Core)
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      emissive: 0x0284c7,
      emissiveIntensity: 1.5,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.85,
      thickness: 0.6,
      ior: 1.8,
    });

    // 5. Build Token Assembly
    const tokenGroup = new THREE.Group();
    scene.add(tokenGroup);

    const radius = 1.35;
    const thickness = 0.22;

    // A. 12-Sided Faceted Heavy Mecha Bezel
    const outerBezelGeo = new THREE.CylinderGeometry(radius, radius, thickness, 12, 1);
    const outerBezel = new THREE.Mesh(outerBezelGeo, titaniumMat);
    outerBezel.rotation.x = Math.PI / 2;
    tokenGroup.add(outerBezel);

    // B. Chrome Chamfer Rims
    const chamferGeo = new THREE.TorusGeometry(radius - 0.03, 0.035, 16, 48);
    const frontChamfer = new THREE.Mesh(chamferGeo, chromeMat);
    frontChamfer.position.z = thickness / 2;
    tokenGroup.add(frontChamfer);

    const backChamfer = new THREE.Mesh(chamferGeo, chromeMat);
    backChamfer.position.z = -thickness / 2;
    tokenGroup.add(backChamfer);

    // C. Glowing Plasma Inset Rings
    const energyRingGeo = new THREE.TorusGeometry(radius - 0.18, 0.02, 16, 64);
    const frontEnergy = new THREE.Mesh(energyRingGeo, plasmaMat);
    frontEnergy.position.z = thickness / 2 + 0.005;
    tokenGroup.add(frontEnergy);

    const backEnergy = new THREE.Mesh(energyRingGeo, plasmaMat);
    backEnergy.position.z = -thickness / 2 - 0.005;
    tokenGroup.add(backEnergy);

    // D. Dark Obsidian Inner Plates
    const plateGeo = new THREE.CylinderGeometry(
      radius - 0.22,
      radius - 0.22,
      thickness + 0.01,
      48,
      1,
    );
    const plate = new THREE.Mesh(plateGeo, titaniumMat);
    plate.rotation.x = Math.PI / 2;
    tokenGroup.add(plate);

    // E. 12 Mecha Tactical Perimeter Notches
    const notchGeo = new THREE.BoxGeometry(0.07, 0.08, thickness + 0.03);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const notch = new THREE.Mesh(notchGeo, chromeMat);
      notch.position.x = Math.cos(angle) * (radius - 0.02);
      notch.position.y = Math.sin(angle) * (radius - 0.02);
      notch.rotation.z = angle;
      tokenGroup.add(notch);
    }

    // F. Circuit Conduits on Plate Surface
    const circuitGroup = new THREE.Group();
    const circuitMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.5,
    });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const pts = [
        new THREE.Vector3(Math.cos(a) * 0.7, Math.sin(a) * 0.7, thickness / 2 + 0.01),
        new THREE.Vector3(Math.cos(a) * 1.05, Math.sin(a) * 1.05, thickness / 2 + 0.01),
      ];
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      circuitGroup.add(new THREE.Line(g, circuitMat));
    }
    tokenGroup.add(circuitGroup);

    // ----------------------------------------------------------------
    // G. HYPER-STYLISH ROBOTIC / MECHA "A" GLYPH GENERATOR
    // ----------------------------------------------------------------
    const createRoboticAGroup = () => {
      const roboA = new THREE.Group();

      // 1. Left Articulated Robotic Leg (Segmented Pylon)
      const leftLegShape = new THREE.Shape();
      leftLegShape.moveTo(-0.07, 0.38);
      leftLegShape.lineTo(-0.16, 0.36);
      leftLegShape.lineTo(-0.44, -0.38);
      leftLegShape.lineTo(-0.28, -0.42);
      leftLegShape.lineTo(-0.16, -0.12);
      leftLegShape.lineTo(-0.06, -0.12);
      leftLegShape.lineTo(-0.04, 0.12);
      leftLegShape.closePath();

      const extrudeSettings = {
        depth: 0.05,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.018,
        bevelThickness: 0.018,
      };

      const legGeo = new THREE.ExtrudeGeometry(leftLegShape, extrudeSettings);
      legGeo.center();

      const leftLeg = new THREE.Mesh(legGeo, chromeMat);
      leftLeg.position.set(-0.21, -0.04, 0);
      roboA.add(leftLeg);

      // Inner glowing energy trench on left leg
      const leftEnergy = new THREE.Mesh(legGeo, plasmaMat);
      leftEnergy.scale.set(0.7, 0.85, 1.2);
      leftEnergy.position.set(-0.21, -0.04, 0.01);
      roboA.add(leftEnergy);

      // 2. Right Articulated Robotic Leg (Mirror)
      const rightLeg = new THREE.Mesh(legGeo, chromeMat);
      rightLeg.scale.set(-1, 1, 1);
      rightLeg.position.set(0.21, -0.04, 0);
      roboA.add(rightLeg);

      const rightEnergy = new THREE.Mesh(legGeo, plasmaMat);
      rightEnergy.scale.set(-0.7, 0.85, 1.2);
      rightEnergy.position.set(0.21, -0.04, 0.01);
      roboA.add(rightEnergy);

      // 3. Robotic Apex Mecha Crown (Stealth Helmet Cap at Top)
      const crownShape = new THREE.Shape();
      crownShape.moveTo(0, 0.58);
      crownShape.lineTo(0.14, 0.34);
      crownShape.lineTo(-0.14, 0.34);
      crownShape.closePath();

      const crownGeo = new THREE.ExtrudeGeometry(crownShape, extrudeSettings);
      crownGeo.center();

      const crown = new THREE.Mesh(crownGeo, chromeMat);
      crown.position.set(0, 0.44, 0);
      roboA.add(crown);

      const crownGlow = new THREE.Mesh(crownGeo, plasmaMat);
      crownGlow.scale.set(0.65, 0.65, 1.3);
      crownGlow.position.set(0, 0.44, 0.01);
      roboA.add(crownGlow);

      // 4. Robotic Power Crossbar (Floating Energy Connector)
      const barGeo = new THREE.BoxGeometry(0.36, 0.07, 0.06);
      const crossbar = new THREE.Mesh(barGeo, chromeMat);
      crossbar.position.set(0, -0.12, 0.015);
      roboA.add(crossbar);

      const barLaserGeo = new THREE.BoxGeometry(0.26, 0.03, 0.07);
      const barLaser = new THREE.Mesh(barLaserGeo, plasmaMat);
      barLaser.position.set(0, -0.12, 0.025);
      roboA.add(barLaser);

      // 5. Central Floating Quantum Hex Reactor Core (The Heart of A)
      const hexGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 6);
      const hexReactor = new THREE.Mesh(hexGeo, crystalMat);
      hexReactor.rotation.x = Math.PI / 2;
      hexReactor.position.set(0, 0.12, 0.02);
      roboA.add(hexReactor);

      const hexRingGeo = new THREE.TorusGeometry(0.14, 0.015, 8, 6);
      const hexRing = new THREE.Mesh(hexRingGeo, chromeMat);
      hexRing.position.set(0, 0.12, 0.03);
      roboA.add(hexRing);

      // 6. Micro Rivet Joints / Bolt Nodes (4 corners)
      const boltGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.09, 8);
      const boltPositions = [
        [-0.14, 0.32],
        [0.14, 0.32],
        [-0.32, -0.36],
        [0.32, -0.36],
      ];
      boltPositions.forEach(([bx, by]) => {
        const bolt = new THREE.Mesh(boltGeo, chromeMat);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(bx, by, 0.03);
        roboA.add(bolt);
      });

      return roboA;
    };

    // Attach Robotic "A" to Front
    const frontRoboA = createRoboticAGroup();
    frontRoboA.position.z = thickness / 2 + 0.025;
    tokenGroup.add(frontRoboA);

    // Attach Robotic "A" to Back (Rotated 180° around Y so it stands upright)
    const backRoboA = createRoboticAGroup();
    backRoboA.rotation.y = Math.PI;
    backRoboA.position.z = -thickness / 2 - 0.025;
    tokenGroup.add(backRoboA);

    // ----------------------------------------------------------------
    // H. Levitating Outer Gyroscope Energy Ring
    // ----------------------------------------------------------------
    const orbitalGroup = new THREE.Group();
    scene.add(orbitalGroup);

    const gyroRingGeo = new THREE.TorusGeometry(1.68, 0.018, 16, 80);
    const gyroRing = new THREE.Mesh(gyroRingGeo, plasmaMat);
    orbitalGroup.add(gyroRing);

    // I. 3 Orbiting Quantum Agent Micro-Drones
    const nodesGroup = new THREE.Group();
    scene.add(nodesGroup);

    const droneGeo = new THREE.OctahedronGeometry(0.05, 0);
    const droneMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x00f0ff,
      emissiveIntensity: 3.5,
      metalness: 0.9,
      roughness: 0.1,
    });

    const droneMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const drone = new THREE.Mesh(droneGeo, droneMat);
      nodesGroup.add(drone);
      droneMeshes.push(drone);
    }

    // 6. Floating Cybernetic Dust Particles
    const dustCount = 45;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPos[i] = (Math.random() - 0.5) * 6;
      dustPos[i + 1] = (Math.random() - 0.5) * 6;
      dustPos[i + 2] = (Math.random() - 0.5) * 4;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.035,
      transparent: true,
      opacity: 0.75,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // 7. Interactive Mouse / Pointer Tilt
    let targetRotX = 0.15;
    let targetRotY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const rect = currentMount.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = x * 0.9;
      targetRotX = -y * 0.9 + 0.15;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = currentMount.getBoundingClientRect();
        const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -(((touch.clientY - rect.top) / rect.height) * 2 - 1);
        targetRotY = x * 0.9;
        targetRotX = -y * 0.9 + 0.15;
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // 8. Render Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Main Token 360-Degree Continuous Rotation
      tokenGroup.rotation.y += 0.014;
      tokenGroup.rotation.x += (targetRotX - tokenGroup.rotation.x) * 0.08;
      tokenGroup.rotation.z = Math.sin(elapsed * 0.9) * 0.06;
      tokenGroup.position.y = Math.sin(elapsed * 1.8) * 0.09;

      // Independent Counter-Rotating Gyroscope
      orbitalGroup.rotation.x = Math.PI / 3.5 + Math.sin(elapsed * 0.5) * 0.15;
      orbitalGroup.rotation.y -= 0.018;
      orbitalGroup.rotation.z = Math.cos(elapsed * 0.7) * 0.12;

      // Orbiting Quantum Agent Drones
      nodesGroup.rotation.x = Math.PI / 3.5;
      nodesGroup.rotation.y += 0.025;
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + elapsed * 1.2;
        droneMeshes[i].position.x = Math.cos(angle) * 1.68;
        droneMeshes[i].position.y = Math.sin(angle) * 1.68;
        droneMeshes[i].rotation.x += 0.05;
        droneMeshes[i].rotation.y += 0.05;
      }

      // Robotic Plasma Pulse
      const pulse = 2.4 + Math.sin(elapsed * 3.5) * 0.8;
      plasmaMat.emissiveIntensity = pulse;
      frontReactorLight.intensity = 5.0 + Math.sin(elapsed * 3.5) * 2.0;
      backReactorLight.intensity = 5.0 + Math.sin(elapsed * 3.5) * 2.0;

      // Dust drift
      dust.rotation.y = elapsed * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', handleResize);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[320px] sm:h-[370px] flex items-center justify-center select-none">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute bottom-2 text-[11px] font-mono tracking-wider uppercase font-bold text-sky-700 dark:text-sky-300 pointer-events-none flex items-center gap-2 bg-sky-50/90 dark:bg-slate-900/90 px-4 py-1.5 rounded-full border border-sky-300/80 dark:border-sky-700/80 shadow-sm backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
        Mecha Robotic $APAY Token • Quantum Hex Reactor Core
      </div>
    </div>
  );
}
