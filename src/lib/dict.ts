import CryptoJS from 'crypto-js'

// 使用标准MD5实现（百度翻译API需要）
function md5(str: string): string {
  return CryptoJS.MD5(str).toString()
}

// 中文反查英文（内置映射）
const CHINESE_TO_ENGLISH: Record<string, string> = {
      '苹果': 'apple',
      '水': 'water',
      '你好': 'hello',
      '猫': 'cat',
      '狗': 'dog',
      '书': 'book',
      '汽车': 'car',
      '房子': 'house',
      '树': 'tree',
      '食物': 'food',
      '时间': 'time',
  '爱': 'love',
  '快乐': 'happy',
  '悲伤': 'sad',
  '美丽': 'beautiful',
  '男人': 'man',
  '女人': 'woman',
  '人们': 'people',
  '朋友': 'friend',
  '家庭': 'family',
  '家': 'home',
  '学校': 'school',
      '工作': 'work',
  '钱': 'money',
  '生活': 'life'
}

// 中文反查英文
export async function reverseTranslate(chineseText: string): Promise<string | null> {
  try {
    console.log(`🔍 中文反查英文: "${chineseText}"`)
    
    // 1. 首先检查内置映射
    if (CHINESE_TO_ENGLISH[chineseText]) {
      const result = CHINESE_TO_ENGLISH[chineseText]
      console.log(`✓ 使用内置映射: "${chineseText}" → "${result}"`)
      return result
    }
    
    // 2. 调用百度翻译API（中文 → 英文）
    console.log(`🌐 中文 "${chineseText}" 不在内置映射中，调用百度翻译...`)
    const apiResult = await callBaiduTranslate(chineseText, 'zh', 'en')
    
    if (apiResult.success && apiResult.result) {
      return apiResult.result
    } else {
      console.error('反查失败:', apiResult.error)
      return null
    }
    
  } catch (error) {
    console.error('❌ 中文反查英文失败:', error)
    return null
  }
}

