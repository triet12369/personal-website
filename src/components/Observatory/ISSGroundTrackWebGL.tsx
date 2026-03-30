/**
 * 3D ISS Globe using Three.js.
 * Dynamically imported (ssr: false) from ISSCard.
 */

import React, { FC, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type { GroundTrackPoint, ISSPosition } from '../../lib/iss';

const DEG = Math.PI / 180;

function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

type Props = {
  position: ISSPosition;
  track: GroundTrackPoint[];
  now: Date;
  sunLat?: number;
  sunLon?: number;
};

export const ISSGroundTrackWebGL: FC<Props> = ({ position, track, now, sunLat = 0, sunLon = 0 }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    issMarker: THREE.Sprite;
    pastLine: THREE.Line;
    futureLine: THREE.Line;
    frameId: number;
    sunLight: THREE.DirectionalLight;
  } | null>(null);

  // Initialize scene once
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 0, 3);

    // Ambient light
    scene.add(new THREE.AmbientLight(0x333333));

    // Sun directional light
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    scene.add(sunLight);

    // Earth sphere
    const geo = new THREE.SphereGeometry(1, 64, 32);
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/textures/earth.jpg');
    const mat = new THREE.MeshPhongMaterial({ map: texture, shininess: 15 });
    const earth = new THREE.Mesh(geo, mat);
    scene.add(earth);

    // Atmosphere glow
    const atmGeo = new THREE.SphereGeometry(1.015, 64, 32);
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x3399ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.FrontSide,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // ISS marker — sprite using the ClearOutside ISS icon
    const issTexture = new THREE.TextureLoader().load('/images/iss_icon.png');
    const issMat = new THREE.SpriteMaterial({ map: issTexture, color: 0xffffff, sizeAttenuation: true });
    const issMarker = new THREE.Sprite(issMat);
    issMarker.scale.set(0.1, 0.1, 1);
    scene.add(issMarker);

    // Track lines
    const pastGeo = new THREE.BufferGeometry();
    const pastMat = new THREE.LineBasicMaterial({ color: 0x6b7280, opacity: 0.5, transparent: true });
    const pastLine = new THREE.Line(pastGeo, pastMat);
    scene.add(pastLine);

    const futureGeo = new THREE.BufferGeometry();
    const futureMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, opacity: 0.8, transparent: true });
    const futureLine = new THREE.Line(futureGeo, futureMat);
    scene.add(futureLine);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.5;
    controls.maxDistance = 8;

    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w2 = el.clientWidth;
      const h2 = el.clientHeight;
      renderer.setSize(w2, h2);
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    sceneRef.current = { renderer, scene, camera, controls, issMarker, pastLine, futureLine, frameId, sunLight };

    return () => {
      cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.dispose();
      window.removeEventListener('resize', handleResize);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // Update ISS position and tracks when props change
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;

    // ISS marker
    const issVec = latLonToVec3(position.lat, position.lon, 1.05);
    s.issMarker.position.copy(issVec);

    // Tracks
    const nowMs = now.getTime();
    const pastPts = track
      .filter((p) => p.time.getTime() <= nowMs)
      .map((p) => latLonToVec3(p.lat, p.lon, 1.02));
    const futurePts = track
      .filter((p) => p.time.getTime() > nowMs)
      .map((p) => latLonToVec3(p.lat, p.lon, 1.02));

    if (pastPts.length > 1) {
      s.pastLine.geometry.setFromPoints(pastPts);
    }
    if (futurePts.length > 1) {
      s.futureLine.geometry.setFromPoints(futurePts);
    }

    // Sun light direction
    const sunVec = latLonToVec3(sunLat, sunLon, 5);
    s.sunLight.position.copy(sunVec);
  }, [position, track, now, sunLat, sunLon]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};
