import React, { useEffect, useRef } from 'react';

// import bgImage from './Askar RNC - Starless - Rod Prazeres_1773044125.png';
import bgImage from './IC1805-20251103-JPG.jpg';
import styles from './CosmosHero.module.scss';

// ─── Tune this value (0 = invisible, 1 = fully opaque) ────────────────────────
const BG_IMAGE_OPACITY = 0.75;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleDir: 1 | -1;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trailLength: number;
  alpha: number;
  maxAlpha: number;
  state: 'in' | 'hold' | 'out';
}

// ─── Palette ──────────────────────────────────────────────────────────────────

interface Palette {
  bg: string;
  starColor: (alpha: number) => string;
  shootColor: (alpha: number) => string;
  shootTail: (alpha: number) => string;
  maxStarAlpha: number;
  maxShootAlpha: number;
}

const PALETTE: Palette = {
  bg: '#0d0b12',
  starColor: (a) => `rgba(220,230,255,${a})`,
  shootColor: (a) => `rgba(200,230,255,${a})`,
  shootTail: (a) => `rgba(180,220,255,${a})`,
  maxStarAlpha: 0.9,
  maxShootAlpha: 0.95,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function makeStars(count: number, w: number, h: number, palette: Palette): Star[] {
  return Array.from({ length: count }, () => {
    const baseAlpha = rand(0.1, palette.maxStarAlpha);
    return {
      x: rand(0, w),
      y: rand(0, h),
      r: rand(0.4, 1.8),
      baseAlpha,
      alpha: baseAlpha,
      twinkleSpeed: rand(0.003, 0.012),
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
    };
  });
}

function spawnShootingStar(w: number, h: number, palette: Palette): ShootingStar {
  // Angle between 20° and 40° below horizontal, heading right
  const angleDeg = rand(20, 40);
  const angleRad = (angleDeg * Math.PI) / 180;
  const speed = rand(9, 16);
  const vx = Math.cos(angleRad) * speed;
  const vy = Math.sin(angleRad) * speed;

  // Spawn from top edge or left edge
  let x: number;
  let y: number;
  if (Math.random() < 0.6) {
    // top edge
    x = rand(0, w * 0.7);
    y = rand(-20, h * 0.3);
  } else {
    // left edge
    x = rand(-20, w * 0.2);
    y = rand(0, h * 0.5);
  }

  return {
    x,
    y,
    vx,
    vy,
    trailLength: rand(160, 360),
    alpha: 0,
    maxAlpha: rand(0.6, palette.maxShootAlpha),
    state: 'in',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CosmosHero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = PALETTE;

    // ── Background image ────────────────────────────────────────────────────
    const img = new Image();
    img.src = bgImage.src;
    let imgReady = false;
    img.onload = () => { imgReady = true; };

    // ── Resize ──────────────────────────────────────────────────────────────
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    const MAX_SHOOTING = 6;
    const shootingStars: ShootingStar[] = [];
    let spawnTimer = 0;
    const SPAWN_INTERVAL = 80; // frames between spawn attempts

    function resize() {
      w = canvas!.offsetWidth;
      h = canvas!.offsetHeight;
      canvas!.width = w;
      canvas!.height = h;
      stars = makeStars(180, w, h, palette);
    }

    resize();
    window.addEventListener('resize', resize);

    // ── Animation loop ───────────────────────────────────────────────────────
    function draw() {
      // Solid background colour
      ctx!.fillStyle = palette.bg;
      ctx!.fillRect(0, 0, w, h);

      // Cover-fit background image
      if (imgReady) {
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const canvasAspect = w / h;
        let sx: number, sy: number, sw: number, sh: number;
        if (imgAspect > canvasAspect) {
          sh = img.naturalHeight;
          sw = sh * canvasAspect;
          sx = (img.naturalWidth - sw) / 2;
          sy = 0;
        } else {
          sw = img.naturalWidth;
          sh = sw / canvasAspect;
          sx = 0;
          sy = (img.naturalHeight - sh) / 2;
        }
        ctx!.globalAlpha = BG_IMAGE_OPACITY;
        ctx!.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
        ctx!.globalAlpha = 1;
      }

      // Static stars (twinkle)
      for (const s of stars) {
        s.alpha += s.twinkleSpeed * s.twinkleDir;
        if (s.alpha >= s.baseAlpha + 0.25 || s.alpha <= s.baseAlpha - 0.25) {
          s.twinkleDir = (s.twinkleDir * -1) as 1 | -1;
        }
        s.alpha = Math.max(0, Math.min(palette.maxStarAlpha, s.alpha));

        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = palette.starColor(s.alpha);
        ctx!.fill();
      }

      // Spawn shooting stars
      spawnTimer++;
      if (spawnTimer >= SPAWN_INTERVAL && shootingStars.length < MAX_SHOOTING) {
        if (Math.random() < 0.35) {
          shootingStars.push(spawnShootingStar(w, h, palette));
        }
        spawnTimer = 0;
      }

      // Draw & update shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];

        // State machine
        if (ss.state === 'in') {
          ss.alpha += 0.04;
          if (ss.alpha >= ss.maxAlpha) {
            ss.alpha = ss.maxAlpha;
            ss.state = 'hold';
          }
        } else if (ss.state === 'hold') {
          // Hold until it moves far enough, then start fading
          const distFromStart = Math.hypot(ss.x, ss.y);
          if (distFromStart > Math.min(w, h) * 0.4) {
            ss.state = 'out';
          }
        } else {
          ss.alpha -= 0.015;
        }

        // Remove if faded or off-canvas
        if (ss.alpha <= 0 || ss.x > w + 20 || ss.y > h + 20) {
          shootingStars.splice(i, 1);
          continue;
        }

        // Draw trail (gradient line)
        const tailX = ss.x - ss.vx * (ss.trailLength / 14);
        const tailY = ss.y - ss.vy * (ss.trailLength / 14);

        const grad = ctx!.createLinearGradient(tailX, tailY, ss.x, ss.y);
        grad.addColorStop(0, palette.shootTail(0));
        grad.addColorStop(0.7, palette.shootTail(ss.alpha * 0.6));
        grad.addColorStop(1, palette.shootColor(ss.alpha));

        ctx!.beginPath();
        ctx!.moveTo(tailX, tailY);
        ctx!.lineTo(ss.x, ss.y);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1.5;
        ctx!.lineCap = 'round';
        ctx!.stroke();

        // Head glow
        const glow = ctx!.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 3.5);
        glow.addColorStop(0, palette.shootColor(ss.alpha));
        glow.addColorStop(1, palette.shootColor(0));
        ctx!.beginPath();
        ctx!.arc(ss.x, ss.y, 3.5, 0, Math.PI * 2);
        ctx!.fillStyle = glow;
        ctx!.fill();

        // Advance position
        ss.x += ss.vx;
        ss.y += ss.vy;
      }

      // Image credit
      // const creditText = 'Image Credit: Rod Prazeres';
      const creditText = 'Heart Nebula, taken from my backyard';
      const padding = 10;
      const yOffset = 20;
      ctx!.font = '11px system-ui, sans-serif';
      ctx!.textAlign = 'right';
      ctx!.textBaseline = 'bottom';
      ctx!.fillStyle = 'rgba(255,255,255,1)';
      ctx!.fillText(creditText, w - padding, h - padding - yOffset);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
};