export async function fetchIPAAndAudio(term: string): Promise<{ ipa?: string; audios?: string[] }>{
  try{
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)  // 延长到5秒
    
    const url = `/api/dictionary/api/v2/entries/en/${encodeURIComponent(term)}`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if (!res.ok) {
      console.log(`⚠️ fetchIPAAndAudio API失败 (${res.status})`)
      return {}
    }
    
    const data = await res.json()
    console.log(`📦 fetchIPAAndAudio返回:`, data?.[0]?.word || '无数据')
    
    // 解析音标和音频
    if (data && Array.isArray(data) && data.length > 0) {
      const entries = data
      const allPhonetics = entries
        .flatMap((e: any) => Array.isArray(e?.phonetics) ? e.phonetics : [])
        .filter(Boolean)
      const topLevelIpa = entries.find((e: any) => typeof e?.phonetic === 'string')?.phonetic
      const ipaText = (allPhonetics.find((p: any) => typeof p?.text === 'string')?.text) || topLevelIpa
      const audioSet = new Set<string>()
      allPhonetics.forEach((p: any) => { if (p?.audio) audioSet.add(p.audio) })
      const audios = Array.from(audioSet)
      
      console.log(`🔤 fetchIPAAndAudio音标: ${ipaText || '无'}, 音频: ${audios.length}个`)
      return { ipa: ipaText, audios }
    }
    
    return {}
  }catch(error){ 
    console.error(`❌ fetchIPAAndAudio异常:`, error)
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
  console.log(`🔍 fetchWordInfo 开始获取单词信息: "${term}"`)
  
  // 先启动翻译请求（不等待）
  const translationPromise = getChineseTranslationOnly(term)
  
  // 尝试从字典API获取音标（简化版，快速响应）
  const dictionaryPromise = (async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)  // 延长到5秒
      
      const url = `/api/dictionary/api/v2/entries/en/${encodeURIComponent(term)}`
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        console.log(`⚠️ 字典API失败 (${res.status})`)
        return null
      }
      
      const data = await res.json()
      console.log(`📦 字典API返回:`, data?.[0]?.word || '无数据')
      
      // 调试：输出完整的API数据结构
      if (data && Array.isArray(data) && data.length > 0) {
        const firstEntry = data[0]
        console.log(`🔍 API数据结构调试:`)
        console.log(`  - word: ${firstEntry.word}`)
        console.log(`  - phonetic: ${firstEntry.phonetic || '无'}`)
        console.log(`  - phonetics: ${Array.isArray(firstEntry.phonetics) ? firstEntry.phonetics.length : '无'}项`)
        if (firstEntry.phonetics && firstEntry.phonetics.length > 0) {
          console.log(`  - phonetics内容:`, firstEntry.phonetics.map((p: any) => ({ text: p.text, audio: p.audio })))
        }
      }
      return data || null
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`⏱️ 字典API超时`)
      } else {
        console.error(`❌ 字典API异常:`, error)
      }
      return null
    }
  })()
  
  // 备用：尝试从简单的音标生成（基于发音规则）
  const fallbackIPAPromise = (async () => {
    try {
      // 对于常用单词，使用内置音标库（300+ 扩充版）
      const commonIPAs: Record<string, string> = {
        // 基础名词
        'apple': '/ˈæp.əl/',
        'book': '/bʊk/',
        'cat': '/kæt/',
        'dog': '/dɔːɡ/',
        'water': '/ˈwɔː.tər/',
        'food': '/fuːd/',
        'tree': '/triː/',
        'flower': '/ˈflaʊ.ər/',
        'house': '/haʊs/',
        'car': '/kɑːr/',
        'bus': '/bʌs/',
        'train': '/treɪn/',
        'plane': '/pleɪn/',
        'bike': '/baɪk/',
        'ship': '/ʃɪp/',
        'boat': '/boʊt/',
        
        // 人物
        'man': '/mæn/',
        'woman': '/ˈwʊm.ən/',
        'child': '/tʃaɪld/',
        'children': '/ˈtʃɪl.drən/',
        'boy': '/bɔɪ/',
        'girl': '/ɡɜːrl/',
        'baby': '/ˈbeɪ.bi/',
        'friend': '/frend/',
        'teacher': '/ˈtiː.tʃər/',
        'student': '/ˈstuː.dənt/',
        'doctor': '/ˈdɑːk.tər/',
        'nurse': '/nɜːrs/',
        'worker': '/ˈwɜːr.kər/',
        'people': '/ˈpiː.pəl/',
        'person': '/ˈpɜːr.sən/',
        'father': '/ˈfɑː.ðər/',
        'mother': '/ˈmʌð.ər/',
        'parent': '/ˈper.ənt/',
        'brother': '/ˈbrʌð.ər/',
        'sister': '/ˈsɪs.tər/',
        'family': '/ˈfæm.əl.i/',
        
        // 地点
        'home': '/hoʊm/',
        'school': '/skuːl/',
        'office': '/ˈɔː.fɪs/',
        'hospital': '/ˈhɑː.spɪ.təl/',
        'library': '/ˈlaɪ.brer.i/',
        'store': '/stɔːr/',
        'shop': '/ʃɑːp/',
        'restaurant': '/ˈres.tə.rɑːnt/',
        'hotel': '/hoʊˈtel/',
        'park': '/pɑːrk/',
        'street': '/striːt/',
        'road': '/roʊd/',
        'city': '/ˈsɪt.i/',
        'town': '/taʊn/',
        'country': '/ˈkʌn.tri/',
        'world': '/wɜːrld/',
        'room': '/ruːm/',
        'kitchen': '/ˈkɪtʃ.ən/',
        'bedroom': '/ˈbed.ruːm/',
        'bathroom': '/ˈbæθ.ruːm/',
        'door': '/dɔːr/',
        'window': '/ˈwɪn.doʊ/',
        'floor': '/flɔːr/',
        'wall': '/wɔːl/',
        'roof': '/ruːf/',
        
        // 时间
        'time': '/taɪm/',
        'day': '/deɪ/',
        'week': '/wiːk/',
        'month': '/mʌnθ/',
        'year': '/jɪr/',
        'hour': '/aʊr/',
        'minute': '/ˈmɪn.ɪt/',
        'second': '/ˈsek.ənd/',
        'morning': '/ˈmɔːr.nɪŋ/',
        'noon': '/nuːn/',
        'afternoon': '/ˌæf.tərˈnuːn/',
        'evening': '/ˈiːv.nɪŋ/',
        'night': '/naɪt/',
        'today': '/təˈdeɪ/',
        'tomorrow': '/təˈmɑː.roʊ/',
        'yesterday': '/ˈjes.tər.deɪ/',
        'now': '/naʊ/',
        'moment': '/ˈmoʊ.mənt/',
        'season': '/ˈsiː.zən/',
        'spring': '/sprɪŋ/',
        'summer': '/ˈsʌm.ər/',
        'autumn': '/ˈɔː.təm/',
        'fall': '/fɔːl/',
        'winter': '/ˈwɪn.tər/',
        
        // 常用动词
        'be': '/biː/',
        'have': '/hæv/',
        'do': '/duː/',
        'say': '/seɪ/',
        'go': '/ɡoʊ/',
        'get': '/ɡet/',
        'make': '/meɪk/',
        'know': '/noʊ/',
        'think': '/θɪŋk/',
        'take': '/teɪk/',
        'see': '/siː/',
        'come': '/kʌm/',
        'want': '/wɑːnt/',
        'look': '/lʊk/',
        'use': '/juːz/',
        'find': '/faɪnd/',
        'give': '/ɡɪv/',
        'tell': '/tel/',
        'work': '/wɜːrk/',
        'call': '/kɔːl/',
        'try': '/traɪ/',
        'ask': '/æsk/',
        'need': '/niːd/',
        'feel': '/fiːl/',
        'become': '/bɪˈkʌm/',
        'leave': '/liːv/',
        'put': '/pʊt/',
        'mean': '/miːn/',
        'keep': '/kiːp/',
        'let': '/let/',
        'begin': '/bɪˈɡɪn/',
        'seem': '/siːm/',
        'help': '/help/',
        'talk': '/tɔːk/',
        'turn': '/tɜːrn/',
        'start': '/stɑːrt/',
        'show': '/ʃoʊ/',
        'hear': '/hɪr/',
        'play': '/pleɪ/',
        'run': '/rʌn/',
        'move': '/muːv/',
        'live': '/lɪv/',
        'believe': '/bɪˈliːv/',
        'bring': '/brɪŋ/',
        'happen': '/ˈhæp.ən/',
        'write': '/raɪt/',
        'provide': '/prəˈvaɪd/',
        'sit': '/sɪt/',
        'stand': '/stænd/',
        'lose': '/luːz/',
        'pay': '/peɪ/',
        'meet': '/miːt/',
        'include': '/ɪnˈkluːd/',
        'continue': '/kənˈtɪn.juː/',
        'set': '/set/',
        'learn': '/lɜːrn/',
        'change': '/tʃeɪndʒ/',
        'lead': '/liːd/',
        'understand': '/ˌʌn.dərˈstænd/',
        'watch': '/wɑːtʃ/',
        'follow': '/ˈfɑː.loʊ/',
        'stop': '/stɑːp/',
        'create': '/kriˈeɪt/',
        'speak': '/spiːk/',
        'read': '/riːd/',
        'spend': '/spend/',
        'grow': '/ɡroʊ/',
        'open': '/ˈoʊ.pən/',
        'walk': '/wɔːk/',
        'win': '/wɪn/',
        'teach': '/tiːtʃ/',
        'offer': '/ˈɔː.fər/',
        'remember': '/rɪˈmem.bər/',
        'consider': '/kənˈsɪd.ər/',
        'appear': '/əˈpɪr/',
        'buy': '/baɪ/',
        'wait': '/weɪt/',
        'serve': '/sɜːrv/',
        'die': '/daɪ/',
        'send': '/send/',
        'build': '/bɪld/',
        'stay': '/steɪ/',
        'cut': '/kʌt/',
        'reach': '/riːtʃ/',
        'kill': '/kɪl/',
        'raise': '/reɪz/',
        'pass': '/pæs/',
        'sell': '/sel/',
        'decide': '/dɪˈsaɪd/',
        'return': '/rɪˈtɜːrn/',
        'explain': '/ɪkˈspleɪn/',
        'hope': '/hoʊp/',
        'develop': '/dɪˈvel.əp/',
        'carry': '/ˈker.i/',
        'break': '/breɪk/',
        'receive': '/rɪˈsiːv/',
        'agree': '/əˈɡriː/',
        'support': '/səˈpɔːrt/',
        'hit': '/hɪt/',
        'produce': '/prəˈduːs/',
        'eat': '/iːt/',
        'cover': '/ˈkʌv.ər/',
        'catch': '/kætʃ/',
        'draw': '/drɔː/',
        'choose': '/tʃuːz/',
        'sleep': '/sliːp/',
        'drink': '/drɪŋk/',
        'jump': '/dʒʌmp/',
        'listen': '/ˈlɪs.ən/',
        'like': '/laɪk/',
        'love': '/lʌv/',
        'study': '/ˈstʌd.i/',
        
        // 形容词
        'good': '/ɡʊd/',
        'new': '/nuː/',
        'first': '/fɜːrst/',
        'last': '/læst/',
        'long': '/lɔːŋ/',
        'great': '/ɡreɪt/',
        'little': '/ˈlɪt.əl/',
        'own': '/oʊn/',
        'other': '/ˈʌð.ər/',
        'old': '/oʊld/',
        'right': '/raɪt/',
        'big': '/bɪɡ/',
        'high': '/haɪ/',
        'different': '/ˈdɪf.ər.ənt/',
        'small': '/smɔːl/',
        'large': '/lɑːrdʒ/',
        'next': '/nekst/',
        'early': '/ˈɜːr.li/',
        'young': '/jʌŋ/',
        'important': '/ɪmˈpɔːr.tənt/',
        'few': '/fjuː/',
        'public': '/ˈpʌb.lɪk/',
        'bad': '/bæd/',
        'same': '/seɪm/',
        'able': '/ˈeɪ.bəl/',
        'happy': '/ˈhæp.i/',
        'sad': '/sæd/',
        'beautiful': '/ˈbjuː.tɪ.fəl/',
        'strong': '/strɔːŋ/',
        'weak': '/wiːk/',
        'fast': '/fæst/',
        'slow': '/sloʊ/',
        'hot': '/hɑːt/',
        'cold': '/koʊld/',
        'warm': '/wɔːrm/',
        'cool': '/kuːl/',
        'easy': '/ˈiː.zi/',
        'hard': '/hɑːrd/',
        'difficult': '/ˈdɪf.ɪ.kəlt/',
        'simple': '/ˈsɪm.pəl/',
        'clean': '/kliːn/',
        'dirty': '/ˈdɜːr.ti/',
        'full': '/fʊl/',
        'empty': '/ˈemp.ti/',
        'heavy': '/ˈhev.i/',
        'light': '/laɪt/',
        'dark': '/dɑːrk/',
        'bright': '/braɪt/',
        'black': '/blæk/',
        'white': '/waɪt/',
        'red': '/red/',
        'blue': '/bluː/',
        'green': '/ɡriːn/',
        'yellow': '/ˈjel.oʊ/',
        'orange': '/ˈɔːr.ɪndʒ/',
        'purple': '/ˈpɜːr.pəl/',
        'pink': '/pɪŋk/',
        'brown': '/braʊn/',
        'gray': '/ɡreɪ/',
        'grey': '/ɡreɪ/',
        'nice': '/naɪs/',
        'fine': '/faɪn/',
        'clear': '/klɪr/',
        'free': '/friː/',
        'ready': '/ˈred.i/',
        'safe': '/seɪf/',
        'dangerous': '/ˈdeɪn.dʒər.əs/',
        'hungry': '/ˈhʌŋ.ɡri/',
        'thirsty': '/ˈθɜːr.sti/',
        'tired': '/taɪrd/',
        'busy': '/ˈbɪz.i/',
        'rich': '/rɪtʃ/',
        'poor': '/pʊr/',
        
        // 科技词汇
        'computer': '/kəmˈpjuː.tər/',
        'phone': '/foʊn/',
        'internet': '/ˈɪn.tər.net/',
        'email': '/ˈiː.meɪl/',
        'website': '/ˈweb.saɪt/',
        'software': '/ˈsɔːft.wer/',
        'hardware': '/ˈhɑːrd.wer/',
        'program': '/ˈproʊ.ɡræm/',
        'data': '/ˈdeɪ.tə/',
        'file': '/faɪl/',
        'system': '/ˈsɪs.təm/',
        'network': '/ˈnet.wɜːrk/',
        'application': '/ˌæp.lɪˈkeɪ.ʃən/',
        'technology': '/tekˈnɑː.lə.dʒi/',
        'digital': '/ˈdɪdʒ.ɪ.təl/',
        'online': '/ˈɑːn.laɪn/',
        'download': '/ˈdaʊn.loʊd/',
        'upload': '/ˈʌp.loʊd/',
        'screen': '/skriːn/',
        'keyboard': '/ˈkiː.bɔːrd/',
        'mouse': '/maʊs/',
        'button': '/ˈbʌt.ən/',
        'click': '/klɪk/',
        
        // 学习词汇
        'education': '/ˌedʒ.ʊˈkeɪ.ʃən/',
        'knowledge': '/ˈnɑː.lɪdʒ/',
        'lesson': '/ˈles.ən/',
        'class': '/klæs/',
        'course': '/kɔːrs/',
        'test': '/test/',
        'exam': '/ɪɡˈzæm/',
        'grade': '/ɡreɪd/',
        'homework': '/ˈhoʊm.wɜːrk/',
        'question': '/ˈkwes.tʃən/',
        'answer': '/ˈæn.sər/',
        'practice': '/ˈpræk.tɪs/',
        'college': '/ˈkɑː.lɪdʒ/',
        'university': '/ˌjuː.nɪˈvɜːr.sə.ti/',
        'degree': '/dɪˈɡriː/',
        
        // 工作商务
        'job': '/dʒɑːb/',
        'business': '/ˈbɪz.nəs/',
        'company': '/ˈkʌm.pə.ni/',
        'project': '/ˈprɑː.dʒekt/',
        'meeting': '/ˈmiː.tɪŋ/',
        'manager': '/ˈmæn.ɪ.dʒər/',
        'employee': '/ɪmˈplɔɪ.iː/',
        'boss': '/bɔːs/',
        'salary': '/ˈsæl.ə.ri/',
        'money': '/ˈmʌn.i/',
        'price': '/praɪs/',
        'cost': '/kɔːst/',
        'market': '/ˈmɑːr.kɪt/',
        'customer': '/ˈkʌs.tə.mər/',
        'service': '/ˈsɜːr.vɪs/',
        'product': '/ˈprɑː.dʌkt/',
        
        // 其他常用
        'thing': '/θɪŋ/',
        'part': '/pɑːrt/',
        'problem': '/ˈprɑː.bləm/',
        'fact': '/fækt/',
        'case': '/keɪs/',
        'point': '/pɔɪnt/',
        'information': '/ˌɪn.fərˈmeɪ.ʃən/',
        'example': '/ɪɡˈzæm.pəl/',
        'reason': '/ˈriː.zən/',
        'idea': '/aɪˈdiː.ə/',
        'story': '/ˈstɔːr.i/',
        'result': '/rɪˈzʌlt/',
        'life': '/laɪf/',
        'way': '/weɪ/',
        'area': '/ˈer.i.ə/',
        'power': '/ˈpaʊ.ər/',
        'end': '/end/',
        'number': '/ˈnʌm.bər/',
        'word': '/wɜːrd/',
        'name': '/neɪm/',
        'place': '/pleɪs/',
        'color': '/ˈkʌl.ər/',
        'sound': '/saʊnd/',
        'picture': '/ˈpɪk.tʃər/',
        'language': '/ˈlæŋ.ɡwɪdʒ/',
        'experience': '/ɪkˈspɪr.i.əns/',
        'level': '/ˈlev.əl/',
        'attention': '/əˈten.ʃən/',
        'interest': '/ˈɪn.trəst/',
        'success': '/səkˈses/',
        'failure': '/ˈfeɪl.jər/',
        
        // 身体部位
        'hand': '/hænd/',
        'head': '/hed/',
        'eye': '/aɪ/',
        'ear': '/ɪr/',
        'nose': '/noʊz/',
        'mouth': '/maʊθ/',
        'face': '/feɪs/',
        'hair': '/her/',
        'body': '/ˈbɑː.di/',
        'foot': '/fʊt/',
        'feet': '/fiːt/',
        'leg': '/leɡ/',
        'arm': '/ɑːrm/',
        'finger': '/ˈfɪŋ.ɡər/',
        'heart': '/hɑːrt/',
        'back': '/bæk/',
        'neck': '/nek/',
        
        // 食物饮料
        'rice': '/raɪs/',
        'bread': '/bred/',
        'meat': '/miːt/',
        'fish': '/fɪʃ/',
        'chicken': '/ˈtʃɪk.ɪn/',
        'egg': '/eɡ/',
        'milk': '/mɪlk/',
        'tea': '/tiː/',
        'coffee': '/ˈkɔː.fi/',
        'juice': '/dʒuːs/',
        'vegetable': '/ˈvedʒ.tə.bəl/',
        'fruit': '/fruːt/',
        'banana': '/bəˈnæn.ə/',
        'sugar': '/ˈʃʊɡ.ər/',
        'salt': '/sɔːlt/',
        'cake': '/keɪk/',
        'soup': '/suːp/',
        
        // 特殊词汇
        'clothes': '/kloʊðz/',
        'shoes': '/ʃuːz/',
        'paper': '/ˈpeɪ.pər/',
        'pen': '/pen/',
        'pencil': '/ˈpen.səl/',
        'bag': '/bæɡ/',
        'box': '/bɑːks/',
        'table': '/ˈteɪ.bəl/',
        'chair': '/tʃer/',
        'bed': '/bed/',
        'clock': '/klɑːk/',
        'key': '/kiː/',
        'bottle': '/ˈbɑː.təl/',
        'cup': '/kʌp/',
        'glass': '/ɡlæs/',
        'plate': '/pleɪt/',
        'knife': '/naɪf/',
        'fork': '/fɔːrk/',
        'spoon': '/spuːn/',
        
        // 特定词汇
        'victory': '/ˈvɪk.tə.ri/',
        'celebrate': '/ˈsel.ə.breɪt/',
        'achieve': '/əˈtʃiːv/',
        'goal': '/ɡoʊl/',
        'dream': '/driːm/',
        'wish': '/wɪʃ/',
        'future': '/ˈfjuː.tʃər/',
        'past': '/pæst/',
        'present': '/ˈprez.ənt/',
        'history': '/ˈhɪs.tə.ri/',
        'culture': '/ˈkʌl.tʃər/',
        'nature': '/ˈneɪ.tʃər/',
        'environment': '/ɪnˈvaɪ.rən.mənt/',
        'health': '/helθ/',
        'medicine': '/ˈmed.ɪ.sən/',
        'sick': '/sɪk/',
        'pain': '/peɪn/',
        'smile': '/smaɪl/',
        'laugh': '/læf/',
        'cry': '/kraɪ/',
        'enjoy': '/ɪnˈdʒɔɪ/',
        'fun': '/fʌn/',
        'game': '/ɡeɪm/',
        'music': '/ˈmjuː.zɪk/',
        'song': '/sɔːŋ/',
        'movie': '/ˈmuː.vi/',
        'photo': '/ˈfoʊ.toʊ/',
        'art': '/ɑːrt/',
        'sport': '/spɔːrt/',
        'exercise': '/ˈek.sər.saɪz/',
        'travel': '/ˈtræv.əl/',
        'trip': '/trɪp/',
        'visit': '/ˈvɪz.ɪt/',
        'holiday': '/ˈhɑː.lə.deɪ/',
        'vacation': '/veɪˈkeɪ.ʃən/',
        'weather': '/ˈweð.ər/',
        'sun': '/sʌn/',
        'moon': '/muːn/',
        'star': '/stɑːr/',
        'sky': '/skaɪ/',
        'cloud': '/klaʊd/',
        'rain': '/reɪn/',
        'snow': '/snoʊ/',
        'wind': '/wɪnd/',
        'fire': '/faɪr/',
        'air': '/er/',
        'earth': '/ɜːrθ/',
        'mountain': '/ˈmaʊn.tən/',
        'river': '/ˈrɪv.ər/',
        'sea': '/siː/',
        'ocean': '/ˈoʊ.ʃən/',
        'lake': '/leɪk/',
        'beach': '/biːtʃ/',
        'island': '/ˈaɪ.lənd/',
        'forest': '/ˈfɔːr.ɪst/',
        'animal': '/ˈæn.ɪ.məl/',
        'bird': '/bɜːrd/',
        'tiger': '/ˈtaɪ.ɡər/',
        'lion': '/ˈlaɪ.ən/',
        'elephant': '/ˈel.ɪ.fənt/',
        'horse': '/hɔːrs/',
        'sheep': '/ʃiːp/',
        'pig': '/pɪɡ/',
        'cow': '/kaʊ/',
        'insect': '/ˈɪn.sekt/',
        'bug': '/bʌɡ/',
        'butterfly': '/ˈbʌt.ər.flaɪ/'
      }
      
      const lowerTerm = term.toLowerCase()
      if (commonIPAs[lowerTerm]) {
        console.log(`📚 使用内置音标库: ${lowerTerm} -> ${commonIPAs[lowerTerm]}`)
        return commonIPAs[lowerTerm]
      }
      
      return null
    } catch (error) {
      return null
    }
  })()
  
  // 并行请求：翻译、字典、聚合服务（优先 /api/phonetics，其次 /api/ipa）
  const aggregatedIPAPromise = (async (): Promise<{ ipa?: string; audios?: string[] }|undefined> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      // 1) /api/phonetics 返回 phonetics 数组
      const r = await fetch(`/api/phonetics?word=${encodeURIComponent(term)}`, { signal: controller.signal })
      clearTimeout(timeout)
      if (r.ok) {
        const j = await r.json()
        const phs = Array.isArray(j?.phonetics) ? j.phonetics : []
        const first = phs.find((p: any) => p?.text)
        if (first) {
          const audios = phs.map((p: any) => p?.audio).filter(Boolean)
          return { ipa: first.text, audios }
        }
      }
    } catch {}
    // 2) 退回 /api/ipa（只取一个 IPA）
    try {
      const r2 = await fetch(`/api/ipa?q=${encodeURIComponent(term)}`)
      if (r2.ok) {
        const j2 = await r2.json()
        return { ipa: j2?.ipa, audios: j2?.audios || [] }
      }
    } catch {}
    return undefined
  })()

  const [translation, entry, aggregated] = await Promise.all([
    translationPromise,
    dictionaryPromise,
    aggregatedIPAPromise
  ])
  
  // 如果字典API没有数据，尝试使用备用音标
  if (!entry || (Array.isArray(entry) && entry.length === 0)) {
    if (aggregated?.ipa) {
      console.log(`✅ 使用聚合接口音标（含有道/字典源）`)
      return {
        ...translation,
        ipa: aggregated.ipa,
        americanIPA: aggregated.ipa,
        britishIPA: undefined,
        americanAudio: aggregated.audios?.[0],
        britishAudio: aggregated.audios?.[1] || aggregated.audios?.[0],
        audios: aggregated.audios || [],
        meanings: [],
        examples: []
      }
    }
    console.log(`⚠️ 字典API无数据且无备用音标，返回翻译结果`)
    return translation
  }
  
  // 有字典数据，继续处理音标
  try {
    // 统一从 entries 数组提取音标与音频，并做去重
    const entries = Array.isArray(entry) ? entry : [entry]
    const phon = entries
      .flatMap((e: any) => Array.isArray(e?.phonetics) ? e.phonetics : [])
      .filter(Boolean)
    
    // 提取顶层 phonetic 字段作为兜底
    const topLevelPhonetics = entries
      .map((e: any) => e?.phonetic)
      .filter((p): p is string => typeof p === 'string' && p.length > 0)
    
    console.log(`📖 phonetics数量: ${phon.length}, 顶层phonetic: ${topLevelPhonetics.length}`)
    
    let americanIPA = ''
    let britishIPA = ''
    let americanAudio = ''
    let britishAudio = ''
    
    const audios = Array.from(new Set(phon.map((p: any) => p.audio).filter(Boolean)))
    
    phon.forEach((p: any) => {
      if (p.text) {
        console.log(`  🔤 发现音标: ${p.text}`)
        const ipaText = p.text.toLowerCase()
        const isAmerican = ipaText.includes('ɚ') || ipaText.includes('ɝ') || ipaText.includes('ɜr')
        const isBritish = ipaText.includes('ɑː') || ipaText.includes('ɔː') || ipaText.includes('ɜː')
        
        if (isAmerican && !isBritish) {
          americanIPA = p.text
          console.log(`  🇺🇸 识别为美式音标: ${p.text}`)
        } else if (isBritish && !isAmerican) {
          britishIPA = p.text
          console.log(`  🇬🇧 识别为英式音标: ${p.text}`)
        } else if (!americanIPA && !britishIPA) {
          americanIPA = p.text
          console.log(`  📝 使用为默认音标: ${p.text}`)
        }
      }
      if (p.audio) {
        if (p.audio.includes('us') || p.audio.includes('american')) {
          americanAudio = p.audio
        } else if (p.audio.includes('uk') || p.audio.includes('british')) {
          britishAudio = p.audio
        }
      }
    })
    
    console.log(`✅ 音标提取结果:`)
    console.log(`  - 美式音标: ${americanIPA || '无'}`)
    console.log(`  - 英式音标: ${britishIPA || '无'}`)
    
    if (!americanAudio && !britishAudio && audios.length > 0) {
      if (audios.length >= 2) {
        americanAudio = audios[0]
        britishAudio = audios[1]
      } else {
        americanAudio = audios[0]
        britishAudio = audios[0]
      }
    }
    
    // 优先使用识别的美式/英式音标，然后 phonetics 数组，最后回退到顶层 phonetic
    const phoneticsIpa = phon.find((p: any) => p.text)?.text
    const topLevelIpa = topLevelPhonetics.length > 0 ? topLevelPhonetics[0] : undefined
    const ipa = americanIPA || britishIPA || phoneticsIpa || topLevelIpa || aggregated?.ipa
    
    console.log(`🔤 音标: ${ipa || '无'} (来源: ${americanIPA ? '美式' : britishIPA ? '英式' : phoneticsIpa ? 'phonetics' : topLevelIpa ? '顶层' : aggregated?.ipa ? '聚合接口' : '无'})`)
    
    const meanings: string[] = []
    const examples: string[] = []
    
    // 从所有条目提取释义和例句
    entries.forEach((e: any) => {
      if(e?.meanings) {
        e.meanings.forEach((meaning: any) => {
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
    })
    
    // 合并翻译结果和字典结果
    let chineseMeaning = translation.chineseMeaning || ''
    
    if (!chineseMeaning && meanings && meanings.length > 0) {
      chineseMeaning = meanings[0]
    }
    
    console.log(`✅ 返回完整结果（含音标）`)
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
  } catch (error) {
    console.error('❌ 处理字典数据时出错:', error)
    console.log('⚠️ 返回翻译结果（不含音标）')
    return translation
  }
}

// 百度翻译API配置
const BAIDU_CONFIG = {
  appId: '20251012002473655',
  secret: '16y2hJESHVKdIjHMKWWK',
  apiUrl: '/api/baidu/api/trans/vip/translate',
  timeout: 10000,
  maxRetries: 2
}

// 百度翻译错误码映射
const BAIDU_ERROR_MESSAGES: Record<string, string> = {
  '52000': '翻译成功',
  '52001': 'API请求超时，请重试',
  '52002': '系统错误，请重试',
  '52003': '未授权用户，请检查APP ID',
  '54000': '必填参数为空，请检查',
  '54001': '签名错误，请检查密钥',
  '54003': '访问频率受限，请稍后重试',
  '54004': '账户余额不足',
  '54005': '长query请求频繁',
  '58000': '客户端IP非法',
  '58001': '译文语言方向不支持',
  '58002': '服务当前已关闭',
  '90107': '认证未通过或未生效'
}

// 内置词典（常用词汇，无需API调用）
const BUILTIN_DICT: Record<string, string> = {
      // 基础词汇
  'bar': '酒吧，条，杆，栏杆',
      'apple': '苹果',
      'water': '水',
      'hello': '你好',
      'good': '好的',
      'bad': '坏的',
      'big': '大的',
      'small': '小的',
      'cat': '猫',
      'dog': '狗',
      'book': '书',
      'car': '汽车',
      'house': '房子',
  'dock': '码头，船坞',
      
      // 常用动词
  'evaluate': '评估，评价',
  'create': '创建，创造',
      'delete': '删除',
      'update': '更新',
      'save': '保存',
      'load': '加载',
      'start': '开始',
      'stop': '停止',
      'run': '运行',
  'walk': '走路',
  'talk': '说话',
  'think': '思考',
  'know': '知道',
  'want': '想要',
  'like': '喜欢',
  'love': '爱',
  'make': '制作',
  'give': '给予',
  'take': '拿取',
  'come': '来',
  'go': '去',
  'see': '看见',
  'hear': '听见',
  
  // 科技词汇
  'computer': '计算机，电脑',
  'phone': '电话',
  'internet': '互联网',
  'software': '软件',
  'hardware': '硬件',
  'program': '程序',
  'data': '数据',
  'file': '文件',
  'system': '系统',
  
  // 时间词汇
  'world': '世界',
  'time': '时间',
  'day': '天，日子',
  'night': '夜晚',
  'year': '年',
  'month': '月',
  'week': '周',
  'hour': '小时',
  'minute': '分钟',
  'second': '秒',
  'today': '今天',
  'tomorrow': '明天',
  'yesterday': '昨天',
  
  // 生活词汇
  'food': '食物',
  'tree': '树',
  'flower': '花',
  'happy': '快乐的，幸福的',
  'sad': '悲伤的',
  'beautiful': '美丽的',
  'man': '男人',
  'woman': '女人',
  'people': '人们',
  'friend': '朋友',
  'family': '家庭',
  'home': '家',
  'school': '学校',
  'work': '工作',
  'money': '钱',
  'life': '生活，生命',
      
      // 常用形容词
      'new': '新的',
      'old': '旧的',
  'young': '年轻的',
  'fast': '快的',
      'slow': '慢的',
      'easy': '容易的',
      'hard': '困难的',
  'hot': '热的',
  'cold': '冷的',
  'long': '长的',
  'short': '短的'
}

// 调用百度翻译API（带重试机制）
async function callBaiduTranslate(
  text: string, 
  from: string = 'en', 
  to: string = 'zh',
  retryCount: number = 0
): Promise<{success: boolean; result?: string; error?: string}> {
  
  try {
    console.log(`🔄 调用百度翻译API [第${retryCount + 1}次]: "${text}" (${from} → ${to})`)
    
    const salt = Date.now().toString()
    const signStr = BAIDU_CONFIG.appId + text + salt + BAIDU_CONFIG.secret
    const sign = md5(signStr)
    
    console.log('📝 签名信息:')
    console.log('  - APP ID:', BAIDU_CONFIG.appId)
    console.log('  - 查询文本:', text)
    console.log('  - Salt:', salt)
    console.log('  - 签名字符串:', signStr)
    console.log('  - MD5签名:', sign)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), BAIDU_CONFIG.timeout)
    
    const response = await fetch(BAIDU_CONFIG.apiUrl, {
                method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
                body: new URLSearchParams({
        q: text,
        from: from,
        to: to,
        appid: BAIDU_CONFIG.appId,
                  salt: salt,
                  sign: sign
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    // 检查HTTP状态码
    if (!response.ok) {
      console.error(`❌ HTTP错误: ${response.status} ${response.statusText}`)
      
      // 如果是5xx错误且还有重试次数，则重试
      if (response.status >= 500 && retryCount < BAIDU_CONFIG.maxRetries) {
        console.log(`⏳ 服务器错误，${1}秒后重试...`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return await callBaiduTranslate(text, from, to, retryCount + 1)
      }
      
      return { 
        success: false, 
        error: `网络错误 ${response.status}` 
      }
    }
    
    // 解析响应
    const data = await response.json()
    console.log('📨 百度翻译API响应:', data)
    
    // 检查API错误码
    if (data.error_code) {
      const errorMsg = BAIDU_ERROR_MESSAGES[data.error_code] || data.error_msg || '未知错误'
      console.error(`❌ 百度翻译API错误 [${data.error_code}]: ${errorMsg}`)
      
      // 如果是频率限制且还有重试次数，则等待后重试
      if (data.error_code === '54003' && retryCount < BAIDU_CONFIG.maxRetries) {
        console.log(`⏳ 频率限制，${2}秒后重试...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        return await callBaiduTranslate(text, from, to, retryCount + 1)
      }
      
      return { 
        success: false, 
        error: errorMsg 
      }
    }
    
    // 提取翻译结果
    if (data.trans_result && data.trans_result.length > 0) {
      const result = data.trans_result[0].dst.trim()
      console.log(`✅ 翻译成功: "${text}" → "${result}"`)
      return { 
        success: true, 
        result: result 
      }
    }
    
    // 未知响应格式
    console.error('❌ 响应格式异常:', data)
    return { 
      success: false, 
      error: '响应格式错误' 
    }
    
  } catch (error: any) {
    // 超时错误
    if (error.name === 'AbortError') {
      console.error('❌ 请求超时')
      
      // 如果还有重试次数，则重试
      if (retryCount < BAIDU_CONFIG.maxRetries) {
        console.log(`⏳ 超时重试...`)
        return await callBaiduTranslate(text, from, to, retryCount + 1)
      }
      
      return { 
        success: false, 
        error: '请求超时，请检查网络' 
      }
    }
    
    // 其他错误
    console.error('❌ 请求失败:', error)
    return { 
      success: false, 
      error: error.message || '网络连接失败' 
    }
  }
}

// 获取中文翻译（英文 → 中文，支持多词性）
async function getChineseTranslationOnly(term: string): Promise<{
  chineseMeaning?: string;
}> {
  // 1. 首先检查内置词典
  const lowerTerm = term.toLowerCase()
  if (BUILTIN_DICT[lowerTerm]) {
    console.log(`✓ 使用内置词典: "${term}" → "${BUILTIN_DICT[lowerTerm]}"`)
    return { chineseMeaning: BUILTIN_DICT[lowerTerm] }
  }
  
  // 2. 使用多个查询策略获取不同词性的翻译
  console.log(`🌐 单词 "${term}" 不在内置词典中，使用多词性策略查询...`)
  
  const strategies = [
    { 
      query: term, 
      label: '通用', 
      context: 'direct',
      description: '直接翻译单词'
    },
    { 
      query: `to ${term}`, 
      label: '动词(v.)', 
      context: 'verb',
      description: '动词不定式形式'
    },
    { 
      query: `${term} something`, 
      label: '动词(v.)', 
      context: 'verb_obj',
      description: '及物动词形式'
    },
    { 
      query: `the ${term}`, 
      label: '名词(n.)', 
      context: 'noun',
      description: '名词形式'
    },
    { 
      query: `very ${term}`, 
      label: '形容词(adj.)', 
      context: 'adjective',
      description: '形容词修饰'
    },
    { 
      query: `${term}ly`, 
      label: '副词(adv.)', 
      context: 'adverb',
      description: '副词形式'
    }
  ]
  
  const results: Array<{label: string; meaning: string; context: string}> = []
  
  // 逐个尝试不同策略
  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i]
    
    try {
      console.log(`  📌 策略${i + 1}: ${strategy.description} - "${strategy.query}"`)
      
      const result = await callBaiduTranslate(strategy.query, 'en', 'zh', 0)
      
      if (result.success && result.result) {
        let extractedMeaning = result.result
        
        // 根据不同策略提取核心词义
        if (strategy.context === 'verb') {
          // "去评估" → "评估"，"到沙子" → "用沙覆盖"
          extractedMeaning = extractedMeaning
            .replace(/^去|^到|^来/g, '')
            .replace(/之类$/g, '')
            .trim()
        } else if (strategy.context === 'verb_obj') {
          // "评估某事" → "评估"
          const words = extractedMeaning.split(/某物|某事|什么|东西|事情/)
          if (words.length > 0 && words[0].length >= 2) {
            extractedMeaning = words[0].trim()
          }
        } else if (strategy.context === 'noun') {
          // "这个评价" → "评价"，"沙子" → "沙子"
          extractedMeaning = extractedMeaning
            .replace(/^这个|^那个|^一个|^这|^那/g, '')
            .trim()
        } else if (strategy.context === 'adjective') {
          // "很好" → "好"，"非常沙" → "沙质的"
          extractedMeaning = extractedMeaning
            .replace(/^很|^非常|^十分/g, '')
            .replace(/在西$|之类$/g, '')
            .trim()
        } else if (strategy.context === 'adverb') {
          // "快速地" → "快速地"（保留）
          // 但要移除明显错误的翻译
          if (extractedMeaning.length > 10 || !extractedMeaning.includes('地')) {
            // 如果太长或不是副词形式，可能是翻译错误
            continue // 跳过这个结果
          }
        }
        
        // 清理多余的标点和空格
        extractedMeaning = extractedMeaning
          .replace(/，$|。$|的$|！$|？$/g, '')
          .replace(/\s+/g, '')
          .trim()
        
        // 验证：必须包含中文，长度合理，且不等于原词
        const isValid = extractedMeaning.length >= 1 && 
                       extractedMeaning.length <= 30 &&
                       /[\u4e00-\u9fff]/.test(extractedMeaning) &&
                       extractedMeaning.toLowerCase() !== term.toLowerCase()
        
        if (isValid) {
          results.push({
            label: strategy.label,
            meaning: extractedMeaning,
            context: strategy.context
          })
          console.log(`    ✓ 成功: ${strategy.label} ${extractedMeaning}`)
              } else {
          console.log(`    ⊘ 跳过无效结果: "${extractedMeaning}"`)
        }
      }
      
      // 避免API频率限制，策略间延迟200ms
      if (i < strategies.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
    } catch (error) {
      console.log(`    ✗ 策略失败:`, error)
    }
  }
  
  // 按词性分组并去重
  if (results.length > 0) {
    const grouped: Record<string, Set<string>> = {}
    
    results.forEach(item => {
      if (!grouped[item.label]) {
        grouped[item.label] = new Set()
      }
      grouped[item.label].add(item.meaning)
    })
    
    // 构建最终释义
    const finalParts: string[] = []
    
    // 按优先级排序：通用 > 动词 > 名词 > 形容词 > 副词
    const order = ['通用', '动词(v.)', '名词(n.)', '形容词(adj.)', '副词(adv.)']
    
    order.forEach(label => {
      if (grouped[label] && grouped[label].size > 0) {
        const meanings = Array.from(grouped[label])
        finalParts.push(`${label === '通用' ? '' : label + ' '}${meanings.join('，')}`)
      }
    })
    
    const chineseMeaning = finalParts.join('；')
    console.log(`✅ 多词性翻译完成: ${chineseMeaning}`)
    
    return { chineseMeaning }
  }
  
  // 如果所有策略都失败，返回错误提示
  console.error('❌ 所有翻译策略都失败了')
  return { chineseMeaning: '翻译失败，请手动输入' }
}
