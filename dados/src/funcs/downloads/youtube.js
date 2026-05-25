import https from 'https'
import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { join } from 'path'
import ytSearch from 'yt-search'

const execAsync = promisify(exec)

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    }).on('error', reject)
  })
}

async function getYtDlpPath() {
  const paths = ['yt-dlp', 'yt_dlp', '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp']
  for (const p of paths) {
    try {
      await execAsync(`${p} --version`)
      return p
    } catch {}
  }
  try {
    const { stdout } = await execAsync('find /nix/store -maxdepth 4 -name "yt-dlp" -type f 2>/dev/null | head -1')
    const nixPath = stdout.trim()
    if (nixPath) return nixPath
  } catch {}
  return null
}

async function search(query) {
  try {
    const result = await ytSearch(query)
    const videos = result.videos

    if (!videos || videos.length === 0) {
      return { ok: false, msg: 'Nenhum vídeo encontrado' }
    }

    const video = videos[0]

    return {
      ok: true,
      data: {
        videoId: video.videoId,
        url: video.url,
        title: video.title,
        description: video.description || '',
        thumbnail: video.thumbnail,
        seconds: video.seconds,
        timestamp: video.timestamp,
        views: video.views,
        ago: video.ago,
        author: { name: video.author?.name || video.author || '' }
      }
    }
  } catch (err) {
    return { ok: false, msg: err.message }
  }
}

async function mp3(url) {
  const tmpOutput = join(tmpdir(), `nazu_audio_${Date.now()}`)

  try {
    const ytdlp = await getYtDlpPath()
    if (!ytdlp) {
      return { ok: false, msg: '❌ yt-dlp não encontrado. Instale com: pip install yt-dlp' }
    }

    const infoJson = await execAsync(`${ytdlp} --dump-json --no-playlist "${url}"`)
    const info = JSON.parse(infoJson.stdout)

    if (info.duration > 1800) {
      return { ok: false, msg: '⚠️ Vídeo muito longo. Máximo de 30 minutos.' }
    }

    await execAsync(
      `${ytdlp} -x --audio-format mp3 --audio-quality 128K --no-playlist -o "${tmpOutput}.%(ext)s" "${url}"`,
      { maxBuffer: 100 * 1024 * 1024 }
    )

    const mp3File = `${tmpOutput}.mp3`
    const buffer = fs.readFileSync(mp3File)
    const title = info.title || 'YouTube Audio'

    return {
      ok: true,
      buffer,
      title,
      thumbnail: info.thumbnail || '',
      filename: `${title.replace(/[^\w\s]/gi, '')}.mp3`
    }
  } catch (err) {
    return { ok: false, msg: err.message }
  } finally {
    try { fs.unlinkSync(`${tmpOutput}.mp3`) } catch {}
    try { fs.unlinkSync(`${tmpOutput}.webm`) } catch {}
    try { fs.unlinkSync(`${tmpOutput}.m4a`) } catch {}
  }
}

async function mp4(url) {
  const tmpOutput = join(tmpdir(), `nazu_video_${Date.now()}`)
  const mp4File = `${tmpOutput}.mp4`

  try {
    const ytdlp = await getYtDlpPath()
    if (!ytdlp) {
      return { ok: false, msg: '❌ yt-dlp não encontrado. Instale com: pip install yt-dlp' }
    }

    const infoJson = await execAsync(`${ytdlp} --dump-json --no-playlist "${url}"`)
    const info = JSON.parse(infoJson.stdout)

    if (info.duration > 600) {
      return { ok: false, msg: '⚠️ Vídeo muito longo. Máximo de 10 minutos para vídeo.' }
    }

    await execAsync(
      `${ytdlp} -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 --no-playlist -o "${mp4File}" "${url}"`,
      { maxBuffer: 200 * 1024 * 1024 }
    )

    const buffer = fs.readFileSync(mp4File)
    const title = info.title || 'YouTube Video'

    return {
      ok: true,
      buffer,
      title,
      thumbnail: info.thumbnail || '',
      filename: `${title.replace(/[^\w\s]/gi, '')}.mp4`
    }
  } catch (err) {
    return { ok: false, msg: err.message }
  } finally {
    try { fs.unlinkSync(mp4File) } catch {}
    try { fs.unlinkSync(`${tmpOutput}.webm`) } catch {}
    try { fs.unlinkSync(`${tmpOutput}.mkv`) } catch {}
  }
}

export { search, mp3, mp4 }
export const ytmp3 = mp3
export const ytmp4 = mp4
