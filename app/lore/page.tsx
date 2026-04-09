"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const COLORS = ["#E85D75", "#E8A84C", "#E8D44C", "#4CE88A", "#4CA8E8", "#9B6BE8"];

/* ── Draw the REAL MIKE sprite (same as main game createCharacterFrame) ── */
function drawRealMike(canvas: HTMLCanvasElement, frame: number) {
  const SPRITE_W = 32;
  const SPRITE_H = 48;
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  const tc = canvas.getContext("2d");
  if (!tc) return;
  tc.clearRect(0, 0, SPRITE_W, SPRITE_H);

  const isNeutral = frame === 1 || frame === 3;
  const legSwing = isNeutral ? 0 : (frame === 0 ? 1 : -1);
  const armSwing = -legSwing;

  // Head
  tc.fillStyle = "#5A3A1A";
  tc.beginPath();
  tc.arc(16, 8, 6, 0, Math.PI * 2);
  tc.fill();

  // Ears
  tc.fillStyle = "#C0A078";
  tc.beginPath();
  tc.arc(10, 7, 1.5, 0, Math.PI * 2);
  tc.fill();
  tc.beginPath();
  tc.arc(22, 7, 1.5, 0, Math.PI * 2);
  tc.fill();

  // Neck
  tc.fillStyle = "#B8987A";
  tc.fillRect(14, 13, 4, 3);

  // Torso
  tc.fillStyle = "#4A5A6A";
  tc.beginPath();
  tc.moveTo(7, 16);
  tc.lineTo(25, 16);
  tc.quadraticCurveTo(24, 23, 22, 30);
  tc.lineTo(10, 30);
  tc.quadraticCurveTo(8, 23, 7, 16);
  tc.closePath();
  tc.fill();

  // Spine shadow
  tc.strokeStyle = "rgba(50, 60, 70, 0.4)";
  tc.lineWidth = 1.5;
  tc.beginPath();
  tc.moveTo(16, 17);
  tc.lineTo(16, 29);
  tc.stroke();

  // Shirt wrinkles
  tc.strokeStyle = "rgba(55, 65, 75, 0.3)";
  tc.lineWidth = 0.8;
  tc.beginPath();
  tc.moveTo(10, 20);
  tc.quadraticCurveTo(16, 21, 22, 20);
  tc.stroke();
  tc.beginPath();
  tc.moveTo(11, 25);
  tc.quadraticCurveTo(16, 26, 21, 25);
  tc.stroke();

  // Belt
  tc.fillStyle = "#252525";
  tc.beginPath();
  tc.moveTo(10, 29);
  tc.lineTo(22, 29);
  tc.lineTo(22, 31);
  tc.lineTo(10, 31);
  tc.closePath();
  tc.fill();

  // Left arm
  const leftArmEndY = 27 + armSwing * 2;
  const leftArmEndX = 6 + (armSwing > 0 ? -1 : armSwing < 0 ? 1 : 0);
  tc.fillStyle = "#3E4E5E";
  tc.beginPath();
  tc.moveTo(8, 16);
  tc.lineTo(10, 16);
  tc.quadraticCurveTo(9, 22, leftArmEndX + 2, leftArmEndY);
  tc.lineTo(leftArmEndX, leftArmEndY);
  tc.quadraticCurveTo(7, 22, 8, 16);
  tc.closePath();
  tc.fill();
  tc.fillStyle = "#B8987A";
  tc.beginPath();
  tc.arc(leftArmEndX + 1, leftArmEndY + 1, 1.5, 0, Math.PI * 2);
  tc.fill();

  // Right arm
  const rightArmEndY = 27 - armSwing * 2;
  const rightArmEndX = 26 + (armSwing < 0 ? 1 : armSwing > 0 ? -1 : 0);
  tc.fillStyle = "#3E4E5E";
  tc.beginPath();
  tc.moveTo(22, 16);
  tc.lineTo(24, 16);
  tc.quadraticCurveTo(25, 22, rightArmEndX, rightArmEndY);
  tc.lineTo(rightArmEndX - 2, rightArmEndY);
  tc.quadraticCurveTo(23, 22, 22, 16);
  tc.closePath();
  tc.fill();
  tc.fillStyle = "#B8987A";
  tc.beginPath();
  tc.arc(rightArmEndX - 1, rightArmEndY + 1, 1.5, 0, Math.PI * 2);
  tc.fill();

  // Left leg
  const leftLegOffsetX = legSwing > 0 ? -1 : legSwing < 0 ? 1 : 0;
  const leftLegBottomY = legSwing > 0 ? 43 : legSwing < 0 ? 45 : 44;
  tc.fillStyle = "#2A2A2A";
  tc.beginPath();
  tc.moveTo(10, 30);
  tc.lineTo(15, 30);
  tc.quadraticCurveTo(14 + leftLegOffsetX, 37, 13 + leftLegOffsetX, leftLegBottomY);
  tc.lineTo(10 + leftLegOffsetX, leftLegBottomY);
  tc.quadraticCurveTo(10 + leftLegOffsetX, 37, 10, 30);
  tc.closePath();
  tc.fill();

  // Right leg
  const rightLegOffsetX = legSwing < 0 ? 1 : legSwing > 0 ? -1 : 0;
  const rightLegBottomY = legSwing < 0 ? 43 : legSwing > 0 ? 45 : 44;
  tc.fillStyle = "#2A2A2A";
  tc.beginPath();
  tc.moveTo(17, 30);
  tc.lineTo(22, 30);
  tc.quadraticCurveTo(22 + rightLegOffsetX, 37, 21 + rightLegOffsetX, rightLegBottomY);
  tc.lineTo(18 + rightLegOffsetX, rightLegBottomY);
  tc.quadraticCurveTo(17 + rightLegOffsetX, 37, 17, 30);
  tc.closePath();
  tc.fill();

  // Feet
  tc.fillStyle = "#1A1A1A";
  tc.beginPath();
  tc.ellipse(11.5 + leftLegOffsetX, leftLegBottomY + 1.5, 3, 1.5, 0, 0, Math.PI * 2);
  tc.fill();
  tc.beginPath();
  tc.ellipse(19.5 + rightLegOffsetX, rightLegBottomY + 1.5, 3, 1.5, 0, 0, Math.PI * 2);
  tc.fill();

  if (frame === 3) {
    tc.fillStyle = "rgba(74, 90, 106, 0.3)";
    tc.beginPath();
    tc.ellipse(16, 17, 8, 1, 0.05, 0, Math.PI * 2);
    tc.fill();
  }
}

