// Vercel Edge Function: Aggregate IPA fetcher
// Usage: GET /api/ipa?q=word

export const config = { runtime: 'edge' }

function extractFromEntries(entries) {
  if (!Array.isArray(entries)) return { ipa: undefined, audios: [] }
  const allPhonetics = entries
    .flatMap((e) => Array.isArray(e?.phonetics) ? e.phonetics : [])
    .filter(Boolean)
  const topLevelIpa = entries.find((e) => typeof e?.phonetic === 'string')?.phonetic
  const ipa = (allPhonetics.find((p) => typeof p?.text === 'string')?.text) || topLevelIpa
  const audioSet = new Set()
  allPhonetics.forEach((p) => { if (p?.audio) audioSet.add(p.audio) })
  const audios = Array.from(audioSet)
  return { ipa, audios }
}

async function fetchDictionary(word, lang) {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/${lang}/${encodeURIComponent(word)}`
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!r.ok) return null
    const data = await r.json()
    return data
  } catch {
    return null
  }
}

async function fetchFromWiktionary(word) {
  try {
    const url = `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!r.ok) return null
    const html = await r.text()
    // Rough regex to capture IPA between slashes near IPA cues
    const ipaRegex = /IPA\s*\(.*?\)\s*\/?\[?\/?\s*([^\s\[\]\/<>{}()]+?)\s*\/?\]?/i
    const m = html.match(ipaRegex)
    if (m && m[1]) {
      return { ipa: `/${m[1].replace(/^\/+|\/+$/g, '')}/`, audios: [] }
    }
    // Fallback: first slash-delimited sequence
    const slashRegex = /\/(?:[^\/\s]{2,}?)\//
    const m2 = html.match(slashRegex)
    if (m2 && m2[0]) {
      return { ipa: m2[0], audios: [] }
    }
    return null
  } catch {
    return null
  }
}

export default async function handler(req) {
  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('q') || ''
    const word = String(q || '').trim()
    if (!word) {
      return new Response(JSON.stringify({ error: 'missing q' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    // Try dictionaryapi.dev: en → en_US → en_GB
    const langs = ['en', 'en_US', 'en_GB']
    for (const lang of langs) {
      const data = await fetchDictionary(word, lang)
      if (data && Array.isArray(data) && data.length > 0) {
        const { ipa, audios } = extractFromEntries(data)
        if (ipa || (audios && audios.length)) {
          return new Response(JSON.stringify({ ipa, audios, source: `dictionaryapi:${lang}` }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
        }
      }
    }

    // Try Youdao for phone as IPA-like text
    try {
      const youdaoUrl = `https://dict.youdao.com/jsonapi?doctype=json&jsonversion=4&q=${encodeURIComponent(word)}`
      const yr = await fetch(youdaoUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      if (yr.ok) {
        const yj = await yr.json()
        const simple = yj?.simple?.word?.[0]
        const ec = yj?.ec?.word?.[0]
        const us = (simple?.usphone || ec?.usphone || '').trim()
        const uk = (simple?.ukphone || ec?.ukphone || '').trim()
        const candidate = us || uk
        if (candidate) {
          const audios = []
          audios.push(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`)
          audios.push(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`)
          return new Response(JSON.stringify({ ipa: `/${candidate}/`, audios, source: 'youdao' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
        }
      }
    } catch {}

    // Try Wiktionary as last resort
    const wik = await fetchFromWiktionary(word)
    if (wik && (wik.ipa || (wik.audios && wik.audios.length))) {
      return new Response(JSON.stringify({ ...wik, source: 'wiktionary' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
    }

    return new Response(JSON.stringify({ ipa: undefined, audios: [], source: 'none' }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'internal error', detail: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}


