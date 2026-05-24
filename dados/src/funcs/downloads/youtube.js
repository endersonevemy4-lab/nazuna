import https from 'https'
import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { join } from 'path'
import ytSearch from 'yt-search'
import ytdl from '@distube/ytdl-core'

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
  const tmpInput = join(tmpdir(), `nazu_audio_${Date.now()}.webm`)
  const tmpOutput = join(tmpdir(), `nazu_audio_${Date.now()}.mp3`)

  try {
    const info = await ytdl.getInfo(url)
    const videoDetails = info.videoDetails

    if (parseInt(videoDetails.lengthSeconds) > 1800) {
      return { ok: false, msg: '⚠️ Vídeo muito longo. Máximo de 30 minutos.' }
    }

    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' })

    const chunks = []
    await new Promise((resolve, reject) => {
      const stream = ytdl.downloadFromInfo(info, { format })
      stream.on('data', chunk => chunks.push(chunk))
      stream.on('end', resolve)
      stream.on('error', reject)
    })

    fs.writeFileSync(tmpInput, Buffer.concat(chunks))

    await execAsync(`ffmpeg -y -i "${tmpInput}" -vn -ab 128k -ar 44100 "${tmpOutput}"`)

    const buffer = fs.readFileSync(tmpOutput)
    const title = videoDetails.title || 'YouTube Audio'

    return {
      ok: true,
      buffer,
      title,
      thumbnail: videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url || '',
      filename: `${title.replace(/[^\w\s]/gi, '')}.mp3`
    }
  } catch (err) {
    return { ok: false, msg: err.message }
  } finally {
    try { fs.unlinkSync(tmpInput) } catch {}
    try { fs.unlinkSync(tmpOutput) } catch {}
  }
}

async function mp4(url) {
  const tmpOutput = join(tmpdir(), `nazu_video_${Date.now()}.mp4`)

  try {
    const info = await ytdl.getInfo(url)
    const videoDetails = info.videoDetails

    if (parseInt(videoDetails.lengthSeconds) > 600) {
      return { ok: false, msg: '⚠️ Vídeo muito longo. Máximo de 10 minutos para vídeo.' }
    }

    const format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' })

    const chunks = []
    await new Promise((resolve, reject) => {
      const stream = ytdl.downloadFromInfo(info, { format })
      stream.on('data', chunk => chunks.push(chunk))
      stream.on('end', resolve)
      stream.on('error', reject)
    })

    const buffer = Buffer.concat(chunks)
    const title = videoDetails.title || 'YouTube Video'

    return {
      ok: true,
      buffer,
      title,
      thumbnail: videoDetails.thumbnails?.[videoDetails.thumbnails.length - 1]?.url || '',
      filename: `${title.replace(/[^\w\s]/gi, '')}.mp4`
    }
  } catch (err) {
    return { ok: false, msg: err.message }
  } finally {
    try { fs.unlinkSync(tmpOutput) } catch {}
  }
}

export { search, mp3, mp4 }
export const ytmp3 = mp3
export const ytmp4 = mp4
