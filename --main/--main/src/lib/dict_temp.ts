// 绻佷綋杞畝浣撴槧灏勮〃
const traditionalToSimplified: { [key: string]: string } = {
  '璁€': '璇?, '闁?: '闃?, '鍏?: '鍐?, '瀹?: '瀹?, '鍕?: '鍔?, '瑭?: '璇?,
  '灞?: '灞?, '鎬?: '鎬?, '缇?: '涔?, '鐣?: '寮?, '楂?: '浣?, '缈?: '涔?,
  '瀛?: '瀛?, '妤?: '涓?, '灏?: '涓?, '鍗€': '鍖?, '鍗?: '鍗?,
  '鏈?: '浼?, '鍌?: '浼?, '鍌?: '澶?, '寰?: '澶?, '妤?: '鏋?, '妲?: '鏋?,
  '妯?: '鏍?, '妾?: '妗?, '姗?: '鏈?, '姝?: '鍘?, '姘?: '姘?, '姹?: '鍐?,
  '娉?: '鍐?, '鐒?: '鏃?, '鐠?: '鐜?, '鐢?: '浜?, '鐧?: '鍙?, '鐩?: '鐩?,
  '纰?: '纭?, '绀?: '纰?, '绋?: '绉?, '绌?: '绋?, '绡€': '鑺?, '绡?: '鑼?,
  '缍?: '缁?, '缍?: '缃?, '绶?: '绾?, '绺?: '缂?, '绺?: '鎬?, '绺?: '缁?,
  '鑱?: '澹?, '鑷?: '涓?, '铏?: '澶?, '铏?: '鍙?, '瑁?: '鍒?,
  '瑜?: '澶?, '瑕?: '瑙?, '瑷?: '璁?, '瑷?: '璁?, '瑾?: '璁?, '瑾?: '璇?,
  '瑾?: '璋?, '璜?: '璇?, '璜?: '璁?, '璀?: '璇?, '璀?: '鎶?, '璁?: '鍙?,
  '璩?: '璐?, '璨?: '璐?, '璩?: '璧?, '璩?: '璧?, '闂?: '鍏?, '闆?: '闅?,
  '闆?: '鐢?, '闊?: '鍝?, '闋?: '椤?, '椤?: '绫?, '椤?: '鏄?, '椤?: '棰?
}

// 绻佷綋杞畝浣撳嚱鏁?function convertToSimplified(text: string): string {
  if (!text) return text
  return text.split('').map(char => traditionalToSimplified[char] || char).join('')
}

// 绠€鍗曠殑MD5瀹炵幇锛堢櫨搴︾炕璇慉PI闇€瑕侊級
function md5(str: string): string {
  // 杩欓噷浣跨敤涓€涓畝鍖栫殑MD5瀹炵幇
  // 瀹為檯椤圭洰涓缓璁娇鐢╟rypto-js搴?  let hash = 0
  if (str.length === 0) return hash.toString()
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0')
}

// 缈昏瘧璐ㄩ噺妫€鏌ュ嚱鏁?function isValidTranslation(translatedText: string, originalTerm: string): boolean {
  // 鍩烘湰妫€鏌?  if (!translatedText || translatedText.length < 1) return false
  
  // 涓嶈兘涓庡師璇嶇浉鍚?  if (translatedText.toLowerCase() === originalTerm.toLowerCase()) return false
  
  // 涓嶈兘鍖呭惈鏄庢樉鐨勮嫳鏂囧崟璇?  const englishWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
  if (englishWords.some(word => translatedText.toLowerCase().includes(word))) return false
  
  // 涓嶈兘鍙寘鍚暟瀛楁垨绗﹀彿
  if (/^[0-9\s\-_.,!?]+$/.test(translatedText)) return false
  
  // 蹇呴』鍖呭惈涓枃瀛楃
  if (!/[\u4e00-\u9fff]/.test(translatedText)) return false
  
  // 闀垮害鍚堢悊锛堜笉鑳藉お闀挎垨澶煭锛?  if (translatedText.length > 50) return false
  
  return true
}

import { getUserTranslationConfig } from './translationConfig'