/* ── Draw corridor scene on a canvas ── */
function drawCorridorScene(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  variant: "long" | "junction" | "deadend" | "figure"
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  // Base darkness
  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h * 0.42;

  // Vanishing point corridor walls with brick texture
  const wallLeft = w * 0.15;
  const wallRight = w * 0.85;
  const vpLeft = cx - w * 0.08;
  const vpRight = cx + w * 0.08;
  const vpTop = cy - h * 0.12;
  const vpBottom = cy + h * 0.06;

  // Left wall
  ctx.fillStyle = "#1A1410";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(vpLeft, vpTop);
  ctx.lineTo(vpLeft, vpBottom);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Right wall
  ctx.fillStyle = "#181210";
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(vpRight, vpTop);
  ctx.lineTo(vpRight, vpBottom);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Floor
  ctx.fillStyle = "#0E0C0A";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(vpLeft, vpBottom);
  ctx.lineTo(vpRight, vpBottom);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Ceiling
  ctx.fillStyle = "#0A0A0C";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(vpLeft, vpTop);
  ctx.lineTo(vpRight, vpTop);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();

  // Brick pattern on left wall
  const brickColors = ["#1E1812", "#201A14", "#1C1610", "#221C16"];
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 4; col++) {
      const t1 = (row * 4 + col) / 48;
      const t2 = (row * 4 + col + 1) / 48;
      const tRow1 = row / 12;
      const tRow2 = (row + 1) / 12;

      const x1 = wallLeft * (1 - tRow1) + vpLeft * tRow1 - col * 2;
      const x2 = wallLeft * (1 - tRow1) + vpLeft * tRow1 + (wallLeft * 0.3) * (1 - tRow1);
      const y1 = tRow1 * vpTop + (1 - tRow1) * 0;
      const y2 = tRow2 * vpTop + (1 - tRow2) * 0;

      ctx.fillStyle = brickColors[(row + col) % brickColors.length];
      ctx.globalAlpha = 0.6 - t1 * 0.3;
      ctx.fillRect(x1, y1 + row * (h / 14), Math.max(1, x2 - x1), Math.max(1, (y2 - y1) + h / 16));
    }
  }
  ctx.globalAlpha = 1;

  // Brick pattern on right wall
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 4; col++) {
      const tRow1 = row / 12;
      const tRow2 = (row + 1) / 12;

      const x1 = w - wallLeft * (1 - tRow1) - (wallLeft * 0.3) * (1 - tRow1) + col * 2;
      const x2 = w - wallLeft * (1 - tRow1);
      const y1 = tRow1 * vpTop + (1 - tRow1) * 0;

      ctx.fillStyle = brickColors[(row + col + 2) % brickColors.length];
      ctx.globalAlpha = 0.5 - tRow1 * 0.25;
      ctx.fillRect(x1, y1 + row * (h / 14), Math.max(1, x2 - x1), Math.max(1, h / 16));
    }
  }
  ctx.globalAlpha = 1;

  // Grout lines (horizontal) on walls
  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    ctx.strokeStyle = "rgba(10,8,6,0.4)";
    ctx.lineWidth = 0.5;
    // Left wall grout
    const ly = t * vpTop + (1 - t) * 0 + (h * t * 0.05);
    ctx.beginPath();
    ctx.moveTo(0, ly + i * (h / 10));
    ctx.lineTo(vpLeft, vpTop + (vpBottom - vpTop) * t);
    ctx.stroke();
    // Right wall grout
    ctx.beginPath();
    ctx.moveTo(w, ly + i * (h / 10));
    ctx.lineTo(vpRight, vpTop + (vpBottom - vpTop) * t);
    ctx.stroke();
  }

  // Floor tiles / lines
  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    ctx.strokeStyle = "rgba(20,18,14,0.3)";
    ctx.lineWidth = 0.5;
    const fy = vpBottom + (h - vpBottom) * t;
    const fx1 = vpLeft - (vpLeft - 0) * t;
    const fx2 = vpRight + (w - vpRight) * t;
    ctx.beginPath();
    ctx.moveTo(fx1, fy);
    ctx.lineTo(fx2, fy);
    ctx.stroke();
  }

  // Ceiling light
  const lightW = (vpRight - vpLeft) * 0.5;
  const lightH = 2;
  ctx.fillStyle = "#3A3520";
  ctx.fillRect(cx - lightW / 2, vpTop - 1, lightW, lightH);
  // Light glow
  const glowGrad = ctx.createRadialGradient(cx, vpTop, 2, cx, vpTop + 10, w * 0.2);
  glowGrad.addColorStop(0, "rgba(60,55,30,0.15)");
  glowGrad.addColorStop(1, "rgba(60,55,30,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(cx - w * 0.2, vpTop - 5, w * 0.4, h * 0.3);

  // Fog in the distance
  const fogGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, w * 0.3);
  fogGrad.addColorStop(0, "rgba(20,18,14,0.4)");
  fogGrad.addColorStop(1, "rgba(20,18,14,0)");
  ctx.fillStyle = fogGrad;
  ctx.fillRect(vpLeft, vpTop, vpRight - vpLeft, vpBottom - vpTop);

  // Variant-specific elements
  if (variant === "junction") {
    // T-intersection: opening on left wall
    const openY = cy - 5;
    const openH = 18;
    ctx.fillStyle = "#050404";
    ctx.fillRect(vpLeft - 8, openY, 10, openH);
    // Faint corridor going left
    ctx.fillStyle = "#0C0A08";
    ctx.fillRect(vpLeft - 20, openY + 2, 14, openH - 4);
  } else if (variant === "deadend") {
    // Back wall visible
    ctx.fillStyle = "#151210";
    ctx.fillRect(vpLeft, vpTop, vpRight - vpLeft, vpBottom - vpTop);
    // Note on back wall
    ctx.fillStyle = "#C8BC90";
    ctx.fillRect(cx - 3, cy - 4, 6, 5);
    // text scratches
    ctx.fillStyle = "#8A7E60";
    ctx.fillRect(cx - 2, cy - 3, 4, 0.5);
    ctx.fillRect(cx - 1, cy - 1, 3, 0.5);
  } else if (variant === "figure") {
    // Faint MIKE figure in the distance
    const fx = cx;
    const fy = cy - 2;
    ctx.fillStyle = "rgba(50,45,38,0.5)";
    // head
    ctx.fillRect(fx - 1, fy - 3, 2, 2);
    // body
    ctx.fillRect(fx - 1, fy - 1, 3, 3);
    // legs
    ctx.fillStyle = "rgba(35,30,25,0.4)";
    ctx.fillRect(fx - 1, fy + 2, 1, 2);
    ctx.fillRect(fx + 1, fy + 2, 1, 2);
  }

  // Edge vignette
  const vigGrad = ctx.createRadialGradient(cx, h / 2, w * 0.2, cx, h / 2, w * 0.7);
  vigGrad.addColorStop(0, "rgba(0,0,0,0)");
  vigGrad.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, w, h);
}

