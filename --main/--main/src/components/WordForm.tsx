import { useState, useRef, useEffect } from 'react'
import type { Word } from '../types'
import { fetchWordInfo } from '../lib/dict'
import TTSPlayer from './TTSPlayer'
import { useCustomShortcuts, DEFAULT_SHORTCUTS } from '../lib/useCustomShortcuts'

export default function WordForm({ initial, onSave, onCancel }:{
  initial?: Partial<Word>
  onSave: (data: Partial<Word>)=>void
  onCancel: ()=>void
}){
  const [term, setTerm] = useState(initial?.term || '')
  const [meaningZh, setMeaningZh] = useState(initial?.meaningZh || '')
  const [ipa, setIpa] = useState(initial?.ipa || '')
  const [meaningEn, setMeaningEn] = useState(initial?.meaningEn || '')
  const [tags, setTags] = useState((initial?.tags||[]).join(','))
  const [ipaType, setIpaType] = useState<'american' | 'british'>('american')
  const [americanAudio, setAmericanAudio] = useState('')
  const [britishAudio, setBritishAudio] = useState('')
  
  // 输入框引用
  const termInputRef = useRef<HTMLInputElement>(null)
  const meaningZhInputRef = useRef<HTMLInputElement>(null)
  
  const handleSubmit = () => {
    if (!term.trim() || !meaningZh.trim()) {
      alert('请填写完整信息（至少需要英文和中文释义）')
      return
    }
    
    onSave({
      term: term.trim(),
      meaningZh: meaningZh.trim(),
      ipa: ipa.trim(),
      meaningEn: meaningEn.trim(),
      tags: tags.split(',').map(t=>t.trim()).filter(Boolean)
    })
  }
  
  const pullIPA = async() => {
    if(!term.trim()) {
      alert('请先输入英文单词')
      return
    }
    
    console.log('开始获取IPA:', term.trim())
    
    try {
      const { 
        ipa, 
        americanIPA, 
        britishIPA,
        americanAudio: fetchedAmericanAudio,
        britishAudio: fetchedBritishAudio
      } = await fetchWordInfo(term.trim())
      
      // 设置音频 URL
      if(fetchedAmericanAudio) setAmericanAudio(fetchedAmericanAudio)
      if(fetchedBritishAudio) setBritishAudio(fetchedBritishAudio)
      
      // 根据用户选择设置音标
      if(ipaType === 'american' && americanIPA) {
        setIpa(americanIPA)
        console.log('设置美式IPA:', americanIPA)
      } else if(ipaType === 'british' && britishIPA) {
        setIpa(britishIPA)
        console.log('设置英式IPA:', britishIPA)
      } else if(ipa) {
        setIpa(ipa)
        console.log('设置默认IPA:', ipa)
      }
      
      const results = []
      if(ipaType === 'american' && americanIPA) results.push(`美式IPA: ${americanIPA}`)
      else if(ipaType === 'british' && britishIPA) results.push(`英式IPA: ${britishIPA}`)
      else if(ipa) results.push(`IPA: ${ipa}`)
      if(fetchedAmericanAudio || fetchedBritishAudio) results.push(`音频: 已获取`)
      
      if(results.length > 0) {
        alert(`✅ 已获取: ${results.join(', ')}`)
      } else {
        alert('❌ 未获取到IPA，请检查网络连接或单词拼写')
      }
    } catch (error) {
      console.error('获取IPA时出错:', error)
      alert('❌ 获取IPA失败，请重试')
    }
  }

  const pullChinese = async() => {
    if(!term.trim()) {
      alert('请先输入英文单词')
      return
    }
    
    console.log('开始获取中文释义:', term.trim())
    
    try {
      const { 
        meanings, 
        chineseMeaning 
      } = await fetchWordInfo(term.trim())
      
      if(chineseMeaning) {
        setMeaningZh(chineseMeaning)
        console.log('设置中文释义:', chineseMeaning)
        alert(`✅ 已获取中文释义: ${chineseMeaning}`)
      } else if(meanings && meanings.length > 0) {
        setMeaningZh(meanings[0])
        console.log('使用英文释义作为中文:', meanings[0])
        alert(`✅ 已获取释义: ${meanings[0]}`)
      } else {
        alert('❌ 未找到中文释义，请手动输入')
      }
    } catch (error) {
      console.error('获取中文释义时出错:', error)
      alert('❌ 获取中文释义失败，请重试')
    }
  }

  const pullAllInfo = async() => {
    if(!term.trim()) {
      alert('请先输入英文单词')
      return
    }
    
    console.log('开始获取单词信息:', term.trim())
    
    try {
      const result = await fetchWordInfo(term.trim())
      console.log('获取到的信息:', result)
      
      const { 
        ipa, 
        meanings, 
        examples, 
        chineseMeaning, 
        americanIPA, 
        britishIPA,
        americanAudio: fetchedAmericanAudio,
        britishAudio: fetchedBritishAudio
      } = result
      
      // 设置音频 URL
      if(fetchedAmericanAudio) {
        setAmericanAudio(fetchedAmericanAudio)
        console.log('设置美式音频:', fetchedAmericanAudio)
      }
      if(fetchedBritishAudio) {
        setBritishAudio(fetchedBritishAudio)
        console.log('设置英式音频:', fetchedBritishAudio)
      }
      
      // 根据用户选择设置音标
      if(ipaType === 'american' && americanIPA) {
        setIpa(americanIPA)
        console.log('设置美式IPA:', americanIPA)
      } else if(ipaType === 'british' && britishIPA) {
        setIpa(britishIPA)
        console.log('设置英式IPA:', britishIPA)
      } else if(ipa) {
        setIpa(ipa)
        console.log('设置默认IPA:', ipa)
      }
      
      if(chineseMeaning) {
        // 优先使用翻译服务获取的中文释义
        setMeaningZh(chineseMeaning)
        console.log('设置中文释义:', chineseMeaning)
      } else if(meanings && meanings.length > 0) {
        // 如果没有翻译，使用英文释义
        setMeaningZh(meanings[0])
        console.log('使用英文释义作为中文:', meanings[0])
      }
      
      if(examples && examples.length > 0) {
        // 取第一个例句作为英文释义
        setMeaningEn(examples[0])
        console.log('设置英文释义:', examples[0])
      }
      
      const results = []
      
      // 显示实际获取到的音标信息
      if(ipaType === 'american' && americanIPA) {
        results.push(`美式音标: ${americanIPA}`)
      } else if(ipaType === 'british' && britishIPA) {
        results.push(`英式音标: ${britishIPA}`)
      } else if(ipa) {
        // 如果无法获取指定类型的音标，显示默认音标并说明类型
        const defaultType = ipaType === 'american' ? '美式' : '英式'
        results.push(`${defaultType}音标: ${ipa}`)
      }
      
      if(chineseMeaning) results.push(`中文: ${chineseMeaning}`)
      else if(meanings && meanings.length > 0) results.push(`释义: ${meanings[0]}`)
      if(examples && examples.length > 0) results.push(`例句: ${examples[0]}`)
      if(fetchedAmericanAudio || fetchedBritishAudio) results.push(`音频: 已获取`)
      
      if(results.length > 0) {
        alert(`✅ 已获取: ${results.join(', ')}`)
      } else {
        alert('❌ 未获取到信息，请检查网络连接或单词拼写')
      }
    } catch (error) {
      console.error('获取信息时出错:', error)
      alert('❌ 获取信息失败，请重试')
    }
  }

  const save = ()=>{
    handleSubmit()
  }

  // 自定义快捷键配置（在函数定义之后）
  const shortcuts = [
    {
      ...DEFAULT_SHORTCUTS.find(s => s.id === 'save-word')!,
      action: handleSubmit
    },
    {
      ...DEFAULT_SHORTCUTS.find(s => s.id === 'save-word-alt')!,
      action: handleSubmit
    },
    {
      ...DEFAULT_SHORTCUTS.find(s => s.id === 'cancel')!,
      action: onCancel
    },
    {
      ...DEFAULT_SHORTCUTS.find(s => s.id === 'focus-chinese')!,
      action: () => meaningZhInputRef.current?.focus()
    },
    {
      ...DEFAULT_SHORTCUTS.find(s => s.id === 'get-chinese')!,
      action: pullChinese
    },
    {
      ...DEFAULT_SHORTCUTS.find(s => s.id === 'get-ipa')!,
      action: pullIPA
    },
    {
      ...DEFAULT_SHORTCUTS.find(s => s.id === 'get-all-info')!,
      action: pullAllInfo
    }
  ]
  
  // 使用自定义快捷键
  useCustomShortcuts(shortcuts)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            英文单词 <span className="text-gray-400">(Tab跳转)</span>
          </label>
          <input 
            ref={termInputRef}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400" 
            value={term} 
            onChange={e=>setTerm(e.target.value)}
            onKeyDown={(e) => {
              // Tab键跳转到中文输入框
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault()
                meaningZhInputRef.current?.focus()
              }
            }}
            placeholder="apple"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            中文释义 <span className="text-gray-400">(Enter保存)</span>
          </label>
          <input 
            ref={meaningZhInputRef}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400" 
            value={meaningZh} 
            onChange={e=>setMeaningZh(e.target.value)}
            onKeyDown={(e) => {
              // Enter键保存
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="苹果"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">英标 IPA</label>
            <input 
              className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400" 
              value={ipa} 
              onChange={e=>setIpa(e.target.value)} 
              placeholder="/ˈæp.əl/"
            />
          </div>
          <button 
            type="button" 
            onClick={pullIPA} 
            className="self-end px-2 py-1.5 rounded bg-blue-500 text-white text-xs hover:bg-blue-600 transition-colors"
          >
            获取IPA
          </button>
        </div>
        
        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-xs">
            <input 
              type="radio" 
              name="ipaType" 
              value="american"
              checked={ipaType === 'american'}
              onChange={e => setIpaType(e.target.value as 'american' | 'british')}
              className="w-3 h-3"
            />
            美式
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input 
              type="radio" 
              name="ipaType" 
              value="british"
              checked={ipaType === 'british'}
              onChange={e => setIpaType(e.target.value as 'american' | 'british')}
              className="w-3 h-3"
            />
            英式
          </label>
        </div>
      </div>
      
        <div className="flex gap-2">
          <button 
            type="button" 
            onClick={pullChinese} 
            className="flex-1 px-3 py-1.5 rounded bg-orange-500 text-white text-xs hover:bg-orange-600 transition-colors flex items-center justify-center gap-1"
          >
            <span>🇨🇳</span>
            获取中文
          </button>
          <button 
            type="button" 
            onClick={pullAllInfo} 
            className="flex-1 px-3 py-1.5 rounded bg-green-500 text-white text-xs hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
          >
            <span>🔍</span>
            获取所有
          </button>
        </div>
        
        {(americanAudio || britishAudio) && (
          <div className="bg-blue-50 rounded p-2 border border-blue-100">
            <div className="text-xs text-blue-700 mb-2 font-medium">🎵 发音测试</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600">单词:</span>
              <input 
                className="flex-1 px-2 py-1 border border-blue-200 rounded text-xs" 
                value={term} 
                onChange={e=>setTerm(e.target.value)} 
                placeholder="输入单词测试发音"
              />
              <TTSPlayer 
                text={term} 
                repeat={1} 
                rate={1} 
                americanAudio={americanAudio}
                britishAudio={britishAudio}
              />
            </div>
          </div>
        )}
      
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">英文释义（可选）</label>
        <input 
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400" 
          value={meaningEn} 
          onChange={e=>setMeaningEn(e.target.value)} 
          placeholder="a round fruit"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">标签（逗号分隔）</label>
        <input 
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400" 
          value={tags} 
          onChange={e=>setTags(e.target.value)} 
          placeholder="fruit, food"
        />
      </div>
      
      {/* 快捷键提示 */}
      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-600">
        <div className="font-medium mb-1">⌨️ 快捷键：</div>
        <div className="space-y-0.5">
          <div><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px]">Tab</kbd> 跳转到中文输入框</div>
          <div><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px]">Enter</kbd> 在中文框按Enter快速保存</div>
          <div><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px]">Ctrl+Enter</kbd> 或 <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px]">Ctrl+S</kbd> 任意位置快速保存</div>
          <div><kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-[10px]">Esc</kbd> 取消并关闭</div>
        </div>
      </div>
      
      <div className="flex gap-2 justify-end pt-2 sticky bottom-0 bg-white">
        <button 
          onClick={onCancel} 
          className="px-3 py-1.5 rounded border border-gray-300 text-sm hover:bg-gray-50 transition-colors"
          title="快捷键: Esc"
        >
          取消
        </button>
        <button 
          onClick={save} 
          className="px-3 py-1.5 rounded bg-green-500 text-white text-sm hover:bg-green-600 transition-colors"
          title="快捷键: Ctrl+Enter 或 Ctrl+S"
        >
          💾 保存
        </button>
      </div>
    </div>
  )
}
