import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Word, Settings, Wordbook, BackgroundImage } from './types'

function uid(){ return crypto.randomUUID?.() || Math.random().toString(36).slice(2) }

// 数据备份和恢复工具
class DataBackup {
  private static BACKUP_KEY = 'engmemo_backup'
  private static MAX_BACKUPS = 10
  private static MIN_BACKUP_INTERVAL = 5 * 60 * 1000 // 5分钟最小间隔
  private static lastBackupTime = 0

  // 检查是否需要备份
  static shouldBackup(data: any): boolean {
    const now = Date.now()
    const timeSinceLastBackup = now - this.lastBackupTime
    
    // 如果距离上次备份不足5分钟，不备份
    if (timeSinceLastBackup < this.MIN_BACKUP_INTERVAL) {
      return false
    }
    
    // 检查数据是否有实质性变化
    const backups = this.getBackups()
    if (backups.length === 0) {
      return true // 首次备份
    }
    
    const lastBackup = backups[0]
    if (!lastBackup) {
      return true
    }
    
    // 比较单词数量变化
    const currentWordCount = data.words?.length || 0
    const lastWordCount = lastBackup.data.words?.length || 0
    
    // 只有单词数量变化超过10个时才备份
    if (Math.abs(currentWordCount - lastWordCount) >= 10) {
      return true
    }
    
    // 检查是否有新单词本（单词本变化时总是备份）
    const currentWordbookCount = data.wordbooks?.length || 0
    const lastWordbookCount = lastBackup.data.wordbooks?.length || 0
    
    if (currentWordbookCount !== lastWordbookCount) {
      return true
    }
    
    return false
  }

  // 创建备份
  static createBackup(data: any) {
    try {
      const backup = {
        timestamp: Date.now(),
        data: JSON.parse(JSON.stringify(data)), // 深拷贝
        version: '1.0'
      }
      
      const backups = this.getBackups()
      backups.unshift(backup)
      
      // 只保留最近的备份
      if (backups.length > this.MAX_BACKUPS) {
        backups.splice(this.MAX_BACKUPS)
      }
      
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backups))
      this.lastBackupTime = Date.now()
      console.log(`✅ 数据备份已创建 - ${new Date().toLocaleString('zh-CN')}`)
    } catch (error) {
      console.error('❌ 备份失败:', error)
    }
  }

  // 获取所有备份
  static getBackups() {
    try {
      const backups = localStorage.getItem(this.BACKUP_KEY)
      return backups ? JSON.parse(backups) : []
    } catch (error) {
      console.error('❌ 获取备份失败:', error)
      return []
    }
  }

  // 恢复数据
  static restoreData(backupIndex: number = 0) {
    try {
      const backups = this.getBackups()
      if (backups.length === 0) {
        throw new Error('没有可用的备份')
      }
      
      const backup = backups[backupIndex]
      if (!backup) {
        throw new Error('备份不存在')
      }
      
      return backup.data
    } catch (error) {
      console.error('❌ 恢复数据失败:', error)
      throw error
    }
  }

  // 智能自动备份（只在有10条以上变化时备份）
  static autoBackup(currentData: any) {
    if (this.shouldBackup(currentData)) {
      this.createBackup(currentData)
    }
  }
}

type State = {
  words: Word[]
  wordbooks: Wordbook[]
  settings: Settings
  backgroundImages: BackgroundImage[]
}

type Actions = {
  addWord: (w: Omit<Word, 'id'|'createdAt'|'updatedAt'|'proficiency'|'wordbookId'> & { proficiency?: number, wordbookId?: string }) => void
  updateWord: (id: string, patch: Partial<Word>) => void
  removeWord: (id: string) => void
  addWordbook: (w: Omit<Wordbook, 'id'|'createdAt'|'updatedAt'>) => void
  updateWordbook: (id: string, patch: Partial<Wordbook>) => void
  removeWordbook: (id: string) => void
  setCurrentWordbook: (id: string) => void
  setSettings: (patch: Partial<Settings>) => void
  seedIfEmpty: () => void
  // 数据备份和恢复功能
  createBackup: () => void
  restoreFromBackup: (backupIndex?: number) => void
  restoreAsNewWordbook: (backupIndex?: number) => Promise<string>
  getBackups: () => any[]
  exportWordbook: (wordbookId: string) => void
  importWordbook: (data: string, targetWordbookId?: string) => { wordbookName: string; newCount: number; skippedCount: number; isAppend: boolean }
  // 背景图管理功能
  addBackgroundImage: (image: Omit<BackgroundImage, 'id'|'createdAt'>) => void
  removeBackgroundImage: (id: string) => void
  setCustomBackground: (url: string) => void
  clearCustomBackground: () => void
}

