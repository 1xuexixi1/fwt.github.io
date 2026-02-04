// @ts-nocheck
import { Plugin } from 'vite'

// 生成标准 WAV 静音（无需第三方依赖，保证可播放）
function createSilentWav(durationSeconds: number): Buffer {
  const sampleRate = 44100
  const numChannels = 1
  const bytesPerSample = 2 // 16-bit PCM
  const numSamples = Math.max(1, Math.floor(sampleRate * durationSeconds))

  const dataSize = numSamples * numChannels * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)
  let offset = 0

  function writeString(str: string) {
    buffer.write(str, offset); offset += str.length
  }
  function writeUint32(v: number) {
    buffer.writeUInt32LE(v, offset); offset += 4
  }
  function writeUint16(v: number) {
    buffer.writeUInt16LE(v, offset); offset += 2
  }

  // RIFF header
  writeString('RIFF')
  writeUint32(36 + dataSize)
  writeString('WAVE')

  // fmt chunk
  writeString('fmt ')
  writeUint32(16) // PCM
  writeUint16(1)  // audio format = PCM
  writeUint16(numChannels)
  writeUint32(sampleRate)
  writeUint32(sampleRate * numChannels * bytesPerSample) // byte rate
  writeUint16(numChannels * bytesPerSample) // block align
  writeUint16(8 * bytesPerSample) // bits per sample

  // data chunk
  writeString('data')
  writeUint32(dataSize)

  // 写入静音（全0）
  // Buffer 已经是 0 填充，无需再写

  return buffer
}

// 解析16-bit PCM WAV，返回基础信息与PCM数据
function parsePcmWav(wavBuffer: Buffer): {
  sampleRate: number
  numChannels: number
  bitsPerSample: number
  pcm: Int16Array
} {
  // RIFF/WAVE 校验
  if (wavBuffer.toString('ascii', 0, 4) !== 'RIFF' || wavBuffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Invalid WAV: Missing RIFF/WAVE header')
  }

  // 解析 chunks
  let offset = 12 // 跳过 RIFF header
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
      // 不 break，继续处理后续 chunk（通常已足够）
    }

    offset = chunkDataEnd
  }

  if (!fmtChunkFound || dataChunkOffset < 0) {
    throw new Error('Invalid WAV: Missing fmt or data chunk')
  }
  if (audioFormat !== 1) {
    throw new Error(`Unsupported WAV format: ${audioFormat} (expect PCM=1)`) 
  }
  if (bitsPerSample !== 16) {
    throw new Error(`Unsupported bits per sample: ${bitsPerSample} (expect 16)`) 
  }

  const dataBuf = wavBuffer.subarray(dataChunkOffset, dataChunkOffset + dataChunkSize)
  // 16-bit little-endian PCM
  const pcm = new Int16Array(dataBuf.buffer, dataBuf.byteOffset, Math.floor(dataBuf.byteLength / 2))

  return { sampleRate, numChannels, bitsPerSample, pcm }
}

// 将 Int16 PCM 写为标准 WAV Buffer
function createWavFromPcm(pcm: Int16Array, sampleRate: number, numChannels: number): Buffer {
  const bytesPerSample = 2
  const dataSize = pcm.length * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)
  let offset = 0

  function writeString(str: string) {
    buffer.write(str, offset); offset += str.length
  }
  function writeUint32(v: number) {
    buffer.writeUInt32LE(v, offset); offset += 4
  }
  function writeUint16(v: number) {
    buffer.writeUInt16LE(v, offset); offset += 2
  }

  writeString('RIFF')
  writeUint32(36 + dataSize)
  writeString('WAVE')

  writeString('fmt ')
  writeUint32(16)
  writeUint16(1) // PCM
  writeUint16(numChannels)
  writeUint32(sampleRate)
  writeUint32(sampleRate * numChannels * bytesPerSample)
  writeUint16(numChannels * bytesPerSample)
  writeUint16(8 * bytesPerSample)

  writeString('data')
  writeUint32(dataSize)

  // 写入PCM数据（Int16 -> little-endian）
  for (let i = 0; i < pcm.length; i++) {
    buffer.writeInt16LE(pcm[i], offset)
    offset += 2
  }

  return buffer
}

// 生成指定时长的静音PCM（Int16）
function createSilentPcm(durationSeconds: number, sampleRate: number, numChannels: number): Int16Array {
  const totalSamples = Math.max(0, Math.floor(durationSeconds * sampleRate * numChannels))
  return new Int16Array(totalSamples) // 全0 即静音
}

