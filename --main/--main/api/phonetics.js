// Vercel Node runtime API: phonetics aggregator
// GET /api/phonetics?word=play

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' })
      return
    }

    const word = String(req.query.word || '').trim().toLowerCase()
    if (!word) {
      res.status(400).json({ error: 'word required' })
      return
    }

    const results = []
    const seen = new Set()
    const push = (p) => {
      const arr = Array.isArray(p) ? p : p ? [p] : []
      for (const x of arr) {
        if (!x || !x.text) continue
        const key = x.text
        if (seen.has(key)) continue
        seen.add(key)
        results.push(x)
      }
    }

    // 1) dictionaryapi.dev
    try { push(await fromDictionaryApi(word)) } catch {}
    // 1.5) youdao
    if (results.length === 0) {
      try { push(await fromYoudao(word)) } catch {}
    }
    // 2) wiktionary wikitext
    if (results.length === 0) {
      try { push(await fromWiktionary(word)) } catch {}
    }

    if (results.length === 0) {
      res.status(404).json({ word, phonetics: [], note: 'no IPA found' })
      return
    }

    // Prefer entries with audio first
    results.sort((a, b) => Number(Boolean(b.audio)) - Number(Boolean(a.audio)))

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400')
    res.status(200).json({ word, phonetics: results })
  } catch (e) {
    res.status(500).json({ error: 'internal error', detail: String(e) })
  }
}

async function fromDictionaryApi(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' })
  if (!r.ok) throw new Error('dict api fail')
  const j = await r.json()
  const out = []
  for (const entry of j ?? []) {
    for (const p of entry?.phonetics ?? []) {
      if (!p?.text) continue
      out.push({ text: cleanIpa(p.text), audio: p.audio || undefined, accent: guessAccent(p.audio) })
    }
    // fallback: top level phonetic
    if (entry?.phonetic) out.push({ text: cleanIpa(entry.phonetic) })
  }
  return out
}

async function fromYoudao(word) {
  const url = `https://dict.youdao.com/jsonapi?doctype=json&jsonversion=4&q=${encodeURIComponent(word)}`
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' })
  if (!r.ok) throw new Error('youdao fail')
  const j = await r.json()
  const out = []
  const simple = j?.simple?.word?.[0]
  const ec = j?.ec?.word?.[0]
  const us = (simple?.usphone || ec?.usphone || '').trim()
  const uk = (simple?.ukphone || ec?.ukphone || '').trim()
  if (us) out.push({ text: `/${us}/`, accent: 'US', audio: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2` })
  if (uk) out.push({ text: `/${uk}/`, accent: 'UK', audio: `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1` })
  return out
}

async function fromWiktionary(word) {
  const url = `https://en.wiktionary.org/w/api.php?action=parse&prop=wikitext&format=json&page=${encodeURIComponent(word)}`
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' })
  if (!r.ok) throw new Error('wiktionary fail')
  const j = await r.json()
  const text = (j?.parse?.wikitext?.['*'] || '')
  const out = []
  const tpl = /\{\{\s*IPA\s*\|\s*en\s*((\|[^}]+)+)\}\}/g
  let m
  while ((m = tpl.exec(text))) {
    const body = m[1]
    const ips = body.match(/\/[^^\/]+\//g) || []
    ips.forEach(s => out.push({ text: cleanIpa(s) }))
  }
  if (out.length === 0) {
    ;(text.match(/\/[^\/]{2,}\/+?/g) || []).forEach(s => out.push({ text: cleanIpa(s) }))
  }
  return out
}

function cleanIpa(s) {
  return String(s).replace(/\s+/g, ' ').replace(/[\[\]【】]/g, '').trim()
}
function guessAccent(audio) {
  if (!audio) return undefined
  const u = String(audio).toLowerCase()
  if (u.includes('us.mp3') || u.includes('us_')) return 'US'
  if (u.includes('uk.mp3') || u.includes('uk_')) return 'UK'
  return undefined
}