const defaultSettings: Settings = {
  ttsRate: 1,
  ttsRepeat: 2,
  showIPA: true,
  quizOrder: 'random',
  quizMode: 'zh_to_en',
  currentWordbookId: undefined,
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      words: [],
      wordbooks: [],
      settings: defaultSettings,
      backgroundImages: [],
      addWord: (w) => set(({words, settings}) => {
        const term = w.term.trim().toLowerCase()
        const currentWordbookId = w.wordbookId || settings.currentWordbookId
        
        if (!currentWordbookId) {
          throw new Error('请先选择一个单词本')
        }
        
        // 检查是否已存在相同的单词（在当前单词本中）
        const existingWord = words.find(word => 
          word.term.toLowerCase() === term && word.wordbookId === currentWordbookId
        )
        if (existingWord) {
          throw new Error(`单词 "${w.term}" 已存在于当前单词本中`)
        }
        
        const now = Date.now()
        const word: Word = {
          id: uid(), term: w.term.trim(), meaningZh: w.meaningZh.trim(),
          ipa: w.ipa, meaningEn: w.meaningEn, examples: w.examples||[], tags: w.tags||[],
          audioUrls: w.audioUrls||[], proficiency: w.proficiency ?? 0,
          createdAt: now, updatedAt: now, wordbookId: currentWordbookId
        }
        const newWords = [word, ...words]
        
        // 智能自动备份（只在有实质性变化时备份）
        DataBackup.autoBackup({ words: newWords, wordbooks: get().wordbooks, settings, backgroundImages: get().backgroundImages })
        
        return { words: newWords }
      }),
      updateWord: (id, patch) => set(({words}) => {
        const newWords = words.map(w => w.id===id? {...w, ...patch, updatedAt: Date.now()}: w)
        // 智能自动备份（只在有实质性变化时备份）
        DataBackup.autoBackup({ words: newWords, wordbooks: get().wordbooks, settings: get().settings, backgroundImages: get().backgroundImages })
        return { words: newWords }
      }),
      removeWord: (id) => set(({words}) => {
        const newWords = words.filter(w => w.id!==id)
        // 智能自动备份（只在有实质性变化时备份）
        DataBackup.autoBackup({ words: newWords, wordbooks: get().wordbooks, settings: get().settings, backgroundImages: get().backgroundImages })
        return { words: newWords }
      }),
      addWordbook: (w) => set(({wordbooks}) => {
        const now = Date.now()
        const wordbook: Wordbook = {
          id: uid(), name: w.name.trim(), description: w.description?.trim(),
          createdAt: now, updatedAt: now, isDefault: w.isDefault
        }
        const newWordbooks = [wordbook, ...wordbooks]
        
        // 智能自动备份（单词本变化时总是备份）
        DataBackup.autoBackup({ words: get().words, wordbooks: newWordbooks, settings: get().settings, backgroundImages: get().backgroundImages })
        
        return { wordbooks: newWordbooks }
      }),
      updateWordbook: (id, patch) => set(({wordbooks}) => ({
        wordbooks: wordbooks.map(w => w.id===id? {...w, ...patch, updatedAt: Date.now()}: w)
      })),
      removeWordbook: (id) => set(({wordbooks, words}) => ({
        wordbooks: wordbooks.filter(w => w.id!==id),
        words: words.filter(w => w.wordbookId !== id)
      })),
      setCurrentWordbook: (id) => set(({settings}) => ({
        settings: { ...settings, currentWordbookId: id }
      })),
      setSettings: (patch) => set(({settings}) => ({ settings: { ...settings, ...patch } })),
      seedIfEmpty: () => {
        const { words, wordbooks } = get()
        if (wordbooks.length === 0) {
          const now = Date.now()
          const defaultWordbook: Wordbook = {
            id: uid(), name: '默认单词本', description: '系统默认单词本',
            createdAt: now, updatedAt: now, isDefault: true
          }
          set({ wordbooks: [defaultWordbook] })
        }
        if (words.length === 0 && wordbooks.length > 0) {
          const now = Date.now()
          const seed: Word = {
            id: uid(), term: 'apple', ipa: '/ˈæp.əl/', meaningZh: '苹果', meaningEn: 'a round fruit',
            examples: ['I eat an apple every day.'], tags: ['fruit'], audioUrls: [],
            proficiency: 0, createdAt: now, updatedAt: now, wordbookId: wordbooks[0].id
          }
          set({ words: [seed] })
        }
      },
      // 数据备份和恢复功能
      createBackup: () => {
        const { words, wordbooks, settings, backgroundImages } = get()
        DataBackup.createBackup({ words, wordbooks, settings, backgroundImages })
      },
      restoreFromBackup: (backupIndex = 0) => {
        try {
          const backupData = DataBackup.restoreData(backupIndex)
          set({
            words: backupData.words || [],
            wordbooks: backupData.wordbooks || [],
            settings: backupData.settings || defaultSettings,
            backgroundImages: backupData.backgroundImages || []
          })
          console.log('✅ 数据恢复成功（包括背景图）')
        } catch (error) {
          console.error('❌ 数据恢复失败:', error)
          throw error
        }
      },
      restoreAsNewWordbook: async (backupIndex = 0) => {
        try {
          const backupData = DataBackup.restoreData(backupIndex)
          const { words: currentWords, wordbooks: currentWordbooks } = get()
          
          // 创建新的单词本
          const now = Date.now()
          const backupDate = new Date(backupData.words?.[0]?.createdAt || now).toLocaleDateString('zh-CN')
          const newWordbookName = `恢复的单词本 (${backupDate})`
          
          const newWordbook: Wordbook = {
            id: uid(),
            name: newWordbookName,
            description: `从备份 #${backupIndex + 1} 恢复于 ${new Date().toLocaleString('zh-CN')}`,
            createdAt: now,
            updatedAt: now,
            isDefault: false
          }
          
          // 将备份中的单词映射到新单词本
          const restoredWords: Word[] = (backupData.words || []).map((word: Word) => ({
            ...word,
            id: uid(), // 生成新的ID，避免与现有单词冲突
            wordbookId: newWordbook.id,
            createdAt: now,
            updatedAt: now
          }))
          
          // 合并数据
          set({
            wordbooks: [newWordbook, ...currentWordbooks],
            words: [...restoredWords, ...currentWords],
            settings: { ...get().settings, currentWordbookId: newWordbook.id }
          })
          
          console.log(`✅ 已将备份恢复为新单词本: ${newWordbookName}，包含 ${restoredWords.length} 个单词`)
          return newWordbook.id
        } catch (error) {
          console.error('❌ 恢复为新单词本失败:', error)
          throw error
        }
      },
      getBackups: () => DataBackup.getBackups(),
      // 导出单个单词本
      exportWordbook: (wordbookId: string) => {
        const { words, wordbooks } = get()
        
        console.log('📤 开始导出单词本...')
        console.log('📊 当前所有单词:', words)
        console.log('📚 当前所有单词本:', wordbooks)
        console.log('🎯 要导出的单词本ID:', wordbookId)
        
        const wordbook = wordbooks.find(w => w.id === wordbookId)
        if (!wordbook) {
          throw new Error('单词本不存在')
        }
        
        console.log('📖 找到单词本:', wordbook)
        
        const wordbookWords = words.filter(w => w.wordbookId === wordbookId)
        console.log(`📝 筛选出的单词 (${wordbookWords.length} 个):`, wordbookWords)
        
        const exportData = {
          wordbook: wordbook,
          words: wordbookWords,
          exportTime: Date.now(),
          version: '1.0'
        }
        
        console.log('📦 导出数据结构:', exportData)
        
        const dataStr = JSON.stringify(exportData, null, 2)
        console.log('📄 JSON字符串长度:', dataStr.length)
        
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${wordbook.name}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`
        link.click()
        URL.revokeObjectURL(url)
        
        console.log(`✅ 已导出单词本: ${wordbook.name}，包含 ${wordbookWords.length} 个单词`)
        
        if (wordbookWords.length === 0) {
          console.warn('⚠️ 警告: 导出的单词本中没有单词！')
        }
      },
      // 导入单词本
      importWordbook: (data: string, targetWordbookId?: string) => {
        try {
          const importData = JSON.parse(data)
          const { words: currentWords, wordbooks: currentWordbooks } = get()
          const now = Date.now()
          
          let targetWordbook: Wordbook
          let newWords: Word[]
          
          if (targetWordbookId) {
            // 导入到指定的单词本（追加模式）
            const existingWordbook = currentWordbooks.find(w => w.id === targetWordbookId)
            if (!existingWordbook) {
              throw new Error('目标单词本不存在')
            }
            
            targetWordbook = existingWordbook
            
            // 导入单词，关联到目标单词本
            // 检查是否有重复的单词
            const existingTerms = new Set(
              currentWords
                .filter(w => w.wordbookId === targetWordbookId)
                .map(w => w.term.toLowerCase())
            )
            
            newWords = importData.words
              .filter((word: Word) => {
                const isDuplicate = existingTerms.has(word.term.toLowerCase())
                if (isDuplicate) {
                  console.log(`⚠️ 跳过重复单词: ${word.term}`)
                }
                return !isDuplicate
              })
              .map((word: Word) => ({
                ...word,
                id: uid(),
                wordbookId: targetWordbookId,
                createdAt: now,
                updatedAt: now
              }))
            
            // 合并单词（不改变单词本列表）
            set({
              words: [...newWords, ...currentWords],
              settings: { ...get().settings, currentWordbookId: targetWordbookId }
            })
            
            const skippedCount = importData.words.length - newWords.length
            console.log(`✅ 已追加到单词本: ${targetWordbook.name}，新增 ${newWords.length} 个单词${skippedCount > 0 ? `，跳过 ${skippedCount} 个重复单词` : ''}`)
            
            return {
              wordbookName: targetWordbook.name,
              newCount: newWords.length,
              skippedCount: skippedCount,
              isAppend: true
            }
          } else {
            // 创建新的单词本
            const newWordbook: Wordbook = {
              ...importData.wordbook,
              id: uid(),
              name: `${importData.wordbook.name} (导入)`,
              createdAt: now,
              updatedAt: now,
              isDefault: false
            }
            
            // 导入单词（使用新ID，关联到新单词本）
            newWords = importData.words.map((word: Word) => ({
              ...word,
              id: uid(),
              wordbookId: newWordbook.id,
              createdAt: now,
              updatedAt: now
            }))
            
            // 合并数据
            set({
              wordbooks: [newWordbook, ...currentWordbooks],
              words: [...newWords, ...currentWords],
              settings: { ...get().settings, currentWordbookId: newWordbook.id }
            })
            
            console.log(`✅ 已导入单词本: ${newWordbook.name}，包含 ${newWords.length} 个单词`)
            
            return {
              wordbookName: newWordbook.name,
              newCount: newWords.length,
              skippedCount: 0,
              isAppend: false
            }
          }
        } catch (error) {
          console.error('❌ 导入失败:', error)
          throw new Error(error instanceof Error ? error.message : '导入失败，请检查文件格式')
        }
      },
      // 背景图管理功能
      addBackgroundImage: (image) => set(({backgroundImages}) => {
        const newImage: BackgroundImage = {
          ...image,
          id: uid(),
          createdAt: Date.now()
        }
        return { backgroundImages: [...backgroundImages, newImage] }
      }),
      removeBackgroundImage: (id) => set(({backgroundImages}) => ({
        backgroundImages: backgroundImages.filter(img => img.id !== id)
      })),
      setCustomBackground: (url) => set(({settings}) => ({
        settings: { ...settings, customBackground: url }
      })),
      clearCustomBackground: () => set(({settings}) => ({
        settings: { ...settings, customBackground: undefined }
      })),
    }),
    { 
      name: 'engmemo.store',
      partialize: (state) => ({
        words: state.words,
        wordbooks: state.wordbooks,
        settings: state.settings,
        backgroundImages: state.backgroundImages
      })
    }
  )
)
