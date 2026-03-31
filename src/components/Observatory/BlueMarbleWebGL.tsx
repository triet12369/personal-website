/**
 * WebGL Earth sphere showing the user's location facing the camera.
 *
 * Reuses the same day/night shader, textures (/textures/earth.jpg +
 * /textures/earth_night.jpg) and latLonToVec3 convention as ISSGroundTrackWebGL.
 *
 * Instead of rotating the sphere mesh, we move the camera to face the given
 * (lat, lon) — matching the ISS globe approach exactly. The sun direction
 * uniform drives the day/night terminator.
 */

import React, { FC, useEffect, useRef } from 'react';
import * as THREE from 'three';

import { latLonToVec3, createEarthMesh, createAtmosphereMesh } from './earthGlobe';

type Props = {
  lat: number;
  lon: number;
  /** Sub-solar point latitude (degrees). Defaults to 0 if not provided. */
  sunLat?: number;
  /** Sub-solar point longitude (degrees). Defaults to 0 if not provided. */
  sunLon?: number;
};

export const BlueMarbleWebGL: FC<Props> = ({ lat, lon, sunLat = 0, sunLon = 0 }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef   = useRef<HTMLDivElement>(null);
  const sceneRef   = useRef<{
    renderer: THREE.WebGLRenderer;
    scene:    THREE.Scene;
    camera:   THREE.PerspectiveCamera;
    earthMat: THREE.ShaderMaterial;
    marker:   THREE.Mesh;
  } | null>(null);

  // Build scene once on mount
  useEffect(() => {
    const el      = mountRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    const size = wrapper.clientWidth || 300;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

    const earthMeshObj = createEarthMesh(
      latLonToVec3(sunLat, sunLon, 1).normalize(),
      () => renderer.render(scene, camera),
    );
    const earthMat = earthMeshObj.material;
    scene.add(earthMeshObj.mesh);

    const atmObj = createAtmosphereMesh();
    scene.add(atmObj.mesh);

    // Location dot — small cyan sphere on the surface
    const dotGeo = new THREE.SphereGeometry(0.025, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x63d2ff });
    const marker = new THREE.Mesh(dotGeo, dotMat);
    scene.add(marker);

    // Position camera to face the location
    const dir = latLonToVec3(lat, lon, 1).normalize();
    camera.position.copy(dir.clone().multiplyScalar(3));
    camera.lookAt(0, 0, 0);

    // Marker on the surface at (lat, lon)
    marker.position.copy(latLonToVec3(lat, lon, 1.03));

    renderer.render(scene, camera);

    const ro = new ResizeObserver(() => {
      const s = wrapper.clientWidth;
      if (!s) return;
      renderer.setSize(s, s);
      renderer.render(scene, camera);
    });
    ro.observe(wrapper);

    sceneRef.current = { renderer, scene, camera, earthMat, marker };

    return () => {
      ro.disconnect();
      renderer.dispose();
      earthMeshObj.dispose();
      atmObj.dispose();
      dotGeo.dispose();
      dotMat.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reposition camera and marker when lat/lon changes
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    const dir = latLonToVec3(lat, lon, 1).normalize();
    s.camera.position.copy(dir.clone().multiplyScalar(3));
    s.camera.lookAt(0, 0, 0);
    s.marker.position.copy(latLonToVec3(lat, lon, 1.03));
    s.renderer.render(s.scene, s.camera);
  }, [lat, lon]);

  // Update sun direction when sub-solar point changes
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.earthMat.uniforms.sunDir.value = latLonToVec3(sunLat, sunLon, 1).normalize();
    s.renderer.render(s.scene, s.camera);
  }, [sunLat, sunLon]);

  return (
    <div
      ref={wrapperRef}
      style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 6, overflow: 'hidden' }}
    >
      <div ref={mountRef} style={{ width: '100%', height: '100%', lineHeight: 0 }} />
    </div>
  );
};
