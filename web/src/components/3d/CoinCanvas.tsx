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
    renderer.toneMappingExposure = 1.32;
    currentMount.appendChild(renderer.domElement);

    // Procedural Studio Environment for Rich Liquid PBR Reflections
    const pmremGen = new THREE.PMREMGenerator(renderer);
    pmremGen.compileCubemapShader();
    const envSize = 64;
    const envData = new Uint8Array(envSize * envSize * 4);
    for (let y = 0; y < envSize; y++) {
      for (let x = 0; x < envSize; x++) {
        const t = y / (envSize - 1);
        const idx = (y * envSize + x) * 4;
        envData[idx] = Math.round(180 + t * 65);
        envData[idx + 1] = Math.round(200 + t * 50);
        envData[idx + 2] = 255;
        envData[idx + 3] = 255;
      }
    }
    const envTextureSrc = new THREE.DataTexture(envData, envSize, envSize, THREE.RGBAFormat);
    envTextureSrc.needsUpdate = true;
    const envMapRt = pmremGen.fromEquirectangular(envTextureSrc);
    envTextureSrc.dispose();
    scene.environment = envMapRt.texture;

    // 3. Cinematic Cyber Studio Lighting (Calibrated to Prevent Bleaching)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.8);
    keyLight.position.set(4, 5, 4.5);
    scene.add(keyLight);

    const cyanRim = new THREE.DirectionalLight(0x00e5ff, 4.2);
    cyanRim.position.set(-5, -4, 2);
    scene.add(cyanRim);

    const purpleFill = new THREE.DirectionalLight(0x818cf8, 3.0);
    purpleFill.position.set(-3, 4, 3);
    scene.add(purpleFill);

    // Signature Base Cobalt Blue Front Point Light (Accentuates Blue Depth, Zero White Washout)
    const frontReactorLight = new THREE.PointLight(0x0052ff, 4.2, 7);
    frontReactorLight.position.set(0, 0, 2.2);
    scene.add(frontReactorLight);

    const backReactorLight = new THREE.PointLight(0x0052ff, 4.2, 7);
    backReactorLight.position.set(0, 0, -2.2);
    scene.add(backReactorLight);

    // 4. Robotic / Mecha Materials
    // Gunmetal Dark Titanium Armor
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.95,
      roughness: 0.16,
      envMap: envMapRt.texture,
    });

    // Mirror-Polished Liquid Platinum Chrome (Razor Edge)
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.05,
      envMap: envMapRt.texture,
    });

    // Intense Cyber Cyan Plasma (Mecha energy veins)
    const plasmaMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x00f0ff,
      emissiveIntensity: 3.2,
      roughness: 0.1,
      metalness: 0.8,
    });

    // Core Quantum Crystal (Prism Core)
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      emissive: 0x0284c7,
      emissiveIntensity: 1.8,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.85,
      thickness: 0.6,
      ior: 1.8,
      envMap: envMapRt.texture,
    });

    // Official Base Cobalt Blue PBR Material (Left Ascending Rail - Vivid, Pure & Radiant)
    const baseBlueMat = new THREE.MeshPhysicalMaterial({
      color: 0x0052ff,
      emissive: 0x0040ee,
      emissiveIntensity: 0.82,
      metalness: 0.02,
      roughness: 0.18,
      clearcoat: 0.35,
      clearcoatRoughness: 0.08,
      reflectivity: 0.8,
      envMap: envMapRt.texture,
    });

    // Official Pure White Liquid Ceramic PBR Material (Right Loop - Gleaming & Crisp)
    const pureWhiteMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0xf8fafc,
      emissiveIntensity: 0.3,
      metalness: 0.04,
      roughness: 0.14,
      clearcoat: 0.45,
      clearcoatRoughness: 0.06,
      reflectivity: 0.95,
      envMap: envMapRt.texture,
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
    // G. OFFICIAL A-PAY 3D SCULPTED EMBLEM (True 3D Dual-Mesh Extrusion)
    // ----------------------------------------------------------------
    const createOfficialLogoGroup = () => {
      const emblemGroup = new THREE.Group();

      const s = 0.0055;
      const sx = (x: number) => (x + 3) * s;
      const sy = (y: number) => -(y + 8) * s; // Invert SVG Y and optical balance

      // 0. Official Precision Circular Track Ring (matching 2D vector r=216)
      const trackGeo = new THREE.TorusGeometry(216 * s, 0.008, 8, 64);
      const trackMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.4,
      });
      const trackMesh = new THREE.Mesh(trackGeo, trackMat);
      trackMesh.position.set(0, 0, 0.002);
      emblemGroup.add(trackMesh);

      // 1. Left Ascending Rail (Base Cobalt Blue #0052FF)
      const leftRailShape = new THREE.Shape();
      leftRailShape.moveTo(sx(-115), sy(130));
      leftRailShape.lineTo(sx(-25), sy(-120));
      leftRailShape.bezierCurveTo(sx(-15), sy(-152), sx(15), sy(-152), sx(25), sy(-120));
      leftRailShape.lineTo(sx(55), sy(-35));
      leftRailShape.lineTo(sx(10), sy(-35));
      leftRailShape.lineTo(sx(-6), sy(-85));
      leftRailShape.lineTo(sx(-70), sy(105));
      leftRailShape.lineTo(sx(-115), sy(130));
      leftRailShape.closePath();

      // 2. Right Descending Rail & Infinite M2M Payment Loop (Crisp Pure White)
      const rightLoopShape = new THREE.Shape();
      rightLoopShape.moveTo(sx(115), sy(130));
      rightLoopShape.lineTo(sx(25), sy(-120));
      rightLoopShape.bezierCurveTo(sx(18), sy(-140), sx(0), sy(-140), sx(-5), sy(-125));
      rightLoopShape.lineTo(sx(-25), sy(-65));
      rightLoopShape.lineTo(sx(20), sy(-65));
      rightLoopShape.lineTo(sx(60), sy(50));
      rightLoopShape.lineTo(sx(-40), sy(50));
      rightLoopShape.bezierCurveTo(sx(-60), sy(50), sx(-75), sy(35), sx(-75), sy(15));
      rightLoopShape.bezierCurveTo(sx(-75), sy(-5), sx(-60), sy(-20), sx(-40), sy(-20));
      rightLoopShape.lineTo(sx(-10), sy(-20));
      rightLoopShape.lineTo(sx(-2), sy(-50));
      rightLoopShape.lineTo(sx(-40), sy(-50));
      rightLoopShape.bezierCurveTo(sx(-75), sy(-50), sx(-105), sy(-20), sx(-105), sy(15));
      rightLoopShape.bezierCurveTo(sx(-105), sy(50), sx(-75), sy(80), sx(-40), sy(80));
      rightLoopShape.lineTo(sx(70), sy(80));
      rightLoopShape.lineTo(sx(85), sy(130));
      rightLoopShape.closePath();

      const leftExtrude = {
        depth: 0.088,
        bevelEnabled: true,
        bevelSegments: 5,
        steps: 1,
        bevelSize: 0.016,
        bevelThickness: 0.016,
      };

      const rightExtrude = {
        depth: 0.082,
        bevelEnabled: true,
        bevelSegments: 5,
        steps: 1,
        bevelSize: 0.015,
        bevelThickness: 0.015,
      };

      // 3D Left Ascending Rail (Base Cobalt Blue - Proud 3D Elevation)
      const leftRailGeo = new THREE.ExtrudeGeometry(leftRailShape, leftExtrude);
      const leftRailMesh = new THREE.Mesh(leftRailGeo, baseBlueMat);
      leftRailMesh.position.set(0, 0, 0.008);
      emblemGroup.add(leftRailMesh);

      // Inner Luminous Cobalt Energy Core (Guarantees Vivid Blue Radiance)
      const leftGlowGeo = new THREE.ExtrudeGeometry(leftRailShape, {
        depth: 0.09,
        bevelEnabled: false,
        steps: 1,
      });
      const leftGlowMat = new THREE.MeshBasicMaterial({
        color: 0x0052ff,
        transparent: true,
        opacity: 0.35,
      });
      const leftGlowMesh = new THREE.Mesh(leftGlowGeo, leftGlowMat);
      leftGlowMesh.scale.set(0.94, 0.94, 1.0);
      leftGlowMesh.position.set(sx(-1.2), sy(1.2), 0.007);
      emblemGroup.add(leftGlowMesh);

      // 3D Right Rail & Infinite M2M Loop (Crisp Pure White - Intertwined 3D Relief)
      const rightLoopGeo = new THREE.ExtrudeGeometry(rightLoopShape, rightExtrude);
      const rightLoopMesh = new THREE.Mesh(rightLoopGeo, pureWhiteMat);
      rightLoopMesh.position.set(0, 0, 0.01); // Intertwined in physical relief
      emblemGroup.add(rightLoopMesh);

      // 3. Recessed Quantum Energy Conduit behind the M2M Loop (Flush, Open Center Aperture)
      const loopCenterX = sx(-40);
      const loopCenterY = sy(15);
      const conduitGeo = new THREE.TorusGeometry(0.15, 0.012, 16, 48);
      const conduit = new THREE.Mesh(conduitGeo, plasmaMat);
      conduit.position.set(loopCenterX, loopCenterY, 0.004);
      emblemGroup.add(conduit);

      const centerCoreGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.01, 16);
      const centerCore = new THREE.Mesh(centerCoreGeo, crystalMat);
      centerCore.rotation.x = Math.PI / 2;
      centerCore.position.set(loopCenterX, loopCenterY, 0.003);
      emblemGroup.add(centerCore);

      return emblemGroup;
    };

    // Attach Official 3D Logo to Front
    const frontLogo = createOfficialLogoGroup();
    frontLogo.position.z = thickness / 2 + 0.01;
    tokenGroup.add(frontLogo);

    // Attach Official 3D Logo to Back (Rotated 180° around Y)
    const backLogo = createOfficialLogoGroup();
    backLogo.rotation.y = Math.PI;
    backLogo.position.z = -thickness / 2 - 0.01;
    tokenGroup.add(backLogo);

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
      pmremGen.dispose();
      envMapRt.dispose();
      baseBlueMat.dispose();
      pureWhiteMat.dispose();
      titaniumMat.dispose();
      chromeMat.dispose();
      plasmaMat.dispose();
      crystalMat.dispose();
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
