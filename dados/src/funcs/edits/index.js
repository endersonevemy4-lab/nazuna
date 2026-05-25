import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function geraredit({ query, type }) {
  try {
    if (!query || !type) {
      return { ok: false, msg: '❌ Parâmetros obrigatórios não informados.' };
    }

    let inputBuffer;

    if (Buffer.isBuffer(query)) {
      inputBuffer = query;
    } else if (typeof query === 'string' && query.startsWith('http')) {
      const { default: https } = await import('https');
      inputBuffer = await new Promise((resolve, reject) => {
        https.get(query, res => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            https.get(res.headers.location, res2 => {
              const chunks = [];
              res2.on('data', c => chunks.push(c));
              res2.on('end', () => resolve(Buffer.concat(chunks)));
            }).on('error', reject);
            return;
          }
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
      });
    } else {
      return { ok: false, msg: '❌ Formato de imagem inválido.' };
    }

    let img = sharp(inputBuffer);
    const meta = await img.metadata();
    const w = meta.width || 800;
    const h = meta.height || 600;

    let buffer;

    switch (type) {
      case 'blackwhite': {
        buffer = await sharp(inputBuffer)
          .grayscale()
          .toBuffer();
        break;
      }

      case 'desfoque': {
        buffer = await sharp(inputBuffer)
          .blur(8)
          .toBuffer();
        break;
      }

      case 'cinema': {
        const barH = Math.round(h * 0.12);
        const blackBar = Buffer.alloc(w * barH * 3, 0);
        const topBar = sharp(blackBar, { raw: { width: w, height: barH, channels: 3 } }).png();
        const botBar = sharp(blackBar, { raw: { width: w, height: barH, channels: 3 } }).png();

        buffer = await sharp(inputBuffer)
          .composite([
            { input: await topBar.toBuffer(), top: 0, left: 0 },
            { input: await botBar.toBuffer(), top: h - barH, left: 0 }
          ])
          .toBuffer();
        break;
      }

      case 'jornal': {
        buffer = await sharp(inputBuffer)
          .grayscale()
          .normalise()
          .sharpen({ sigma: 1.5 })
          .modulate({ brightness: 1.05, saturation: 0 })
          .toBuffer();
        break;
      }

      case 'wojakreaction': {
        buffer = await sharp(inputBuffer)
          .modulate({ brightness: 0.85, saturation: 0.5 })
          .blur(1)
          .toBuffer();
        break;
      }

      default:
        return { ok: false, msg: `❌ Tipo de edição desconhecido: ${type}` };
    }

    return { ok: true, buffer };

  } catch (err) {
    console.error('[edits] Erro:', err.message);
    return { ok: false, msg: `❌ Erro ao aplicar efeito: ${err.message}` };
  }
}

export { geraredit };
