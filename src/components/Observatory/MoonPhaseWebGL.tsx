/**
 * WebGL moon sphere simulating the current phase illumination.
 * Dynamically imported (ssr: false) from MoonCard.
 *
 * Lighting model:
 *   DirectionalLight at (sin(angle), 0, -cos(angle)) — angle = moonPhase().angle
 *   angle=0   (New):    light at (0,  0, -1) → back-lit, dark side faces camera
 *   angle=90  (1Q):     light at (1,  0,  0) → right half lit
 *   angle=180 (Full):   light at (0,  0,  1) → fully front-lit
 *   angle=270 (3Q):     light at (-1, 0,  0) → left half lit
 *
 * Texture: /textures/moon.jpg  (user must add this file)
 */

import React, { FC, useEffect, useRef } from 'react';
import * as THREE from 'three';

const DEG = Math.PI / 180;

type Props = {
  phaseAngle: number; // degrees, 0–360
};

export const MoonPhaseWebGL: FC<Props> = ({ phaseAngle }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const lightRef = useRef<THREE.DirectionalLight | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Set up the scene once on mount
  useEffect(() => {
    const el = mountRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    const size = wrapper.clientWidth || 260;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x07070f, 1);
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0xffffff, 0.04));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    const initRad = phaseAngle * DEG;
    dirLight.position.set(-Math.sin(initRad), 0, -Math.cos(initRad));
    scene.add(dirLight);
    lightRef.current = dirLight;

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 5 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    new THREE.TextureLoader().load('/textures/moon.jpg', (tex) => {
      material.map = tex;
      material.color.set(0xffffff);
      material.needsUpdate = true;
      renderer.render(scene, camera);
    });

    renderer.render(scene, camera);

    // Resize renderer when container changes size
    const ro = new ResizeObserver(() => {
      const s = wrapper.clientWidth;
      if (!s || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
      rendererRef.current.setSize(s, s);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    });
    ro.observe(wrapper);

    return () => {
      ro.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      rendererRef.current = null;
      lightRef.current = null;
    };
  }, []);

  // Re-position light and re-render whenever phaseAngle changes
  useEffect(() => {
    if (!lightRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    const rad = phaseAngle * DEG;
    lightRef.current.position.set(-Math.sin(rad), 0, -Math.cos(rad));
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, [phaseAngle]);

  return (
    <div
      ref={wrapperRef}
      style={{ width: '100%', aspectRatio: '1 / 1', background: '#07070f', borderRadius: 'var(--mantine-radius-md)', padding: 12, boxSizing: 'border-box' }}
    >
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', lineHeight: 0 }}
      />
    </div>
  );
};
