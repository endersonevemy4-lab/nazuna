/*
 * Gerador local de logo Among Us — ZERO dependências externas
 * Usa Node.js nativo: zlib + Buffer
 */

import zlib from 'zlib';
import { promisify } from 'util';

const deflateRaw = promisify(zlib.deflateRaw);

// ── CRC32 ──────────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

// ── Canvas simples ──────────────────────────────────────────────────────────
class Canvas {
  constructor(w, h, fillColor = [13, 13, 43, 255]) {
    this.w = w; this.h = h;
    this.buf = Buffer.alloc(w * h * 4);
    if (fillColor) this.fillRect(0, 0, w, h, ...fillColor);
  }

  _idx(x, y) { return (y * this.w + x) * 4; }

  setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const i = this._idx(x, y);
    this.buf[i] = r; this.buf[i+1] = g; this.buf[i+2] = b; this.buf[i+3] = a;
  }

  fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        this.setPixel(x + dx, y + dy, r, g, b, a);
  }

  // Círculo simples
  fillCircle(cx, cy, rad, r, g, b, a = 255) {
    for (let dy = -rad; dy <= rad; dy++)
      for (let dx = -rad; dx <= rad; dx++)
        if (dx*dx + dy*dy <= rad*rad)
          this.setPixel(cx + dx, cy + dy, r, g, b, a);
  }

  // Texto usando fonte bitmap 5×7
  drawText(text, x, y, scale, r, g, b, a = 255) {
    let cx = x;
    for (const ch of text.toUpperCase()) {
      const glyph = FONT[ch] || FONT[' '];
      for (let row = 0; row < 7; row++)
        for (let col = 0; col < 5; col++)
          if (glyph[row] & (1 << (4 - col)))
            this.fillRect(cx + col * scale, y + row * scale, scale, scale, r, g, b, a);
      cx += 6 * scale;
    }
    return cx - x; // largura total
  }

  textWidth(text, scale) { return text.length * 6 * scale; }

  async toPNG() {
    // Raw scanlines com filtro 0 (None)
    const scanlines = Buffer.alloc((1 + this.w * 4) * this.h);
    for (let y = 0; y < this.h; y++) {
      const rowStart = y * (1 + this.w * 4);
      scanlines[rowStart] = 0; // filter None
      this.buf.copy(scanlines, rowStart + 1, y * this.w * 4, (y + 1) * this.w * 4);
    }

    const compressed = await deflateRaw(scanlines, { level: 6 });

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.w, 0);
    ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

    const sig = Buffer.from([137,80,78,71,13,10,26,10]);
    return Buffer.concat([
      sig,
      pngChunk('IHDR', ihdr),
      pngChunk('IDAT', compressed),
      pngChunk('IEND', Buffer.alloc(0))
    ]);
  }
}