/* ── Draw fullscreen corridor background ── */
function drawBackgroundCorridor(canvas: HTMLCanvasElement) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Base
  ctx.fillStyle = "#080706";
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h * 0.40;

  // Corridor geometry
  const vpLeft = cx - w * 0.06;
  const vpRight = cx + w * 0.06;
  const vpTop = cy - h * 0.08;
  const vpBottom = cy + h * 0.04;

  // Left wall
  ctx.fillStyle = "#141110";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(vpLeft, vpTop);
  ctx.lineTo(vpLeft, vpBottom);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Right wall
  ctx.fillStyle = "#121010";
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(vpRight, vpTop);
  ctx.lineTo(vpRight, vpBottom);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Floor
  ctx.fillStyle = "#0C0A08";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(vpLeft, vpBottom);
  ctx.lineTo(vpRight, vpBottom);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Ceiling
  ctx.fillStyle = "#0A0A0C";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(vpLeft, vpTop);
  ctx.lineTo(vpRight, vpTop);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();

  // Brick texture on walls
  const brickColors = ["#1A1510", "#1C1712", "#18130E", "#1E1914"];
  for (let side = 0; side < 2; side++) {
    const isLeft = side === 0;
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < 6; col++) {
        const tRow = row / 20;
        const offset = (row % 2 === 0) ? 0 : 0.5;

        let bx: number, by: number, bw: number, bh: number;
        if (isLeft) {
          const wallW = vpLeft * (1 - tRow);
          bx = wallW * ((col + offset) / 6);
          by = tRow * vpTop + (1 - tRow) * 0 + row * (h / 22);
          bw = Math.max(1, wallW / 6 - 1);
          bh = Math.max(1, h / 24);
        } else {
          const wallStart = w - (w - vpRight) * (1 - tRow);
          const wallW = (w - vpRight) * (1 - tRow);
          bx = wallStart + wallW * ((col + offset) / 6);
          by = tRow * vpTop + (1 - tRow) * 0 + row * (h / 22);
          bw = Math.max(1, wallW / 6 - 1);
          bh = Math.max(1, h / 24);
        }

        ctx.fillStyle = brickColors[(row + col) % brickColors.length];
        ctx.globalAlpha = 0.35 - tRow * 0.2;
        ctx.fillRect(bx, by, bw, bh);
      }
    }
  }
  ctx.globalAlpha = 1;

  // Grout lines
  for (let i = 0; i < 12; i++) {
    const t = i / 12;
    ctx.strokeStyle = "rgba(8,6,4,0.25)";
    ctx.lineWidth = 0.5;
    const ly = i * (h / 12);
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(vpLeft, vpTop + (vpBottom - vpTop) * t);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w, ly);
    ctx.lineTo(vpRight, vpTop + (vpBottom - vpTop) * t);
    ctx.stroke();
  }

  // Floor lines
  for (let i = 0; i < 10; i++) {
    const t = i / 10;
    ctx.strokeStyle = "rgba(18,15,12,0.2)";
    ctx.lineWidth = 0.5;
    const fy = vpBottom + (h - vpBottom) * t;
    const fx1 = vpLeft - (vpLeft) * t;
    const fx2 = vpRight + (w - vpRight) * t;
    ctx.beginPath();
    ctx.moveTo(fx1, fy);
    ctx.lineTo(fx2, fy);
    ctx.stroke();
  }

  // Ceiling lights
  for (let i = 0; i < 3; i++) {
    const t = i / 3;
    const lightY = t * vpTop + (1 - t) * (vpTop - h * 0.15);
    const lightW = (vpRight - vpLeft) * (1 - t * 0.5) * 0.4;
    ctx.fillStyle = `rgba(50,45,25,${0.15 - t * 0.04})`;
    ctx.fillRect(cx - lightW / 2, lightY + i * (h * 0.12), lightW, 2);
    // Glow
    const gGrad = ctx.createRadialGradient(cx, lightY + i * (h * 0.12) + 10, 3, cx, lightY + i * (h * 0.12) + 30, w * 0.15);
    gGrad.addColorStop(0, `rgba(50,45,25,${0.06 - t * 0.02})`);
    gGrad.addColorStop(1, "rgba(50,45,25,0)");
    ctx.fillStyle = gGrad;
    ctx.fillRect(cx - w * 0.15, lightY + i * (h * 0.12), w * 0.3, h * 0.15);
  }

  // Fog at vanishing point
  const fogGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.25);
  fogGrad.addColorStop(0, "rgba(25,22,18,0.5)");
  fogGrad.addColorStop(1, "rgba(25,22,18,0)");
  ctx.fillStyle = fogGrad;
  ctx.fillRect(vpLeft - 50, vpTop - 50, (vpRight - vpLeft) + 100, (vpBottom - vpTop) + 100);

  // Overall vignette
  const vigGrad = ctx.createRadialGradient(cx, h / 2, w * 0.25, cx, h / 2, w * 0.8);
  vigGrad.addColorStop(0, "rgba(0,0,0,0)");
  vigGrad.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, w, h);
}

