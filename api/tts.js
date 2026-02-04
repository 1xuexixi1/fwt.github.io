// Vercel Edge Function: TTS proxy with silent MP3 fallback
// Accepts POST { text, lang, voice } and returns audio/mpeg

export const config = { runtime: 'edge' }

function createSilenceMp3(durationMs = 1000) {
  const base64 = 'SUQzAwAAAAAAQ1JJTUVNRQAAABJkYXRhAAAAAAEAAAADAAAAGG1wMyBzaWxlbmNlIGZhbGxiYWNr'
  return Uint8Array.from(Buffer.from(base64, 'base64')).buffer
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    let body
    try {
      body = await req.json()
    } catch {
      body = null
    }

    const { text = '', lang = 'en-US' } = body || {}
    const limitedText = String(text).slice(0, 300)
    const langCode = String(lang).includes('zh') ? 'zh-CN' : 'en-US'

    if (!limitedText) {
      return new Response(JSON.stringify({ error: 'missing text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 1) Try Google TTS (unofficial)
    try {
      const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(langCode)}&q=${encodeURIComponent(limitedText)}`
      const gr = await fetch(googleUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://translate.google.com/'
        }
      })
      if (gr.ok) {
        const buf = await gr.arrayBuffer()
        if (buf && buf.byteLength > 100) {
          return new Response(buf, {
            status: 200,
            headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' }
          })
        }
      }
    } catch {}

    // 2) Try Edge readaloud (unofficial)
    try {
      const voiceName = langCode === 'zh-CN' ? 'zh-CN-XiaoxiaoNeural' : 'en-US-JennyNeural'
      const edgeUrl = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&Sec-MS-GEC=0x9&Sec-MS-GEC-Version=1-107.0.1418.24'
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${langCode}'>\n  <voice name='${voiceName}'>${limitedText}</voice>\n</speak>`
      const er = await fetch(edgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
        },
        body: ssml
      })
      if (er.ok) {
        const buf = await er.arrayBuffer()
        if (buf && buf.byteLength > 100) {
          return new Response(buf, {
            status: 200,
            headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' }
          })
        }
      }
    } catch {}

    // 3) Fallback: silence
    const silent = createSilenceMp3(1000)
    return new Response(silent, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'internal error', detail: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}


