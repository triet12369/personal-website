use wasm_bindgen::prelude::*;

// ── Vector math ───────────────────────────────────────────────────────────────

type V3 = [f32; 3];

#[inline] fn v(x: f32, y: f32, z: f32) -> V3 { [x, y, z] }
#[inline] fn add(a: V3, b: V3) -> V3 { [a[0]+b[0], a[1]+b[1], a[2]+b[2]] }
#[inline] fn sub(a: V3, b: V3) -> V3 { [a[0]-b[0], a[1]-b[1], a[2]-b[2]] }
#[inline] fn scale(a: V3, t: f32) -> V3 { [a[0]*t, a[1]*t, a[2]*t] }
#[inline] fn dot(a: V3, b: V3) -> f32 { a[0]*b[0] + a[1]*b[1] + a[2]*b[2] }
#[inline] fn len2(a: V3) -> f32 { dot(a, a) }
#[inline] fn len(a: V3) -> f32 { len2(a).sqrt() }
#[inline] fn norm(a: V3) -> V3 { scale(a, 1.0 / len(a)) }
#[inline] fn reflect(d: V3, n: V3) -> V3 { sub(d, scale(n, 2.0 * dot(d, n))) }
#[inline] fn lerp(a: V3, b: V3, t: f32) -> V3 { add(scale(a, 1.0 - t), scale(b, t)) }

// ── Scene types ───────────────────────────────────────────────────────────────

struct Sphere {
    center: V3,
    radius: f32,
    albedo: V3,
    specular: f32,     // Phong shininess exponent
    reflectivity: f32, // 0..1
    checkerboard: bool,
}

struct PointLight {
    position: V3,
    intensity: f32,
}

// ── Ray–sphere intersection (half-b form, assumes |rd| = 1) ──────────────────

fn hit_sphere(ro: V3, rd: V3, s: &Sphere) -> Option<f32> {
    let oc = sub(ro, s.center);
    let h = dot(oc, rd);
    let c = dot(oc, oc) - s.radius * s.radius;
    let disc = h * h - c;
    if disc < 0.0 {
        return None;
    }
    let sq = disc.sqrt();
    let t = -h - sq;
    if t > 1e-4 {
        return Some(t);
    }
    let t2 = -h + sq;
    if t2 > 1e-4 { Some(t2) } else { None }
}

// ── Phong lighting with hard shadows ─────────────────────────────────────────

fn compute_lighting(
    p: V3,
    n: V3,
    view: V3,
    spec: f32,
    spheres: &[Sphere],
    lights: &[PointLight],
) -> f32 {
    const AMBIENT: f32 = 0.15;
    let mut intensity = AMBIENT;

    for light in lights {
        let to_light = sub(light.position, p);
        let dist_sq = len2(to_light);
        let l = norm(to_light);

        // Shadow: any sphere blocks the path to the light
        let in_shadow = spheres
            .iter()
            .any(|s| hit_sphere(p, l, s).map(|t| t * t < dist_sq).unwrap_or(false));
        if in_shadow {
            continue;
        }

        // r^-2 falloff, clamped so very close lights don't blow out
        let att = light.intensity / dist_sq.max(1.0);

        // Diffuse
        let ndl = dot(n, l).max(0.0);
        intensity += att * ndl;

        // Specular
        if spec > 0.0 {
            let r = reflect(scale(l, -1.0), n);
            let rdv = dot(r, view).max(0.0);
            intensity += att * rdv.powf(spec);
        }
    }

    intensity
}

// ── Sky background ────────────────────────────────────────────────────────────

fn sky(rd: V3) -> V3 {
    let t = (rd[1] * 0.5 + 0.5).clamp(0.0, 1.0);
    lerp([1.0, 0.95, 0.85], [0.35, 0.55, 0.92], t)
}

// ── Recursive ray tracer ──────────────────────────────────────────────────────

fn trace(ro: V3, rd: V3, spheres: &[Sphere], lights: &[PointLight], depth: u32) -> V3 {
    // Find nearest hit
    let hit = spheres
        .iter()
        .enumerate()
        .filter_map(|(i, s)| hit_sphere(ro, rd, s).map(|t| (t, i)))
        .min_by(|a, b| a.0.partial_cmp(&b.0).unwrap());

    let (t, idx) = match hit {
        None => return sky(rd),
        Some(h) => h,
    };

    let sphere = &spheres[idx];
    let point = add(ro, scale(rd, t));
    let normal = norm(sub(point, sphere.center));
    let view = scale(rd, -1.0);

    // Checkerboard pattern for large ground sphere
    let albedo = if sphere.checkerboard {
        let u = point[0].floor() as i32;
        let w = point[2].floor() as i32;
        if u.wrapping_add(w) & 1 == 0 {
            [0.92_f32, 0.92, 0.88]
        } else {
            [0.12_f32, 0.12, 0.15]
        }
    } else {
        sphere.albedo
    };

    let lighting = compute_lighting(point, normal, view, sphere.specular, spheres, lights);
    let diffuse = scale(albedo, lighting.clamp(0.0, 1.0));

    if depth == 0 || sphere.reflectivity <= 0.0 {
        return diffuse;
    }

    // Reflection ray, bias along normal to avoid self-intersection
    let refl_dir = norm(reflect(rd, normal));
    let refl_origin = add(point, scale(normal, 1e-4));
    let refl_col = trace(refl_origin, refl_dir, spheres, lights, depth - 1);

    lerp(diffuse, refl_col, sphere.reflectivity)
}