// ── Fonte bitmap 5×7 (A-Z, 0-9, espaço, / ! .) ───────────────────────────
const FONT = {
  ' ': [0,0,0,0,0,0,0],
  'A': [0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  'B': [0b11110,0b10001,0b10001,0b11110,0b10001,0b10001,0b11110],
  'C': [0b01110,0b10001,0b10000,0b10000,0b10000,0b10001,0b01110],
  'D': [0b11100,0b10010,0b10001,0b10001,0b10001,0b10010,0b11100],
  'E': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111],
  'F': [0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b10000],
  'G': [0b01110,0b10001,0b10000,0b10111,0b10001,0b10001,0b01110],
  'H': [0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
  'I': [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b11111],
  'J': [0b00111,0b00010,0b00010,0b00010,0b10010,0b10010,0b01100],
  'K': [0b10001,0b10010,0b10100,0b11000,0b10100,0b10010,0b10001],
  'L': [0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111],
  'M': [0b10001,0b11011,0b10101,0b10001,0b10001,0b10001,0b10001],
  'N': [0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b10001],
  'O': [0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  'P': [0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
  'Q': [0b01110,0b10001,0b10001,0b10001,0b10101,0b10010,0b01101],
  'R': [0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
  'S': [0b01111,0b10000,0b10000,0b01110,0b00001,0b00001,0b11110],
  'T': [0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
  'U': [0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
  'V': [0b10001,0b10001,0b10001,0b10001,0b10001,0b01010,0b00100],
  'W': [0b10001,0b10001,0b10001,0b10101,0b10101,0b11011,0b10001],
  'X': [0b10001,0b10001,0b01010,0b00100,0b01010,0b10001,0b10001],
  'Y': [0b10001,0b10001,0b01010,0b00100,0b00100,0b00100,0b00100],
  'Z': [0b11111,0b00001,0b00010,0b00100,0b01000,0b10000,0b11111],
  '0': [0b01110,0b10001,0b10011,0b10101,0b11001,0b10001,0b01110],
  '1': [0b00100,0b01100,0b00100,0b00100,0b00100,0b00100,0b11111],
  '2': [0b01110,0b10001,0b00001,0b00110,0b01000,0b10000,0b11111],
  '3': [0b11111,0b00001,0b00010,0b00110,0b00001,0b10001,0b01110],
  '4': [0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0b00010],
  '5': [0b11111,0b10000,0b11110,0b00001,0b00001,0b10001,0b01110],
  '6': [0b01110,0b10000,0b10000,0b11110,0b10001,0b10001,0b01110],
  '7': [0b11111,0b00001,0b00010,0b00100,0b01000,0b01000,0b01000],
  '8': [0b01110,0b10001,0b10001,0b01110,0b10001,0b10001,0b01110],
  '9': [0b01110,0b10001,0b10001,0b01111,0b00001,0b00001,0b01110],
  '/': [0b00001,0b00010,0b00100,0b00100,0b01000,0b10000,0b10000],
  '!': [0b00100,0b00100,0b00100,0b00100,0b00100,0b00000,0b00100],
  '.': [0b00000,0b00000,0b00000,0b00000,0b00000,0b00000,0b00100],
  '-': [0b00000,0b00000,0b00000,0b11111,0b00000,0b00000,0b00000],
  '_': [0b00000,0b00000,0b00000,0b00000,0b00000,0b00000,0b11111],
};

// ── Paleta crewmate ────────────────────────────────────────────────────────
const COLORS = [
  [197,17,17],   // vermelho
  [19,47,210],   // azul
  [17,127,45],   // verde
  [107,47,178],  // roxo
  [239,125,13],  // laranja
  [236,84,187],  // rosa
  [80,239,57],   // limão
  [114,73,30],   // marrom
];

function darken([r,g,b], f=0.55) {
  return [Math.round(r*f), Math.round(g*f), Math.round(b*f)];
}

// ── Desenha crewmate ────────────────────────────────────────────────────────
function drawCrewmate(canvas, cx, cy, s, color) {
  const dark = darken(color);
  const bw = Math.round(130*s), bh = Math.round(155*s);

  // Corpo
  canvas.fillRect(cx - bw/2|0, cy - bh/2|0, bw, bh, ...color);
  // Mochila
  canvas.fillRect(cx + bw/2|0, cy - bh/4|0, Math.round(38*s), Math.round(85*s), ...dark);
  // Visor
  const vw = Math.round(88*s), vh = Math.round(52*s);
  const vx = cx - vw/2|0 - Math.round(4*s), vy = cy - bh/2|0 - Math.round(8*s);
  canvas.fillRect(vx, vy, vw, vh, 126, 200, 227);
  // Brilho visor
  canvas.fillRect(vx + Math.round(5*s), vy + Math.round(5*s), Math.round(26*s), Math.round(16*s), 212, 241, 255);
  // Perna esq
  const lw = Math.round(46*s), lh = Math.round(55*s);
  canvas.fillRect(cx - bw/2|0, cy + bh/2|0, lw, lh, ...dark);
  // Perna dir
  canvas.fillRect(cx + bw/2|0 - lw, cy + bh/2|0, lw, lh, ...color);
}

// ── Gera a imagem ──────────────────────────────────────────────────────────
async function gerarAmongUs(texto1, texto2) {
  try {
    const W = 900, H = 480;
    const cidx = ((texto1.charCodeAt(0)||65) + (texto2.charCodeAt(0)||65)) % COLORS.length;
    const cor = COLORS[cidx];

    const canvas = new Canvas(W, H, [13, 13, 43, 255]);

    // Estrelas
    const rng = (seed) => { let s = seed; return () => { s = (s*1664525+1013904223)&0xffffffff; return (s>>>0)/0xffffffff; }; };
    const rand = rng(texto1.length * 13 + texto2.length);
    for (let i = 0; i < 220; i++) {
      const sx = (rand() * W)|0, sy = (rand() * H)|0;
      const v = [255,220,180][(rand()*3)|0];
      canvas.setPixel(sx, sy, v, v, v);
      if (rand() > 0.65) canvas.setPixel(sx+1, sy, v, v, v);
    }

    // Linhas decorativas
    canvas.fillRect(0, 0, W, 5, ...cor);
    canvas.fillRect(0, H-5, W, 5, ...cor);

    // Crewmate principal (esquerda)
    drawCrewmate(canvas, 185, 210, 1.3, cor);

    // Crewmate decorativo (direita, menor)
    const cor2 = COLORS[(cidx + 3) % COLORS.length];
    drawCrewmate(canvas, 730, 320, 0.6, cor2);

    // ── Textos ──
    const sc1 = 5, sc2 = 3, scLabel = 2;
    const t1 = (texto1.length > 10 ? texto1.substring(0,10) : texto1).toUpperCase();
    const t2 = (texto2.length > 16 ? texto2.substring(0,16) : texto2).toUpperCase();

    const areaX = 360, areaW = W - areaX - 30;

    // Texto 1
    const t1w = canvas.textWidth(t1, sc1);
    const t1x = areaX + Math.max(0, (areaW - t1w) / 2)|0;
    canvas.drawText(t1, t1x, 110, sc1, 255, 255, 255);

    // Separador
    const sepW = Math.min(areaW, 260);
    canvas.fillRect(areaX + ((areaW - sepW)/2)|0, 215, sepW, 4, ...cor);

    // Texto 2
    const t2w = canvas.textWidth(t2, sc2);
    const t2x = areaX + Math.max(0, (areaW - t2w) / 2)|0;
    canvas.drawText(t2, t2x, 240, sc2, 255, 255, 255);

    // Label "AMONG US"
    const label = 'AMONG US';
    const labelW = canvas.textWidth(label, scLabel);
    canvas.drawText(label, ((W - labelW)/2)|0, 440, scLabel, ...cor);

    const buffer = await canvas.toPNG();
    return { success: true, buffer };

  } catch (err) {
    console.error('Erro gerador Among Us:', err);
    return { success: false, error: err.message };
  }
}

export { gerarAmongUs };
export default gerarAmongUs;