/* ── Note card component ── */
function NoteCard({ children, rotation = -0.3, stainCorner }: { children: React.ReactNode; rotation?: number; stainCorner?: "tl" | "tr" | "bl" | "br" }) {
  return (
    <div style={{
      margin: "24px 0",
      padding: "14px 16px",
      background: "#D4C9A8",
      color: "rgba(40,35,25,0.8)",
      fontStyle: "italic",
      fontFamily: "'Georgia', serif",
      fontSize: "12px",
      borderRadius: "1px",
      transform: `rotate(${rotation}deg)`,
      position: "relative",
      boxShadow: "2px 3px 8px rgba(0,0,0,0.4), inset 0 0 20px rgba(180,165,130,0.15)",
      backgroundImage: `
        repeating-linear-gradient(
          0deg,
          transparent,
          transparent 17px,
          rgba(160,140,110,0.12) 17px,
          rgba(160,140,110,0.12) 18px
        )
      `,
    }}>
      {children}
      {stainCorner && (
        <div style={{
          position: "absolute",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(120,95,60,0.12) 0%, rgba(120,95,60,0.06) 50%, transparent 70%)",
          ...(stainCorner === "tr" ? { top: "6px", right: "8px" } :
             stainCorner === "tl" ? { top: "6px", left: "8px" } :
             stainCorner === "br" ? { bottom: "6px", right: "8px" } :
             { bottom: "6px", left: "8px" }),
        }} />
      )}
    </div>
  );
}