// ── Public WASM API ───────────────────────────────────────────────────────────

/// Renders the scene and returns a flat RGBA byte array of `width × height` pixels.
///
/// Camera is defined by its world-space position and three orthonormal basis vectors:
///   right  — camera +X axis
///   up     — camera +Y axis
///   fwd    — direction the camera is looking (toward the scene)
#[wasm_bindgen]
pub fn render(
    width: u32, height: u32,
    cam_x: f32, cam_y: f32, cam_z: f32,
    right_x: f32, right_y: f32, right_z: f32,
    up_x: f32, up_y: f32, up_z: f32,
    fwd_x: f32, fwd_y: f32, fwd_z: f32,
) -> Vec<u8> {
    let camera = v(cam_x, cam_y, cam_z);
    let right  = v(right_x, right_y, right_z);
    let up_cam = v(up_x, up_y, up_z);
    let fwd    = v(fwd_x, fwd_y, fwd_z);

    let spheres = [
        // Ground (large sphere acting as a plane)
        Sphere {
            center: v(0.0, -1000.5, 0.0),
            radius: 1000.0,
            albedo: [0.0; 3], // unused — checkerboard overrides
            specular: 8.0,
            reflectivity: 0.05,
            checkerboard: true,
        },
        // Centre — blue, semi-reflective
        Sphere {
            center: v(0.0, 0.0, -3.5),
            radius: 0.7,
            albedo: [0.25, 0.55, 1.0],
            specular: 400.0,
            reflectivity: 0.45,
            checkerboard: false,
        },
        // Left — red, matte
        Sphere {
            center: v(-1.4, -0.1, -4.0),
            radius: 0.6,
            albedo: [0.85, 0.18, 0.18],
            specular: 30.0,
            reflectivity: 0.08,
            checkerboard: false,
        },
        // Right — gold, mirror-like
        Sphere {
            center: v(1.4, -0.1, -4.0),
            radius: 0.6,
            albedo: [1.0, 0.78, 0.25],
            specular: 600.0,
            reflectivity: 0.65,
            checkerboard: false,
        },
        // Small floating — green
        Sphere {
            center: v(0.0, 1.2, -4.2),
            radius: 0.35,
            albedo: [0.3, 0.85, 0.35],
            specular: 120.0,
            reflectivity: 0.2,
            checkerboard: false,
        },
    ];

    let lights = [
        PointLight { position: v(3.0, 8.0, 2.0),   intensity: 60.0 },
        PointLight { position: v(-5.0, 4.0, -2.0), intensity: 25.0 },
    ];

    let aspect = width as f32 / height as f32;
    // 45° vertical FoV
    let fov_tan = (std::f32::consts::FRAC_PI_8).tan();

    // 2×2 SSAA
    const AA: u32 = 2;
    let inv_aa2 = 1.0 / (AA * AA) as f32;

    let mut pixels = vec![0u8; (width * height * 4) as usize];

    for py in 0..height {
        for px in 0..width {
            let mut col = [0.0_f32; 3];

            for sy in 0..AA {
                for sx in 0..AA {
                    let su = ((px as f32 + (sx as f32 + 0.5) / AA as f32) / width as f32 * 2.0 - 1.0)
                        * aspect
                        * fov_tan;
                    let sv = (1.0
                        - (py as f32 + (sy as f32 + 0.5) / AA as f32) / height as f32 * 2.0)
                        * fov_tan;
                    // rd = right*su + up*sv + fwd, then normalised
                    let rd = norm(add(add(scale(right, su), scale(up_cam, sv)), fwd));
                    let c = trace(camera, rd, &spheres, &lights, 3);
                    col[0] += c[0];
                    col[1] += c[1];
                    col[2] += c[2];
                }
            }

            let base = (py * width + px) as usize * 4;
            // Average samples + gamma 2.2 correction
            pixels[base]     = ((col[0] * inv_aa2).clamp(0.0, 1.0).powf(1.0 / 2.2) * 255.0) as u8;
            pixels[base + 1] = ((col[1] * inv_aa2).clamp(0.0, 1.0).powf(1.0 / 2.2) * 255.0) as u8;
            pixels[base + 2] = ((col[2] * inv_aa2).clamp(0.0, 1.0).powf(1.0 / 2.2) * 255.0) as u8;
            pixels[base + 3] = 255;
        }
    }

    pixels
}
