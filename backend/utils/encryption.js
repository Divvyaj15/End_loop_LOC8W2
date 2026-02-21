import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const ALGORITHM  = "aes-256-cbc";
const SECRET_KEY = process.env.ENCRYPTION_KEY; // must be exactly 32 chars
const IV_LENGTH  = 16;

/**
 * Encrypts a plain text string
 * @param {string} text - plain text to encrypt
 * @returns {string} - "iv:encryptedData" format
 */
export const encrypt = (text) => {
  const iv     = crypto.randomBytes(IV_LENGTH);
  const key    = Buffer.from(SECRET_KEY.padEnd(32).slice(0, 32));
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(String(text)), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

/**
 * Decrypts an encrypted string
 * @param {string} encryptedText - "iv:encryptedData" format
 * @returns {string} - original plain text
 */
export const decrypt = (encryptedText) => {
  const [ivHex, encryptedHex] = encryptedText.split(":");
  const iv       = Buffer.from(ivHex, "hex");
  const key      = Buffer.from(SECRET_KEY.padEnd(32).slice(0, 32));
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]);
  return decrypted.toString();
};