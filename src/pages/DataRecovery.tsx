import { useState, useEffect } from 'react'
import { useStore } from '../store'

export default function DataRecovery() {
  const { createBackup, restoreFromBackup, restoreAsNewWordbook, getBackups, words, wordbooks, backgroundImages } = useStore()
  const [backups, setBackups] = useState<any[]>([])
  const [message, setMessage] = useState('')
  // const [showAdvanced] = useState(false)

  useEffect(() => {
    setBackups(getBackups())
  }, [])

  const handleCreateBackup = () => {
    try {
      createBackup()
      setBackups(getBackups())
      const currentTime = new Date().toLocaleString('zh-CN')
      setMessage(`✅ 备份创建成功！时间：${currentTime}，包含 ${words.length} 个单词，${wordbooks.length} 个单词本`)
      setTimeout(() => setMessage(''), 8000) // 8秒后清除
    } catch (error) {
      setMessage('❌ 备份创建失败，请检查存储空间或重试')
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const handleRestore = (backupIndex: number) => {
    if (confirm('确定要恢复这个备份吗？当前数据将被完全覆盖！\n\n如果只想恢复单词不想覆盖现有数据，请使用"恢复为新单词本"功能。')) {
      try {
        restoreFromBackup(backupIndex)
        setMessage('✅ 数据恢复成功！')
        setBackups(getBackups()) // 刷新备份列表
        setTimeout(() => setMessage(''), 3000)
      } catch (error) {
        setMessage('❌ 数据恢复失败')
        setTimeout(() => setMessage(''), 3000)
      }
    }
  }

  const handleRestoreAsNewWordbook = async (backupIndex: number) => {
    try {
      const backup = backups[backupIndex]
      const wordCount = backup.data.words?.length || 0
      
      if (confirm(`确定要将这个备份恢复为新单词本吗？\n\n这将创建一个包含 ${wordCount} 个单词的新单词本，不会影响现有数据。`)) {
        const newWordbookId = await restoreAsNewWordbook(backupIndex)
        setMessage(`✅ 已成功恢复为新单词本！包含 ${wordCount} 个单词`)
        setTimeout(() => setMessage(''), 5000)
      }
    } catch (error) {
      setMessage('❌ 恢复为新单词本失败')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleQuickRestore = () => {
    if (backups.length === 0) {
      setMessage('❌ 没有可用的备份')
      return
    }
    
    if (confirm('确定要恢复最新的备份吗？这将完全覆盖当前所有数据！\n\n如果只想恢复单词不想覆盖现有数据，请使用"恢复为新单词本"功能。')) {
      try {
        restoreFromBackup(0) // 恢复最新的备份
        setMessage('✅ 快速恢复成功！')
        setBackups(getBackups())
        setTimeout(() => setMessage(''), 3000)
      } catch (error) {
        setMessage('❌ 快速恢复失败')
        setTimeout(() => setMessage(''), 3000)
      }
    }
  }

  const handleQuickRestoreAsNew = async () => {
    if (backups.length === 0) {
      setMessage('❌ 没有可用的备份')
      return
    }
    
    try {
      const backup = backups[0]
      const wordCount = backup.data.words?.length || 0
      
      if (confirm(`确定要将最新备份恢复为新单词本吗？\n\n这将创建一个包含 ${wordCount} 个单词的新单词本，不会影响现有数据。`)) {
        await restoreAsNewWordbook(0)
        setMessage(`✅ 已成功恢复为新单词本！包含 ${wordCount} 个单词`)
        setTimeout(() => setMessage(''), 5000)
      }
    } catch (error) {
      setMessage('❌ 恢复为新单词本失败')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  return (
    <div className="space-y-1">
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-1">
        <h1 className="text-xs font-semibold mb-0.5">🔄 数据备份与恢复</h1>
        <p className="text-xs text-gray-600 mb-1">
          当前数据：{words.length} 个单词，{wordbooks.length} 个单词本，{backgroundImages.length} 个背景图
        </p>
        
        <div className="flex gap-0.5 flex-wrap">
          <button
            onClick={handleCreateBackup}
            className="px-1 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            📦 创建备份
          </button>
          {backups.length > 0 && (
            <>
              <button
                onClick={handleQuickRestoreAsNew}
                className="px-1 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
              >
                ✨ 恢复为新单词本
              </button>
              <button
                onClick={handleQuickRestore}
                className="px-1 py-0.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
              >
                ⚠️ 完全覆盖恢复
              </button>
            </>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-0.5 rounded text-center text-xs font-medium ${
          message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-1">
        <h2 className="text-xs font-semibold mb-0.5">📋 备份列表</h2>
        
        {backups.length === 0 ? (
          <p className="text-xs text-gray-500">暂无备份</p>
        ) : (
          <div className="space-y-0.5">
            {backups.map((backup, index) => (
              <div key={backup.timestamp} className="flex items-center justify-between p-0.5 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="text-xs font-medium">
                    备份 #{index + 1}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(backup.timestamp)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {backup.data.words?.length || 0} 个单词，{backup.data.wordbooks?.length || 0} 个单词本，{backup.data.backgroundImages?.length || 0} 个背景图
                    {backup.isCompressed && (
                      <span className="ml-1 text-orange-600">（已压缩）</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => handleRestoreAsNewWordbook(index)}
                    className="px-1 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors whitespace-nowrap"
                    title="创建新单词本，不影响现有数据"
                  >
                    恢复为新本
                  </button>
                  <button
                    onClick={() => handleRestore(index)}
                    className="px-1 py-0.5 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors whitespace-nowrap"
                    title="完全覆盖当前所有数据"
                  >
                    完全覆盖
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-0.5">
        <div className="text-xs text-yellow-800">
          <div className="font-medium mb-0.5">💡 使用说明</div>
          <ul className="space-y-0.5 text-xs">
            <li className="font-semibold text-green-700">✨ 恢复为新单词本（推荐）：</li>
            <li className="ml-3">• 创建新的单词本保存恢复的单词</li>
            <li className="ml-3">• 不会影响现有的单词和单词本</li>
            <li className="ml-3">• 安全可靠，适合日常使用</li>
            <li className="font-semibold text-orange-700 mt-1">⚠️ 完全覆盖恢复（慎用）：</li>
            <li className="ml-3">• 会删除所有现有数据</li>
            <li className="ml-3">• 用备份数据完全替换</li>
            <li className="ml-3">• 谨慎操作，仅在需要完全恢复时使用</li>
            <li className="font-semibold mt-1">📦 备份策略：</li>
            <li className="ml-3">• 数据变化超过10条时自动备份</li>
            <li className="ml-3">• 单词本变化时总是备份</li>
            <li className="ml-3">• 最多保留 10 个备份</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
