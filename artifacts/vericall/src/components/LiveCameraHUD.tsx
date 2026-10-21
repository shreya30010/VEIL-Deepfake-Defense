import { useEffect, useRef, useState } from 'react';

interface LiveCameraHUDProps {
  active: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hasStream: boolean;
  activeChallenge?: string;
  challengeProgress?: number;
}

export function LiveCameraHUD({
  active,
  hasStream,
  activeChallenge,
  challengeProgress = 0,
}: LiveCameraHUDProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showMesh, setShowMesh] = useState(true);
  const [showTelemetry, setShowTelemetry] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let t = 0;

    const render = () => {
      t += 0.03;
      if (canvas.clientWidth && (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight)) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (!active) {
        return;
      }

      // Center coordinates
      const cx = width / 2;
      const cy = height / 2;
      const faceW = Math.min(width * 0.28, 110);
      const faceH = Math.min(height * 0.36, 140);

      // Slight natural micro-sway simulation
      const swayX = Math.sin(t * 1.5) * 3;
      const swayY = Math.cos(t * 1.2) * 2;
      const fcx = cx + swayX;
      const fcy = cy + swayY;

      // 1. Cyber Target Reticles around the face
      ctx.strokeStyle = hasStream ? 'rgba(56, 189, 248, 0.75)' : 'rgba(148, 163, 184, 0.5)';
      ctx.lineWidth = 1.5;
      const bLeft = fcx - faceW;
      const bRight = fcx + faceW;
      const bTop = fcy - faceH;
      const bBottom = fcy + faceH;
      const corner = 16;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(bLeft, bTop + corner);
      ctx.lineTo(bLeft, bTop);
      ctx.lineTo(bLeft + corner, bTop);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(bRight - corner, bTop);
      ctx.lineTo(bRight, bTop);
      ctx.lineTo(bRight, bTop + corner);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(bLeft, bBottom - corner);
      ctx.lineTo(bLeft, bBottom);
      ctx.lineTo(bLeft + corner, bBottom);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(bRight - corner, bBottom);
      ctx.lineTo(bRight, bBottom);
      ctx.lineTo(bRight, bBottom - corner);
      ctx.stroke();

      // Scanning line
      const scanY = bTop + ((Math.sin(t * 2) + 1) / 2) * (bBottom - bTop);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bLeft + 4, scanY);
      ctx.lineTo(bRight - 4, scanY);
      ctx.stroke();

      // 2. Facial Landmark Mesh Points
      if (showMesh) {
        ctx.fillStyle = hasStream ? 'rgba(56, 189, 248, 0.85)' : 'rgba(234, 179, 8, 0.8)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.lineWidth = 0.8;

        const points: [number, number][] = [
          // Chin contour
          [fcx - faceW * 0.7, fcy + faceH * 0.4],
          [fcx - faceW * 0.4, fcy + faceH * 0.75],
          [fcx, fcy + faceH * 0.9],
          [fcx + faceW * 0.4, fcy + faceH * 0.75],
          [fcx + faceW * 0.7, fcy + faceH * 0.4],
          // Eyes
          [fcx - faceW * 0.38, fcy - faceH * 0.2],
          [fcx - faceW * 0.2, fcy - faceH * 0.2],
          [fcx + faceW * 0.2, fcy - faceH * 0.2],
          [fcx + faceW * 0.38, fcy - faceH * 0.2],
          // Eyebrows
          [fcx - faceW * 0.42, fcy - faceH * 0.32],
          [fcx - faceW * 0.18, fcy - faceH * 0.34],
          [fcx + faceW * 0.18, fcy - faceH * 0.34],
          [fcx + faceW * 0.42, fcy - faceH * 0.32],
          // Nose bridge & tip
          [fcx, fcy - faceH * 0.15],
          [fcx, fcy + faceH * 0.1],
          [fcx - faceW * 0.12, fcy + faceH * 0.16],
          [fcx + faceW * 0.12, fcy + faceH * 0.16],
          // Mouth
          [fcx - faceW * 0.25, fcy + faceH * 0.42],
          [fcx, fcy + faceH * 0.38],
          [fcx + faceW * 0.25, fcy + faceH * 0.42],
          [fcx, fcy + faceH * 0.52],
        ];

        // Draw connections
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
          for (let j = i + 1; j < points.length; j++) {
            const dist = Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]);
            if (dist < faceW * 0.55) {
              ctx.moveTo(points[i][0], points[i][1]);
              ctx.lineTo(points[j][0], points[j][1]);
            }
          }
        }
        ctx.stroke();

        // Draw dots
        for (const [px, py] of points) {
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Active Challenge Guidance Overlay
      if (activeChallenge) {
        const boxW = Math.min(bRight - bLeft, 220);
        const boxX = fcx - boxW / 2;
        const boxY = Math.min(height - 76, Math.max(36, bBottom + 8));
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(boxX, boxY, boxW, 32);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.strokeRect(boxX, boxY, boxW, 32);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px "DM Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`CHALLENGE: ${activeChallenge.toUpperCase()}`, fcx, boxY + 14);

        // Progress bar inside
        const pWidth = (boxW - 16) * Math.min(1, challengeProgress);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(boxX + 8, boxY + 20, pWidth, 4);
      }

      // 4. Telemetry Overlay
      if (showTelemetry) {
        ctx.font = '9px "DM Mono", monospace';
        ctx.textAlign = 'left';

        const lines = [
          `FEED: ${hasStream ? 'LIVE CAMERA PREVIEW' : 'STANDBY · AWAITING FEED'}`,
          'LIP-SYNC: NOT MEASURED',
          'BLINK RATE: NOT MEASURED',
          'VIDEO ANALYSIS: NOT IMPLEMENTED · OVERLAY IS DECORATIVE',
        ];

        const tX = Math.max(12, bLeft + 8);
        const tY = Math.max(34, bTop + 14);

        // Semi-transparent pill backing for contrast
        ctx.fillStyle = 'rgba(10, 16, 26, 0.68)';
        ctx.fillRect(tX - 4, tY - 10, 196, lines.length * 13 + 6);

        ctx.fillStyle = 'rgba(203, 213, 225, 0.95)';
        let lineY = tY;
        for (const line of lines) {
          ctx.fillText(line, tX, lineY);
          lineY += 13;
        }
      }

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrame);
    };
  }, [active, hasStream, showMesh, showTelemetry, activeChallenge, challengeProgress]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 z-10">
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="w-full h-full object-cover absolute inset-0"
      />
      <div className="relative z-20 flex justify-between items-center w-full pointer-events-auto">
        <div className="flex gap-1.5">
          <button
            type="button"
            className={`px-2 py-0.5 text-[9px] rounded font-mono border transition ${
              showMesh
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
            onClick={() => setShowMesh(!showMesh)}
            title="Toggle Face Mesh Overlay"
          >
            Mesh {showMesh ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className={`px-2 py-0.5 text-[9px] rounded font-mono border transition ${
              showTelemetry
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
            onClick={() => setShowTelemetry(!showTelemetry)}
            title="Toggle Live Telemetry"
          >
            HUD {showTelemetry ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-900/90 border border-slate-700 text-slate-300">
          VEIL TELEMETRY HUD
        </div>
      </div>
    </div>
  );
}
