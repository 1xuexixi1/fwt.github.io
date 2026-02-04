import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store'
import type { Word } from '../types'

type PracticeMode = 'spell' | 'meaning' | 'listen' | 'mixed'
type QuestionType = 'spell' | 'meaning' | 'listen'

interface Question {
  type: QuestionType
  word: Word
  options?: string[]
  correctAnswer: string
}

interface WordQueueItem {
  word: Word
  remainingTimes: number // 剩余出现次数
  errorCount: number // 错误次数
}

export default function Practice() {
  const { words, wordbooks, settings, setSettings } = useStore()
  const currentWordbook = settings.currentWordbookId || 'all'
  const [mode, setMode] = useState<PracticeMode>('mixed')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [practicedWords, setPracticedWords] = useState<Set<string>>(new Set())
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
  const [showWordSelector, setShowWordSelector] = useState(false)
  const [wordQueue, setWordQueue] = useState<WordQueueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [useSequentialMode, setUseSequentialMode] = useState(false) // 顺序模式开关

  // 获取当前单词本的单词
  const getWordsForPractice = useCallback(() => {
    let wordsToUse = currentWordbook === 'all' 
      ? words 
      : words.filter(w => w.wordbookId === currentWordbook)
    
    // 如果有选中的单词，只使用选中的
    if (selectedWords.size > 0) {
      wordsToUse = wordsToUse.filter(w => selectedWords.has(w.id))
    }
    
    return wordsToUse
  }, [words, currentWordbook, selectedWords])

  // 初始化单词队列（顺序模式）
  const initWordQueue = useCallback(() => {
    const wordsToUse = getWordsForPractice()
    const queue: WordQueueItem[] = []
    
    // 每个单词加入队列2次
    wordsToUse.forEach(word => {
      queue.push({
        word: word,
        remainingTimes: 2,
        errorCount: 0
      })
    })
    
    setWordQueue(queue)
    setCurrentIndex(0)
    setScore(0)
    setTotalQuestions(0)
    console.log(`📋 初始化队列: ${wordsToUse.length} 个单词，共 ${queue.length} 题`)
  }, [getWordsForPractice])

  // 保存进度
  const saveProgress = useCallback(() => {
    if (!useSequentialMode || !settings.currentWordbookId) return
    
    const progress = {
      wordbookId: settings.currentWordbookId,
      currentIndex: currentIndex,
      wordQueue: wordQueue.map(item => ({
        wordId: item.word.id,
        remainingTimes: item.remainingTimes,
        errorCount: item.errorCount
      })),
      score: score,
      totalQuestions: totalQuestions
    }
    
    setSettings({ practiceProgress: progress })
  }, [useSequentialMode, settings.currentWordbookId, currentIndex, wordQueue, score, totalQuestions, setSettings])

  // 恢复进度
  const loadProgress = useCallback(() => {
    if (!settings.practiceProgress || !settings.currentWordbookId) return false
    
    const progress = settings.practiceProgress
    
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
      setScore(progress.score)
      setTotalQuestions(progress.totalQuestions)
      
      console.log('✅ Practice进度已恢复')
      return true
    } catch (error) {
      console.error('❌ 恢复进度失败:', error)
      return false
    }
  }, [settings.practiceProgress, settings.currentWordbookId, words])

  // 清空进度
  const clearProgress = () => {
    if (confirm('确定要清空进度吗？这将重新开始练习。')) {
      setSettings({ practiceProgress: undefined })
      setWordQueue([])
      setCurrentIndex(0)
      setScore(0)
      setTotalQuestions(0)
      setPracticedWords(new Set())
      setStreak(0)
      setCurrentQuestion(null)
      setShowResult(false)
      console.log('🗑️ Practice进度已清空')
      alert('✅ 进度已清空，将重新开始')
      
      // 重新初始化
      if (useSequentialMode) {
        setTimeout(() => initWordQueue(), 100)
      }
    }
  }

  // 生成选项
  const generateOptions = useCallback((correctAnswer: string, allWords: Word[], type: 'spell' | 'meaning', correctWord: Word): string[] => {
    const options = [correctAnswer]
    
    // 过滤掉当前单词，获取其他单词
    let otherWords = allWords.filter(w => w.id !== correctWord.id)
    
    // 如果是释义练习，尝试找相似长度或相似词性的单词作为干扰项
    if (type === 'meaning') {
      const correctLength = correctAnswer.length
      // 优先选择长度相近的释义（±3个字符）
      const similarWords = otherWords.filter(w => 
        Math.abs(w.meaningZh.length - correctLength) <= 3
      )
      
      // 如果有足够的相似单词，优先使用
      if (similarWords.length >= 3) {
        otherWords = similarWords
      }
    } else {
      // 拼写练习：优先选择长度相近的单词
      const correctLength = correctAnswer.length
      const similarWords = otherWords.filter(w => 
        Math.abs(w.term.length - correctLength) <= 2
      )
      
      if (similarWords.length >= 3) {
        otherWords = similarWords
      }
    }
    
    // 随机选择3个其他选项
    const shuffled = [...otherWords].sort(() => Math.random() - 0.5)
    for (let i = 0; i < shuffled.length && options.length < 4; i++) {
      const option = type === 'spell' ? shuffled[i].term : shuffled[i].meaningZh
      // 确保选项不重复（避免多个单词有相同释义）
      if (!options.includes(option)) {
        options.push(option)
      }
    }
    
    // 如果选项不足4个，补充随机选项
    if (options.length < 4) {
      for (const word of allWords) {
        if (word.id === correctWord.id) continue
        const option = type === 'spell' ? word.term : word.meaningZh
        if (!options.includes(option)) {
          options.push(option)
          if (options.length >= 4) break
        }
      }
    }
    
    // 打乱选项顺序
    return options.sort(() => Math.random() - 0.5)
  }, [])

  // 生成新问题（支持顺序和随机两种模式）
  const generateQuestion = useCallback(() => {
    const availableWords = getWordsForPractice()
    if (availableWords.length === 0) return null

    let selectedWord: Word

    // 顺序模式：从队列中取单词
    if (useSequentialMode) {
      if (currentIndex >= wordQueue.length) {
        // 队列结束，显示完成
        console.log('✅ 所有单词练习完成！')
        return null
      }
      selectedWord = wordQueue[currentIndex].word
    } else {
      // 随机模式：随机选择
      selectedWord = availableWords[Math.floor(Math.random() * availableWords.length)]
    }
    
    // 确定问题类型
    let questionType: QuestionType
    if (mode === 'mixed') {
      const types: QuestionType[] = ['spell', 'meaning', 'listen']
      questionType = types[Math.floor(Math.random() * types.length)]
    } else if (mode === 'spell') {
      questionType = 'spell'
    } else if (mode === 'meaning') {
      questionType = 'meaning'
    } else {
      questionType = 'listen'
    }

    // 生成问题
    let question: Question
    switch (questionType) {
      case 'spell':
        question = {
          type: 'spell',
          word: selectedWord,
          options: generateOptions(selectedWord.term, availableWords, 'spell', selectedWord),
          correctAnswer: selectedWord.term
        }
        break
      case 'meaning':
        question = {
          type: 'meaning',
          word: selectedWord,
          options: generateOptions(selectedWord.meaningZh, availableWords, 'meaning', selectedWord),
          correctAnswer: selectedWord.meaningZh
        }
        break
      case 'listen':
        question = {
          type: 'listen',
          word: selectedWord,
          options: generateOptions(selectedWord.term, availableWords, 'spell', selectedWord),
          correctAnswer: selectedWord.term
        }
        break
    }

    return question
  }, [mode, getWordsForPractice, generateOptions, useSequentialMode, wordQueue, currentIndex])

  // 开始新问题
  const nextQuestion = useCallback(() => {
    // 顺序模式：移动到下一个
    if (useSequentialMode) {
      setCurrentIndex(prev => prev + 1)
    }
    
    const question = generateQuestion()
    
    if (!question) {
      // 练习完成
      alert(`🎉 恭喜完成所有练习！\n\n正确率: ${totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0}%\n总题数: ${totalQuestions}\n正确: ${score}`)
      return
    }
    
    setCurrentQuestion(question)
    setUserAnswer('')
    setShowResult(false)
    setIsCorrect(false)
  }, [generateQuestion, useSequentialMode, totalQuestions, score])

  // 检查答案
  const checkAnswer = () => {
    if (!currentQuestion || !userAnswer) return

    const correct = userAnswer.toLowerCase().trim() === currentQuestion.correctAnswer.toLowerCase().trim()
    setIsCorrect(correct)
    setShowResult(true)
    setTotalQuestions(prev => prev + 1)
    
    if (correct) {
      setScore(prev => prev + 1)
      setStreak(prev => {
        const newStreak = prev + 1
        if (newStreak > bestStreak) {
          setBestStreak(newStreak)
        }
        return newStreak
      })
      setPracticedWords(prev => new Set([...prev, currentQuestion.word.id]))
      
      // 顺序模式：正确后移动到下一题
      if (useSequentialMode) {
        console.log(`✅ 答对: ${currentQuestion.word.term}，进度 ${currentIndex + 1}/${wordQueue.length}`)
      }
      
      // 答对后自动进入下一题
      setTimeout(() => {
        nextQuestion()
      }, 500)
    } else {
      setStreak(0)
      
      // 顺序模式：答错后，将这个单词加到队列末尾（再出现2次）
      if (useSequentialMode) {
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
          
          console.log(`❌ 答错: ${currentQuestion.word.term}，已加到队列末尾（再练2次）`)
          console.log(`📊 队列更新: ${prev.length} -> ${newQueue.length}`)
          
          return newQueue
        })
      }
    }
  }

  // 朗读单词
  const speakWord = (text: string, accent: 'US' | 'UK' = 'US') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = accent === 'US' ? 'en-US' : 'en-GB'
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  // 初始化
  useEffect(() => {
    if (words.length === 0) return
    
    if (!useSequentialMode) {
      // 随机模式：直接生成第一题
      const question = generateQuestion()
      if (question) {
        setCurrentQuestion(question)
        setUserAnswer('')
        setShowResult(false)
        setIsCorrect(false)
      }
    }
  }, [words.length, useSequentialMode])
  
  // 顺序模式：初始化队列（尝试恢复进度）
  useEffect(() => {
    if (!useSequentialMode || words.length === 0) return
    
    // 尝试恢复进度
    const restored = loadProgress()
    if (!restored) {
      // 初始化新队列
      initWordQueue()
    }
  }, [useSequentialMode, selectedWords, currentWordbook])
  
  // 自动保存进度
  useEffect(() => {
    if (useSequentialMode && wordQueue.length > 0) {
      saveProgress()
    }
  }, [currentIndex, wordQueue, score, totalQuestions, useSequentialMode, saveProgress])
  
  // 队列初始化后生成第一题
  useEffect(() => {
    if (!useSequentialMode || wordQueue.length === 0) return
    
    const question = generateQuestion()
    if (question) {
      setCurrentQuestion(question)
      setUserAnswer('')
      setShowResult(false)
      setIsCorrect(false)
    }
  }, [wordQueue])

  // 重新开始
  const restart = () => {
    setScore(0)
    setTotalQuestions(0)
    setPracticedWords(new Set())
    setStreak(0)
    
    if (useSequentialMode) {
      initWordQueue()
      setCurrentIndex(0)
      setTimeout(() => {
        const question = generateQuestion()
        if (question) {
          setCurrentQuestion(question)
          setUserAnswer('')
          setShowResult(false)
          setIsCorrect(false)
        }
      }, 100)
    } else {
      nextQuestion()
    }
  }

  if (words.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-1">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-2 text-center">
          <p className="text-xs text-gray-600 mb-1">📚 还没有单词可以练习</p>
          <p className="text-xs text-gray-500">请先添加一些单词到单词本</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-0.5 space-y-0.5">
      {/* 头部信息 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 backdrop-blur-sm rounded shadow-sm border border-blue-200/50 p-0.5">
        <div className="flex items-center justify-between mb-0.5">
          <h1 className="text-xs font-bold text-gray-800 flex items-center gap-0.5">
            <span className="text-xs">🎯</span>
            练习
          </h1>
          <button
            onClick={restart}
            className="px-1 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            🔄
          </button>
        </div>

        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-0.5">
          <div className="bg-white/60 rounded p-0.5">
            <div className="text-xs text-gray-600">题数</div>
            <div className="text-xs font-bold text-blue-600">{totalQuestions}</div>
          </div>
          <div className="bg-white/60 rounded p-0.5">
            <div className="text-xs text-gray-600">正确</div>
            <div className="text-xs font-bold text-green-600">{score}</div>
          </div>
          <div className="bg-white/60 rounded p-0.5">
            <div className="text-xs text-gray-600">正确率</div>
            <div className="text-xs font-bold text-purple-600">
              {totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0}%
            </div>
          </div>
          <div className="bg-white/60 rounded p-0.5">
            <div className="text-xs text-gray-600">连对</div>
            <div className="text-xs font-bold text-orange-600">
              {streak}{bestStreak > 0 && `/${bestStreak}`}
            </div>
          </div>
        </div>

        {/* 单词本选择 */}
        <div className="mt-0.5">
          <select
            value={currentWordbook === 'all' ? 'all' : currentWordbook}
            onChange={(e) => {
              const newWordbookId = e.target.value === 'all' ? undefined : e.target.value
              setSettings({ currentWordbookId: newWordbookId })
              setSelectedWords(new Set())
              setPracticedWords(new Set())
            }}
            className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded bg-white"
          >
            <option value="all">所有单词</option>
            {wordbooks.map(wb => (
              <option key={wb.id} value={wb.id}>{wb.name}</option>
            ))}
          </select>
        </div>

        {/* 单词选择 */}
        <div className="mt-0.5">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              {selectedWords.size > 0 ? (
                <span className="text-blue-600">已选{selectedWords.size}个</span>
              ) : (
                <span className="text-gray-600">全部{words.filter(w => currentWordbook === 'all' || w.wordbookId === currentWordbook).length}个</span>
              )}
            </div>
            <button
              onClick={() => setShowWordSelector(!showWordSelector)}
              className="px-1 py-0.5 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors"
            >
              {showWordSelector ? '✓' : '📝'}
            </button>
          </div>
          
          {showWordSelector && (
            <div className="bg-white/60 rounded p-0.5 max-h-24 overflow-y-auto">
              <div className="flex gap-0.5 mb-0.5">
                <button
                  onClick={() => {
                    const currentWords = words.filter(w => 
                      currentWordbook === 'all' || w.wordbookId === currentWordbook
                    )
                    const allIds = new Set(currentWords.map(w => w.id))
                    setSelectedWords(allIds)
                  }}
                  className="px-1 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                >
                  ✓
                </button>
                <button
                  onClick={() => setSelectedWords(new Set())}
                  className="px-1 py-0.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                >
                  ✗
                </button>
                <span className="text-xs text-gray-500">
                  不选=全部
                </span>
              </div>
              <div className="space-y-0.5">
                {words
                  .filter(w => currentWordbook === 'all' || w.wordbookId === currentWordbook)
                  .map(word => (
                    <label key={word.id} className="flex items-center gap-1 text-xs cursor-pointer hover:bg-white/40 p-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={selectedWords.has(word.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedWords)
                          if (e.target.checked) {
                            newSelected.add(word.id)
                          } else {
                            newSelected.delete(word.id)
                          }
                          setSelectedWords(newSelected)
                        }}
                        className="w-3 h-3"
                      />
                      <span className="flex-1">{word.term} - {word.meaningZh}</span>
                    </label>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* 顺序模式开关 */}
        <div className="mt-0.5 bg-blue-50 border border-blue-200 rounded p-0.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-0.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={useSequentialMode}
                onChange={(e) => {
                  setUseSequentialMode(e.target.checked)
                  if (e.target.checked) {
                    // 开启顺序模式
                    setScore(0)
                    setTotalQuestions(0)
                    setPracticedWords(new Set())
                    setStreak(0)
                  } else {
                    // 关闭顺序模式
                    setWordQueue([])
                    setCurrentIndex(0)
                    restart()
                  }
                }}
                className="w-3 h-3"
              />
              <span className={useSequentialMode ? 'text-blue-600 font-medium' : ''}>
                📋 顺序模式（每词2次，答错再练2次）
              </span>
              {useSequentialMode && wordQueue.length > 0 && (
                <span className="ml-2 text-blue-600">
                  进度: {currentIndex}/{wordQueue.length}
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

        {/* 练习模式选择 */}
        <div className="mt-0.5 flex gap-0.5 flex-wrap">
          <button
            onClick={() => { 
              setMode('mixed')
              setShowResult(false)
              setTimeout(() => nextQuestion(), 50)
            }}
            className={`px-1 py-0.5 text-xs rounded transition-colors ${
              mode === 'mixed' ? 'bg-blue-500 text-white' : 'bg-white/60 text-gray-700 hover:bg-white/80'
            }`}
          >
            🎲
          </button>
          <button
            onClick={() => { 
              setMode('spell')
              setShowResult(false)
              setTimeout(() => nextQuestion(), 50)
            }}
            className={`px-1 py-0.5 text-xs rounded transition-colors ${
              mode === 'spell' ? 'bg-blue-500 text-white' : 'bg-white/60 text-gray-700 hover:bg-white/80'
            }`}
          >
            ✍️
          </button>
          <button
            onClick={() => { 
              setMode('meaning')
              setShowResult(false)
              setTimeout(() => nextQuestion(), 50)
            }}
            className={`px-1 py-0.5 text-xs rounded transition-colors ${
              mode === 'meaning' ? 'bg-blue-500 text-white' : 'bg-white/60 text-gray-700 hover:bg-white/80'
            }`}
          >
            📖
          </button>
          <button
            onClick={() => { 
              setMode('listen')
              setShowResult(false)
              setTimeout(() => nextQuestion(), 50)
            }}
            className={`px-1 py-0.5 text-xs rounded transition-colors ${
              mode === 'listen' ? 'bg-blue-500 text-white' : 'bg-white/60 text-gray-700 hover:bg-white/80'
            }`}
          >
            🎧
          </button>
        </div>
      </div>

      {/* 问题区域 */}
      {currentQuestion && (
        <div className="bg-white/80 backdrop-blur-sm rounded shadow-sm border border-white/20 p-1">
          {/* 问题类型标签 */}
          <div className="flex items-center justify-between mb-1">
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
              currentQuestion.type === 'spell' ? 'bg-blue-100 text-blue-700' :
              currentQuestion.type === 'meaning' ? 'bg-green-100 text-green-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {currentQuestion.type === 'spell' ? '✍️ 拼写' :
               currentQuestion.type === 'meaning' ? '📖 释义' :
               '🎧 听力'}
            </span>
            {currentQuestion.type === 'listen' && (
              <button
                onClick={() => speakWord(currentQuestion.word.term)}
                className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors"
              >
                🔊 播放
              </button>
            )}
          </div>

          {/* 问题内容 */}
          <div className="mb-1">
            {currentQuestion.type === 'spell' && (
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-bold text-gray-800">{currentQuestion.word.meaningZh}</p>
                  <button
                    onClick={() => speakWord(currentQuestion.word.term)}
                    className="px-1 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    🔊
                  </button>
                </div>
                {currentQuestion.word.ipa && (
                  <p className="text-xs text-gray-500">/{currentQuestion.word.ipa}/</p>
                )}
              </div>
            )}
            {currentQuestion.type === 'meaning' && (
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-bold text-gray-800">{currentQuestion.word.term}</p>
                  <button
                    onClick={() => speakWord(currentQuestion.word.term)}
                    className="px-1 py-0.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                  >
                    🔊
                  </button>
                </div>
                {currentQuestion.word.ipa && (
                  <p className="text-xs text-gray-500">/{currentQuestion.word.ipa}/</p>
                )}
              </div>
            )}
            {currentQuestion.type === 'listen' && (
              <div className="text-center">
                <button
                  onClick={() => speakWord(currentQuestion.word.term)}
                  className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  <span className="text-sm">🔊</span>
                </button>
              </div>
            )}
          </div>

          {/* 选项 */}
          {!showResult && currentQuestion.options && (
            <div className="grid grid-cols-2 gap-0.5">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setUserAnswer(option)
                    setTimeout(() => {
                      checkAnswer()
                    }, 100)
                  }}
                  className="px-1 py-0.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded text-left text-xs transition-all"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* 结果显示 */}
          {showResult && (
            <div className={`p-0.5 rounded ${isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-0.5 mb-0.5">
                <span className="text-xs">{isCorrect ? '✅' : '❌'}</span>
                <span className={`text-xs font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {isCorrect ? '正确' : '错误'}
                </span>
                {isCorrect && (
                  <span className="text-xs text-green-600 ml-auto">
                    正在进入下一题...
                  </span>
                )}
              </div>
              
              {!isCorrect && (
                <>
                  <div className="mb-0.5">
                    <span className="text-xs text-gray-600">答案: </span>
                    <span className="text-xs font-bold text-gray-800">{currentQuestion.correctAnswer}</span>
                  </div>

                  <div className="bg-white/60 rounded p-0.5 mb-0.5">
                    <div className="grid grid-cols-2 gap-0.5 text-xs">
                      <div>
                        <span className="text-gray-600">单词: </span>
                        <span className="font-medium">{currentQuestion.word.term}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">释义: </span>
                        <span className="font-medium">{currentQuestion.word.meaningZh}</span>
                      </div>
                      {currentQuestion.word.ipa && (
                        <div className="col-span-2">
                          <span className="text-gray-600">音标: </span>
                          <span className="font-medium">/{currentQuestion.word.ipa}/</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={nextQuestion}
                    className="w-full px-1 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                  >
                    下一题 →
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 进度信息 */}
      <div className="bg-white/80 backdrop-blur-sm rounded shadow-sm border border-white/20 p-0.5">
        <div className="flex items-center justify-between text-xs text-gray-600">
          {useSequentialMode ? (
            <>
              <span>{currentIndex}/{wordQueue.length}</span>
              <span>
                {wordQueue.length > 0 
                  ? Math.round((currentIndex / wordQueue.length) * 100)
                  : 0}%
              </span>
            </>
          ) : (
            <>
              <span>{practicedWords.size}/{getWordsForPractice().length}</span>
              <span>
                {getWordsForPractice().length > 0 
                  ? Math.round((practicedWords.size / getWordsForPractice().length) * 100)
                  : 0}%
              </span>
            </>
          )}
        </div>
        <div className="mt-0.5 w-full bg-gray-200 rounded-full h-1">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-300"
            style={{ 
              width: `${useSequentialMode 
                ? (wordQueue.length > 0 ? (currentIndex / wordQueue.length) * 100 : 0)
                : (getWordsForPractice().length > 0 ? (practicedWords.size / getWordsForPractice().length) * 100 : 0)
              }%` 
            }}
          />
        </div>
      </div>
    </div>
  )
}

