import { useRef, useState, useEffect } from 'react'
import { useStore } from '../store'
import { AutoBackup } from '../lib/autoBackup'

export default function ImportExport(){
  const { words, wordbooks, settings } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null)
  const [targetWordbookId, setTargetWordbookId] = useState<string>('')
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [backupFolderName, setBackupFolderName] = useState<string | null>(null)
  const [backupWordbookId, setBackupWordbookId] = useState<string>('all')

  useEffect(() => {
    setLastBackupTime(AutoBackup.getLastBackupTime())
    setBackupFolderName(AutoBackup.getBackupFolderName())
    // 默认选择当前单词本
    if (wordbooks.length > 0 && !targetWordbookId) {
      setTargetWordbookId(settings.currentWordbookId || wordbooks[0].id)
    }
  }, [wordbooks, settings.currentWordbookId])

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(words, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'engmemo_words.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const onImport = async(e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if(!file) return
    const text = await file.text()
    try{
      const data = JSON.parse(text)
      
      // 检查是否是新格式的备份文件（包含 words, wordbooks, settings）
      if (data.words && Array.isArray(data.words)) {
        // 新格式：自动备份文件
        const raw = localStorage.getItem('engmemo.store')
        const parsed = raw? JSON.parse(raw): {}
        parsed.state = parsed.state || {}
        
        // 【智能合并模式】导入单词
        const existingWords = parsed.state.words || []
        const importWords = data.words
        
        // 创建已有单词的映射（按 term + wordbookId 去重）
        const existingMap = new Map()
        existingWords.forEach((word: any) => {
          const key = `${word.term.toLowerCase()}_${word.wordbookId || 'default'}`
          existingMap.set(key, word)
        })
        
        // 合并：根据模式处理
        let newCount = 0
        let skipCount = 0
        let updatedCount = 0
        
        importWords.forEach((word: any) => {
          // 如果用户选择了目标单词本，则将所有单词导入到该单词本
          const finalWordbookId = targetWordbookId || word.wordbookId || 'default'
          const key = `${word.term.toLowerCase()}_${finalWordbookId}`
          
          if (!existingMap.has(key)) {
            // 新单词：添加到目标单词本
            existingMap.set(key, {
              ...word,
              wordbookId: finalWordbookId
            })
            newCount++
          } else if (importMode === 'replace') {
            // 替换模式：更新已有单词
            existingMap.set(key, {
              ...word,
              wordbookId: finalWordbookId
            })
            updatedCount++
          } else {
            // 合并模式：跳过重复
            skipCount++
          }
        })
        
        // 转换回数组
        parsed.state.words = Array.from(existingMap.values())
        
        // 导入单词本（如果有）- 也使用合并模式
        if (data.wordbooks && Array.isArray(data.wordbooks)) {
          const existingWordbooks = parsed.state.wordbooks || []
          const existingWbMap = new Map()
          
          existingWordbooks.forEach((wb: any) => {
            existingWbMap.set(wb.id, wb)
          })
          
          data.wordbooks.forEach((wb: any) => {
            if (!existingWbMap.has(wb.id)) {
              existingWbMap.set(wb.id, wb)
            }
          })
          
          parsed.state.wordbooks = Array.from(existingWbMap.values())
        }
        
        // 导入设置（如果有，但排除临时的背景URL）
        if (data.settings) {
          const { customBackground, customBackgroundId, ...otherSettings } = data.settings
          parsed.state.settings = { ...parsed.state.settings, ...otherSettings }
        }
        
        localStorage.setItem('engmemo.store', JSON.stringify(parsed))
        
        const targetWbName = wordbooks.find(wb => wb.id === targetWordbookId)?.name || '默认'
        const modeText = importMode === 'merge' ? '合并模式' : '替换模式'
        
        let message = `✅ 导入完成（${modeText}）！\n\n`
        if (targetWordbookId) {
          message += `📖 目标单词本：${targetWbName}\n\n`
        }
        message += `✓ 新增单词：${newCount} 个\n`
        if (updatedCount > 0) {
          message += `🔄 更新单词：${updatedCount} 个\n`
        }
        if (skipCount > 0) {
          message += `⊘ 跳过重复：${skipCount} 个\n`
        }
        message += `\n📚 总单词数：${parsed.state.words.length} 个\n📖 单词本数：${parsed.state.wordbooks?.length || 0} 个\n\n请刷新页面查看`
        
        alert(message)
      } else if (Array.isArray(data)) {
        // 旧格式：纯单词数组 - 合并模式
        const raw = localStorage.getItem('engmemo.store')
        const parsed = raw? JSON.parse(raw): {}
        parsed.state = parsed.state || {}
        
        const existingWords = parsed.state.words || []
        const importWords = data
        
        // 创建已有单词的映射
        const existingMap = new Map()
        existingWords.forEach((word: any) => {
          const key = `${word.term.toLowerCase()}_${word.wordbookId || 'default'}`
          existingMap.set(key, word)
        })
        
        // 合并：根据选择的单词本和模式导入
        let newCount = 0
        let skipCount = 0
        let updatedCount = 0
        
        importWords.forEach((word: any) => {
          const finalWordbookId = targetWordbookId || word.wordbookId || 'default'
          const key = `${word.term.toLowerCase()}_${finalWordbookId}`
          
          if (!existingMap.has(key)) {
            existingMap.set(key, {
              ...word,
              wordbookId: finalWordbookId
            })
            newCount++
          } else if (importMode === 'replace') {
            existingMap.set(key, {
              ...word,
              wordbookId: finalWordbookId
            })
            updatedCount++
          } else {
            skipCount++
          }
        })
        
        parsed.state.words = Array.from(existingMap.values())
        localStorage.setItem('engmemo.store', JSON.stringify(parsed))
        
        const targetWbName = wordbooks.find(wb => wb.id === targetWordbookId)?.name || '默认'
        const modeText = importMode === 'merge' ? '合并模式' : '替换模式'
        
        let message = `✅ 导入完成（${modeText}）！\n\n`
        if (targetWordbookId) {
          message += `📖 目标单词本：${targetWbName}\n\n`
        }
        message += `✓ 新增单词：${newCount} 个\n`
        if (updatedCount > 0) {
          message += `🔄 更新单词：${updatedCount} 个\n`
        }
        if (skipCount > 0) {
          message += `⊘ 跳过重复：${skipCount} 个\n`
        }
        message += `\n📚 总单词数：${parsed.state.words.length} 个\n\n请刷新页面查看`
        
        alert(message)
      } else {
        throw new Error('无效的备份文件格式')
      }
    }catch(err:any){
      alert('❌ 导入失败：' + err?.message)
    }finally{
      if(fileRef.current) fileRef.current.value=''
    }
  }

  const quickBackup = async () => {
    let dataToBackup
    let fileName = '英语单词自动备份'
    
    if (backupWordbookId === 'all') {
      // 备份所有数据
      dataToBackup = { words, wordbooks, settings }
      fileName = '英语单词自动备份_全部'
    } else {
      // 备份指定单词本
      const wordbook = wordbooks.find(wb => wb.id === backupWordbookId)
      if (!wordbook) {
        alert('❌ 单词本不存在')
        return
      }
      
      const wordbookWords = words.filter(w => w.wordbookId === backupWordbookId)
      dataToBackup = {
        wordbook: wordbook,
        words: wordbookWords,
        exportTime: new Date().toISOString(),
        version: '1.0'
      }
      fileName = `${wordbook.name}_备份`
    }
    
    // 准备导出数据
    const exportData = backupWordbookId === 'all' ? {
      words: dataToBackup.words || [],
      wordbooks: dataToBackup.wordbooks || [],
      settings: dataToBackup.settings || {},
      exportTime: new Date().toISOString(),
      version: '2.0',
      source: 'manual-backup'
    } : dataToBackup
    
    const fullFileName = `${fileName}_${new Date().toISOString().split('T')[0]}.json`
    
    // 尝试保存到指定文件夹
    const success = await AutoBackup.saveToSelectedFolder(exportData, fullFileName)
    
    if (success) {
      setLastBackupTime(new Date())
      const folderName = AutoBackup.getBackupFolderName() || '下载文件夹'
      
      if (backupWordbookId === 'all') {
        alert(`✅ 备份成功！\n\n已保存到: ${folderName}\n文件名: ${fullFileName}\n\n包含:\n单词: ${words.length} 个\n单词本: ${wordbooks.length} 个`)
      } else {
        const wordbook = wordbooks.find(wb => wb.id === backupWordbookId)
        const wordCount = words.filter(w => w.wordbookId === backupWordbookId).length
        alert(`✅ 备份成功！\n\n已保存到: ${folderName}\n文件名: ${fullFileName}\n\n单词本: ${wordbook?.name}\n单词数: ${wordCount} 个`)
      }
    } else {
      alert('❌ 备份失败，请重试')
    }
  }

  const setupBackupFolder = async () => {
    const success = await AutoBackup.selectBackupFolder()
    if (success) {
      setBackupFolderName(AutoBackup.getBackupFolderName())
    }
  }

  return (
    <div className="space-y-1">
      {/* 自动备份提示 */}
      <div className="p-1 border rounded bg-blue-50/80 backdrop-blur-sm border-blue-200/50">
        <div className="font-semibold text-xs text-blue-800 mb-0.5">💾 数据安全建议</div>
        <div className="text-xs text-blue-700 space-y-0.5">
          <p>• 定期备份单词数据到本地文件，避免数据丢失</p>
          <p>• 换浏览器时可导入备份文件恢复数据</p>
          {lastBackupTime && (
            <p className="text-blue-600">
              上次备份：{lastBackupTime.toLocaleString('zh-CN')}
            </p>
          )}
          {backupFolderName && (
            <p className="text-green-600">
              📁 备份文件夹：{backupFolderName}（本次会话有效）
            </p>
          )}
        </div>
        
        {/* 备份单词本选择 */}
        <div className="mt-0.5 mb-0.5">
          <label className="text-xs font-medium text-blue-800">选择要备份的内容：</label>
          <select 
            value={backupWordbookId}
            onChange={(e) => setBackupWordbookId(e.target.value)}
            className="w-full px-1 py-0.5 border border-blue-300 rounded text-xs focus:ring-1 focus:ring-blue-400 focus:border-blue-400 mt-0.5"
          >
            <option value="all">全部数据（所有单词本 + {words.length} 个单词）</option>
            {wordbooks.map(wb => {
              const wordCount = words.filter(w => w.wordbookId === wb.id).length
              return (
                <option key={wb.id} value={wb.id}>
                  {wb.name}（{wordCount} 个单词）
                </option>
              )
            })}
          </select>
        </div>
        
        <div className="flex gap-1 mt-0.5">
          <button 
            onClick={quickBackup}
            className="px-2 py-0.5 rounded bg-blue-500 text-white text-xs hover:bg-blue-600 transition-colors"
          >
            💾 立即备份
          </button>
          <button 
            onClick={setupBackupFolder}
            className="px-2 py-0.5 rounded bg-green-500 text-white text-xs hover:bg-green-600 transition-colors"
            title="设置固定备份文件夹，如 F:\英语\单词"
          >
            📁 设置备份文件夹
          </button>
        </div>
      </div>

      <div className="p-1 border rounded bg-white/80 backdrop-blur-sm border-white/20 space-y-0.5">
        <div className="font-semibold text-xs">导出数据</div>
        <button onClick={exportJSON} className="px-1 py-0.5 rounded bg-gray-800 text-white text-xs">导出 JSON</button>
      </div>

      <div className="p-1 border rounded bg-white/80 backdrop-blur-sm border-white/20 space-y-0.5">
        <div className="font-semibold text-xs">导入数据</div>
        
        {/* 单词本选择器 */}
        <div className="space-y-0.5">
          <label className="text-xs font-medium text-gray-700">导入到单词本：</label>
          <select 
            value={targetWordbookId}
            onChange={(e) => setTargetWordbookId(e.target.value)}
            className="w-full px-1 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="">保持原单词本（如果有）</option>
            {wordbooks.map(wb => {
              const wordCount = words.filter(w => w.wordbookId === wb.id).length
              return (
                <option key={wb.id} value={wb.id}>
                  {wb.name} ({wordCount} 个单词)
                </option>
              )
            })}
          </select>
        </div>
        
        {/* 导入模式选择器 */}
        <div className="space-y-0.5">
          <label className="text-xs font-medium text-gray-700">导入模式：</label>
          <div className="flex gap-1">
            <label className="flex items-center gap-0.5 text-xs cursor-pointer">
              <input 
                type="radio" 
                name="importMode" 
                value="merge"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
                className="w-2 h-2"
              />
              <span>合并（跳过重复）</span>
            </label>
            <label className="flex items-center gap-0.5 text-xs cursor-pointer">
              <input 
                type="radio" 
                name="importMode" 
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="w-2 h-2"
              />
              <span>替换（更新重复）</span>
            </label>
          </div>
        </div>
        
        {/* 文件选择 */}
        <input ref={fileRef} type="file" accept="application/json" onChange={onImport} className="text-xs w-full" />
        
        {/* 说明 */}
        <div className="text-xs text-gray-500 space-y-0.5 bg-gray-50 p-0.5 rounded">
          <p>• 支持导入自动备份文件（包含单词、单词本、设置）</p>
          <p>• 支持导入旧版单词数组文件</p>
          {importMode === 'merge' ? (
            <p className="text-green-600">✓ 合并模式：保留已有单词，只添加新单词</p>
          ) : (
            <p className="text-orange-600">⚠️ 替换模式：会更新重复的单词数据</p>
          )}
          {targetWordbookId && (
            <p className="text-blue-600">
              📖 导入目标：{wordbooks.find(wb => wb.id === targetWordbookId)?.name}
            </p>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500">
        当前词条数：{words.length}，语音重复次数：{settings.ttsRepeat}，语速：{settings.ttsRate}
      </div>
    </div>
  )
}