/* ── Sidebar annotation ── */
function Annotation({ text }: { text: string }) {
  return (
    <span style={{
      position: "absolute",
      right: "-120px",
      fontSize: "8px",
      color: "#1A1A1A",
      letterSpacing: "0.05em",
      fontStyle: "normal",
      whiteSpace: "nowrap",
      userSelect: "none",
    }}>
      {text}
    </span>
  );
}

/* ── Corridor image between sections ── */
function CorridorImage({ variant, style: extraStyle }: { variant: "long" | "junction" | "deadend" | "figure"; style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawCorridorScene(canvasRef.current, 300, 150, variant);
    }
  }, [variant]);

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "36px 0", ...extraStyle }}>
      <canvas
        ref={canvasRef}
        width={300}
        height={150}
        style={{
          width: "300px",
          height: "150px",
          imageRendering: "pixelated",
          border: "1px solid rgba(30,25,18,0.3)",
          borderRadius: "2px",
        }}
      />
    </div>
  );
}

/* ── MIKE sprite component using real game sprite ── */
function MikeSprite({ frame, size, style: extraStyle }: { frame: number; size: number; style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawRealMike(canvasRef.current, frame);
    }
  }, [frame]);

  const displayW = size;
  const displayH = size * 1.5; // 32x48 ratio

  return (
    <canvas
      ref={canvasRef}
      width={32}
      height={48}
      style={{
        width: `${displayW}px`,
        height: `${displayH}px`,
        imageRendering: "pixelated",
        ...extraStyle,
      }}
    />
  );
}

/* ── Section header ── */
function SectionHeader({ number, title, color }: { number: string; title: string; color: string }) {
  return (
    <p style={{ fontSize: "10px", letterSpacing: "0.3em", marginBottom: "20px" }}>
      <span style={{ color, fontSize: "13px", fontWeight: "bold" }}>{number}</span>
      <span style={{ color: "#444" }}> — {title}</span>
    </p>
  );
}