// Vite插件：提供本地TTS代理服务
function registerTtsRoutes(server: { middlewares: any }) {
  server.middlewares.use('/api/tts', async (req: any, res: any) => {
        // 处理预检请求
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          res.end()
          return
        }
        // 只接受POST请求
        if (req.method !== 'POST') {
          // 兼容 GET 简单调试
          if (req.method === 'GET') {
            // 允许GET作为健康检查或简单调用
          } else {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'Method Not Allowed' }))
            return
          }
        }

        try {
          // 读取POST body
          let body = ''
          req.on('data', chunk => { body += chunk.toString() })
          
          await new Promise<void>((resolve) => {
            req.on('end', () => resolve())
          })

          const data = JSON.parse(body || '{}')
          let { text, lang = 'en-US', voice = 'Cherry' } = data

          if (!text || typeof text !== 'string') {
            res.statusCode = 400
            res.end(JSON.stringify({ error: 'text is required' }))
            return
          }

          // CORS headers（开发环境下便于本地调用）
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

          console.log(`🎙️ TTS请求: text="${text.substring(0, 50)}...", lang=${lang}, voice=${voice}`)
          
          // 调用通义千问TTS API
          const qwenApiKey = process.env.DASHSCOPE_API_KEY || ''
          if (!qwenApiKey) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing DASHSCOPE_API_KEY (dev)', hint: '在本地终端设置环境变量后重启：set DASHSCOPE_API_KEY=你的Key' }))
            return
          }
          const qwenModel = 'qwen3-tts-flash'
          
          // 检测是否为中英混合文本（包含汉字和英文字母）
          const hasChinese = /[\u4e00-\u9fa5]/.test(text)
          const hasEnglish = /[a-zA-Z]/.test(text)
          const isMixed = hasChinese && hasEnglish
          
          // 确定语言类型：混合文本用Auto，单一语言用指定类型
          let languageType = 'Auto'
          if (!isMixed) {
            languageType = lang.includes('zh') ? 'Chinese' : 'English'
          }
          
          console.log(`🌐 语言检测: 中文=${hasChinese}, 英文=${hasEnglish}, 混合=${isMixed}, 使用=${languageType}`)
          
          async function callUpstream(currVoice: string) {
            return await fetch(
            'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${qwenApiKey}`,
              },
              body: JSON.stringify({
                model: qwenModel,
                input: { 
                  text: text,
                  language_type: languageType,
                  voice: currVoice
                },
                audio: {
                  format: 'mp3',
                  sample_rate: 24000
                }
              })
            }
          )
          }

          // 第一次调用
          let upstream = await callUpstream(voice)

          const upstreamData = await upstream.json().catch(async () => ({ raw: await upstream.text().catch(() => '') })) as any

          // 透传上游错误
          if (!upstream.ok) {
            const msg: string = upstreamData?.message || ''
            // 如果发音人不支持，则自动回退到 Cherry 重试一次
            if (/Voice .* is not supported/i.test(msg) && voice !== 'Cherry') {
              console.warn('⚠️ 发音人不支持，自动回退到 Cherry 并重试一次')
              voice = 'Cherry'
              upstream = await callUpstream(voice)
              const retried = await upstream.json().catch(() => ({})) as any
              if (!upstream.ok) {
                console.error(`❌ 上游TTS错误(重试后) ${upstream.status}:`, retried)
                res.statusCode = upstream.status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({
                  error: retried?.message || retried?.code || 'Upstream error',
                  upstream: retried
                }))
                return
              } else {
                // 成功走后续通路
                upstreamData.output = retried?.output
              }
            } else {
            console.error(`❌ 上游TTS错误 ${upstream.status}:`, upstreamData)
            res.statusCode = upstream.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: upstreamData?.message || upstreamData?.code || upstreamData?.raw || 'Upstream error',
              upstream: upstreamData
            }))
            return
            }
          }

          // 成功：返回音频URL或Base64（兼容不同返回结构）
          const audioUrl = upstreamData?.output?.audio?.url ?? upstreamData?.output?.audio_url
          const audioBase64 = upstreamData?.output?.audio?.data

          if (audioUrl) {
            console.log(`✅ TTS成功，返回URL: ${audioUrl.substring(0, 50)}...`)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ audioUrl }))
          } else if (audioBase64) {
            console.log(`✅ TTS成功，返回Base64 (${audioBase64.length} chars)`)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ audioBase64 }))
          } else {
            // 如果都没有，返回可播放的 WAV 静音占位，并附带上游回包方便排查
            console.warn('⚠️ 上游未返回音频字段，返回静音WAV占位; upstreamData=', upstreamData)
            const duration = Math.max(1, text.length * 0.1)
            const wavBuffer = createSilentWav(duration)
            res.statusCode = 200
            res.setHeader('Content-Type', 'audio/wav')
            res.setHeader('X-Upstream-Info', encodeURIComponent(JSON.stringify(upstreamData).slice(0,512)))
            res.setHeader('Cache-Control', 'no-store')
            res.end(wavBuffer)
          }
          
        } catch (error: any) {
          console.error('TTS处理错误:', error)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ 
            error: 'Upstream TTS call failed', 
            detail: String(error) 
          }))
        }
  })

  // 批量TTS：逐词合成，按间隔拼接后一次性返回单个WAV
  server.middlewares.use('/api/tts-batch', async (req: any, res: any) => {
        // 处理预检请求
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          res.end()
          return
        }
        if (req.method !== 'POST') {
          // 兼容 GET 调用，允许通过查询串传参
          if (req.method === 'GET') {
            // pass
          } else {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'Method Not Allowed' }))
            return
          }
        }

        try {
          // CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')

          let data: any = {}
          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk.toString() })
            await new Promise<void>((resolve) => { req.on('end', () => resolve()) })
            try { data = JSON.parse(body || '{}') } catch { data = {} }
          } else {
            // GET: 从查询串读取
            const u = new URL(req.url || '', 'http://localhost')
            const wordsParam = u.searchParams.getAll('w')
            const wordsJson = u.searchParams.get('words')
            const lang = u.searchParams.get('lang') || undefined
            const voice = u.searchParams.get('voice') || undefined
            const rate = u.searchParams.get('rate')
            const gapMs = u.searchParams.get('gapMs')
            let words: string[] = []
            if (wordsJson) {
              try { const parsed = JSON.parse(wordsJson); if (Array.isArray(parsed)) words = parsed.map(String) } catch {}
            }
            if (wordsParam.length) words = words.concat(wordsParam)
            data = {
              words,
              lang,
              voice,
              rate: rate ? Number(rate) : undefined,
              gapMs: gapMs ? Number(gapMs) : undefined
            }
          }
          // 支持 words: string[] 或 items: { text: string }[]
          const words: string[] = Array.isArray(data?.words)
            ? (data.words as any[]).map(x => String(x)).filter(Boolean)
            : Array.isArray(data?.items)
              ? (data.items as any[]).map(x => String(x?.text || '')).filter(Boolean)
              : []

          if (!words.length) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'words or items is required' }))
            return
          }

          let { lang = 'en-US', voice = 'Cherry', rate = 1.0, gapMs = 600 } = data || {}

          // 统一参数
          const desiredSampleRate = 24000
          const desiredChannels = 1
          const gapSeconds = Math.max(0, Number(gapMs) || 0) / 1000

          // 语言检测：若混合则Auto，否则按lang推断
          
          // 语言检测：若混合则Auto，否则按lang推断
          const hasChinese = words.some(w => /[\u4e00-\u9fa5]/.test(w))
          const hasEnglish = words.some(w => /[a-zA-Z]/.test(w))
          const isMixed = hasChinese && hasEnglish
          let languageType = 'Auto'
          if (!isMixed) {
            languageType = String(lang).includes('zh') ? 'Chinese' : 'English'
          }

          async function callUpstreamWord(text: string): Promise<Buffer> {
            // 优先请求WAV，便于拼接。尝试携带速度参数（若不支持会回退）。
            const requestBodyBase: any = {
              model: 'qwen3-tts-flash',
              input: {
                text,
                language_type: languageType,
                voice
              },
              audio: {
                format: 'wav',
                sample_rate: desiredSampleRate
              }
            }

            // 最佳努力地传入速度参数（若上游不支持会回退不带此参数）
            if (typeof rate === 'number' && rate > 0 && rate !== 1) {
              try {
                requestBodyBase.audio.speed_ratio = rate
              } catch { /* no-op */ }
            }

            const upstream = await fetch(
              'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${'sk-9420fd983635418082464a07c80b0a15'}`,
                },
                body: JSON.stringify(requestBodyBase)
              }
            )

            const resp = await upstream.json().catch(() => ({})) as any

            if (!upstream.ok) {
              // 若因未知字段报错，回退去掉speed_ratio再试一次
              const msg: string = resp?.message || ''
              if (msg && /speed|ratio|unknown|invalid/i.test(msg) && requestBodyBase?.audio?.speed_ratio) {
                delete requestBodyBase.audio.speed_ratio
                const retry = await fetch(
                  'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${'sk-9420fd983635418082464a07c80b0a15'}`,
                    },
                    body: JSON.stringify(requestBodyBase)
                  }
                )
                const retried = await retry.json().catch(() => ({})) as any
                if (!retry.ok) {
                  throw new Error(`Upstream error: ${retry.status} ${retried?.message || retried?.code || ''}`)
                }
                // success path continues with retried data
                return await resolveAudioBufferFromUpstream(retried)
              }
              throw new Error(`Upstream error: ${upstream.status} ${msg || resp?.code || ''}`)
            }

            return await resolveAudioBufferFromUpstream(resp)
          }

          async function resolveAudioBufferFromUpstream(upstreamData: any): Promise<Buffer> {
            const audioUrl = upstreamData?.output?.audio?.url ?? upstreamData?.output?.audio_url
            const audioBase64 = upstreamData?.output?.audio?.data
            if (audioUrl) {
              const r = await fetch(audioUrl)
              if (!r.ok) throw new Error(`Fetch audioUrl failed: ${r.status}`)
              const arrBuf = await r.arrayBuffer()
              return Buffer.from(arrBuf)
            } else if (audioBase64) {
              return Buffer.from(audioBase64, 'base64')
            }
            throw new Error('Upstream returned no audio')
          }

          const segments: Int16Array[] = []
          let mergedMs = 0

          for (let i = 0; i < words.length; i++) {
            const word = String(words[i] || '')
            if (!word) continue

            const wavBuf = await callUpstreamWord(word)
            const { sampleRate, numChannels, bitsPerSample, pcm } = parsePcmWav(wavBuf)
            if (bitsPerSample !== 16) {
              throw new Error(`Unsupported bits: ${bitsPerSample}`)
            }
            if (sampleRate !== desiredSampleRate) {
              throw new Error(`Sample rate mismatch: got ${sampleRate}, expect ${desiredSampleRate}`)
            }
            if (numChannels !== desiredChannels) {
              throw new Error(`Channel mismatch: got ${numChannels}, expect ${desiredChannels}`)
            }

            segments.push(pcm)
            mergedMs += (pcm.length / (desiredSampleRate * desiredChannels)) * 1000

            // 间隔（最后一个词后也可选是否加入，这里不加尾部间隔）
            if (gapSeconds > 0 && i < words.length - 1) {
              const gapPcm = createSilentPcm(gapSeconds, desiredSampleRate, desiredChannels)
              segments.push(gapPcm)
              mergedMs += gapSeconds * 1000
            }
          }

          if (segments.length === 0 || mergedMs < 1) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'No audio merged from upstream' }))
            return
          }

          // 合并所有 PCM 段
          const totalSamples = segments.reduce((sum, seg) => sum + seg.length, 0)
          const merged = new Int16Array(totalSamples)
          let writePos = 0
          for (const seg of segments) {
            merged.set(seg, writePos)
            writePos += seg.length
          }

          const wav = createWavFromPcm(merged, desiredSampleRate, desiredChannels)
          res.statusCode = 200
          res.setHeader('Content-Type', 'audio/wav')
          res.setHeader('Cache-Control', 'no-store')
          res.setHeader('X-Route', 'tts-batch')
          res.setHeader('X-Words-Count', String(words.length))
          res.setHeader('X-Audio-Duration-MS', String(Math.round(mergedMs)))
          res.end(wav)
        } catch (error: any) {
          console.error('TTS批量处理错误:', error)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ 
            error: 'Batch TTS failed',
            detail: String(error)
          }))
        }
  })
}

export function ttsProxyPlugin(): Plugin {
  return {
    name: 'tts-proxy',
    configureServer(server) {
      registerTtsRoutes(server)
    },
    configurePreviewServer(server) {
      registerTtsRoutes(server)
    }
  }
}

