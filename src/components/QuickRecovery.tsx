import { useState, useEffect } from 'react'
import { useStore } from '../store'

export default function QuickRecovery() {
  const { words, wordbooks, getBackups, restoreFromBackup, createBackup } = useStore()
  const [backups, setBackups] = useState<any[]>([])
  const [showRecovery, setShowRecovery] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const availableBackups = getBackups()
    setBackups(availableBackups)
    
    // 如果当前没有单词但有备份，自动显示恢复选项
    if (words.length === 0 && availableBackups.length > 0) {
      setShowRecovery(true)
      setMessage('🔍 检测到您之前有备份数据，是否要恢复？')
    }
  }, [words.length, getBackups])

  const handleQuickRecovery = () => {
    if (backups.length === 0) {
      setMessage('❌ 没有找到可用的备份数据')
      return
    }

    try {
      // 恢复最新的备份
      restoreFromBackup(0)
      setMessage('✅ 数据恢复成功！您的单词已恢复')
      setShowRecovery(false)
    } catch (error) {
      setMessage('❌ 数据恢复失败，请检查备份数据')
    }
  }

  const handleCreateBackup = () => {
    try {
      createBackup()
      setBackups(getBackups()) // 刷新备份列表
      setMessage('✅ 备份创建成功！数据已安全保存到本地存储')
      // 5秒后自动清除提示
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      setMessage('❌ 备份创建失败，请重试')
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  if (!showRecovery && words.length > 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-1 mb-1">
        <div className="text-xs text-green-800">
          <div className="font-medium">✅ 数据状态正常</div>
          <div>当前有 {words.length} 个单词，{wordbooks.length} 个单词本</div>
          <button
            onClick={handleCreateBackup}
            className="mt-0.5 px-1 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600"
          >
            📦 备份当前数据
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-1 mb-1">
      <div className="text-xs text-blue-800">
        <div className="font-medium mb-0.5">🔄 数据恢复助手</div>
        
        {message && (
          <div className={`mb-0.5 p-0.5 rounded text-xs ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 
            message.includes('❌') ? 'bg-red-100 text-red-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            {message}
          </div>
        )}

        {backups.length > 0 ? (
          <div>
            <div className="mb-0.5">找到 {backups.length} 个备份：</div>
            <div className="space-y-0.5 max-h-20 overflow-y-auto">
              {backups.slice(0, 3).map((backup, index) => (
                <div key={backup.timestamp} className="text-xs bg-white p-0.5 rounded">
                  <div className="font-medium">备份 #{index + 1}</div>
                  <div className="text-gray-600">
                    {formatDate(backup.timestamp)} - {backup.data.words?.length || 0} 个单词
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-0.5 mt-0.5">
              <button
                onClick={handleQuickRecovery}
                className="px-1 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                🚀 快速恢复最新备份
              </button>
              <button
                onClick={() => setShowRecovery(false)}
                className="px-1 py-0.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
              >
                稍后处理
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-0.5">没有找到备份数据</div>
            <div className="text-gray-600">
              如果您之前有数据，可能已经被清除。建议：
            </div>
            <ul className="text-xs text-gray-600 mt-0.5 space-y-0.5">
              <li>• 检查浏览器是否清除了本地存储</li>
              <li>• 尝试从其他设备或浏览器恢复</li>
              <li>• 重新开始添加单词</li>
            </ul>
            <button
              onClick={() => setShowRecovery(false)}
              className="mt-0.5 px-1 py-0.5 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
            >
              我知道了
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
