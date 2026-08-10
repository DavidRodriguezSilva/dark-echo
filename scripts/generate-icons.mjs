#!/usr/bin/env node
/**
 * Genera el favicon y los iconos de PWA a partir de la marca del producto
 * (`▋▋`, visual-identity: "Nombre y marca del producto") — el bloque de
 * cursor sólido con su eco atenuado, la misma forma que dibuja
 * `src/ui/Wordmark.tsx` en la interfaz.
 *
 * Sin dependencias nuevas: los iconos son dos rectángulos sólidos, así que
 * un codificador PNG minimo escrito a mano (sin antialiasing, innecesario
 * para geometría axis-aligned) evita instalar una libreria de rasterizado
 * para un script que se ejecuta una vez por cambio de marca.
 *
 * El color se deriva de los mismos tokens OKLCH que `src/styles/tokens.css`
 * (tema "default"/Bosque, esquema oscuro), con la misma formula de
 * conversion que `src/testing/oklch.ts` usa para verificar contraste —ues
 * un contexto distinto (rasterizar en vez de medir luminancia), asi que no
 * comparte código con ese módulo, pero sí sus constantes.
 *
 * Uso: node scripts/generate-icons.mjs
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BACKGROUND_OKLCH = { l: 0.18, c: 0.012, h: 250 }; // --background, esquema oscuro
const PRIMARY_OKLCH = { l: 0.815, c: 0.135, h: 158 }; // --primary, tema "default" (Bosque), esquema oscuro

function oklchToSrgb({ l, c, h }) {
  const hueRadians = (h * Math.PI) / 180;
  const a = c * Math.cos(hueRadians);
  const b = c * Math.sin(hueRadians);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const L = l_ ** 3;
  const M = m_ ** 3;
  const S = s_ ** 3;

  const linear = [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ];

  const gammaEncode = (value) => {
    const v = Math.max(0, Math.min(1, value));
    return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  };

  return linear.map((v) => Math.round(gammaEncode(v) * 255));
}

function toHex([r, g, b]) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function blend(fg, bg, alpha) {
  return fg.map((channel, i) => Math.round(channel * alpha + bg[i] * (1 - alpha)));
}

const BACKGROUND = oklchToSrgb(BACKGROUND_OKLCH);
const PRIMARY = oklchToSrgb(PRIMARY_OKLCH);
const ECHO_ON_BACKGROUND = blend(PRIMARY, BACKGROUND, 0.4);

// ---------------------------------------------------------------- //
// Codificador PNG minimo: cabecera + un IDAT con filtro "none" por
// scanline + CRC32 a mano. Suficiente para rectangulos solidos.
// ---------------------------------------------------------------- //

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgbPixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profundidad de bit
  ihdr[9] = 2; // tipo de color: RGB verdadero, sin alfa

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // sin filtro
    rgbPixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function drawMarkIcon(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 3);

  function fillRect(x0, y0, w, h, [r, g, b]) {
    const xStart = Math.max(0, Math.round(x0));
    const yStart = Math.max(0, Math.round(y0));
    const xEnd = Math.min(size, Math.round(x0 + w));
    const yEnd = Math.min(size, Math.round(y0 + h));
    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        const i = (y * size + x) * 3;
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
      }
    }
  }

  // Fondo completo: los iconos "maskable" exigen full-bleed opaco, y da
  // consistencia visual con el resto (favicon.svg, en cambio, va sin fondo).
  fillRect(0, 0, size, size, BACKGROUND);

  // La marca -- bloque solido + eco atenuado, desplazado en diagonal, igual
  // que src/ui/Wordmark.tsx -- centrada como un solo conjunto. La variante
  // "maskable" la encoge para que quede dentro de su zona segura (el ~80%
  // central que sobrevive a cualquier mascara de recorte del sistema).
  const scale = maskable ? 0.62 : 1;
  const barWidth = size * 0.16 * scale;
  const barHeight = size * 0.46 * scale;
  const offset = size * 0.12 * scale;

  const clusterWidth = barWidth + offset;
  const clusterHeight = barHeight + offset;
  const originX = (size - clusterWidth) / 2;
  const originY = (size - clusterHeight) / 2;

  fillRect(originX + offset, originY + offset, barWidth, barHeight, ECHO_ON_BACKGROUND);
  fillRect(originX, originY, barWidth, barHeight, PRIMARY);

  return encodePng(size, size, pixels);
}

function faviconSvg() {
  const primaryHex = toHex(PRIMARY);
  const viewBox = 32;
  const barWidth = 6;
  const barHeight = 20;
  const offset = 4;
  const originX = (viewBox - (barWidth + offset)) / 2;
  const originY = (viewBox - (barHeight + offset)) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBox} ${viewBox}">
  <rect x="${originX + offset}" y="${originY + offset}" width="${barWidth}" height="${barHeight}" rx="1" fill="${primaryHex}" fill-opacity="0.4"/>
  <rect x="${originX}" y="${originY}" width="${barWidth}" height="${barHeight}" rx="1" fill="${primaryHex}"/>
</svg>
`;
}

const publicDir = new URL("../public/", import.meta.url);

writeFileSync(new URL("favicon.svg", publicDir), faviconSvg());
writeFileSync(new URL("pwa-192x192.png", publicDir), drawMarkIcon(192));
writeFileSync(new URL("pwa-512x512.png", publicDir), drawMarkIcon(512));
writeFileSync(
  new URL("pwa-512x512-maskable.png", publicDir),
  drawMarkIcon(512, { maskable: true })
);

console.log("Iconos generados a partir de la marca en public/:");
console.log(`  --primary (Bosque, oscuro):    ${toHex(PRIMARY)}`);
console.log(`  --background (esquema oscuro): ${toHex(BACKGROUND)}`);
