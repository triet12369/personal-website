/**
 * Shared Three.js utilities for Observatory Earth globe components.
 *
 * Used by:
 *   - ISSGroundTrackWebGL  (ISS tracker with orbit controls)
 *   - BlueMarbleWebGL      (static "you are here" view)
 */

import * as THREE from 'three';

export const DEG = Math.PI / 180;

/**
 * Convert geographic coordinates to a Three.js world-space vector.
 *
 * Convention (consistent across all Observatory globe components):
 *   - +Y = North pole
 *   - lon=0, lat=0 → (0, 0, 0) on a unit sphere → front at lon≈180° facing +Z
 */
export function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

/** Return value from {@link createEarthMesh}. */
export interface EarthMesh {
  /** The sphere mesh — add to your scene. */
  mesh: THREE.Mesh;
  /** The ShaderMaterial — update `uniforms.sunDir.value` each frame. */
  material: THREE.ShaderMaterial;
  /**
   * Call after the night texture has finished loading (already handled
   * internally — exposed here for disposal only).
   */
  dispose: () => void;
}

/**
 * Create the Earth sphere mesh with a day/night shader and load both textures.
 *
 * The caller is responsible for adding `mesh` to the scene and calling
 * `dispose()` on cleanup.
 *
 * @param initialSunDir   Initial sun direction vector (world space, normalised).
 *                        Defaults to (1, 0, 0).
 * @param onNightLoaded   Optional callback fired once the night texture is ready.
 */
export function createEarthMesh(
  initialSunDir: THREE.Vector3 = new THREE.Vector3(1, 0, 0),
  onNightLoaded?: () => void,
): EarthMesh {
  const geo = new THREE.SphereGeometry(1, 64, 32);
  const loader = new THREE.TextureLoader();
  const dayTex = loader.load('/textures/earth.webp');

  const material = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTex },
      nightTexture: { value: new THREE.Texture() },
      sunDir: { value: initialSunDir.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D dayTexture;
      uniform sampler2D nightTexture;
      uniform vec3 sunDir;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      void main() {
        vec3 N = normalize(vWorldNormal);
        float NdotL = dot(N, sunDir);
        // Soft terminator blend over ~25 degrees
        float dayBlend = smoothstep(-0.1, 0.15, NdotL);
        vec4 daySample   = texture2D(dayTexture,   vUv);
        vec4 nightSample = texture2D(nightTexture, vUv);
        // Day side: ambient base + diffuse
        vec3 dayLit   = daySample.rgb   * (0.1 + 0.9 * max(NdotL, 0.0));
        // Night side: city-lights, dimmed
        vec3 nightLit = nightSample.rgb * 0.7;
        gl_FragColor = vec4(mix(nightLit, dayLit, dayBlend), 1.0);
      }
    `,
  });

  // Load + downsample night texture to 50% via canvas to save GPU memory
  loader.load('/textures/earth_night.webp', (tex) => {
    const img = tex.image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(img.width * 0.5));
    canvas.height = Math.max(1, Math.floor(img.height * 0.5));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      material.uniforms.nightTexture.value = new THREE.CanvasTexture(canvas);
      tex.dispose();
      onNightLoaded?.();
    }
  });

  const mesh = new THREE.Mesh(geo, material);

  return {
    mesh,
    material,
    dispose: () => {
      geo.dispose();
      material.dispose();
    },
  };
}

/**
 * Create the semi-transparent blue atmosphere halo.
 * Add the returned mesh to your scene; dispose with `dispose()` on cleanup.
 */
export function createAtmosphereMesh(): { mesh: THREE.Mesh; dispose: () => void } {
  const geo = new THREE.SphereGeometry(1.015, 64, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x3399ff,
    transparent: true,
    opacity: 0.06,
    side: THREE.FrontSide,
  });
  return {
    mesh: new THREE.Mesh(geo, mat),
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}
