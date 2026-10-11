'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function GlobeCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 300;
    const height = currentMount.clientHeight || 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Inner wireframe sphere
    const sphereGeo = new THREE.IcosahedronGeometry(1.2, 3);
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const sphere = new THREE.Mesh(sphereGeo, wireframeMat);
    globeGroup.add(sphere);

    // Dot particles representing global AI Agent nodes
    const nodeCount = 120;
    const dotGeo = new THREE.BufferGeometry();
    const dotPositions = new Float32Array(nodeCount * 3);

    for (let i = 0; i < nodeCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / nodeCount);
      const theta = Math.sqrt(nodeCount * Math.PI) * phi;

      const r = 1.22;
      dotPositions[i * 3] = r * Math.cos(theta) * Math.sin(phi);
      dotPositions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      dotPositions[i * 3 + 2] = r * Math.cos(phi);
    }

    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
    const dotMat = new THREE.PointsMaterial({
      color: 0x2563eb,
      size: 0.05,
      transparent: true,
      opacity: 0.85,
    });
    const dots = new THREE.Points(dotGeo, dotMat);
    globeGroup.add(dots);

    // Glowing transaction arcs
    const arcCount = 4;
    const arcs: THREE.Line[] = [];

    for (let i = 0; i < arcCount; i++) {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(Math.sin(i) * 1.2, Math.cos(i) * 1.2, 0),
        new THREE.Vector3(0, 0, 1.8),
        new THREE.Vector3(-Math.sin(i) * 1.2, -Math.cos(i) * 1.2, 0),
      );
      const points = curve.getPoints(30);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(points);
      const arcMat = new THREE.LineBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.6,
      });
      const arc = new THREE.Line(arcGeo, arcMat);
      arcs.push(arc);
      globeGroup.add(arc);
    }

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      globeGroup.rotation.y += 0.008;
      globeGroup.rotation.x = 0.2;
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
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[220px] flex items-center justify-center">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-1 right-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">
        Active Base L2 M2M Nodes (99.98% uptime)
      </div>
    </div>
  );
}
