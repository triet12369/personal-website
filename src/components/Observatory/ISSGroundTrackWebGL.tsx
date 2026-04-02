/**
 * 3D ISS Globe using Three.js.
 * Dynamically imported (ssr: false) from ISSCard.
 */

import { Button } from '@mantine/core';
import { type FC, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { useT } from '../../hooks/useT';
import type { GroundTrackPoint, ISSPosition } from '../../lib/iss';
import { latLonToVec3, createEarthMesh, createAtmosphereMesh } from './earthGlobe';

type Props = {
  position: ISSPosition;
  track: GroundTrackPoint[];
  now: Date;
  sunLat?: number;
  sunLon?: number;
};

export const ISSGroundTrackWebGL: FC<Props> = ({
  position,
  track,
  now: _now,
  sunLat = 0,
  sunLon = 0,
}) => {
  const t = useT();
  const mountRef = useRef<HTMLDivElement>(null);
  // Capture the ISS position at the moment the component mounts (i.e. when the user
  // switches to the 3D tab) so we can aim the camera at it without depending on
  // the frequently-updating `position` prop inside the setup effect.
  const initialPositionRef = useRef(position);

  // Camera follow state — true until the user pans/rotates the globe
  const [isFollowing, setIsFollowing] = useState(true);
  const isFollowingRef = useRef(true);
  const isUserInteractingRef = useRef(false);
  // Mirror of `position` prop kept up-to-date via a thin effect; read inside
  // the RAF loop without staleness issues.
  const positionRef = useRef(position);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    issMarker: THREE.Sprite;
    pastLine: THREE.Line;
    futureLine: THREE.Line;
    frameId: number;
    earthMat: THREE.ShaderMaterial;
  } | null>(null);

  // Initialize scene once
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);

    // Aim camera at the ISS position that was current when the tab was opened.
    // The direction vector points from Earth's center to the ISS surface point;
    // we place the camera 3 units out along that same direction.
    const initPos = initialPositionRef.current;
    const issDir = latLonToVec3(initPos.lat, initPos.lon, 1).normalize();
    camera.position.copy(issDir.multiplyScalar(3));
    camera.lookAt(0, 0, 0);

    const earthMeshObj = createEarthMesh(new THREE.Vector3(1, 0, 0));
    const earthMat = earthMeshObj.material;
    scene.add(earthMeshObj.mesh);

    const atmObj = createAtmosphereMesh();
    scene.add(atmObj.mesh);

    // ISS marker — sprite using the ClearOutside ISS icon
    const issTexture = new THREE.TextureLoader().load('/images/iss_icon.png');
    const issMat = new THREE.SpriteMaterial({
      map: issTexture,
      color: 0xffffff,
      sizeAttenuation: true,
    });
    const issMarker = new THREE.Sprite(issMat);
    issMarker.scale.set(0.1, 0.1, 1);
    scene.add(issMarker);

    // Track lines
    const pastGeo = new THREE.BufferGeometry();
    const pastMat = new THREE.LineBasicMaterial({
      color: 0x6b7280,
      opacity: 0.5,
      transparent: true,
    });
    const pastLine = new THREE.Line(pastGeo, pastMat);
    scene.add(pastLine);

    const futureGeo = new THREE.BufferGeometry();
    const futureMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      opacity: 0.8,
      transparent: true,
    });
    const futureLine = new THREE.Line(futureGeo, futureMat);
    scene.add(futureLine);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.5;
    controls.maxDistance = 8;

    // Detect pan/rotate (not scroll-zoom) — pointerdown fires only for
    // click-drag interactions, never for wheel events.
    const onPanRotateStart = () => {
      isFollowingRef.current = false;
      setIsFollowing(false);
      isUserInteractingRef.current = true;
    };
    const onPanRotateEnd = () => {
      isUserInteractingRef.current = false;
    };
    renderer.domElement.addEventListener('pointerdown', onPanRotateStart);
    window.addEventListener('pointerup', onPanRotateEnd);

    // Smooth fly-in: lerp camera from its starting distance (3) to a closer
    // viewing distance (2.2) over ~60 frames (~1 second at 60fps).
    const FLY_FRAMES = 60;
    const FLY_START = 3;
    const FLY_END = 2.2;
    let flyFrame = 0;

    let frameId = 0;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (flyFrame < FLY_FRAMES) {
        const t = flyFrame / FLY_FRAMES;
        const eased = 1 - (1 - t) ** 3; // ease-out cubic
        const dist = FLY_START + (FLY_END - FLY_START) * eased;
        camera.position.setLength(dist);
        flyFrame++;
      } else if (isFollowingRef.current && !isUserInteractingRef.current) {
        // Smoothly keep the camera aimed at the ISS. We preserve the current
        // camera distance (so zoom is unaffected) and lerp only the direction.
        const currentDist = camera.position.length();
        const pos = positionRef.current;
        const target = latLonToVec3(pos.lat, pos.lon, 1)
          .normalize()
          .multiplyScalar(currentDist);
        camera.position.lerp(target, 0.025);
        // Re-normalise to the original distance in case lerp introduces drift
        camera.position.setLength(currentDist);
      }
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

    sceneRef.current = {
      renderer,
      scene,
      camera,
      controls,
      issMarker,
      pastLine,
      futureLine,
      frameId,
      earthMat,
    };

    return () => {
      cancelAnimationFrame(frameId);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPanRotateStart);
      window.removeEventListener('pointerup', onPanRotateEnd);
      renderer.dispose();
      earthMeshObj.dispose();
      atmObj.dispose();
      window.removeEventListener('resize', handleResize);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // Keep positionRef in sync so the RAF loop always has the latest position
  // without needing to re-run the scene-init effect.
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Update ISS marker position only — runs every 200ms, no geometry reallocation
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.issMarker.position.copy(latLonToVec3(position.lat, position.lon, 1.05));
  }, [position]);

  // Rebuild track geometry only when the track array changes (every ~60s).
  // Three.js cannot grow a BufferGeometry's buffer in-place, so we dispose the
  // old geometry and assign a fresh one to avoid the "buffer size too small" error.
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    const nowMs = Date.now();
    const pastPts = track
      .filter((p) => p.time.getTime() <= nowMs)
      .map((p) => latLonToVec3(p.lat, p.lon, 1.02));
    const futurePts = track
      .filter((p) => p.time.getTime() > nowMs)
      .map((p) => latLonToVec3(p.lat, p.lon, 1.02));

    if (pastPts.length > 1) {
      s.pastLine.geometry.dispose();
      s.pastLine.geometry = new THREE.BufferGeometry().setFromPoints(pastPts);
    }
    if (futurePts.length > 1) {
      s.futureLine.geometry.dispose();
      s.futureLine.geometry = new THREE.BufferGeometry().setFromPoints(futurePts);
    }
  }, [track]);

  // Update sun direction uniform when sub-solar point changes (per-minute)
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.earthMat.uniforms.sunDir.value = latLonToVec3(sunLat, sunLon, 1).normalize();
  }, [sunLat, sunLon]);

  const handleRefocus = () => {
    isFollowingRef.current = true;
    setIsFollowing(true);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {!isFollowing && (
        <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
          <Button size="xs" variant="light" color="cyan" onClick={handleRefocus}>
            {t('observatory.refocusISS')}
          </Button>
        </div>
      )}
    </div>
  );
};
