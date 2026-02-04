// 调试存储工具
import { fileStorage } from './fileStorage'

export const debugStorage = {
  // 检查IndexedDB状态
  async checkIndexedDBStatus() {
    try {
      const files = await fileStorage.getAllBackgroundFiles()
      const info = await fileStorage.getStorageInfo()
      
      console.log('🔍 IndexedDB调试信息:')
      console.log('- 文件数量:', files.length)
      console.log('- 存储信息:', info)
      console.log('- 文件列表:', files.map(f => ({ id: f.id, name: f.name, type: f.type })))
      
      return {
        success: true,
        fileCount: files.length,
        files: files,
        storageInfo: info
      }
    } catch (error) {
      console.error('❌ IndexedDB检查失败:', error)
      return {
        success: false,
        error: error
      }
    }
  },

  // 强制同步所有文件
  async forceSyncAllFiles(backgroundImages: any[]) {
    try {
      console.log('🔄 开始强制同步所有文件到IndexedDB...')
      
      for (const image of backgroundImages) {
        await fileStorage.saveBackgroundFile(image)
        console.log(`✅ 已同步: ${image.name}`)
      }
      
      console.log('✅ 所有文件同步完成')
      return { success: true }
    } catch (error) {
      console.error('❌ 强制同步失败:', error)
      return { success: false, error }
    }
  },

  // 清空IndexedDB
  async clearIndexedDB() {
    try {
      await fileStorage.clearAll()
      console.log('✅ IndexedDB已清空')
      return { success: true }
    } catch (error) {
      console.error('❌ 清空IndexedDB失败:', error)
      return { success: false, error }
    }
  }
}
