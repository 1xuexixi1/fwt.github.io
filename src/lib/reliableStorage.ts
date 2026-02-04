// 可靠的存储系统 - 多重备份机制
class ReliableStorage {
  private storageKey = 'engmemo_backgrounds_reliable'
  
  // 多重存储：localStorage + IndexedDB + 内存
  async saveBackgrounds(backgrounds: any[]): Promise<void> {
    try {
      // 1. 保存到localStorage（主要存储）
      const data = {
        backgrounds,
        timestamp: Date.now(),
        version: '2.0'
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data))
      console.log('✅ 背景文件已保存到localStorage')
      
      // 2. 保存到IndexedDB（备份存储）
      try {
        const { fileStorage } = await import('./fileStorage')
        for (const bg of backgrounds) {
          await fileStorage.saveBackgroundFile(bg)
        }
        console.log('✅ 背景文件已备份到IndexedDB')
      } catch (error) {
        console.warn('⚠️ IndexedDB备份失败，但localStorage已保存')
      }
      
      // 3. 保存到sessionStorage（临时存储）
      sessionStorage.setItem(this.storageKey, JSON.stringify(data))
      console.log('✅ 背景文件已保存到sessionStorage')
      
    } catch (error) {
      console.error('❌ 保存背景文件失败:', error)
      throw error
    }
  }
  
  // 多重加载：优先从localStorage加载
  async loadBackgrounds(): Promise<any[]> {
    try {
      // 1. 优先从localStorage加载
      const localData = localStorage.getItem(this.storageKey)
      if (localData) {
        const data = JSON.parse(localData)
        console.log('✅ 从localStorage加载背景文件:', data.backgrounds.length)
        return data.backgrounds || []
      }
      
      // 2. 如果localStorage没有，尝试从IndexedDB加载
      try {
        const { fileStorage } = await import('./fileStorage')
        const indexedData = await fileStorage.getAllBackgroundFiles()
        if (indexedData.length > 0) {
          console.log('✅ 从IndexedDB加载背景文件:', indexedData.length)
          // 同步到localStorage
          await this.saveBackgrounds(indexedData)
          return indexedData
        }
      } catch (error) {
        console.warn('⚠️ 从IndexedDB加载失败')
      }
      
      // 3. 最后尝试从sessionStorage加载
      const sessionData = sessionStorage.getItem(this.storageKey)
      if (sessionData) {
        const data = JSON.parse(sessionData)
        console.log('✅ 从sessionStorage加载背景文件:', data.backgrounds.length)
        return data.backgrounds || []
      }
      
      console.log('ℹ️ 没有找到已保存的背景文件')
      return []
      
    } catch (error) {
      console.error('❌ 加载背景文件失败:', error)
      return []
    }
  }
  
  // 删除背景文件
  async removeBackground(id: string, allBackgrounds: any[]): Promise<void> {
    try {
      const newBackgrounds = allBackgrounds.filter(bg => bg.id !== id)
      await this.saveBackgrounds(newBackgrounds)
      console.log('✅ 背景文件已删除并保存')
    } catch (error) {
      console.error('❌ 删除背景文件失败:', error)
      throw error
    }
  }
  
  // 获取存储状态
  getStorageStatus(): { localStorage: boolean, sessionStorage: boolean, indexedDB: boolean } {
    const localData = localStorage.getItem(this.storageKey)
    const sessionData = sessionStorage.getItem(this.storageKey)
    
    return {
      localStorage: !!localData,
      sessionStorage: !!sessionData,
      indexedDB: false // 需要异步检查
    }
  }
  
  // 强制同步所有存储
  async forceSync(backgrounds: any[]): Promise<void> {
    try {
      await this.saveBackgrounds(backgrounds)
      console.log('✅ 强制同步完成')
    } catch (error) {
      console.error('❌ 强制同步失败:', error)
      throw error
    }
  }
}

// 导出单例
export const reliableStorage = new ReliableStorage()
