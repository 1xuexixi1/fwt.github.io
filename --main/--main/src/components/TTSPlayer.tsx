import { useEffect, useMemo, useState } from 'react'

type Props = { 
  text: string; 
  repeat: number; 
  rate: number; 
  voiceName?: string;
  americanAudio?: string;
  britishAudio?: string;
  accentType?: 'american' | 'british' | 'auto';
}

export default function TTSPlayer({ 
  text, 
  repeat, 
  rate, 
  voiceName, 
  americanAudio, 
  britishAudio, 
  accentType = 'auto'
}: Props){
  // 使用 accentType 参数
  console.log('Accent type:', accentType)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedAccent, setSelectedAccent] = useState<'american' | 'british'>('american')
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(()=>{
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.onvoiceschanged = load
  }, [])

  const voice = useMemo(
    () => voices.find(v=> v.name===voiceName) || voices.find(v=> /English|en/i.test(v.lang)),
    [voices, voiceName]
  )

  const speak = (accent?: 'american' | 'british') => {
    if(!text) return
    
    // 使用传入的accent参数，而不是state（避免异步问题）
    const useAccent = accent || selectedAccent
    
    // 停止所有播放
    window.speechSynthesis.cancel()
    setIsPlaying(true)
    
    // 如果有音频文件，优先使用音频文件
    const audioUrl = useAccent === 'american' ? americanAudio : britishAudio
    if (audioUrl) {
      try {
        const audio = new Audio(audioUrl)
        audio.onended = () => setIsPlaying(false)
        audio.onerror = () => playTTS(useAccent)
        audio.play().catch(() => playTTS(useAccent))
      } catch (error) {
        playTTS(useAccent)
      }
    } else {
      playTTS(useAccent)
    }
  }

  const playTTS = (accent?: 'american' | 'british') => {
    const n = Math.max(1, Math.min(10, repeat||1))
    const useAccent = accent || selectedAccent
    const lang = useAccent === 'american' ? 'en-US' : 'en-GB'
    const accentLabel = useAccent === 'american' ? '🇺🇸美式' : '🇬🇧英式'
    
    // 确保之前的播放已停止
    window.speechSynthesis.cancel()
    
    // 获取最佳语音
    const getBestVoice = () => {
      const availableVoices = window.speechSynthesis.getVoices()
      
      if (voice) return voice
      
      let selectedVoice = null
      
      if (useAccent === 'american') {
        // 美式发音优先级
        const americanPriority = [
          (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang === 'en-US',
          (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && (v.name.includes('David') || v.name.includes('Mark') || v.name.includes('Zira')),
          (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang === 'en-US',
          (v: SpeechSynthesisVoice) => v.lang === 'en-US' && v.name.includes('US'),
          (v: SpeechSynthesisVoice) => v.lang === 'en-US',
          (v: SpeechSynthesisVoice) => v.lang.startsWith('en-')
        ]
        
        for (const matcher of americanPriority) {
          selectedVoice = availableVoices.find(matcher)
          if (selectedVoice) break
        }
      } else {
        // 英式发音优先级
        const britishPriority = [
          (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang === 'en-GB',
          (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && (v.name.includes('George') || v.name.includes('Hazel') || v.name.includes('Susan')),
          (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang === 'en-GB',
          (v: SpeechSynthesisVoice) => v.lang === 'en-GB' && v.name.includes('UK'),
          (v: SpeechSynthesisVoice) => v.lang === 'en-GB',
          (v: SpeechSynthesisVoice) => v.lang.startsWith('en-')
        ]
        
        for (const matcher of britishPriority) {
          selectedVoice = availableVoices.find(matcher)
          if (selectedVoice) break
        }
      }
      
      return selectedVoice
    }
    
    // 添加小延迟确保cancel完成
    setTimeout(() => {
      const selectedVoice = getBestVoice()
      
      // 只打印一条清晰的日志
      console.log(`🔊 ${accentLabel} 播放: "${text}" | 语音: ${selectedVoice?.name || '默认'}`)
      
      for(let i=0;i<n;i++){
        const u = new SpeechSynthesisUtterance(text)
        u.lang = lang
        
        if (selectedVoice) {
          u.voice = selectedVoice
        }
        
        u.rate = Math.min(1.5, Math.max(0.5, rate||1))
        u.onend = () => {
          if(i === n-1) setIsPlaying(false)
        }
        u.onerror = () => setIsPlaying(false)
        
        window.speechSynthesis.speak(u)
      }
    }, 100)
  }

  const hasAmericanAudio = !!americanAudio
  const hasBritishAudio = !!britishAudio
  const hasAnyAudio = hasAmericanAudio || hasBritishAudio

  return (
    <div className="flex items-center gap-0.5 leading-[1.1]">
      {/* 直接点击播放按钮，不需要先选择口音 */}
      <button 
        onClick={() => {
          setSelectedAccent('american')
          speak('american') // 直接传递参数，避免状态异步问题
        }}
        disabled={isPlaying}
        className="px-1 py-0 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-0.5 text-[11px]"
        title={hasAmericanAudio ? '播放在线美式发音' : '使用浏览器TTS美式发音'}
      >
        {hasAmericanAudio && <span className="text-[9px]">🎵</span>}
        🇺🇸 美式
      </button>
      
      <button 
        onClick={() => {
          setSelectedAccent('british')
          speak('british') // 直接传递参数，避免状态异步问题
        }}
        disabled={isPlaying}
        className="px-1 py-0 rounded bg-purple-500 text-white hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-0.5 text-[11px]"
        title={hasBritishAudio ? '播放在线英式发音' : '使用浏览器TTS英式发音'}
      >
        {hasBritishAudio && <span className="text-[9px]">🎵</span>}
        🇬🇧 英式
      </button>
      
      {isPlaying && (
        <span className="text-[10px] text-green-600 flex items-center gap-0.5">
          <div className="w-2 h-2 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          播放中
        </span>
      )}
    </div>
  )
}
