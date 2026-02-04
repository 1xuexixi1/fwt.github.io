// Qwen batch TTS serverless function (Vercel)
// POST: { words: string[], lang?: string, voice?: string, rate?: number, gapMs?: number }
// GET:  /api/tts-batch?w=apple&w=banana&rate=1.0&gapMs=600

export const config = { runtime: 'nodejs' }

function createSilentPcm(durationSeconds, sampleRate, numChannels) {
  const totalSamples = Math.max(0, Math.floor(durationSeconds * sampleRate * numChannels))
  return new Int16Array(totalSamples)
}

function parsePcmWav(wavBuffer) {
  if (wavBuffer.toString('ascii', 0, 4) !== 'RIFF' || wavBuffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Invalid WAV: Missing RIFF/WAVE header')
  }
  let offset = 12
  let fmtChunkFound = false
  let dataChunkOffset = -1
  let dataChunkSize = 0
  let audioFormat = 0
  let numChannels = 0
  let sampleRate = 0
  let bitsPerSample = 0
  while (offset + 8 <= wavBuffer.length) {
    const chunkId = wavBuffer.toString('ascii', offset, offset + 4)
    const chunkSize = wavBuffer.readUInt32LE(offset + 4)
    const chunkDataStart = offset + 8
    const chunkDataEnd = chunkDataStart + chunkSize
    if (chunkId === 'fmt ') {
      fmtChunkFound = true
      audioFormat = wavBuffer.readUInt16LE(chunkDataStart)
      numChannels = wavBuffer.readUInt16LE(chunkDataStart + 2)
      sampleRate = wavBuffer.readUInt32LE(chunkDataStart + 4)
      bitsPerSample = wavBuffer.readUInt16LE(chunkDataStart + 14)
    } else if (chunkId === 'data') {
      dataChunkOffset = chunkDataStart
      dataChunkSize = chunkSize
    }
    offset = chunkDataEnd
  }
  if (!fmtChunkFound || dataChunkOffset < 0) throw new Error('Invalid WAV: Missing fmt or data chunk')
  if (audioFormat !== 1) throw new Error(`Unsupported WAV format: ${audioFormat}`)
  if (bitsPerSample !== 16) throw new Error(`Unsupported bits per sample: ${bitsPerSample}`)
  const dataBuf = wavBuffer.subarray(dataChunkOffset, dataChunkOffset + dataChunkSize)
  const pcm = new Int16Array(dataBuf.buffer, dataBuf.byteOffset, Math.floor(dataBuf.byteLength / 2))
  return { sampleRate, numChannels, bitsPerSample, pcm }
}

function createWavFromPcm(pcm, sampleRate, numChannels) {
  const bytesPerSample = 2
  const dataSize = pcm.length * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)
  let offset = 0
  function writeString(str) { buffer.write(str, offset); offset += str.length }
  function writeUint32(v) { buffer.writeUInt32LE(v, offset); offset += 4 }
  function writeUint16(v) { buffer.writeUInt16LE(v, offset); offset += 2 }
  writeString('RIFF')
  writeUint32(36 + dataSize)
  writeString('WAVE')
  writeString('fmt ')
  writeUint32(16)
  writeUint16(1)
  writeUint16(numChannels)
  writeUint32(sampleRate)
  writeUint32(sampleRate * numChannels * bytesPerSample)
  writeUint16(numChannels * bytesPerSample)
  writeUint16(8 * bytesPerSample)
  writeString('data')
  writeUint32(dataSize)
  for (let i = 0; i < pcm.length; i++) { buffer.writeInt16LE(pcm[i], offset); offset += 2 }
  return buffer
}

function createSilenceMp3Chunk() {
  // Minimal silent MP3 chunk (very small). This is not precise, but acceptable as gap filler.
  const base64 = 'SUQzAwAAAAAAQ1JJTUVNRQAAABJkYXRhAAAAAAEAAAADAAAAGG1wMyBzaWxlbmNlIGZhbGxiYWNr'
  return Buffer.from(base64, 'base64')
}

