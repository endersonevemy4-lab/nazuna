/*
 * Gerador local de logo Among Us usando Jimp
 * Sem dependência de API externa
 */

import { Jimp, loadFont, JimpMime } from 'jimp';
import { measureText } from '@jimp/plugin-print';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FONTS_BASE = path.join(
  path.resolve('.'),
  'node_modules/@jimp/plugin-print/fonts/open-sans'
);

const FONT_128_WHITE = path.join(FONTS_BASE, 'open-sans-128-white/open-sans-128-white.fnt');
const FONT_64_WHITE  = path.join(FONTS_BASE, 'open-sans-64-white/open-sans-64-white.fnt');
const FONT_32_WHITE  = path.join(FONTS_BASE, 'open-sans-32-white/open-sans-32-white.fnt');

const W = 900;
const H = 500;

// Paleta de cores dos crewmates Among Us
const CREWMATE_COLORS = [
  0xc51111ff, // vermelho
  0x132fd2ff, // azul
  0x117f2dff, // verde
  0x6b2fb2ff, // roxo
  0xef7d0dff, // laranja
  0xf5f557ff, // amarelo
  0xd6e0f0ff, // branco/cinza claro
  0x71491eff, // marrom
  0xec54bbff, // rosa
  0x50ef39ff, // limão
];

function fillRect(image, x, y, w, h, color) {
  for (let i = x; i < x + w; i++) {
    for (let j = y; j < y + h; j++) {
      if (i >= 0 && i < W && j >= 0 && j < H) {
        image.setPixelColor(color, i, j);
      }
    }
  }
}

function darken(color, factor = 0.6) {
  const r = Math.floor(((color >>> 24) & 0xff) * factor);
  const g = Math.floor(((color >>> 16) & 0xff) * factor);
  const b = Math.floor(((color >>> 8)  & 0xff) * factor);
  return ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
}

function drawCrewmate(image, cx, cy, scale, bodyColor) {
  const shadowColor = darken(bodyColor, 0.55);
  const visorColor  = 0x7ec8e3ff;
  const visorShine  = 0xd4f1ffff;

  // Corpo
  const bw = Math.round(130 * scale);
  const bh = Math.round(160 * scale);
  fillRect(image, cx - bw / 2, cy - bh / 2, bw, bh, bodyColor);

  // Mochila (direita do corpo)
  const pw = Math.round(38 * scale);
  const ph = Math.round(90 * scale);
  fillRect(image, cx + bw / 2, cy - bh / 4, pw, ph, shadowColor);

  // Visor
  const vw = Math.round(90 * scale);
  const vh = Math.round(55 * scale);
  const vx = cx - vw / 2 - Math.round(5 * scale);
  const vy = cy - bh / 2 - Math.round(10 * scale);
  fillRect(image, vx, vy, vw, vh, visorColor);

  // Brilho visor
  fillRect(image, vx + Math.round(6 * scale), vy + Math.round(6 * scale),
    Math.round(28 * scale), Math.round(18 * scale), visorShine);

  // Perna esquerda
  const lw = Math.round(48 * scale);
  const lh = Math.round(60 * scale);
  fillRect(image, cx - bw / 2, cy + bh / 2, lw, lh, shadowColor);

  // Perna direita
  fillRect(image, cx + bw / 2 - lw, cy + bh / 2, lw, lh, bodyColor);
}

async function gerarAmongUs(texto1, texto2) {
  try {
    // Cor aleatória do crewmate baseada no texto
    const colorIdx = (texto1.charCodeAt(0) + texto2.charCodeAt(0)) % CREWMATE_COLORS.length;
    const bodyColor = CREWMATE_COLORS[colorIdx];

    // Fundo escuro (espaço)
    const img = new Jimp({ width: W, height: H, color: 0x0d0d2bff });

    // Estrelas
    for (let i = 0; i < 200; i++) {
      const sx = Math.floor(Math.random() * W);
      const sy = Math.floor(Math.random() * H);
      const brightness = [0xffffffff, 0xccccccff, 0xaaaaAAff][Math.floor(Math.random() * 3)];
      img.setPixelColor(brightness, sx, sy);
      if (Math.random() > 0.7) img.setPixelColor(brightness, sx + 1, sy);
    }

    // Linha decorativa no topo e fundo
    fillRect(img, 0, 0, W, 6, bodyColor);
    fillRect(img, 0, H - 6, W, 6, bodyColor);

    // Crewmate centralizado à esquerda
    drawCrewmate(img, 200, 200, 1.3, bodyColor);

    // Crewmate menor à direita (decoração)
    drawCrewmate(img, 730, 320, 0.65, CREWMATE_COLORS[(colorIdx + 3) % CREWMATE_COLORS.length]);

    // Carregar fontes
    const font128 = await loadFont(FONT_128_WHITE);
    const font64  = await loadFont(FONT_64_WHITE);
    const font32  = await loadFont(FONT_32_WHITE);

    // Área de texto (centro-direito)
    const textAreaX = 370;
    const textAreaW = W - textAreaX - 20;

    // Texto 1 — principal
    const t1 = texto1.length > 10 ? texto1.substring(0, 10) : texto1;
    const t1w = measureText(font64, t1);
    const t1x = textAreaX + Math.max(0, (textAreaW - t1w) / 2) | 0;
    img.print({ font: font64, x: t1x, y: 120, text: t1 });

    // Separador
    const sepW = Math.min(textAreaW, 280);
    fillRect(img, textAreaX + ((textAreaW - sepW) / 2 | 0), 220, sepW, 4, bodyColor);

    // Texto 2 — secundário
    const t2 = texto2.length > 14 ? texto2.substring(0, 14) : texto2;
    const t2w = measureText(font32, t2);
    const t2x = textAreaX + Math.max(0, (textAreaW - t2w) / 2) | 0;
    img.print({ font: font32, x: t2x, y: 240, text: t2 });

    // Rodapé "Among Us"
    const labelW = measureText(font32, 'Among Us');
    img.print({ font: font32, x: ((W - labelW) / 2) | 0, y: 440, text: 'Among Us' });

    const buffer = await img.getBuffer(JimpMime.png);
    return { success: true, buffer };

  } catch (err) {
    console.error('Erro no gerador Among Us local:', err);
    return { success: false, error: err.message };
  }
}

export { gerarAmongUs };
export default gerarAmongUs;
