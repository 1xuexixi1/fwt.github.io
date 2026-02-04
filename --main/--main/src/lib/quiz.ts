import type { Word } from '../types'

export function pickNextWord(words: Word[], order: 'random'|'sequential' = 'random'): Word | undefined {
  const pool = words.filter(w => !w.archived).sort((a,b)=> a.proficiency - b.proficiency)
  if(!pool.length) return undefined
  if(order==='sequential') return pool[0]
  const head = pool.slice(0, Math.min(pool.length, 20))
  return head[Math.floor(Math.random()*head.length)]
}

export function judgeAnswer(input: string, word: Word, mode: 'zh_to_en'|'en_to_zh'){
  const norm = (s:string)=> s.trim().toLowerCase()
  if(mode==='zh_to_en'){
    return norm(input) === norm(word.term)
  }else{
    // 更灵活的中文匹配：支持多种分隔符和部分匹配
    const meaningZh = word.meaningZh || ''
    const targets = meaningZh.split(/[；;,，、\s]+/).map(s=>norm(s)).filter(Boolean)
    
    // 检查是否匹配任意一个中文释义
    const inputNorm = norm(input)
    return targets.some(target => {
      // 完全匹配
      if (target === inputNorm) return true
      // 部分匹配（输入包含目标或目标包含输入）
      if (target.includes(inputNorm) || inputNorm.includes(target)) return true
      return false
    })
  }
}

// 获取所有可能的中文释义
export function getAllChineseMeanings(word: Word): string[] {
  if (!word.meaningZh) return []
  // 支持多种分隔符：中文逗号、英文逗号、分号、顿号、空格等
  const meanings = word.meaningZh.split(/[；;,，、\s]+/).map(s => s.trim()).filter(Boolean)
  console.log('获取中文释义:', word.meaningZh, '->', meanings)
  return meanings
}

// 新的熟练度管理系统
// 规则：错误一次后，需要连续答对2次才能提升熟练度
export function applyProficiency(w: Word, correct: boolean): Word{
  const p = w.proficiency ?? 0
  
  // 获取或初始化错误计数器和连续正确计数器
  const errorCount = (w as any).errorCount ?? 0
  const correctStreak = (w as any).correctStreak ?? 0
  
  let newProficiency = p
  let newErrorCount = errorCount
  let newCorrectStreak = correctStreak
  
  if (correct) {
    // 答对了
    newCorrectStreak += 1
    
    if (errorCount > 0) {
      // 如果之前有错误，需要连续答对2次才能提升熟练度
      if (newCorrectStreak >= 2) {
        // 连续答对2次，可以提升熟练度并清除错误记录
        newProficiency = Math.min(5, p + 1)
        newErrorCount = 0
        newCorrectStreak = 0
        console.log(`单词 ${w.term}: 连续答对2次，熟练度提升至 ${newProficiency}`)
      } else {
        console.log(`单词 ${w.term}: 答对1次，还需要再答对1次才能提升熟练度`)
      }
    } else {
      // 没有错误记录，正常提升熟练度
      newProficiency = Math.min(5, p + 1)
      newCorrectStreak = 0
      console.log(`单词 ${w.term}: 正常答对，熟练度提升至 ${newProficiency}`)
    }
  } else {
    // 答错了
    newErrorCount += 1
    newCorrectStreak = 0
    newProficiency = Math.max(0, p - 1)
    console.log(`单词 ${w.term}: 答错，熟练度降低至 ${newProficiency}，需要连续答对2次才能提升`)
  }
  
  return { 
    ...w, 
    proficiency: newProficiency,
    errorCount: newErrorCount,
    correctStreak: newCorrectStreak,
    updatedAt: Date.now() 
  }
}