export default async function handler(req, res) {
  try {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') { res.status(204).end(); return }

    const desiredSampleRate = 24000
    const desiredChannels = 1

    let data = {}
    if (req.method === 'POST') {
      data = req.body || {}
      if (typeof data === 'string') { try { data = JSON.parse(data) } catch {} }
    } else if (req.method === 'GET') {
      const u = new URL(req.url, 'http://localhost')
      const wordsParam = u.searchParams.getAll('w')
      const wordsJson = u.searchParams.get('words')
      const lang = u.searchParams.get('lang') || undefined
      const voice = u.searchParams.get('voice') || undefined
      const rate = u.searchParams.get('rate')
      const gapMs = u.searchParams.get('gapMs')
      let words = []
      if (wordsJson) { try { const parsed = JSON.parse(wordsJson); if (Array.isArray(parsed)) words = parsed.map(String) } catch {} }
      if (wordsParam.length) words = words.concat(wordsParam)
      data = { words, lang, voice, rate: rate ? Number(rate) : undefined, gapMs: gapMs ? Number(gapMs) : undefined }
    } else {
      res.status(405).json({ error: 'Method Not Allowed' }); return
    }

    const words = Array.isArray(data?.words) ? data.words.map(String).filter(Boolean) : []
    if (!words.length) { res.status(400).json({ error: 'words is required' }); return }

    let { lang = 'en-US', voice = 'Cherry', rate = 1.0, gapMs = 600 } = data || {}
    const gapSeconds = Math.max(0, Number(gapMs) || 0) / 1000

    const hasChinese = words.some(w => /[\u4e00-\u9fa5]/.test(w))
    const hasEnglish = words.some(w => /[a-zA-Z]/.test(w))
    const isMixed = hasChinese && hasEnglish
    let languageType = 'Auto'
    if (!isMixed) languageType = String(lang).includes('zh') ? 'Chinese' : 'English'

    const apiKey = process.env.DASHSCOPE_API_KEY
    if (!apiKey) {
      res.status(500).json({ error: 'Missing DASHSCOPE_API_KEY', hint: 'Set DASHSCOPE_API_KEY in Vercel Project → Settings → Environment Variables' })
      return
    }

    async function callUpstreamWord(text) {
      const body = {
        model: 'qwen3-tts-flash',
        input: { text, language_type: languageType, voice },
        // Use MP3 to avoid server-side decode; we will concatenate MP3 frames directly
        audio: { format: 'mp3', sample_rate: desiredSampleRate }
      }
      if (typeof rate === 'number' && rate > 0 && rate !== 1) body.audio.speed_ratio = rate
      let r = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(body)
      })
      let d = await r.json().catch(async () => ({ raw: await r.text().catch(() => '') }))
      if (!r.ok) {
        const msg = d?.message || ''
        if (msg && /speed|ratio|unknown|invalid/i.test(msg) && body.audio.speed_ratio) {
          delete body.audio.speed_ratio
          r = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(body)
          })
          d = await r.json().catch(async () => ({ raw: await r.text().catch(() => '') }))
          if (!r.ok) throw new Error(d?.message || d?.raw || `HTTP ${r.status}`)
        } else {
          throw new Error(msg || d?.raw || `HTTP ${r.status}`)
        }
      }
      const audioUrl = d?.output?.audio?.url ?? d?.output?.audio_url
      const audioBase64 = d?.output?.audio?.data
      if (audioUrl) {
        const rr = await fetch(audioUrl)
        if (!rr.ok) throw new Error(`Fetch audioUrl failed: ${rr.status}`)
        const arr = await rr.arrayBuffer()
        return Buffer.from(arr)
      } else if (audioBase64) {
        return Buffer.from(audioBase64, 'base64')
      }
      throw new Error('Upstream returned no audio')
    }

    const mp3Segments = []
    let mergedMs = 0
    for (let i = 0; i < words.length; i++) {
      const wb = await callUpstreamWord(String(words[i] || ''))
      // We cannot easily know the exact duration without decoding; track only gaps
      mp3Segments.push(wb)
      if (gapSeconds > 0 && i < words.length - 1) {
        const unitMs = 250
        const repeat = Math.max(1, Math.ceil((gapSeconds * 1000) / unitMs))
        const sil = createSilenceMp3Chunk()
        for (let r = 0; r < repeat; r++) mp3Segments.push(sil)
        mergedMs += gapSeconds * 1000
      }
    }
    if (!mp3Segments.length) { res.status(502).json({ error: 'No audio merged' }); return }
    const mergedMp3 = Buffer.concat(mp3Segments)
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Route', 'tts-batch')
    res.setHeader('X-Words-Count', String(words.length))
    // Duration header is approximate (gaps only)
    res.setHeader('X-Audio-Duration-MS', String(Math.round(mergedMs)))
    res.status(200).end(mergedMp3)
  } catch (e) {
    res.status(502).json({ error: 'Batch TTS failed', detail: String(e && e.message ? e.message : String(e)) })
  }
}


