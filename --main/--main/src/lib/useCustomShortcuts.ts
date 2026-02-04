import { useEffect, useCallback } from 'react'

export interface ShortcutConfig {
  id: string
  name: string
  description: string
  defaultKey: string
  customKey?: string
  action: () => void
  enabled: boolean
}

export interface ShortcutSettings {
  [key: string]: {
    key: string
    enabled: boolean
  }
}

const STORAGE_KEY = 'custom-shortcuts'

// 默认快捷键配置
export const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  {
    id: 'save-word',
    name: '保存单词',
    description: '快速保存当前单词',
    defaultKey: 'ctrl+enter',
    action: () => {},
    enabled: true
  },
  {
    id: 'save-word-alt',
    name: '保存单词(备用)',
    description: '快速保存当前单词的备用快捷键',
    defaultKey: 'ctrl+s',
    action: () => {},
    enabled: true
  },
  {
    id: 'cancel',
    name: '取消操作',
    description: '取消当前操作并关闭弹窗',
    defaultKey: 'escape',
    action: () => {},
    enabled: true
  },
  {
    id: 'focus-chinese',
    name: '跳转中文输入',
    description: '从英文输入框跳转到中文输入框',
    defaultKey: 'tab',
    action: () => {},
    enabled: true
  },
  {
    id: 'get-chinese',
    name: '获取中文释义',
    description: '自动获取当前单词的中文释义',
    defaultKey: 'f1',
    action: () => {},
    enabled: true
  },
  {
    id: 'get-ipa',
    name: '获取音标',
    description: '自动获取当前单词的音标',
    defaultKey: 'f2',
    action: () => {},
    enabled: true
  },
  {
    id: 'get-all-info',
    name: '获取所有信息',
    description: '自动获取单词的所有信息（音标、释义、音频等）',
    defaultKey: 'f3',
    action: () => {},
    enabled: true
  }
]

// 解析快捷键字符串
function parseShortcut(shortcut: string): { key: string; ctrl: boolean; shift: boolean; alt: boolean } {
  const parts = shortcut.toLowerCase().split('+').map(s => s.trim())
  const result = {
    key: '',
    ctrl: false,
    shift: false,
    alt: false
  }
  
  for (const part of parts) {
    if (part === 'ctrl') result.ctrl = true
    else if (part === 'shift') result.shift = true
    else if (part === 'alt') result.alt = true
    else result.key = part
  }
  
  return result
}

// 检查按键是否匹配快捷键
function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut)
  
  return (
    event.key.toLowerCase() === parsed.key &&
    event.ctrlKey === parsed.ctrl &&
    event.shiftKey === parsed.shift &&
    event.altKey === parsed.alt
  )
}

// 从本地存储加载快捷键设置
export function loadShortcutSettings(): ShortcutSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// 保存快捷键设置到本地存储
export function saveShortcutSettings(settings: ShortcutSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('保存快捷键设置失败:', error)
  }
}

// 获取有效的快捷键
export function getEffectiveShortcut(shortcutId: string, settings: ShortcutSettings): string {
  const setting = settings[shortcutId]
  if (setting && setting.enabled) {
    return setting.key
  }
  
  const defaultShortcut = DEFAULT_SHORTCUTS.find(s => s.id === shortcutId)
  return defaultShortcut?.defaultKey || ''
}

// 自定义快捷键Hook
export function useCustomShortcuts(shortcuts: ShortcutConfig[]) {
  const settings = loadShortcutSettings()
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 忽略在输入框中的快捷键（除了全局快捷键）
      const target = event.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true'
      
      for (const shortcut of shortcuts) {
        if (!shortcut.enabled) continue
        
        const effectiveKey = getEffectiveShortcut(shortcut.id, settings)
        if (!effectiveKey) continue
        
        // 对于输入框，只允许全局快捷键（ctrl+enter, ctrl+s, escape等）
        if (isInput && !['ctrl+enter', 'ctrl+s', 'escape'].includes(effectiveKey)) {
          continue
        }
        
        if (matchesShortcut(event, effectiveKey)) {
          event.preventDefault()
          shortcut.action()
          break
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, settings])
  
  return {
    settings,
    loadShortcutSettings,
    saveShortcutSettings,
    getEffectiveShortcut
  }
}

// 快捷键显示格式化
export function formatShortcutDisplay(shortcut: string): string {
  return shortcut
    .split('+')
    .map(key => {
      const keyMap: { [key: string]: string } = {
        'ctrl': 'Ctrl',
        'shift': 'Shift',
        'alt': 'Alt',
        'escape': 'Esc',
        'enter': 'Enter',
        'space': 'Space',
        'tab': 'Tab',
        'backspace': 'Backspace',
        'delete': 'Delete',
        'arrowup': '↑',
        'arrowdown': '↓',
        'arrowleft': '←',
        'arrowright': '→'
      }
      return keyMap[key.toLowerCase()] || key.toUpperCase()
    })
    .join(' + ')
}
