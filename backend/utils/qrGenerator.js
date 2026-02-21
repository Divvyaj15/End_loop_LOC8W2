import QRCode from "qrcode";
import crypto  from "crypto";

/**
 * Generates a unique secure token for QR
 */
export const generateQRToken = (userId, eventId) => {
  return crypto
    .createHash("sha256")
    .update(`${userId}-${eventId}-${Date.now()}-${Math.random()}`)
    .digest("hex");
};

/**
 * Converts a token into a QR code base64 image
 * @param {string} token - unique QR token
 * @returns {Promise<string>} - base64 PNG image
 */
export const generateQRImage = async (token) => {
  const qrData = JSON.stringify({ token, type: "entry" });
  const base64 = await QRCode.toDataURL(qrData, {
    errorCorrectionLevel: "H",
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
  return base64;
};