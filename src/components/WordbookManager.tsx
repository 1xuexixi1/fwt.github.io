import { useState } from 'react'
import { useStore } from '../store'
import type { Wordbook } from '../types'

interface WordbookManagerProps {
  onClose: () => void
}

export default function WordbookManager({ onClose }: WordbookManagerProps) {
  const { wordbooks, words, addWordbook, updateWordbook, removeWordbook, setCurrentWordbook, settings, exportWordbook, importWordbook } = useStore()
  const [editingId, setEditingId] = useState<string | undefined>()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importFileData, setImportFileData] = useState<string | null>(null)
  const [selectedTargetWordbook, setSelectedTargetWordbook] = useState<string>('')
  const [importPreview, setImportPreview] = useState<{ wordbookName: string; wordCount: number } | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      if (editingId) {
        updateWordbook(editingId, { name: name.trim(), description: description.trim() })
        setEditingId(undefined)
      } else {
        addWordbook({ name: name.trim(), description: description.trim() })
      }
      setName('')
      setDescription('')
    } catch (error) {
      alert(error instanceof Error ? error.message : '操作失败')
    }
  }

  const handleEdit = (wordbook: Wordbook) => {
    setEditingId(wordbook.id)
    setName(wordbook.name)
    setDescription(wordbook.description || '')
  }

  const handleCancel = () => {
    setEditingId(undefined)
    setName('')
    setDescription('')
  }

  const handleDelete = (id: string, name: string) => {
    if (confirm(`确定要删除单词本"${name}"吗？这将同时删除该单词本中的所有单词。`)) {
      removeWordbook(id)
    }
  }

  const handleSelect = (id: string) => {
    setCurrentWordbook(id)
    onClose()
  }

  const handleExport = (wordbookId: string, wordbookName: string) => {
    try {
      const wordCount = words.filter(w => w.wordbookId === wordbookId).length
      exportWordbook(wordbookId)
      setMessage(`✅ 成功导出单词本"${wordbookName}"，包含 ${wordCount} 个单词`)
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      setMessage('❌ 导出失败')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleImportClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      try {
        const text = await file.text()
        
        // 解析并预览文件内容
        try {
          const data = JSON.parse(text)
          console.log('📄 导入文件内容:', data)
          
          const wordbookName = data.wordbook?.name || '未知单词本'
          const wordCount = Array.isArray(data.words) ? data.words.length : 0
          
          console.log(`📊 解析结果: 单词本="${wordbookName}", 单词数=${wordCount}`)
          
          if (wordCount === 0) {
            setMessage('⚠️ 文件中没有单词数据，请检查文件格式')
            setTimeout(() => setMessage(''), 5000)
            return
          }
          
          setImportPreview({ wordbookName, wordCount })
          setImportFileData(text)
          setShowImportDialog(true)
          setSelectedTargetWordbook('') // 默认不选择（创建新单词本）
        } catch (parseError) {
          console.error('❌ JSON解析失败:', parseError)
          setMessage('❌ 文件格式错误，请选择有效的JSON文件')
          setTimeout(() => setMessage(''), 5000)
        }
      } catch (error) {
        console.error('❌ 文件读取失败:', error)
        setMessage('❌ 文件读取失败')
        setTimeout(() => setMessage(''), 3000)
      }
    }
    input.click()
  }

  const handleConfirmImport = () => {
    if (!importFileData) return
    
    try {
      const result = importWordbook(importFileData, selectedTargetWordbook || undefined)
      
      if (result.isAppend) {
        setMessage(
          `✅ 已追加到"${result.wordbookName}"，新增 ${result.newCount} 个单词` +
          (result.skippedCount > 0 ? `，跳过 ${result.skippedCount} 个重复单词` : '')
        )
      } else {
        setMessage(`✅ 已创建新单词本"${result.wordbookName}"，包含 ${result.newCount} 个单词`)
      }
      
      setShowImportDialog(false)
      setImportFileData(null)
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      setMessage(error instanceof Error ? `❌ ${error.message}` : '❌ 导入失败')
      setTimeout(() => setMessage(''), 5000)
    }
  }

  const handleCancelImport = () => {
    setShowImportDialog(false)
    setImportFileData(null)
    setSelectedTargetWordbook('')
    setImportPreview(null)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">单词本管理</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* 消息提示 */}
          {message && (
            <div className={`p-2 rounded text-sm ${
              message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 
              'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* 当前选中的单词本 */}
          {settings.currentWordbookId && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm text-blue-600 mb-1">当前单词本</div>
              <div className="font-medium">
                {wordbooks.find(w => w.id === settings.currentWordbookId)?.name || '未知'}
              </div>
            </div>
          )}
          
          {/* 导入单词本按钮 */}
          <div className="flex gap-2">
            <button
              onClick={handleImportClick}
              className="px-4 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 flex items-center gap-2"
            >
              📥 导入单词本
            </button>
            <div className="text-xs text-gray-500 flex items-center">
              可导入到现有单词本或创建新单词本
            </div>
          </div>

          {/* 创建/编辑表单 */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                单词本名称 *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入单词本名称"
                className="w-full border rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                描述（可选）
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入单词本描述"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                {editingId ? '更新' : '创建'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                >
                  取消
                </button>
              )}
            </div>
          </form>

          {/* 单词本列表 */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">单词本列表</div>
            {wordbooks.length === 0 ? (
              <div className="text-gray-500 text-sm">暂无单词本</div>
            ) : (
              <div className="space-y-2">
                {wordbooks.map((wordbook) => (
                  <div
                    key={wordbook.id}
                    className={`p-3 border rounded-lg ${
                      settings.currentWordbookId === wordbook.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{wordbook.name}</div>
                          {wordbook.isDefault && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              默认
                            </span>
                          )}
                          {settings.currentWordbookId === wordbook.id && (
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                              当前
                            </span>
                          )}
                        </div>
                        {wordbook.description && (
                          <div className="text-sm text-gray-600 mt-1">
                            {wordbook.description}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {words.filter(w => w.wordbookId === wordbook.id).length} 个单词
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2 flex-wrap">
                        <button
                          onClick={() => handleSelect(wordbook.id)}
                          className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 whitespace-nowrap"
                        >
                          选择
                        </button>
                        <button
                          onClick={() => handleExport(wordbook.id, wordbook.name)}
                          className="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 whitespace-nowrap"
                          title="导出为JSON文件"
                        >
                          📤导出
                        </button>
                        <button
                          onClick={() => handleEdit(wordbook)}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                        >
                          编辑
                        </button>
                        {!wordbook.isDefault && (
                          <button
                            onClick={() => handleDelete(wordbook.id, wordbook.name)}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 whitespace-nowrap"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 导入选择对话框 */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">选择导入方式</h3>
            </div>
            
            <div className="p-4 space-y-4">
              {/* 文件预览信息 */}
              {importPreview && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-blue-900">📦 导入文件预览</div>
                  <div className="text-sm text-blue-700 mt-1">
                    单词本名称: <span className="font-semibold">{importPreview.wordbookName}</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    单词数量: <span className="font-semibold">{importPreview.wordCount} 个</span>
                  </div>
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                请选择要将单词导入到哪个单词本：
              </div>
              
              {/* 创建新单词本选项 */}
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="importTarget"
                  value=""
                  checked={selectedTargetWordbook === ''}
                  onChange={(e) => setSelectedTargetWordbook(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">创建新单词本</div>
                  <div className="text-xs text-gray-500">作为独立的新单词本导入</div>
                </div>
              </label>
              
              {/* 现有单词本列表 */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">或追加到现有单词本：</div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {wordbooks.map((wordbook) => (
                    <label
                      key={wordbook.id}
                      className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="importTarget"
                        value={wordbook.id}
                        checked={selectedTargetWordbook === wordbook.id}
                        onChange={(e) => setSelectedTargetWordbook(e.target.value)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{wordbook.name}</div>
                        <div className="text-xs text-gray-500">
                          当前有 {words.filter(w => w.wordbookId === wordbook.id).length} 个单词
                          {selectedTargetWordbook === wordbook.id && (
                            <span className="text-orange-600"> · 重复的单词将自动跳过</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t flex gap-2 justify-end">
              <button
                onClick={handleCancelImport}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
              >
                取消
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-4 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
