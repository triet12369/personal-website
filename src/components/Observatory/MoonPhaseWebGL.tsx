/**
 * WebGL moon sphere simulating the current phase illumination.
 * Dynamically imported (ssr: false) from MoonCard.
 *
 * Lighting model:
 *   Sphere is rotated -90° around Y so the near side (0° lon, u=0.5) faces the camera.
 *   Southern hemisphere (lat < 0): rotation.x=π + rotation.y=+π/2 (instead of -π/2)
 *   keeps the near side facing the camera while flipping the image 180° (N at bottom).
 *   Derivation: near side at local +X. R_Y(+π/2)·(1,0,0)=(0,0,-1), then R_X(π) flips z
 *   back to +Z (toward camera), with north pole going to -Y (bottom). ✓
 *
 *   NH  — rotation.y=-π/2            DirectionalLight at ( sin(angle), 0, -cos(angle))
 *   SH  — rotation.x=π, rotation.y=π/2  DirectionalLight at (-sin(angle), 0, -cos(angle))
 *   angle=0   (New):    back-lit, near side dark
 *   angle=90  (1Q):     NH right half lit  / SH left half lit
 *   angle=180 (Full):   fully front-lit
 *   angle=270 (3Q):     NH left half lit   / SH right half lit
 *
 * Texture: /textures/moon.jpg  (user must add this file)
 */

import React, { FC, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const DEG = Math.PI / 180;

/**
 * Build a group of reference lines drawn in the sphere's local UV frame:
 *   yellow  = 0° longitude  (near side, faces camera)
 *   orange  = 180°           (far side)
 *   magenta = ±90°           (east/west limbs)
 *   dim     = ±45°, ±135°   (grid)
 *   cyan    = equator
 *
 * In Three.js SphereGeometry: near side (u=0.5) lives at phi=π.
 * Geographic lon L maps to phi = π + L·DEG.
 * vertex: x = -cos(phi)*sin(θ), y = cos(θ), z = sin(phi)*sin(θ)
 */
function buildDebugLines(): THREE.Group {
  const R = 1.006; // sit just above sphere surface
  const group = new THREE.Group();

  function addMeridian(geoLon: number, color: number, opacity = 1) {
    const phi = Math.PI + geoLon * DEG;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI;
      pts.push(new THREE.Vector3(
        -Math.cos(phi) * Math.sin(theta) * R,
        Math.cos(theta) * R,
        Math.sin(phi) * Math.sin(theta) * R,
      ));
    }
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
    ));
  }

  // background grid
  for (const lon of [-135, -45, 45, 135]) addMeridian(lon, 0x333333, 0.7);
  addMeridian(-90, 0xff44aa);  // west limb
  addMeridian(90,  0xff44aa);  // east limb
  addMeridian(180, 0xff6600);  // far side
  addMeridian(0,   0xffff00);  // near side center (faces camera) — draw last so it renders on top

  // equator
  const eqPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    const phi = (i / 128) * 2 * Math.PI;
    eqPts.push(new THREE.Vector3(-Math.cos(phi) * R, 0, Math.sin(phi) * R));
  }
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(eqPts),
    new THREE.LineBasicMaterial({ color: 0x00aaff }),
  ));

  return group;
}

function disposeDebugGroup(group: THREE.Group) {
  group.traverse((obj) => {
    if (obj instanceof THREE.Line) {
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    }
  });
}

type Props = {
  phaseAngle: number;  // degrees, 0–360
  latitude: number;    // observer latitude; negative = southern hemisphere
  debug?: boolean;     // draw longitude/equator reference lines
};

export const MoonPhaseWebGL: FC<Props> = ({ phaseAngle, latitude, debug = false }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const lightRef = useRef<THREE.DirectionalLight | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const debugGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rafRef = useRef<number>(0);
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 4);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0xffffff, 0.04));

    const sign = latitude < 0 ? -1 : 1;
    const dirLight = new THREE.DirectionalLight(0xfff8f0, 1.6);
    const initRad = phaseAngle * DEG;
    dirLight.position.set(sign * Math.sin(initRad), 0, -Math.cos(initRad));
    scene.add(dirLight);
    lightRef.current = dirLight;

    const geometry = new THREE.SphereGeometry(1, 128, 128);
    const material = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 8 });
    const mesh = new THREE.Mesh(geometry, material);
    // NH: rotation.y=-π/2 brings local +X (near side) to world +Z (faces camera).
    // SH: rotation.y=+π/2 would send +X to world -Z (wrong), so rotation.x=π flips Z
    //     back toward the camera, while also flipping north/south — 180° visual rotation.
    mesh.rotation.x = latitude < 0 ? Math.PI : 0;
    mesh.rotation.y = latitude < 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(mesh);
    meshRef.current = mesh;

    if (debug) {
      const group = buildDebugLines();
      mesh.add(group);
      debugGroupRef.current = group;
    }

    const loader = new THREE.TextureLoader();

    loader.load('/textures/moon.jpg', (tex) => {
      material.map = tex;
      material.color.set(0xffffff);
      material.needsUpdate = true;
      renderer.render(scene, camera);
    });

    loader.load('/textures/moon_displacement.jpg', (tex) => {
      material.bumpMap = tex;
      material.bumpScale = 0.06;
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
      if (debugGroupRef.current) {
        disposeDebugGroup(debugGroupRef.current);
        debugGroupRef.current = null;
      }
      rendererRef.current = null;
      lightRef.current = null;
      meshRef.current = null;
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Create/destroy OrbitControls when debug mode toggles
  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!renderer || !camera || !scene) return;

    if (debug) {
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.minDistance = 1.5;
      controls.maxDistance = 8;
      controlsRef.current = controls;

      // Drive a render loop while controls are active
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        controls.update();
        renderer.render(scene, camera);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }
      // Snap camera back to default position
      camera.position.set(0, 0, 4);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [debug]);

  // Toggle debug lines when debug prop changes
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (debug && !debugGroupRef.current) {
      const group = buildDebugLines();
      mesh.add(group);
      debugGroupRef.current = group;
    } else if (!debug && debugGroupRef.current) {
      mesh.remove(debugGroupRef.current);
      disposeDebugGroup(debugGroupRef.current);
      debugGroupRef.current = null;
    }
    rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
  }, [debug]);

  // Update light direction and mesh Z-rotation whenever phase or hemisphere changes
  useEffect(() => {
    if (!lightRef.current || !meshRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    const rad = phaseAngle * DEG;
    const sign = latitude < 0 ? -1 : 1;
    lightRef.current.position.set(sign * Math.sin(rad), 0, -Math.cos(rad));
    meshRef.current.rotation.x = latitude < 0 ? Math.PI : 0;
    meshRef.current.rotation.y = latitude < 0 ? Math.PI / 2 : -Math.PI / 2;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, [phaseAngle, latitude]);

  return (
    <div
      ref={wrapperRef}
      style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden' }}
    >
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%', lineHeight: 0, display: 'block' }}
      />
    </div>
  );
};
