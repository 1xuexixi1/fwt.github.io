import { useState, useEffect } from 'react'
import { 
  DEFAULT_SHORTCUTS, 
  loadShortcutSettings, 
  saveShortcutSettings, 
  formatShortcutDisplay,
  type ShortcutConfig,
  type ShortcutSettings 
} from '../lib/useCustomShortcuts'

export default function ShortcutSettings() {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>(DEFAULT_SHORTCUTS)
  const [settings, setSettings] = useState<ShortcutSettings>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadedSettings = loadShortcutSettings()
    setSettings(loadedSettings)
  }, [])

  const handleKeyChange = (shortcutId: string, newKey: string) => {
    const updatedSettings = {
      ...settings,
      [shortcutId]: {
        key: newKey,
        enabled: settings[shortcutId]?.enabled ?? true
      }
    }
    setSettings(updatedSettings)
    saveShortcutSettings(updatedSettings)
    setMessage('✅ 快捷键已更新')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleToggleEnabled = (shortcutId: string) => {
    const updatedSettings = {
      ...settings,
      [shortcutId]: {
        key: settings[shortcutId]?.key || DEFAULT_SHORTCUTS.find(s => s.id === shortcutId)?.defaultKey || '',
        enabled: !(settings[shortcutId]?.enabled ?? true)
      }
    }
    setSettings(updatedSettings)
    saveShortcutSettings(updatedSettings)
    setMessage('✅ 快捷键状态已更新')
    setTimeout(() => setMessage(''), 3000)
  }

  const resetToDefaults = () => {
    setSettings({})
    saveShortcutSettings({})
    setMessage('✅ 已重置为默认快捷键')
    setTimeout(() => setMessage(''), 3000)
  }

  const getEffectiveKey = (shortcutId: string): string => {
    const setting = settings[shortcutId]
    if (setting && setting.enabled) {
      return setting.key
    }
    const defaultShortcut = DEFAULT_SHORTCUTS.find(s => s.id === shortcutId)
    return defaultShortcut?.defaultKey || ''
  }

  const startEditing = (shortcutId: string) => {
    setEditingId(shortcutId)
    setNewKey(getEffectiveKey(shortcutId))
  }

  const saveEdit = () => {
    if (editingId && newKey.trim()) {
      handleKeyChange(editingId, newKey.trim().toLowerCase())
      setEditingId(null)
      setNewKey('')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setNewKey('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            ⌨️ 自定义快捷键设置
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            设置您喜欢的快捷键组合，提高操作效率
          </p>
        </div>

        {message && (
          <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            {message}
          </div>
        )}

        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-md font-medium text-gray-700">快捷键列表</h2>
            <button
              onClick={resetToDefaults}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              🔄 重置为默认
            </button>
          </div>

          <div className="space-y-3">
            {shortcuts.map((shortcut) => {
              const effectiveKey = getEffectiveKey(shortcut.id)
              const isEnabled = settings[shortcut.id]?.enabled ?? true
              const isEditing = editingId === shortcut.id

              return (
                <div
                  key={shortcut.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    isEnabled 
                      ? 'bg-white border-gray-200 hover:border-gray-300' 
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-800">{shortcut.name}</h3>
                        <span className="text-sm text-gray-500">{shortcut.description}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* 快捷键显示/编辑 */}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newKey}
                              onChange={(e) => setNewKey(e.target.value)}
                              onKeyDown={handleKeyPress}
                              className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                              placeholder="输入快捷键"
                              autoFocus
                            />
                            <button
                              onClick={saveEdit}
                              className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                            >
                              ✓
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm font-mono">
                              {formatShortcutDisplay(effectiveKey)}
                            </kbd>
                            <button
                              onClick={() => startEditing(shortcut.id)}
                              className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            >
                              编辑
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 启用/禁用开关 */}
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => handleToggleEnabled(shortcut.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">
                          {isEnabled ? '启用' : '禁用'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            <h3 className="font-medium mb-2">💡 使用说明：</h3>
            <ul className="space-y-1 text-gray-500">
              <li>• 点击"编辑"按钮可以修改快捷键</li>
              <li>• 支持组合键：Ctrl、Shift、Alt + 其他键</li>
              <li>• 特殊键：Enter、Space、Tab、Esc、F1-F12、方向键等</li>
              <li>• 禁用快捷键后，该功能将不会响应键盘操作</li>
              <li>• 在输入框中，只有全局快捷键（如Ctrl+Enter）会生效</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