// 涓枃鍙嶆煡鑻辨枃
export async function reverseTranslate(chineseText: string): Promise<string | null> {
  try {
    console.log('=== reverseTranslate 寮€濮?===')
    console.log('杈撳叆鐨勪腑鏂?', chineseText)
    
    const config = getUserTranslationConfig()
    console.log('缈昏瘧閰嶇疆:', config)
    
    // 棣栧厛妫€鏌ュ唴缃槧灏?    const builtin: Record<string, string> = {
      '鑻规灉': 'apple',
      '姘?: 'water',
      '浣犲ソ': 'hello',
      '鐚?: 'cat',
      '鐙?: 'dog',
      '涔?: 'book',
      '姹借溅': 'car',
      '鎴垮瓙': 'house',
      '鏍?: 'tree',
      '椋熺墿': 'food',
      '鏃堕棿': 'time',
      '璇勪及': 'evaluate',
      '瀛︿範': 'learn',
      '宸ヤ綔': 'work',
      '蹇€?: 'fast',
      '鎱?: 'slow',
      '濂?: 'good',
      '鍧?: 'bad',
      '澶?: 'big',
      '灏?: 'small',
      '澶皬': 'too small',
      '澶ぇ': 'too big',
      '寰堝ソ': 'very good',
      '寰堝潖': 'very bad',
      '闈炲父': 'very',
      '缇庝附': 'beautiful',
      '婕備寒': 'pretty',
      '鑱槑': 'smart',
      '鎰氳牏': 'stupid',
      '楂樺叴': 'happy',
      '鎮蹭激': 'sad',
      '鐖?: 'love',
      '鎭?: 'hate',
      '鍠滄': 'like',
      '璁ㄥ帉': 'dislike',
      '鏂?: 'new',
      '鏃?: 'old',
      '骞磋交': 'young',
      '鑰?: 'old',
      '鐑?: 'hot',
      '鍐?: 'cold',
      '闀?: 'long',
      '鐭?: 'short',
      '楂?: 'tall',
      '鐭?: 'short',
      '鑳?: 'fat',
      '鐦?: 'thin',
      '寮?: 'strong',
      '寮?: 'weak'
    }
    
    if (builtin[chineseText]) {
      console.log('浣跨敤鍐呯疆鏄犲皠:', chineseText, '鈫?, builtin[chineseText])
      return builtin[chineseText]
    }
    
    console.log('鍐呯疆鏄犲皠涓病鏈夋壘鍒帮紝灏濊瘯鍦ㄧ嚎缈昏瘧...')
    
    // 鏂规硶1: 灏濊瘯鍏嶈垂鐨凙I缈昏瘧鏈嶅姟
    try {
      console.log('灏濊瘯鍏嶈垂AI缈昏瘧鏈嶅姟...')
      
      // 浣跨敤 Hugging Face 鐨勫厤璐圭炕璇戞ā鍨?      const hfResponse = await fetch('https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-zh-en', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: chineseText,
          options: { wait_for_model: true }
        })
      })
      
      if (hfResponse.ok) {
        const hfData = await hfResponse.json()
        if (hfData && hfData[0] && hfData[0].translation_text) {
          const englishText = hfData[0].translation_text.trim()
          console.log('Hugging Face缈昏瘧鎴愬姛:', chineseText, '鈫?, englishText)
          return englishText
        }
      }
    } catch (hfError) {
      console.log('Hugging Face缈昏瘧澶辫触:', hfError)
    }
    
    // 鏂规硶2: 灏濊瘯 Google Translate 鍏嶈垂鎺ュ彛
    try {
      console.log('灏濊瘯Google Translate...')
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh&tl=en&dt=t&q=${encodeURIComponent(chineseText)}`
      const googleResponse = await fetch(googleUrl)
      
      if (googleResponse.ok) {
        const googleData = await googleResponse.json()
        if (googleData && googleData[0] && googleData[0][0] && googleData[0][0][0]) {
          const englishText = googleData[0][0][0].trim()
          console.log('Google Translate缈昏瘧鎴愬姛:', chineseText, '鈫?, englishText)
          return englishText
        }
      }
    } catch (googleError) {
      console.log('Google Translate缈昏瘧澶辫触:', googleError)
    }
    
    // 鏂规硶3: 灏濊瘯 DeepL 鍏嶈垂鎺ュ彛
    try {
      console.log('灏濊瘯DeepL缈昏瘧...')
      const deeplResponse = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          text: chineseText,
          source_lang: 'ZH',
          target_lang: 'EN',
          auth_key: config.deeplApiKey || 'your-deepl-api-key'
        })
      })
      
      if (deeplResponse.ok) {
        const deeplData = await deeplResponse.json()
        if (deeplData.translations && deeplData.translations[0]) {
          const englishText = deeplData.translations[0].text.trim()
          console.log('DeepL缈昏瘧鎴愬姛:', chineseText, '鈫?, englishText)
          return englishText
        }
      }
    } catch (deeplError) {
      console.log('DeepL缈昏瘧澶辫触:', deeplError)
    }
    
    // 鏂规硶4: 浣跨敤鐧惧害缈昏瘧API鍙嶆煡
    if (config.baiduAppId && config.baiduSecret) {
      const salt = Date.now().toString()
      const sign = md5(config.baiduAppId + chineseText + salt + config.baiduSecret)
      
      const response = await fetch('/api/baidu/api/trans/vip/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          q: chineseText,
          from: 'zh',
          to: 'en',
          appid: config.baiduAppId,
          salt: salt,
          sign: sign
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.trans_result && data.trans_result[0]) {
          const englishText = data.trans_result[0].dst
          console.log('涓枃鍙嶆煡鑻辨枃鎴愬姛:', chineseText, '鈫?, englishText)
          return englishText
        }
      }
    }
    
    // 濡傛灉鐧惧害缈昏瘧澶辫触锛屽皾璇?MyMemory
    const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chineseText)}&langpair=zh|en`
    const myMemoryRes = await fetch(myMemoryUrl)
    
    if (myMemoryRes.ok) {
      const myMemoryData = await myMemoryRes.json()
      if (myMemoryData.responseData?.translatedText) {
        const englishText = (myMemoryData.responseData.translatedText || '').trim()
        console.log('涓枃鍙嶆煡鑻辨枃鎴愬姛(MyMemory):', chineseText, '鈫?, englishText)
        if (englishText) return englishText
      }
    }
    
    // 鏂规硶6: 灏濊瘯 LibreTranslate锛堝紑婧愬厤璐癸級
    try {
      console.log('灏濊瘯LibreTranslate...')
      const libreRes = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: chineseText, source: 'zh', target: 'en', format: 'text' })
      })
      if (libreRes.ok) {
        const libreData = await libreRes.json()
        const englishText = (libreData.translatedText || '').trim()
        if (englishText) {
          console.log('LibreTranslate缈昏瘧鎴愬姛:', chineseText, '鈫?, englishText)
          return englishText
        }
      }
    } catch (libreError) {
      console.log('LibreTranslate缈昏瘧澶辫触:', libreError)
    }
    
    // 鏂规硶7: 灏濊瘯 Ollama 鏈湴澶фā鍨嬶紙濡傛灉鐢ㄦ埛鏈夐儴缃诧級
    try {
      console.log('灏濊瘯Ollama鏈湴澶фā鍨?..')
      const ollamaResponse = await fetch(`${config.ollamaBaseUrl || 'http://localhost:11434'}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.ollamaModel || 'llama2',
          prompt: `You are a professional Chinese-English translator. Translate this Chinese text to English, return ONLY the English word or phrase: ${chineseText}`,
          stream: false
        })
      })
      
      if (ollamaResponse.ok) {
        const ollamaData = await ollamaResponse.json()
        if (ollamaData.response) {
          const englishText = ollamaData.response.trim()
          console.log('Ollama缈昏瘧鎴愬姛:', chineseText, '鈫?, englishText)
          return englishText
        }
      }
    } catch (ollamaError) {
      console.log('Ollama缈昏瘧澶辫触锛堝彲鑳芥湭瀹夎锛?', ollamaError)
    }
    
    // 鏂规硶8: 灏濊瘯 OpenAI 鍏煎鎺ュ彛锛堝 OpenRouter, Together AI 绛夛級
    try {
      console.log('灏濊瘯OpenAI鍏煎鎺ュ彛...')
      if (config.openaiCompatibleKey) {
        const baseUrl = config.openaiCompatibleBaseUrl || 'https://openrouter.ai/api/v1'
        const openaiResponse = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.openaiCompatibleKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': '鑻辫瀛︿範鍔╂墜'
          },
          body: JSON.stringify({
            model: config.openaiCompatibleModel || 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [
              {
                role: 'system',
                content: 'You are a professional Chinese-English translator. Translate the given Chinese text to its most appropriate English word or phrase. Return ONLY the English translation, without any explanations or additional text.'
              },
              {
                role: 'user',
                content: `Translate this Chinese to English: ${chineseText}`
              }
            ],
            max_tokens: 50,
            temperature: 0.1
          })
        })
        
        if (openaiResponse.ok) {
          const openaiData = await openaiResponse.json()
          const englishText = openaiData.choices?.[0]?.message?.content?.trim()
          if (englishText) {
            console.log('OpenAI鍏煎鎺ュ彛缈昏瘧鎴愬姛:', chineseText, '鈫?, englishText)
            return englishText
          }
        }
      }
    } catch (openaiError) {
      console.log('OpenAI鍏煎鎺ュ彛缈昏瘧澶辫触:', openaiError)
    }
    
    // 鏂规硶9: 灏濊瘯 Cohere 鍏嶈垂API
    try {
      console.log('灏濊瘯Cohere缈昏瘧...')
      if (config.cohereApiKey) {
        const cohereResponse = await fetch('https://api.cohere.ai/v1/generate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.cohereApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'command-light',
            prompt: `Translate this Chinese text to English: ${chineseText}\nEnglish:`,
            max_tokens: 50,
            temperature: 0.1,
            stop_sequences: ['\n']
          })
        })
        
        if (cohereResponse.ok) {
          const cohereData = await cohereResponse.json()
          const englishText = cohereData.generations?.[0]?.text?.trim()
          if (englishText) {
            console.log('Cohere缈昏瘧鎴愬姛:', chineseText, '鈫?, englishText)
            return englishText
          }
        }
      }
    } catch (cohereError) {
      console.log('Cohere缈昏瘧澶辫触:', cohereError)
    }


    return null
  } catch (error) {
    console.error('涓枃鍙嶆煡鑻辨枃澶辫触:', error)
    return null
  }
}

export async function fetchIPAAndAudio(term: string): Promise<{ ipa?: string; audios?: string[] }>{
  try{
    // 灏濊瘯浣跨敤浠ｇ悊璁块棶瀛楀吀API锛堟湁3绉掕秴鏃讹級
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    const url = `/api/dictionary/api/v2/entries/en/${encodeURIComponent(term)}`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if(!res.ok) return {}
    const data = await res.json()
    const phon = data?.[0]?.phonetics || []
    const ipa = phon.find((p: any) => p.text)?.text
    const audios = phon.map((p: any) => p.audio).filter(Boolean)
    return { ipa, audios }
  }catch(error){ 
    console.log('瀛楀吀API涓嶅彲鐢紝璺宠繃闊虫爣鑾峰彇')
    return {} 
  }
}

export async function fetchWordInfo(term: string): Promise<{ 
  ipa?: string; 
  audios?: string[]; 
  meanings?: string[];
  examples?: string[];
  chineseMeaning?: string;
  americanIPA?: string;
  britishIPA?: string;
  americanAudio?: string;
  britishAudio?: string;
}>{
  // 棣栧厛灏濊瘯鐩存帴鑾峰彇涓枃缈昏瘧锛堜笉绛夊緟瀛楀吀API锛?  const translationPromise = getChineseTranslationOnly(term)
  
  try{
    // 灏濊瘯浣跨敤浠ｇ悊璁块棶瀛楀吀API锛堟湁3绉掕秴鏃讹級
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    
    const url = `/api/dictionary/api/v2/entries/en/${encodeURIComponent(term)}`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if(!res.ok) {
      console.log('瀛楀吀API杩斿洖閿欒鐘舵€?', res.status)
      // 濡傛灉瀛楀吀API澶辫触锛岃繑鍥炵炕璇戠粨鏋?      return await translationPromise
    }
    const data = await res.json()
    
    const entry = data?.[0]
    if(!entry) return {}
    
    // 鑾峰彇闊虫爣 - 鍖哄垎缇庡紡鍜岃嫳寮?    const phon = entry.phonetics || []
    let americanIPA = ''
    let britishIPA = ''
    let americanAudio = ''
    let britishAudio = ''
    
    // 鑾峰彇鎵€鏈夐煶棰慤RL
    const audios = phon.map((p: any) => p.audio).filter(Boolean)
    
    // 灏濊瘯浠?phonetics 涓幏鍙栫編寮忓拰鑻卞紡闊虫爣鍜岄煶棰?    phon.forEach((p: any) => {
      if (p.text) {
        // 鏀硅繘鐨勯煶鏍囧垽鏂€昏緫
        const ipaText = p.text.toLowerCase()
        
        // 缇庡紡闊虫爣鐗瑰緛
        const isAmerican = ipaText.includes('/r/') || 
                          ipaText.includes('蓺') || 
                          ipaText.includes('蓾') ||
                          ipaText.includes('蓽r') ||
                          ipaText.includes('蓹r') ||
                          ipaText.includes('蓱r') ||
                          ipaText.includes('蓴r') ||
                          ipaText.includes('蓽藧r') ||
                          ipaText.includes('蓽r') ||
                          // 缇庡紡鐗规湁鐨勫厓闊?                          ipaText.includes('忙') && !ipaText.includes('蓱藧') ||
                          ipaText.includes('蓱') && !ipaText.includes('蓱藧') ||
                          // 缇庡紡鍙戦煶妯″紡
                          ipaText.includes('t') && ipaText.includes('d') ||
                          ipaText.includes('flap') ||
                          ipaText.includes('glottal')
        
        // 鑻卞紡闊虫爣鐗瑰緛  
        const isBritish = ipaText.includes('蓱藧') ||
                         ipaText.includes('蓴藧') ||
                         ipaText.includes('蓽藧') ||
                         ipaText.includes('i藧') ||
                         ipaText.includes('u藧') ||
                         ipaText.includes('蓹蕣') ||
                         ipaText.includes('a瑟') ||
                         ipaText.includes('a蕣') ||
                         ipaText.includes('蓴瑟') ||
                         ipaText.includes('瑟蓹') ||
                         ipaText.includes('e蓹') ||
                         ipaText.includes('蕣蓹') ||
                         // 鑻卞紡鐗规湁妯″紡
                         ipaText.includes('藧') ||
                         ipaText.includes('non-rhotic')
        
        if (isAmerican && !isBritish) {
          americanIPA = p.text
        } else if (isBritish && !isAmerican) {
          britishIPA = p.text
        } else if (!americanIPA && !britishIPA) {
          // 濡傛灉鏃犳硶鍒ゆ柇锛岄粯璁や綔涓虹編寮忥紙鍥犱负缇庡紡鏇村父瑙侊級
          americanIPA = p.text
        }
      }
      if (p.audio) {
        // 鏍规嵁闊抽 URL 鍒ゆ柇鍦板尯
        if (p.audio.includes('us') || p.audio.includes('american')) {
          americanAudio = p.audio
        } else if (p.audio.includes('uk') || p.audio.includes('british')) {
          britishAudio = p.audio
        }
      }
    })
    
    // 濡傛灉娌℃湁鎵惧埌鐗瑰畾鐨勭編寮?鑻卞紡闊抽锛屽皾璇曚粠鎵€鏈夐煶棰戜腑鍒嗛厤
    if (!americanAudio && !britishAudio && audios.length > 0) {
      // 濡傛灉鏈夊涓煶棰戯紝绗竴涓綔涓虹編寮忥紝绗簩涓綔涓鸿嫳寮?      if (audios.length >= 2) {
        americanAudio = audios[0]
        britishAudio = audios[1]
      } else {
        // 鍙湁涓€涓煶棰戞椂锛屽悓鏃跺垎閰嶇粰缇庡紡鍜岃嫳寮?        americanAudio = audios[0]
        britishAudio = audios[0]
      }
    }
    
    // 濡傛灉娌℃湁鎵惧埌鐗瑰畾鐨勭編寮?鑻卞紡闊虫爣锛屼娇鐢ㄧ涓€涓彲鐢ㄧ殑
    const ipa = americanIPA || britishIPA || phon.find((p: any) => p.text)?.text
    
    // 鑾峰彇閲婁箟
    const meanings: string[] = []
    const examples: string[] = []
    
    if(entry.meanings) {
      entry.meanings.forEach((meaning: any) => {
        if(meaning.definitions) {
          meaning.definitions.forEach((def: any) => {
            if(def.definition) {
              meanings.push(def.definition)
            }
            if(def.example) {
              examples.push(def.example)
            }
          })
        }
      })
    }
    
    // 鑾峰彇涓枃缈昏瘧锛堜娇鐢ㄥ苟琛屽惎鍔ㄧ殑鐧惧害缈昏瘧缁撴灉锛?    let chineseMeaning = ''
    
    // 宸茬粡鍦ㄥ嚱鏁板紑濮嬫椂骞惰鍚姩浜嗙炕璇戣姹傦紙translationPromise锛?    // 杩欓噷涓嶉渶瑕佸啀鍋氬唴缃槧灏勬鏌ワ紝鍥犱负 getChineseTranslationOnly 鍑芥暟宸茬粡鍖呭惈浜?    
    // 澶囩敤锛氬鏋滃瓧鍏窤PI鑷繁鏈夊唴缃炕璇戞槧灏勶紙淇濈暀灏戦噺鍏抽敭璇嶏級
    const quickTranslations: Record<string, string> = {
      // 鍩虹璇嶆眹
      'per': '姣忥紝姣忎釜',
      'apple': '鑻规灉',
      'water': '姘?,
      'hello': '浣犲ソ',
      'good': '濂界殑',
      'bad': '鍧忕殑',
      'big': '澶х殑',
      'small': '灏忕殑',
      'cat': '鐚?,
      'dog': '鐙?,
      'bar': '閰掑惂锛屾潯锛屾潌锛屾爮鏉?,
      'book': '涔?,
      'car': '姹借溅',
      'house': '鎴垮瓙',
      'tree': '鏍?,
      'food': '椋熺墿',
      'time': '鏃堕棿',
      'day': '澶╋紝鏃?,
      'night': '澶滄櫄',
      'year': '骞?,
      
      // 鎶€鏈瘝姹?      'install': '瀹夎锛岃缃紝璁剧疆',
      'computer': '璁＄畻鏈猴紝鐢佃剳',
      'software': '杞欢',
      'program': '绋嬪簭锛岃妭鐩紝璁″垝',
      'system': '绯荤粺锛屽埗搴?,
      'network': '缃戠粶锛屽叧绯荤綉',
      'internet': '浜掕仈缃戯紝鍥犵壒缃?,
      'website': '缃戠珯锛岀珯鐐?,
      'database': '鏁版嵁搴擄紝璧勬枡搴?,
      'server': '鏈嶅姟鍣紝鏈嶅姟鍛?,
      'application': '搴旂敤绋嬪簭锛岀敵璇凤紝搴旂敤',
      'interface': '鐣岄潰锛屾帴鍙ｏ紝浜ょ晫闈?,
      'function': '鍔熻兘锛屽嚱鏁帮紝浣滅敤',
      'process': '杩囩▼锛屽鐞嗭紝绋嬪簭',
      'data': '鏁版嵁锛岃祫鏂?,
      'file': '鏂囦欢锛屾。妗?,
      'folder': '鏂囦欢澶癸紝鐩綍',
      'document': '鏂囨。锛屾枃浠讹紝璇佹槑',
      'image': '鍥惧儚锛屽浘鐗囷紝褰㈣薄',
      'video': '瑙嗛锛屽綍鍍?,
      
      // 甯哥敤鍔ㄨ瘝
      'create': '鍒涘缓锛屽埗閫?,
      'delete': '鍒犻櫎',
      'update': '鏇存柊',
      'download': '涓嬭浇',
      'upload': '涓婁紶',
      'search': '鎼滅储',
      'find': '鎵惧埌',
      'open': '鎵撳紑',
      'close': '鍏抽棴',
      'save': '淇濆瓨',
      'load': '鍔犺浇',
      'start': '寮€濮?,
      'stop': '鍋滄',
      'run': '杩愯',
      'execute': '鎵ц',
      'build': '鏋勫缓锛屽缓閫?,
      'develop': '寮€鍙?,
      'design': '璁捐',
      'test': '娴嬭瘯',
      'debug': '璋冭瘯',
      
      // 甯哥敤褰㈠璇?      'new': '鏂扮殑',
      'old': '鏃х殑',
      'fast': '蹇殑锛岃繀閫熺殑锛屽揩閫熷湴',
      'slow': '鎱㈢殑',
      'easy': '瀹规槗鐨?,
      'hard': '鍥伴毦鐨?,
      'simple': '绠€鍗曠殑',
      'complex': '澶嶆潅鐨?,
      'important': '閲嶈鐨?,
      'useful': '鏈夌敤鐨?,
      'powerful': '寮哄ぇ鐨?,
      'efficient': '楂樻晥鐨?,
      'secure': '瀹夊叏鐨?,
      'reliable': '鍙潬鐨?,
      'flexible': '鐏垫椿鐨?,
      'stable': '绋冲畾鐨?,
      
      // 鍟嗗姟璇嶆眹
      'business': '鍟嗕笟锛屼笟鍔?,
      'company': '鍏徃',
      'project': '椤圭洰',
      'team': '鍥㈤槦',
      'meeting': '浼氳',
      'report': '鎶ュ憡',
      'plan': '璁″垝',
      'strategy': '绛栫暐',
      'goal': '鐩爣',
      'result': '缁撴灉',
      'success': '鎴愬姛',
      'failure': '澶辫触',
      'problem': '闂',
      'solution': '瑙ｅ喅鏂规',
      'customer': '瀹㈡埛',
      'service': '鏈嶅姟',
      'product': '浜у搧',
      'market': '甯傚満',
      'price': '浠锋牸',
      'cost': '鎴愭湰',
      'profit': '鍒╂鼎',
      'revenue': '鏀跺叆'
    }
    
    const lowerTerm = term.toLowerCase()
    if (quickTranslations[lowerTerm]) {
      chineseMeaning = quickTranslations[lowerTerm]
      console.log('鉁?瀛楀吀API浣跨敤蹇€熸槧灏?', chineseMeaning)
    }
    
    // 浣跨敤骞惰鍚姩鐨勭櫨搴︾炕璇戠粨鏋滐紙宸插湪鍑芥暟寮€濮嬫椂鍙戣捣锛?    if (!chineseMeaning) {
      console.log('鈫?浣跨敤骞惰缈昏瘧缁撴灉...')
      const translation = await translationPromise
      chineseMeaning = translation.chineseMeaning || ''
    }
    
    // 濡傛灉杩樻槸娌℃湁锛屽皾璇曚娇鐢ㄨ嫳鏂囬噴涔変綔涓哄閫?    if (!chineseMeaning && meanings && meanings.length > 0) {
      // 鍙栫涓€涓嫳鏂囬噴涔変綔涓哄閫?      chineseMeaning = meanings[0]
      console.log('浣跨敤鑻辨枃閲婁箟浣滀负澶囬€?', chineseMeaning)
    }
    
    return { 
      ipa, 
      audios, 
      meanings, 
      examples, 
      chineseMeaning,
      americanIPA,
      britishIPA,
      americanAudio,
      britishAudio
    }
  } catch(error){ 
    console.log('字典API连接失败，返回翻译结果')
    // 如果字典API完全失败，返回翻译结果
    return await translationPromise
  }
}

