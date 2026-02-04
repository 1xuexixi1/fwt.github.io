import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import QuickRecovery from '../components/QuickRecovery'
import { fetchIPAAndAudio, fetchWordInfo, reverseTranslate } from '../lib/dict'
import { useCustomShortcuts, DEFAULT_SHORTCUTS } from '../lib/useCustomShortcuts'

export default function QuickAdd() {
  const { addWord } = useStore()
  const [term, setTerm] = useState('')
  const [meaningZh, setMeaningZh] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [ipaType, setIpaType] = useState<'american' | 'british'>('american')
  const [fetchedIPA, setFetchedIPA] = useState('')  // 保存从"获取所有"获取到的音标
  
  // 输入框引用
  const termInputRef = useRef<HTMLInputElement>(null)
  const meaningZhInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!term.trim() || !meaningZh.trim()) {
      setMessage('请填写完整信息')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // 优先使用已获取的音标，如果没有则自动获取
      let ipaToSave = fetchedIPA
      if (!ipaToSave) {
        const { ipa } = await fetchIPAAndAudio(term.trim())
        ipaToSave = ipa || ''
      }
      
      // 添加单词
      addWord({
        term: term.trim(),
        meaningZh: meaningZh.trim(),
        ipa: ipaToSave,
        proficiency: 0
      })

      setMessage(`✅ 已保存: ${term} - ${meaningZh}${ipaToSave ? ` [${ipaToSave}]` : ''}`)
      // 保存成功后清空输入框和音标缓存
      setTerm('')
      setMeaningZh('')
      setFetchedIPA('')
    } catch (error: any) {
      if (error.message && error.message.includes('已存在于词库中')) {
        // 单词已存在，不清空输入框，让用户可以修改或查看
        setMessage(`⚠️ 单词 "${term}" 已存在于当前单词本中，请修改后重试或前往单词列表查看`)
        // 不清空输入框，保留当前输入
      } else {
        setMessage('❌ 保存失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }

  const pullChinese = async () => {
    // 允许“英文或中文”任一输入
    if (!term.trim() && !meaningZh.trim()) {
      setMessage('请先输入英文或中文')
      return
    }

    setLoading(true)
    setMessage('正在获取释义...')

    try {
      // 优先用中文框内容；英文为空时再用英文
      const raw = (meaningZh.trim() || term.trim())
      const input = raw
      console.log('=== pullChinese 开始 ===')
      console.log('term:', term)
      console.log('meaningZh:', meaningZh)
      console.log('raw:', raw)
      console.log('input:', input)
      
      // 检测输入是中文还是英文
      const isChinese = /[\u4e00-\u9fa5]/.test(input)
      console.log('isChinese:', isChinese)
      
      if (isChinese) {
        // 如果输入的是中文，反查英文并回填
        console.log('检测到中文输入，正在反查英文...')
        console.log('调用 reverseTranslate，参数:', input)
        const englishWord = await reverseTranslate(input)
        console.log('reverseTranslate 返回结果:', englishWord)
        
        if (englishWord) {
          setTerm(englishWord)
          // 中文已有，保持不变
          setMessage(`✅ 找到英文: ${englishWord}`)
          
          // 继续获取英文单词的中文释义（验证）
          try {
            const { chineseMeaning } = await fetchWordInfo(englishWord)
            if (chineseMeaning) {
              setMessage(prev => prev + ` | 验证释义: ${chineseMeaning}`)
            }
          } catch (error) {
            console.log('验证释义失败，但反查成功')
          }
        } else {
          setMessage('❌ 未找到对应的英文单词')
        }
        return
      }
      
      // 如果输入的是英文，正常查询中文
      const { meanings, chineseMeaning } = await fetchWordInfo(input)
      
      if (chineseMeaning) {
        setMeaningZh(chineseMeaning)
        setMessage(`✅ 已获取中文释义: ${chineseMeaning}`)
        console.log('设置中文释义:', chineseMeaning)
      } else if (meanings && meanings.length > 0) {
        setMeaningZh(meanings[0])
        setMessage(`✅ 已获取释义: ${meanings[0]}`)
        console.log('使用英文释义作为中文:', meanings[0])
      } else {
        setMessage('❌ 未找到中文释义，请手动输入')
      }
    } catch (error) {
      console.error('获取中文释义时出错:', error)
      setMessage('❌ 获取中文释义失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const autoFillInfo = async () => {
    // 允许“英文或中文”任一输入
    if (!term.trim() && !meaningZh.trim()) {
      setMessage('请先输入英文或中文')
      return
    }

    setLoading(true)
    setMessage('正在获取信息...')

    try {
      // 优先用中文框内容；英文为空时再用英文
      const raw = (meaningZh.trim() || term.trim())
      const input = raw
      console.log('开始获取单词信息:', input)
      
      // 检测输入是中文还是英文
      const isChinese = /[\u4e00-\u9fa5]/.test(input)
      
      let result
      if (isChinese) {
        // 如果输入的是中文，反查英文
        console.log('检测到中文输入，正在反查英文...')
        const englishWord = await reverseTranslate(input)
        
        if (englishWord) {
          // 反查成功，填充英文单词
          setTerm(englishWord)
          setMessage(`✅ 找到英文: ${englishWord}`)
          
          // 继续获取英文单词的详细信息
          result = await fetchWordInfo(englishWord)
        } else {
          setMessage('❌ 未找到对应的英文单词')
          setLoading(false)
          return
        }
      } else {
        // 如果输入的是英文，正常查询
        result = await fetchWordInfo(input)
      }
      
      console.log('获取到的信息:', result)
      
      const { 
        ipa, 
        meanings, 
        chineseMeaning, 
        americanIPA, 
        britishIPA 
      } = result
      
      if (chineseMeaning) {
        setMeaningZh(chineseMeaning)
        setMessage(`✅ 已自动填充中文释义: ${chineseMeaning}`)
        console.log('设置中文释义:', chineseMeaning)
      } else if (meanings && meanings.length > 0) {
        setMeaningZh(meanings[0])
        setMessage(`✅ 已自动填充释义: ${meanings[0]}`)
        console.log('使用英文释义作为中文:', meanings[0])
      } else {
        setMessage('❌ 未找到中文释义，请手动输入')
      }
      
      // 根据用户选择的音标类型保存音标
      let selectedIPA = ''
      if (ipaType === 'american' && americanIPA) {
        selectedIPA = americanIPA
        setMessage(prev => prev + `\n📝 已获取美式音标: ${americanIPA}`)
      } else if (ipaType === 'british' && britishIPA) {
        selectedIPA = britishIPA
        setMessage(prev => prev + `\n📝 已获取英式音标: ${britishIPA}`)
      } else if (americanIPA) {
        selectedIPA = americanIPA
        setMessage(prev => prev + `\n📝 已获取音标: ${americanIPA}`)
      } else if (britishIPA) {
        selectedIPA = britishIPA
        setMessage(prev => prev + `\n📝 已获取音标: ${britishIPA}`)
      } else if (ipa) {
        selectedIPA = ipa
        setMessage(prev => prev + `\n📝 已获取音标: ${ipa}`)
      }
      
      // 保存获取到的音标，在保存单词时使用
      setFetchedIPA(selectedIPA)
      
      // 显示额外的音标信息（如果有多个）
      if (americanIPA && britishIPA && americanIPA !== britishIPA) {
        setMessage(prev => prev + `\n💡 提示: 美式: ${americanIPA} | 英式: ${britishIPA}`)
      }
    } catch (error) {
      console.error('获取信息时出错:', error)
      setMessage('❌ 获取信息失败，请检查网络连接或单词拼写')
    } finally {
      setLoading(false)
    }
  }

  // 自定义快捷键配置（在函数定义之后）
  const shortcuts = [
    {
      ...DEFAULT_SHORTCUTS.find(s => s.id === 'save-word')!,
      action: () => handleSubmit({ preventDefault: () => {} } as any)
    },
    {
      ...DEFAULT_SHORTCUTS.find(s => s.id === 'save-word-alt')!,
      action: () => handleSubmit({ preventDefault: () => {} } as any)
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
      ...DEFAULT_SHORTCUTS.find(s => s.id === 'get-all-info')!,
      action: autoFillInfo
    }
  ]
  
  // 使用自定义快捷键
  useCustomShortcuts(shortcuts)

  return (
    <div className="max-w-sm mx-auto p-0">
      <QuickRecovery />
      
      <div className="text-center mb-0.5">
        <h1 className="text-xs font-bold text-gray-800 mb-0.5">
          🚀 快速添加
        </h1>
        <p className="text-xs text-gray-500">输入单词和释义</p>
      </div>
      
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-0.5">
        <form onSubmit={handleSubmit} className="space-y-0.5">
          <div className="grid grid-cols-2 gap-0.5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">
                英文 <span className="text-gray-400">(Tab跳转)</span>
              </label>
              <input
                ref={termInputRef}
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  // Tab键跳转到中文输入框
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault()
                    meaningZhInputRef.current?.focus()
                  }
                }}
                placeholder="apple"
                className="w-full px-0.5 py-0.5 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-xs"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-0.5">
                中文 <span className="text-gray-400">(Enter保存)</span>
              </label>
              <input
                ref={meaningZhInputRef}
                type="text"
                value={meaningZh}
                onChange={(e) => setMeaningZh(e.target.value)}
                onKeyDown={(e) => {
                  // Enter键保存
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder="苹果"
                className="w-full px-0.5 py-0.5 border border-gray-200 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-xs"
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={pullChinese}
                disabled={loading || !(term.trim() || meaningZh.trim())}
                className="flex-1 bg-orange-500 text-white py-0.5 px-0.5 rounded font-medium text-xs hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-0.5"
              >
                {loading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    获取中
                  </>
                ) : (
                  <>
                    <span>🇨🇳</span>
                    获取中文
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={autoFillInfo}
                disabled={loading || !(term.trim() || meaningZh.trim())}
                className="flex-1 bg-green-500 text-white py-0.5 px-0.5 rounded font-medium text-xs hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-0.5"
              >
                {loading ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    获取中
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    获取所有
                  </>
                )}
              </button>
            </div>
            
            <div className="flex gap-0.5">
              <button
                type="submit"
                disabled={loading || !term.trim() || !meaningZh.trim()}
                className="w-full bg-blue-500 text-white py-0.5 px-0.5 rounded font-medium text-xs hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-0.5"
              >
                <span>💾</span>
                保存
              </button>
            </div>
            
            <div className="flex gap-0.5 justify-center">
              <label className="flex items-center gap-0.5 text-xs">
                <input 
                  type="radio" 
                  name="ipaType" 
                  value="american"
                  checked={ipaType === 'american'}
                  onChange={e => setIpaType(e.target.value as 'american' | 'british')}
                  className="w-0.5 h-0.5"
                />
                美式音标
              </label>
              <label className="flex items-center gap-0.5 text-xs">
                <input 
                  type="radio" 
                  name="ipaType" 
                  value="british"
                  checked={ipaType === 'british'}
                  onChange={e => setIpaType(e.target.value as 'american' | 'british')}
                  className="w-0.5 h-0.5"
                />
                英式音标
              </label>
            </div>
          </div>
        </form>

        {message && (
          <div className={`mt-0.5 p-0.5 rounded text-center text-xs font-medium ${
            message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 
            message.includes('❌') ? 'bg-red-50 text-red-700 border border-red-200' : 
            'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}>
            {message}
          </div>
        )}
      </div>

      <div className="mt-0.5 bg-blue-50/80 backdrop-blur-sm rounded p-0.5 border border-blue-200/50">
        <div className="flex items-start gap-0.5">
          <span className="text-blue-500 text-xs">💡</span>
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-0.5">提示</p>
            <ul className="space-y-0.5 text-blue-600">
              <li>• 自动获取 IPA 音标</li>
              <li>• 数据本地保存</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* 快捷键提示 */}
      <div className="mt-0.5 bg-gray-50/80 backdrop-blur-sm rounded p-0.5 border border-gray-200/50">
        <div className="flex items-start gap-0.5">
          <span className="text-gray-500 text-xs">⌨️</span>
          <div className="text-xs text-gray-700">
            <p className="font-medium mb-0.5">快捷键</p>
            <div className="space-y-0.5 text-gray-600">
              <div><kbd className="px-0.5 py-0.5 bg-white border border-gray-300 rounded text-[10px]">Tab</kbd> 跳转到中文框</div>
              <div><kbd className="px-0.5 py-0.5 bg-white border border-gray-300 rounded text-[10px]">Enter</kbd> 在中文框按Enter保存</div>
              <div><kbd className="px-0.5 py-0.5 bg-white border border-gray-300 rounded text-[10px]">Ctrl+Enter</kbd> 或 <kbd className="px-0.5 py-0.5 bg-white border border-gray-300 rounded text-[10px]">Ctrl+S</kbd> 快速保存</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
