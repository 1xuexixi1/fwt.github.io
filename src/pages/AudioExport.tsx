import { useState } from 'react'
import { useStore } from '../store'
import type { Word } from '../types'
import { generateSpeechWithQwenTTS } from '../lib/ttsApi'

type PlaybackMode = 'english-only' | 'chinese-only' | 'english-chinese' | 'chinese-english'
type TTSEngine = 'browser' | 'qwen' // 浏览器内置 或 通义千问

export default function AudioExport() {
  const { words, wordbooks } = useStore()
  const [selectedWordbookId, setSelectedWordbookId] = useState<string>('all')
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set())
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('english-chinese')
  const [pauseBetweenWords, setPauseBetweenWords] = useState(2)
  const [pauseBetweenLanguages, setPauseBetweenLanguages] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [ttsEngine, setTtsEngine] = useState<TTSEngine>('qwen') // 默认使用通义千问
  const [qwenRate, setQwenRate] = useState<number>(1.0)
  const [qwenGapMs, setQwenGapMs] = useState<number>(600)

  // 获取当前单词本的单词
  const getWordsFromWordbook = () => {
    if (selectedWordbookId === 'all') {
      return words
    }
    return words.filter(w => w.wordbookId === selectedWordbookId)
  }

  // 获取选中的单词
  const getSelectedWords = () => {
    const wordbookWords = getWordsFromWordbook()
    if (selectedWords.size === 0) {
      return wordbookWords
    }
    return wordbookWords.filter(w => selectedWords.has(w.id))
  }

  // 组合单词文本：英文 + 中文第一义项，末尾句号，便于TTS自然停顿
  const buildQwenTextForWord = (word: Word): string => {
    let wordText = word.term
    if (word.meaningZh && word.meaningZh.trim().length > 0) {
      let simpleMeaning = word.meaningZh
      const firstPart = simpleMeaning.split(/[；;，,。]/)[0]?.trim()
      if (firstPart) simpleMeaning = firstPart
      wordText += `，${simpleMeaning}。`
    } else {
      wordText += '。'
    }
    return wordText
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    const wordbookWords = getWordsFromWordbook()
    if (selectedWords.size === wordbookWords.length) {
      setSelectedWords(new Set())
    } else {
      setSelectedWords(new Set(wordbookWords.map(w => w.id)))
    }
  }

  // 切换单词选择
  const toggleWordSelection = (wordId: string) => {
    const newSelected = new Set(selectedWords)
    if (newSelected.has(wordId)) {
      newSelected.delete(wordId)
    } else {
      newSelected.add(wordId)
    }
    setSelectedWords(newSelected)
  }

  // 使用 Web Speech API 朗读文本（返回 Promise）
  const speak = (text: string, lang: 'en' | 'zh'): Promise<void> => {
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US'
      utterance.rate = 0.9
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      window.speechSynthesis.speak(utterance)
    })
  }

  // 等待指定时间
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // 生成并下载完整音频（通义千问TTS版本）
  const generateAudioWithQwen = async () => {
    const wordsToExport = getSelectedWords()
    if (wordsToExport.length === 0) {
      setMessage('❌ 请选择要导出的单词')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setMessage('🎙️ 使用通义千问TTS生成音频...')

    try {
      // 一次性构建所有单词的组合文本
      const textParts: string[] = []
      for (const word of wordsToExport) {
        // 只读英文单词和中文释义，不读音标（音标是视觉学习工具）
        let wordText = word.term
        
        if (word.meaningZh && word.meaningZh.trim().length > 0) {
          // 只取中文的第一个主要意思（去除多余的词性解释）
          let simpleMeaning = word.meaningZh
          // 按分号、逗号或句号分割，取第一部分
          const separators = /[；;，,。]/
          const firstPart = simpleMeaning.split(separators)[0].trim()
          if (firstPart) {
            simpleMeaning = firstPart
          }
          // 格式：音标 英文，中文。（用逗号和句号帮助TTS停顿）
          wordText += `，${simpleMeaning}。`
        } else {
          wordText += `。`
        }
        textParts.push(wordText)
      }
      
      // 将所有单词用空格连接（TTS会自然停顿）
      const fullText = textParts.join(' ')
      
      console.log(`🎙️ 一次性生成所有单词音频，共 ${wordsToExport.length} 个单词`)
      console.log(`📝 完整文本: "${fullText.substring(0, 100)}..."`)
      
      setProgress(50)
      setMessage(`🎙️ 正在生成 ${wordsToExport.length} 个单词的完整音频...`)
      
      // 一次性调用TTS生成所有音频
      const audioBlob = await generateSpeechWithQwenTTS(fullText, 'en')
      console.log(`✅ 完整音频生成成功，大小: ${audioBlob.size} bytes`)

      // 保存文件
      setProgress(100)
      setMessage('💾 正在保存MP3文件...')
      
      const url = URL.createObjectURL(audioBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `单词录音_通义千问_${selectedWordbookId === 'all' ? '全部' : wordbooks.find(wb => wb.id === selectedWordbookId)?.name}_${new Date().toISOString().slice(0, 10)}.mp3`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage(`✅ 成功导出！文件大小: ${(audioBlob.size / 1024).toFixed(1)} KB，包含 ${wordsToExport.length} 个单词（英文+中文）`)
      setTimeout(() => setMessage(''), 8000)
    } catch (error) {
      console.error('生成失败:', error)
      setMessage(`❌ 生成失败: ${error}`)
      setTimeout(() => setMessage(''), 5000)
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }

  // 生成静音片段（用于间隔）
  const generateSilence = (seconds: number): Blob => {
    // 创建一个很小的静音MP3帧
    const silentFrames = Math.ceil(seconds * 10) // 估算帧数
    const silentData = new Uint8Array(silentFrames * 100).fill(0)
    return new Blob([silentData], { type: 'audio/mpeg' })
  }

  // 使用批量接口：逐词调用通义千问并拼接（支持语速与单词间隔）
  const generateAudioWithQwenBatch = async () => {
    const wordsToExport = getSelectedWords()
    if (wordsToExport.length === 0) {
      setMessage('❌ 请选择要导出的单词')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setMessage('🎙️ 逐词合成中（通义千问）...')

    try {
      const payload = {
        // 每个元素为：英文 + 中文（第一义项）
        words: wordsToExport.map(buildQwenTextForWord),
        lang: 'en-US',
        voice: 'Cherry',
        rate: qwenRate,
        gapMs: qwenGapMs
      }

      let resp = await fetch('/api/tts-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!resp.ok) {
        // 若服务器不允许POST（如vite preview或托管环境），回退GET
        if (resp.status === 405) {
          const qs = new URLSearchParams()
          qs.set('lang', 'en-US')
          qs.set('voice', 'Cherry')
          qs.set('rate', String(qwenRate))
          qs.set('gapMs', String(qwenGapMs))
          for (const w of wordsToExport.map(w => w.term)) {
            qs.append('w', w)
          }
          resp = await fetch(`/api/tts-batch?${qs.toString()}`, { method: 'GET' })
        }
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({} as any))
          throw new Error(err?.error || `HTTP ${resp.status}`)
        }
      }

      // 记录一些诊断信息
      const wordsCount = resp.headers.get('X-Words-Count')
      const durationMs = resp.headers.get('X-Audio-Duration-MS')
      console.log('X-Words-Count=', wordsCount, 'X-Audio-Duration-MS=', durationMs)

      const contentType = resp.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await resp.json().catch(() => ({} as any))
        throw new Error(data?.error || data?.message || '服务端未返回音频')
      }
      const blob = await resp.blob()
      setProgress(100)
      setMessage('💾 正在保存WAV文件...')

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const wbName = selectedWordbookId === 'all' ? '全部' : (wordbooks.find(wb => wb.id === selectedWordbookId)?.name || '未命名本')
      a.download = `单词录音_逐词_${wbName}_${new Date().toISOString().slice(0, 10)}.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      const wc = resp.headers.get('X-Words-Count')
      const dm = resp.headers.get('X-Audio-Duration-MS')
      setMessage(`✅ 成功导出逐词WAV！大小: ${(blob.size / 1024).toFixed(1)} KB，包含 ${wordsToExport.length} 个单词${wc ? `（服务端合并 ${wc} 段）` : ''}${dm ? `，总时长约 ${(Number(dm)/1000).toFixed(1)}s` : ''}`)
      setTimeout(() => setMessage(''), 8000)
    } catch (error) {
      console.error('逐词合成失败:', error)
      setMessage(`❌ 逐词合成失败: ${error}`)
      setTimeout(() => setMessage(''), 5000)
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }

  // 浏览器TTS版本（原有的）
  const generateAudio = async () => {
    const wordsToExport = getSelectedWords()
    if (wordsToExport.length === 0) {
      setMessage('❌ 请选择要导出的单词')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    if (!('speechSynthesis' in window)) {
      setMessage('❌ 您的浏览器不支持语音合成功能')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    setIsGenerating(true)
    setProgress(0)
    setMessage('🎤 开始录制音频...')

    try {
      // 创建音频上下文和录制器
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const dest = audioContext.createMediaStreamDestination()
      const mediaRecorder = new MediaRecorder(dest.stream)
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      // 开始录制
      mediaRecorder.start()
      setMessage('🔴 正在录制...')

      // 朗读所有单词
      for (let i = 0; i < wordsToExport.length; i++) {
        const word = wordsToExport[i]
        setProgress(Math.round((i / wordsToExport.length) * 100))
        setMessage(`🔴 录制中: ${word.term} (${i + 1}/${wordsToExport.length})`)

        switch (playbackMode) {
          case 'english-only':
            await speak(word.term, 'en')
            break
          case 'chinese-only':
            await speak(word.meaningZh || '', 'zh')
            break
          case 'english-chinese':
            await speak(word.term, 'en')
            await wait(pauseBetweenLanguages * 1000)
            await speak(word.meaningZh || '', 'zh')
            break
          case 'chinese-english':
            await speak(word.meaningZh || '', 'zh')
            await wait(pauseBetweenLanguages * 1000)
            await speak(word.term, 'en')
            break
        }

        if (i < wordsToExport.length - 1) {
          await wait(pauseBetweenWords * 1000)
        }
      }

      // 停止录制
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve()
        mediaRecorder.stop()
      })

      audioContext.close()

      // 保存文件
      setProgress(100)
      setMessage('💾 正在保存文件...')
      
      const finalBlob = new Blob(chunks, { type: 'audio/webm' })
      const url = URL.createObjectURL(finalBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `单词录音_${selectedWordbookId === 'all' ? '全部' : wordbooks.find(wb => wb.id === selectedWordbookId)?.name}_${new Date().toISOString().slice(0, 10)}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage(`✅ 成功导出！文件大小: ${(finalBlob.size / 1024).toFixed(1)} KB（WebM格式，可用Chrome/VLC播放）`)
      setTimeout(() => setMessage(''), 8000)
    } catch (error) {
      console.error('生成失败:', error)
      setMessage('❌ 生成失败，请重试')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setIsGenerating(false)
      setProgress(0)
    }
  }

  // 主函数：根据选择的引擎生成音频
  const handleGenerateAudio = async () => {
    if (ttsEngine === 'qwen') {
      await generateAudioWithQwenBatch()
    } else {
      await generateAudio()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 backdrop-blur-sm rounded-lg shadow-sm border border-purple-200/50 p-4">
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
          <span className="text-2xl">🎤</span>
          单词录音导出
        </h1>
        
        {/* 单词本选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">选择单词本</label>
          <select
            value={selectedWordbookId}
            onChange={(e) => {
              setSelectedWordbookId(e.target.value)
              setSelectedWords(new Set())
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">全部单词本 ({words.length}个单词)</option>
            {wordbooks.map(wb => {
              const count = words.filter(w => w.wordbookId === wb.id).length
              return (
                <option key={wb.id} value={wb.id}>{wb.name} ({count}个单词)</option>
              )
            })}
          </select>
        </div>

        {/* TTS引擎选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">🎙️ TTS引擎</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTtsEngine('qwen')}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                ttsEngine === 'qwen'
                  ? 'bg-green-500 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              ⭐ 通义千问TTS（推荐）
            </button>
            <button
              onClick={() => setTtsEngine('browser')}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                ttsEngine === 'browser'
                  ? 'bg-green-500 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              🌐 浏览器TTS（备用）
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {ttsEngine === 'qwen' 
              ? '✅ 使用阿里云通义千问，真人发音，MP3格式' 
              : '⚠️ 使用浏览器内置，机器音，WebM格式'}
          </p>
        </div>

        {/* 通义千问批量导出参数（语速/间隔） */}
        {ttsEngine === 'qwen' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">批量导出参数（逐词合成）</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">语速（0.6 - 1.4）</label>
                <input
                  type="number"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={qwenRate}
                  onChange={(e) => setQwenRate(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">单词间隔(ms)</label>
                <input
                  type="number"
                  min="0"
                  max="5000"
                  step="50"
                  value={qwenGapMs}
                  onChange={(e) => setQwenGapMs(parseInt(e.target.value || '0', 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">注：仅在“逐词导出WAV”时生效；若上游不支持语速将自动回退。</p>
          </div>
        )}

        {/* 播放模式 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">播放模式（注：通义千问模式会自动包含中文）</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => setPlaybackMode('english-only')}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                playbackMode === 'english-only' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              🇺🇸 仅英文
            </button>
            <button
              onClick={() => setPlaybackMode('chinese-only')}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                playbackMode === 'chinese-only' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              🇨🇳 仅中文
            </button>
            <button
              onClick={() => setPlaybackMode('english-chinese')}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                playbackMode === 'english-chinese' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              🇺🇸→🇨🇳 英中
            </button>
            <button
              onClick={() => setPlaybackMode('chinese-english')}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                playbackMode === 'chinese-english' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              🇨🇳→🇺🇸 中英
            </button>
          </div>
        </div>

        {/* 时间设置 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">时间设置</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">单词间隔(秒)</label>
              <input
                type="number"
                min="0.5"
                max="5"
                step="0.5"
                value={pauseBetweenWords}
                onChange={(e) => setPauseBetweenWords(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">语言间隔(秒)</label>
              <input
                type="number"
                min="0.2"
                max="3"
                step="0.2"
                value={pauseBetweenLanguages}
                onChange={(e) => setPauseBetweenLanguages(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 单词选择 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">选择单词</h2>
          <div className="flex gap-2">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              {selectedWords.size === getWordsFromWordbook().length ? '取消全选' : '全选'}
            </button>
            <span className="text-sm text-gray-600">
              已选择 {selectedWords.size === 0 ? getWordsFromWordbook().length : selectedWords.size} / {getWordsFromWordbook().length} 个单词
            </span>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
            {getWordsFromWordbook().map(word => (
              <label key={word.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedWords.size === 0 || selectedWords.has(word.id)}
                  onChange={() => toggleWordSelection(word.id)}
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{word.term}</div>
                  <div className="text-xs text-gray-500 truncate">{word.meaningZh}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 生成按钮 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-4">
        <button
          onClick={handleGenerateAudio}
          disabled={isGenerating || getSelectedWords().length === 0}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
        >
          {isGenerating ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {ttsEngine === 'qwen' ? '🎙️ 通义千问生成中' : '🎤 浏览器录制中'}... {progress}%
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>{ttsEngine === 'qwen' ? '🎙️' : '🎤'}</span>
              {ttsEngine === 'qwen' ? '逐词导出WAV' : '录制WebM音频'}（{getSelectedWords().length} 个单词）
            </div>
          )}
        </button>

        {/* 进度条 */}
        {isGenerating && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 消息提示 */}
        {message && (
          <div className={`mt-4 p-3 rounded-md text-sm ${
            message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' :
            message.includes('❌') ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div className="bg-yellow-50/80 backdrop-blur-sm border border-yellow-200/50 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-3">💡 使用说明</h3>
        {ttsEngine === 'qwen' ? (
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• ⭐ 使用阿里云通义千问TTS（真人发音，高质量）</li>
            <li>• 🎵 生成标准MP3文件，所有设备可播放</li>
            <li>• 🚀 支持中英文自动识别，发音自然流畅</li>
            <li>• ⚡ 一次性生成所有单词，速度快</li>
            <li>• 📝 格式：英文，中文。自动停顿</li>
            <li>• 📱 适合通勤、运动时听单词复习</li>
          </ul>
        ) : (
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 使用浏览器内置语音合成</li>
            <li>• 生成 WebM 文件，Chrome/Edge/VLC 可播放</li>
            <li>• 支持自定义单词间隔和语言间隔</li>
            <li>• ⚠️ 录制过程中会播放声音（技术限制）</li>
            <li>• 适合快速测试</li>
          </ul>
        )}
      </div>
    </div>
  )
}
