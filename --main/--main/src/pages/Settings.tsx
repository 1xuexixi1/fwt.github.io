import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { useNavigate } from 'react-router-dom'

export default function Settings(){
  const { settings, setSettings } = useStore()
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const navigate = useNavigate()

  useEffect(()=>{
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load(); window.speechSynthesis.onvoiceschanged = load
  }, [])

  return (
    <div className="space-y-1">
      <div className="p-1 border rounded bg-white/80 backdrop-blur-sm border-white/20 space-y-1">
        <div className="font-semibold text-xs">语音设置</div>
        <div className="flex gap-1 items-center">
          <label className="text-xs">语速（0.5-1.5）</label>
          <input type="number" step="0.1" min={0.5} max={1.5}
            className="border rounded px-0.5 py-0.5 w-16 text-xs"
            value={settings.ttsRate}
            onChange={e=> setSettings({ ttsRate: Math.max(0.5, Math.min(1.5, Number(e.target.value)||1)) })}
          />
        </div>
        <div className="flex gap-1 items-center">
          <label className="text-xs">重复次数（1-10）</label>
          <input type="number" min={1} max={10} className="border rounded px-0.5 py-0.5 w-16 text-xs"
            value={settings.ttsRepeat}
            onChange={e=> setSettings({ ttsRepeat: Math.max(1, Math.min(10, Number(e.target.value)||1)) })}
          />
        </div>
        <div className="flex gap-1 items-center">
          <label className="text-xs">语音</label>
          <select className="border rounded px-0.5 py-0.5 text-xs" value={settings.ttsVoiceName||''}
            onChange={e=> setSettings({ ttsVoiceName: e.target.value||undefined })}>
            <option value="">自动</option>
            {voices.map(v=> <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
          </select>
        </div>
      </div>

      <div className="p-1 border rounded bg-white/80 backdrop-blur-sm border-white/20 space-y-1">
        <div className="font-semibold text-xs">练习显示</div>
        <label className="flex items-center gap-0.5 text-xs">
          <input type="checkbox" checked={settings.showIPA} onChange={e=> setSettings({ showIPA: e.target.checked })} className="w-2 h-2" />
          显示音标
        </label>
      </div>

      <div className="p-1 border rounded bg-white/80 backdrop-blur-sm border-white/20 space-y-1">
        <div className="font-semibold text-xs">背景设置</div>
        <label className="flex items-center gap-0.5 text-xs">
          <input type="checkbox" checked={settings.backgroundAudioEnabled || false} onChange={e=> setSettings({ backgroundAudioEnabled: e.target.checked })} className="w-2 h-2" />
          背景音频
        </label>
        <label className="flex items-center gap-0.5 text-xs">
          <input type="checkbox" checked={settings.backgroundAppreciationMode || false} onChange={e=> setSettings({ backgroundAppreciationMode: e.target.checked })} className="w-2 h-2" />
          背景欣赏模式
        </label>
      </div>

      <div className="p-1 border rounded bg-white/80 backdrop-blur-sm border-white/20 space-y-1">
        <div className="font-semibold text-xs">快捷键设置</div>
        <button 
          onClick={() => navigate('/shortcuts')}
          className="w-full px-2 py-1.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
        >
          ⌨️ 自定义快捷键
        </button>
        <div className="text-xs text-gray-500">
          设置您喜欢的快捷键组合，提高操作效率
        </div>
      </div>
    </div>
  )
}
