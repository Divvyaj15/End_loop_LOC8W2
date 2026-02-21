import { createCanvas } from "canvas";

/**
 * Generates a certificate as PNG buffer using canvas
 */
export const generateCertificatePNG = ({
  participantName, teamName, eventName,
  eventDate, committeeName, certificateId,
}) => {
  const W = 1123;
  const H = 794;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0f0f1a");
  bg.addColorStop(0.5, "#1a1a2e");
  bg.addColorStop(1, "#0f0f1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Outer border
  ctx.strokeStyle = "#4F46E5";
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  // Inner border
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  // Corner decorations
  const drawCorner = (x, y, dx, dy) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * 40, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * 40);
    ctx.strokeStyle = "#818cf8";
    ctx.lineWidth = 3;
    ctx.stroke();
  };
  drawCorner(40, 40, 1, 1);
  drawCorner(W - 40, 40, -1, 1);
  drawCorner(40, H - 40, 1, -1);
  drawCorner(W - 40, H - 40, -1, -1);

  // Center glow
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 300);
  glow.addColorStop(0, "rgba(79,70,229,0.12)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Helper: centered text
  const cText = (text, y, font, color, maxWidth) => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    maxWidth ? ctx.fillText(text, W / 2, y, maxWidth) : ctx.fillText(text, W / 2, y);
  };

  // Logo
  cText("END_LOOP", 105, "bold 22px monospace", "#6366f1");
  cText("P R E S E N T S", 130, "13px sans-serif", "#6b7280");

  // Title
  cText("CERTIFICATE", 190, "bold 52px Georgia, serif", "#ffffff");
  cText("O F   P A R T I C I P A T I O N", 218, "13px sans-serif", "#9ca3af");

  // Divider
  const div = ctx.createLinearGradient(W / 2 - 200, 0, W / 2 + 200, 0);
  div.addColorStop(0, "transparent");
  div.addColorStop(0.5, "#4F46E5");
  div.addColorStop(1, "transparent");
  ctx.strokeStyle = div;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 200, 238); ctx.lineTo(W / 2 + 200, 238);
  ctx.stroke();

  // Awarded to
  cText("THIS CERTIFICATE IS PROUDLY PRESENTED TO", 272, "11px sans-serif", "#9ca3af");

  // Participant name
  cText(participantName, 330, "italic bold 48px Georgia, serif", "#a5b4fc");

  // Team name
  ctx.textAlign = "center";
  ctx.font = "15px sans-serif";
  const label = "Team: ";
  const lw = ctx.measureText(label).width;
  ctx.font = "bold 15px sans-serif";
  const nw = ctx.measureText(teamName).width;
  const startX = W / 2 - (lw + nw) / 2;
  ctx.font = "15px sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.textAlign = "left";
  ctx.fillText(label, startX, 362);
  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = "#818cf8";
  ctx.fillText(teamName, startX + lw, 362);

  // Description
  const d1 = `For successfully participating in "${eventName}" and advancing to the hackathon round`;
  const d2 = `after clearing the PPT screening round, organized by ${committeeName}.`;
  cText(d1, 405, "14px sans-serif", "#9ca3af", 720);
  cText(d2, 428, "14px sans-serif", "#9ca3af", 720);

  // Footer divider
  ctx.strokeStyle = "rgba(79,70,229,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 470); ctx.lineTo(W - 80, 470);
  ctx.stroke();

  // Footer left: event date
  ctx.textAlign = "left";
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("EVENT DATE", 100, 510);
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText(eventDate, 100, 530);

  // Footer center: seal circle
  ctx.beginPath();
  ctx.arc(W / 2, 510, 36, 0, Math.PI * 2);
  ctx.strokeStyle = "#4F46E5";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, 510, 28, 0, Math.PI * 2);
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 1;
  ctx.stroke();
  cText("*", 524, "bold 32px sans-serif", "#818cf8");  // star symbol
  cText("ORGANIZER", 565, "10px sans-serif", "#6b7280");
  cText(committeeName, 582, "bold 12px sans-serif", "#9ca3af");

  // Footer right: certificate ID
  ctx.textAlign = "right";
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.fillText("CERTIFICATE ID", W - 100, 510);
  ctx.font = "bold 13px sans-serif";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText(certificateId, W - 100, 530);
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#4b5563";
  ctx.fillText("Verify at end-loop.com/verify", W - 100, 548);

  return canvas.toBuffer("image/png");
};