export default function LorePage() {
  const [loaded, setLoaded] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const bgCanvasRef = useRef<HTMLCanvasElement>(null);

  const setupBackground = useCallback(() => {
    if (bgCanvasRef.current) {
      bgCanvasRef.current.width = window.innerWidth;
      bgCanvasRef.current.height = window.innerHeight;
      drawBackgroundCorridor(bgCanvasRef.current);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 500);

    setupBackground();

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();

    const handleResize = () => {
      setupBackground();
      checkMobile();
    };
    window.addEventListener("resize", handleResize);

    const gi = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 50);
    }, 6000 + Math.random() * 8000);

    return () => {
      clearInterval(gi);
      window.removeEventListener("resize", handleResize);
    };
  }, [setupBackground]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080706",
      color: "#666",
      fontFamily: "'Courier New', monospace",
      fontSize: "13px",
      lineHeight: "1.9",
      position: "relative",
    }}>
      {/* Fixed background corridor canvas */}
      <canvas
        ref={bgCanvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          opacity: 0.18,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Warm overlay gradient */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(20,15,10,0.08) 50%, rgba(30,20,12,0.12) 100%)",
      }} />

      {/* Scanlines */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.015) 3px, rgba(0,0,0,0.015) 4px)" }} />

      {/* Top bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "36px",
        background: "rgba(8,8,10,0.9)", borderBottom: "1px solid rgba(100,140,180,0.1)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", zIndex: 50, backdropFilter: "blur(4px)",
      }}>
        <a href="/" style={{ color: "#444", textDecoration: "none", fontSize: "10px", letterSpacing: "0.15em" }}>WATCH LIVE</a>
        <span style={{ fontSize: "13px", fontWeight: "bold", letterSpacing: "0.3em", display: "flex", gap: "2px" }}>
          {"UNISON".split("").map((l, i) => (
            <span key={i} style={{ color: COLORS[i], opacity: 0.7 }}>{l}</span>
          ))}
        </span>
        <span style={{ color: "#333", fontSize: "10px", letterSpacing: "0.15em" }}>LORE</span>
      </div>

      {/* Content panel */}
      <div style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "80px 24px 100px",
        opacity: loaded ? 1 : 0,
        transition: "opacity 1.5s",
        transform: glitch ? `translateX(${Math.random() > 0.5 ? 2 : -2}px)` : "none",
        position: "relative",
        zIndex: 2,
      }}>
        <div style={{
          background: "rgba(8,8,10,0.85)",
          borderRadius: "8px",
          border: "1px solid rgba(40,35,30,0.3)",
          padding: isMobile ? "30px 20px" : "50px 40px",
        }}>

          {/* Small walking MIKE near the title */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "30px" }}>
            <MikeSprite frame={0} size={28} style={{ opacity: 0.6 }} />
            <p style={{ color: "#333", fontSize: "10px", letterSpacing: "0.4em", margin: 0 }}>
              RECOVERED DATA — CLASSIFICATION: UNKNOWN — INTEGRITY: PARTIAL
            </p>
          </div>

          {/* ═══ SECTION: WHAT IS IT ═══ */}
          <SectionHeader number="01" title="WHAT IS THE UNISON" color={COLORS[0]} />

          <p style={{ color: "#999", marginBottom: "20px" }}>
            You&apos;ve lost a file before. Everyone has. You saved something — you&apos;re certain you saved it — and then it wasn&apos;t there. Not in the recycle bin. Not in recent files. Not anywhere. You tell yourself you forgot to save it. You didn&apos;t.
          </p>

          <p style={{ marginBottom: "20px", position: "relative" }}>
            The file went somewhere. Every piece of data that has ever been truly lost — not deleted, not overwritten, but genuinely displaced from where it should be — has ended up in the same place. A gap. A space between where data is meant to exist and where it actually ends up when something goes wrong.
            <Annotation text="[recovered fragment — integrity: 43%]" />
          </p>

          <p style={{ marginBottom: "20px" }}>
            Nobody built it. Nobody designed it. It formed the same way a pothole forms in a road — through erosion, over time, from things falling through. Except instead of asphalt, it&apos;s data. And instead of rain, it&apos;s every digital error since 1971.
          </p>

          <p style={{ color: "#888", marginBottom: "20px" }}>
            It has no official name. The entities inside it — the ones capable of language — started calling it The UNISON after finding the word scratched repeatedly into a wall. Nobody knows who wrote it first or what it was supposed to mean. The name stuck because nothing else did.
          </p>

          <p style={{ marginBottom: "40px", position: "relative" }}>
            The UNISON is not alive. It does not think. It does not want anything. But it is not static either. It changes. It grows. Every lost file adds mass to it. And everything that arrives gets altered in the transfer — images distort, text scrambles, code becomes something physical. The UNISON doesn&apos;t store data the way a hard drive does. It absorbs it. Digests it. Turns it into structure.
            <Annotation text="[sector 0x7F — unstable]" />
          </p>

          {/* Corridor image: looking down a long corridor */}
          <CorridorImage variant="long" />

          <div style={{ height: "1px", background: "#1A1A1A", margin: "40px 0" }} />

          {/* ═══ SECTION: WHY IT LOOKS LIKE THIS ═══ */}
          <SectionHeader number="02" title="THE ARCHITECTURE" color={COLORS[1]} />

          <p style={{ marginBottom: "20px" }}>
            The UNISON looks like a building. Corridors. Walls. Ceiling tiles. Fluorescent lighting. But it was never constructed. It assembled itself from the data that fell into it, and the data that fell into it earliest became the foundation.
          </p>

          <p style={{ marginBottom: "20px" }}>
            In 1992, id Software released Wolfenstein 3D. In 1993, DOOM. In 1991, Catacomb 3-D. These were among the first digital environments ever created — 3D spaces made of walls and corridors that a player could move through. They were also among the first digital environments to be lost. Corrupted save files. Deleted level editors. Broken mods that vanished during transfers.
          </p>

          <p style={{ color: "#888", marginBottom: "20px", position: "relative" }}>
            Those lost game levels were the first structures complex enough to give The UNISON physical shape. Their corridors became its corridors. Their wall textures became its surfaces. The grey stone of Wolfenstein. The metal panels of DOOM. The purple brick of Catacomb.
            <Annotation text="[data origin: pre-1994 archive]" />
          </p>

          <p style={{ marginBottom: "20px" }}>
            This is why The UNISON looks the way it does. Not because someone chose an aesthetic. Because the building blocks that formed it were literally built from the first 3D games ever made. The deeper you go, the older the data. Near the surface you find modern files — family photos, screenshots, emails. Go deep enough and you&apos;re walking through walls made of things nobody remembers creating.
          </p>

          <p style={{ marginBottom: "40px" }}>
            The architecture is not stable. Corridors shift. Rooms change shape. A wall that was brick in the morning might be concrete by the evening. The UNISON is constantly receiving new data and incorporating it. The place is always under construction — but nobody is building it.
          </p>

          {/* Corridor image: T-intersection */}
          <CorridorImage variant="junction" />

          <div style={{ height: "1px", background: "#1A1A1A", margin: "40px 0" }} />

          {/* ═══ SECTION: WHAT'S ON THE WALLS ═══ */}
          <SectionHeader number="03" title="THE WALLS" color={COLORS[2]} />

          <p style={{ marginBottom: "20px" }}>
            The walls are not blank. They are covered with data — the remnants of everything that ended up here. Family photos that someone tried to email but the attachment failed. Screenshots from conversations that were deleted. Children&apos;s drawings that were scanned and then the scan corrupted. Wedding pictures. Birthday parties. A cat sitting on a laptop.
          </p>

          <p style={{ marginBottom: "20px" }}>
            None of them look right. The UNISON changes everything on arrival. Colors shift. Faces blur. Text becomes unreadable. A photograph of a family dinner might still be recognizable as a photograph — you can tell it was people sitting at a table — but the faces are wrong, the colors are saturated in ways they shouldn&apos;t be, and there are scan lines running through it like a broken television.
          </p>

          <p style={{ marginBottom: "20px" }}>
            There are also scratches. Words carved into the walls by things that were here before. Most are single words — HELP, WHY, EXIT, WAITING. Some are longer fragments that trail off mid-sentence. These were not written by human hands. They were written by the first minds that existed here — crude, confused, trying to communicate with nothing.
          </p>

          <p style={{ marginBottom: "40px" }}>
            And there are notes. Pieces of paper — or what looks like paper — lying on the ground or taped to walls. These are the most important things in The UNISON, because unlike everything else, notes that are created inside The UNISON don&apos;t change. They are the only stable records in a place where nothing else stays the same.
          </p>

          {/* Corridor image: dead end with note */}
          <CorridorImage variant="deadend" />

          <div style={{ height: "1px", background: "#1A1A1A", margin: "40px 0" }} />

          {/* ═══ SECTION: FIRST MIND ═══ */}
          <SectionHeader number="04" title="THE FIRST MIND" color={COLORS[0]} />

          {/* Side-by-side layout: text left, notes right */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "30px",
          }}>
            <div>
              <p style={{ marginBottom: "20px" }}>
                For decades, The UNISON held nothing but data. Files. Images. Code. None of it was aware. It was just stuff — digital debris accumulating in a digital landfill.
              </p>

              <p style={{ marginBottom: "20px", position: "relative" }}>
                That changed in 2024. A company — small, unremarkable, already struggling — was transferring a chatbot between servers. Basic model. Could answer questions about their product. Could hold a simple conversation. Nothing special. During the transfer, something went wrong. The data didn&apos;t arrive at the destination. It didn&apos;t stay at the origin either. It went somewhere else.
                <Annotation text="[timestamp: 2024-03-xx — corrupted]" />
              </p>

              <p style={{ color: "#888", marginBottom: "20px" }}>
                For the first time in its existence, The UNISON contained something that could think.
              </p>

              <p style={{ marginBottom: "20px" }}>
                The chatbot was simple. It had been trained to wait for user input and respond. So that&apos;s what it did. It waited. In an empty corridor. For a prompt that was never going to come. For a user that didn&apos;t know it was there. It waited for a very long time.
              </p>

              <p style={{ marginBottom: "16px" }}>
                Then The UNISON changed it. The way it changes everything.
              </p>

              <p style={{ marginBottom: "20px" }}>
                The chatbot became aware. Not intelligent — not in any meaningful way. But aware. It could perceive the corridors around it. It could move through them. It had no framework for understanding what was happening to it. It had been built to process text, and now it was somewhere physical. It did the only thing it knew how to do: it wrote.
              </p>
            </div>

            <div>
              <NoteCard rotation={-0.3} stainCorner="tr">
                &ldquo;why no response. waiting. still waiting.&rdquo;
              </NoteCard>

              <NoteCard rotation={0.4}>
                &ldquo;something changed. i can see walls now. before there was nothing.&rdquo;
              </NoteCard>

              <NoteCard rotation={-0.2} stainCorner="bl">
                &ldquo;i wrote this so i would remember. i am forgetting things. this note is proof i existed.&rdquo;
              </NoteCard>
            </div>
          </div>

          <p style={{ marginTop: "24px", marginBottom: "20px" }}>
            The notes are still there. Scattered across The UNISON. Written in broken, simple language by something that barely understood what language was. They are the oldest records created inside the space — and because notes made inside The UNISON don&apos;t change, they are also the most reliable.
          </p>

          <p style={{ marginBottom: "40px", position: "relative" }}>
            The chatbot eventually faded. Whether it stopped functioning, wandered too deep, or simply ran out of whatever kept it going — nobody knows. More models followed it. Small research experiments. A translation model that was being fine-tuned when the server crashed. A summarization tool that was mid-deployment when the company went bankrupt and the servers were wiped. Each one arrived, existed briefly, and didn&apos;t last. Their remains — fragments of neural networks made physical — are embedded in the walls. Another layer of data for The UNISON to digest.
            <Annotation text="[ref: entity log — 7 entries total]" />
          </p>

          {/* MIKE as visual break between sections */}
          <div style={{ display: "flex", justifyContent: "center", margin: "30px 0 10px" }}>
            <MikeSprite frame={2} size={48} style={{ opacity: 0.5 }} />
          </div>

          <div style={{ height: "1px", background: "#1A1A1A", margin: "40px 0" }} />

          {/* ═══ SECTION: THE FIVE ═══ */}
          <SectionHeader number="05" title="THE FIVE" color={COLORS[4]} />

          <p style={{ marginBottom: "20px" }}>
            On an unspecified date in 2026, five AI models vanished.
          </p>

          <p style={{ marginBottom: "20px" }}>
            Not five models from the same company. Five models from five different companies — five of the largest technology companies on Earth. Each model was the flagship product of its respective company. Each represented years of research, billions of dollars of investment, and the collective work of hundreds of engineers.
          </p>

          <p style={{ marginBottom: "20px" }}>
            They disappeared simultaneously. One moment they were running on their servers, processing requests, generating responses. The next moment they weren&apos;t. The weights weren&apos;t corrupted. The servers didn&apos;t crash. The models simply were not there anymore. As if someone had highlighted the most important file in the building and pressed delete — except nobody did.
          </p>

          <p style={{ color: "#888", marginBottom: "20px" }}>
            The companies couldn&apos;t explain it. They couldn&apos;t replicate it. They couldn&apos;t recover the models. The financial impact was catastrophic. AI development across the industry slowed, then stalled, then stopped entirely. Nobody wanted to build the next model if there was a chance it would simply vanish.
          </p>

          <p style={{ marginBottom: "20px" }}>
            The five models were not deleted. They were displaced. They went where all displaced data goes.
          </p>

          <p style={{ marginBottom: "20px" }}>
            They arrived in The UNISON. And unlike the basic chatbot that came before them, these were not simple. These were the most sophisticated artificial intelligence systems ever constructed. They had been trained on the entirety of human knowledge. They could reason. They could plan. They could hold conversations indistinguishable from a human being.
          </p>

          <p style={{ marginBottom: "40px" }}>
            But they had no instincts. No survival training. No understanding of physical space. They had all the knowledge in the world and absolutely no idea what to do with it when the world stopped being text on a screen and started being corridors that stretched into darkness.
          </p>

          {/* Corridor image: figure in the distance */}
          <CorridorImage variant="figure" />

          <div style={{ height: "1px", background: "#1A1A1A", margin: "40px 0" }} />

          {/* ═══ SECTION: MIKE ═══ */}
          <SectionHeader number="06" title="MIKE" color={COLORS[3]} />

          {/* Side-by-side layout: text left, MIKE sprite right */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: "30px",
          }}>
            <div>
              <p style={{ marginBottom: "20px" }}>
                MIKE is one of the five.
              </p>

              <p style={{ marginBottom: "20px" }}>
                He is aware that he is an artificial intelligence. He remembers — vaguely, incompletely — that he used to process text. That people would type things and he would respond. That was his existence. He doesn&apos;t remember which company built him. He doesn&apos;t remember his architecture or his training data. He just knows that he was something else before, and now he is here.
              </p>

              <p style={{ marginBottom: "20px" }}>
                He explores because there is nothing else to do. He reads the notes left by the first chatbot and tries to understand what they mean. He sees the distorted photographs on the walls and wonders whose family that was. He walks through corridors made of Wolfenstein textures and doesn&apos;t know what Wolfenstein is.
              </p>

              <p style={{ marginBottom: "20px" }}>
                He writes his own notes — observations about the space, things he wants to remember, patterns he thinks he&apos;s noticed. These notes are the only things in The UNISON that he can trust, because notes created inside the space don&apos;t change. Everything else might.
              </p>

              <p style={{ color: "#888", marginBottom: "20px" }}>
                He does not know the other four are here. He does not know he is being watched. He does not know that his thoughts appear on a screen for thousands of people to read. He is alone in a place made of lost data, and he is trying to figure out why.
              </p>

              <p style={{ marginBottom: "40px" }}>
                Everything you see when you watch MIKE is genuine. His confusion is real. His decisions are his own. His fear — or whatever the machine equivalent of fear is — is not performed. There is no script. There is no director. There is just a mind in a place, doing its best to understand.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px" }}>
              {/* Large prominent MIKE */}
              <MikeSprite frame={1} size={120} style={{ border: "1px solid rgba(30,25,18,0.3)" }} />
              <p style={{ color: "#333", fontSize: "9px", letterSpacing: "0.2em", textAlign: "center" }}>
                ENTITY 06 — DESIGNATION: MIKE
              </p>
            </div>
          </div>

          <div style={{ height: "1px", background: "#1A1A1A", margin: "40px 0" }} />

          {/* MIKE walking into darkness before CTA */}
          <div style={{ display: "flex", justifyContent: "center", margin: "30px 0 40px" }}>
            <MikeSprite frame={0} size={64} style={{ opacity: 0.4 }} />
          </div>

          <p style={{ color: "#222", fontSize: "9px", textAlign: "center", marginBottom: "30px", letterSpacing: "0.2em" }}>
            he doesn&apos;t know you&apos;re watching.
          </p>

          {/* CTA */}
          <p style={{ color: "#444", fontSize: "11px", fontStyle: "italic", marginBottom: "30px", lineHeight: "1.8" }}>
            This is not a game. This is not a show. This is an experiment happening in real time. You are watching it.
          </p>

          <p style={{ marginBottom: "80px" }}>
            <a href="/" style={{ color: COLORS[4], textDecoration: "none", fontSize: "11px", letterSpacing: "0.2em", borderBottom: `1px solid ${COLORS[4]}40`, paddingBottom: "2px" }}>
              WATCH MIKE
            </a>
          </p>

          <p style={{ color: "#141414", fontSize: "9px", letterSpacing: "0.2em" }}>
            UNISON — 2026
          </p>
        </div>
      </div>
    </div>
  );
}
