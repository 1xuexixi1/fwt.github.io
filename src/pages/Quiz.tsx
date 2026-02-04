import { useEffect, useMemo, useState, useRef } from 'react'
import { useStore } from '../store'
import { pickNextWord, judgeAnswer, applyProficiency, getAllChineseMeanings } from '../lib/quiz'
import TTSPlayer from '../components/TTSPlayer'
import type { Word } from '../types'

interface WordQueueItem {
  word: Word
  remainingTimes: number
  errorCount: number
}

export default function Quiz(){
  const { words, wordbooks, updateWord, settings, setSettings, seedIfEmpty } = useStore()
  const [currentId, setCurrentId] = useState<string|undefined>()
  const [input, setInput] = useState('')
  const [result, setResult] = useState<null|boolean>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const [useSequentialMode, setUseSequentialMode] = useState(false)
  const [wordQueue, setWordQueue] = useState<WordQueueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [correctAttempts, setCorrectAttempts] = useState(0)

  useEffect(()=>{ seedIfEmpty() }, [])
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // 根据选择的单词本过滤单词
  const currentWords = useMemo(() => {
    if (!settings.currentWordbookId) {
      // 如果没有选择特定单词本，使用所有单词
      return words
    }
    return words.filter(w => w.wordbookId === settings.currentWordbookId)
  }, [words, settings.currentWordbookId])

  const current = useMemo(()=> {
    if (useSequentialMode && wordQueue.length > 0 && currentIndex < wordQueue.length) {
      return wordQueue[currentIndex].word
    }
    return words.find(w=> w.id===currentId)
  }, [words, currentId, useSequentialMode, wordQueue, currentIndex])

  // 初始化单词队列（顺序模式）
  const initWordQueue = () => {
    const queue: WordQueueItem[] = []
    currentWords.forEach(word => {
      queue.push({
        word: word,
        remainingTimes: 2,
        errorCount: 0
      })
    })
    setWordQueue(queue)
    setCurrentIndex(0)
    setTotalAttempts(0)
    setCorrectAttempts(0)
    console.log(`📋 Quiz顺序模式: ${currentWords.length} 个单词，共 ${queue.length} 题`)
  }

  // 保存进度
  const saveProgress = () => {
    if (!useSequentialMode || !settings.currentWordbookId) return
    
    const progress = {
      wordbookId: settings.currentWordbookId,
      currentIndex: currentIndex,
      wordQueue: wordQueue.map(item => ({
        wordId: item.word.id,
        remainingTimes: item.remainingTimes,
        errorCount: item.errorCount
      })),
      totalAttempts: totalAttempts,
      correctAttempts: correctAttempts
    }
    
    setSettings({ quizProgress: progress })
    console.log('💾 进度已保存')
  }

  // 恢复进度
  const loadProgress = () => {
    if (!settings.quizProgress || !settings.currentWordbookId) return false
    
    const progress = settings.quizProgress
    
    // 检查是否是同一个单词本
    if (progress.wordbookId !== settings.currentWordbookId) {
      console.log('⚠️ 单词本已切换，不恢复进度')
      return false
    }
    
    try {
      // 重建队列
      const queue: WordQueueItem[] = progress.wordQueue.map(item => {
        const word = words.find(w => w.id === item.wordId)
        if (!word) throw new Error('单词不存在')
        return {
          word: word,
          remainingTimes: item.remainingTimes,
          errorCount: item.errorCount
        }
      })
      
      setWordQueue(queue)
      setCurrentIndex(progress.currentIndex)
      setTotalAttempts(progress.totalAttempts)
      setCorrectAttempts(progress.correctAttempts)
      
      console.log('✅ 进度已恢复')
      return true
    } catch (error) {
      console.error('❌ 恢复进度失败:', error)
      return false
    }
  }

  // 清空进度
  const clearProgress = () => {
    if (confirm('确定要清空进度吗？')) {
      setSettings({ quizProgress: undefined })
      setWordQueue([])
      setCurrentIndex(0)
      setTotalAttempts(0)
      setCorrectAttempts(0)
      setResult(null)
      setInput('')
      console.log('🗑️ 进度已清空')
      alert('✅ 进度已清空')
    }
  }

  // 顺序模式初始化（尝试恢复进度）
  useEffect(() => {
    if (useSequentialMode && currentWords.length > 0) {
      // 尝试恢复进度
      const restored = loadProgress()
      if (!restored) {
        // 没有进度或恢复失败，初始化新队列
        initWordQueue()
      }
    }
  }, [useSequentialMode, currentWords.length])

  // 自动保存进度
  useEffect(() => {
    if (useSequentialMode && wordQueue.length > 0) {
      saveProgress()
    }
  }, [currentIndex, wordQueue, totalAttempts, correctAttempts])

  useEffect(()=>{
    if(!current && !useSequentialMode){
      const next = pickNextWord(currentWords, settings.quizOrder)
      setCurrentId(next?.id)
      setResult(null)
      setInput('')
    }
  }, [currentWords, current, settings.quizOrder, useSequentialMode])

  if(!current) return (
    <div className="text-center py-2">
      <div className="text-gray-500 mb-1">
        {currentWords.length === 0 ? (
          <div>
            <p className="text-xs">当前单词本中没有单词</p>
            <p className="text-xs mt-0.5">请先在 <b>单词本</b> 页面添加单词</p>
          </div>
        ) : (
          <div>
            <p className="text-xs">请先在 <b>单词本</b> 页面添加单词</p>
          </div>
        )}
      </div>
    </div>
  )

  const mode = settings.quizMode
  const question = mode==='zh_to_en' ? current.meaningZh : current.term
  const answer = mode==='zh_to_en' ? current.term : current.meaningZh

  const submit = () => {
    const ok = judgeAnswer(input, current, mode)
    setResult(ok)
    const patched = applyProficiency(current, ok)
    updateWord(current.id, patched)
    
    // 统计
    setTotalAttempts(prev => prev + 1)
    if (ok) {
      setCorrectAttempts(prev => prev + 1)
    }
    
    // 顺序模式：答错后将单词加到队列末尾
    if (useSequentialMode && !ok) {
      setWordQueue(prev => {
        const newQueue = [...prev]
        const currentItem = newQueue[currentIndex]
        
        // 在队列末尾添加这个单词2次
        newQueue.push({
          word: currentItem.word,
          remainingTimes: 2,
          errorCount: currentItem.errorCount + 1
        })
        newQueue.push({
          word: currentItem.word,
          remainingTimes: 2,
          errorCount: currentItem.errorCount + 1
        })
        
        console.log(`❌ 答错: ${current.term}，已加到队列末尾（再练2次）`)
        console.log(`📊 队列更新: ${prev.length} -> ${newQueue.length}`)
        
        return newQueue
      })
    }
    
    // 清除之前的倒计时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    // 如果答对了，立即进入下一题
    if (ok) {
      setTimeout(() => {
        next()
      }, 500) // 500ms后自动下一题，让用户看到正确提示
    }
  }

  const next = () => {
    // 清除倒计时
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setCountdown(null)
    
    if (useSequentialMode) {
      const nextIndex = currentIndex + 1
      if (nextIndex >= wordQueue.length) {
        // 完成所有练习
        const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0
        alert(`🎉 恭喜完成所有练习！\n\n正确率: ${accuracy}%\n总题数: ${totalAttempts}\n正确: ${correctAttempts}`)
        // 重置
        setUseSequentialMode(false)
        setWordQueue([])
        setCurrentIndex(0)
        setResult(null)
        setInput('')
        return
      }
      setCurrentIndex(nextIndex)
      setResult(null)
      setInput('')
      console.log(`✅ 进度: ${nextIndex + 1}/${wordQueue.length}`)
    } else {
      const nxt = pickNextWord(currentWords, settings.quizOrder)
      setCurrentId(nxt?.id)
      setResult(null)
      setInput('')
    }
  }

  return (
    <div className="space-y-1">
      {/* 顺序模式开关 */}
      <div className="bg-blue-50 border border-blue-200 rounded p-0.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-0.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={useSequentialMode}
              onChange={(e) => {
                setUseSequentialMode(e.target.checked)
                if (e.target.checked) {
                  initWordQueue()
                } else {
                  setWordQueue([])
                  setCurrentIndex(0)
                  setTotalAttempts(0)
                  setCorrectAttempts(0)
                  setResult(null)
                  setInput('')
                }
              }}
              className="w-3 h-3"
            />
            <span className={useSequentialMode ? 'text-blue-600 font-medium' : ''}>
              📋 顺序模式（每词2次，答错再练2次）
            </span>
            {useSequentialMode && wordQueue.length > 0 && (
              <span className="ml-2 text-blue-600">
                进度: {currentIndex}/{wordQueue.length} ({totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0}%)
              </span>
            )}
          </label>
          
          {useSequentialMode && (
            <button
              onClick={clearProgress}
              className="px-1 py-0.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
              title="清空当前进度"
            >
              🗑️ 清空进度
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <select className="border rounded px-0.5 py-0.5 text-xs" value={settings.quizMode}
          onChange={e=> setSettings({ quizMode: e.target.value as any })}>
          <option value="zh_to_en">只看中文 → 猜英文</option>
          <option value="en_to_zh">只看英文 → 猜中文</option>
        </select>
        {!useSequentialMode && (
          <label className="flex items-center gap-0.5 text-xs">
            <span>顺序</span>
            <select className="border rounded px-0.5 py-0.5 text-xs" value={settings.quizOrder}
              onChange={e=> setSettings({ quizOrder: e.target.value as any })}>
              <option value="random">随机（低熟练度优先）</option>
              <option value="sequential">顺序</option>
            </select>
          </label>
        )}
        <label className="flex items-center gap-0.5 text-xs">
          <span>单词本</span>
          <select className="border rounded px-0.5 py-0.5 text-xs" 
            value={settings.currentWordbookId || 'all'}
            onChange={e=> setSettings({ currentWordbookId: e.target.value === 'all' ? undefined : e.target.value })}>
            <option value="all">全部单词本 ({words.length}个)</option>
            {wordbooks.map(wb => {
              const wordbookWordCount = words.filter(w => w.wordbookId === wb.id).length
              return (
                <option key={wb.id} value={wb.id}>{wb.name} ({wordbookWordCount}个)</option>
              )
            })}
          </select>
        </label>
        {currentWords.length > 0 && (
          <span className="text-xs text-gray-500">
            当前: {currentWords.length}个单词
          </span>
        )}
      </div>

      <div className="p-1 border rounded bg-white/80 backdrop-blur-sm border-white/20">
        <div className="text-gray-500 text-xs mb-0.5">题目</div>
        <div className="text-sm font-semibold">{question}</div>
        {settings.showIPA && mode==='zh_to_en' && current.ipa && (
          <div className="mt-0.5 text-gray-500 text-xs">{current.ipa}</div>
        )}
      </div>

      <div className="space-y-0.5">
        <div className="flex gap-1 items-center">
          <input className="border rounded px-1 py-0.5 flex-1 text-xs" placeholder="请输入你的答案"
            value={input} onChange={e=> setInput(e.target.value)}
            onKeyDown={e=> e.key==='Enter' && submit()} />
          <button className="px-1 py-0.5 rounded bg-blue-600 text-white text-xs" onClick={submit}>提交</button>
          <button className="px-1 py-0.5 rounded border text-xs" onClick={next}>下一题</button>
        </div>
        
        {mode === 'en_to_zh' && (
          <div className="text-xs text-gray-500 bg-gray-50 p-0.5 rounded">
            💡 提示：中文匹配支持部分匹配，只要输入的中文包含在任意一个释义中就算正确
          </div>
        )}
      </div>

      {result!==null && (
        <div className={`p-1 rounded ${result? 'bg-green-50 border border-green-200':'bg-red-50 border border-red-200'}`}>
          <div className="font-semibold text-xs flex items-center justify-between">
            <span>{result? '✅ 正确':'❌ 错误'}</span>
            {result && (
              <span className="text-green-600 font-medium text-xs">
                正在进入下一题...
              </span>
            )}
          </div>
          
          {/* 显示练习状态 */}
          {current.errorCount && current.errorCount > 0 && (
            <div className="mt-0.5 text-xs">
              {result ? (
                current.correctStreak === 1 ? (
                  <div className="text-orange-600">
                    🎯 答对1次！再答对1次即可提升熟练度
                  </div>
                ) : (current.correctStreak ?? 0) >= 2 ? (
                  <div className="text-green-600">
                    🎉 连续答对2次！熟练度已提升
                  </div>
                ) : null
              ) : (
                <div className="text-red-600">
                  ⚠️ 需要连续答对2次才能提升熟练度
                </div>
              )}
            </div>
          )}
          
          {mode === 'en_to_zh' ? (
            <div className="mt-0.5 text-gray-700">
              <div className="mb-0.5 text-xs">所有可能的中文释义：</div>
              <div className="flex flex-wrap gap-0.5">
                {getAllChineseMeanings(current).map((meaning, index) => (
                  <span key={index} className="px-0.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                    {meaning}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-0.5 text-gray-700 text-xs">正确答案：<b>{answer}</b></div>
          )}
          {mode==='zh_to_en' && settings.showIPA && current.ipa && (
            <div className="text-gray-500 text-xs">{current.ipa}</div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <TTSPlayer text={current.term} repeat={settings.ttsRepeat} rate={settings.ttsRate} voiceName={settings.ttsVoiceName} />
        <label className="text-xs flex items-center gap-1">
          次数
          <input type="number" className="border rounded px-1.5 py-0.5 w-16 text-xs" min={1} max={10}
            value={settings.ttsRepeat}
            onChange={e=> setSettings({ ttsRepeat: Math.max(1, Math.min(10, Number(e.target.value)||1)) })}
          />
        </label>
        <label className="text-xs flex items-center gap-1">
          语速
          <input type="number" className="border rounded px-1.5 py-0.5 w-20 text-xs" step="0.1" min={0.5} max={1.5}
            value={settings.ttsRate}
            onChange={e=> setSettings({ ttsRate: Math.max(0.5, Math.min(1.5, Number(e.target.value)||1)) })}
          />
        </label>
      </div>
    </div>
  )
}
