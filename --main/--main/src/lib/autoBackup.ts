// 自动备份系统 - 定期将数据导出到本地文件
export class AutoBackup {
  private static BACKUP_INTERVAL = 24 * 60 * 60 * 1000 // 24小时
  private static LAST_BACKUP_KEY = 'engmemo_last_auto_backup'
  private static BACKUP_FOLDER_KEY = 'engmemo_backup_folder_handle'
  private static BACKUP_FOLDER_NAME_KEY = 'engmemo_backup_folder_name'
  private static LAST_WORD_COUNT_KEY = 'engmemo_last_word_count' // 上次备份时的单词数
  private static CHANGE_THRESHOLD = 100 // 变化阈值：100条
  private static folderHandle: any = null // 缓存的文件夹句柄
  
  // 检查是否需要自动备份
  static shouldAutoBackup(currentWordCount: number): boolean {
    const lastBackup = localStorage.getItem(this.LAST_BACKUP_KEY)
    const lastWordCount = localStorage.getItem(this.LAST_WORD_COUNT_KEY)
    
    // 如果从未备份过，返回false（不自动触发）
    if (!lastBackup) return false
    
    // 计算变化量
    const lastCount = lastWordCount ? parseInt(lastWordCount) : 0
    const changeCount = Math.abs(currentWordCount - lastCount)
    
    console.log(`📊 备份检查: 当前${currentWordCount}条，上次${lastCount}条，变化${changeCount}条`)
    
    // 变化超过100条，触发备份
    if (changeCount >= this.CHANGE_THRESHOLD) {
      console.log(`✓ 变化超过${this.CHANGE_THRESHOLD}条，需要备份`)
      return true
    }
    
    // 或者超过24小时也触发
    const timeSinceLastBackup = Date.now() - parseInt(lastBackup)
    if (timeSinceLastBackup >= this.BACKUP_INTERVAL) {
      console.log('✓ 距离上次备份超过24小时，需要备份')
      return true
    }
    
    return false
  }
  
  // 自动导出到本地文件（优先保存到指定文件夹）
  static async autoExportToFile(data: any): Promise<boolean> {
    try {
      const exportData = {
        words: data.words || [],
        wordbooks: data.wordbooks || [],
        settings: data.settings || {},
        exportTime: new Date().toISOString(),
        version: '2.0',
        source: 'auto-backup'
      }
      
      // 先尝试保存到指定文件夹
      if (this.folderHandle) {
        try {
          const success = await this.saveToFolder(data, this.folderHandle)
          if (success) {
            const folderName = localStorage.getItem(this.BACKUP_FOLDER_NAME_KEY) || '指定文件夹'
            console.log(`✅ 备份已保存到文件夹: ${folderName}`)
            
            // 更新最后备份时间和单词数
            localStorage.setItem(this.LAST_BACKUP_KEY, Date.now().toString())
            localStorage.setItem(this.LAST_WORD_COUNT_KEY, (data.words?.length || 0).toString())
            
            return true
          }
        } catch (error) {
          console.warn('⚠️ 保存到指定文件夹失败，降级为下载:', error)
          this.folderHandle = null // 清除失效的句柄
        }
      }
      
      // 降级方案：下载文件
      const jsonStr = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `英语单词自动备份_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      // 更新最后备份时间和单词数
      localStorage.setItem(this.LAST_BACKUP_KEY, Date.now().toString())
      localStorage.setItem(this.LAST_WORD_COUNT_KEY, (data.words?.length || 0).toString())
      
      console.log(`✅ 备份已下载到本地 (${data.words?.length || 0} 个单词)`)
      return true
    } catch (error) {
      console.error('❌ 备份失败:', error)
      return false
    }
  }
  
  // 提示用户备份
  static promptBackup(currentWordCount: number): void {
    if (this.shouldAutoBackup(currentWordCount)) {
      const lastCount = parseInt(localStorage.getItem(this.LAST_WORD_COUNT_KEY) || '0')
      const changeCount = Math.abs(currentWordCount - lastCount)
      
      let message = '💾 数据安全提醒\n\n'
      if (changeCount >= this.CHANGE_THRESHOLD) {
        message += `数据变化已超过${this.CHANGE_THRESHOLD}条（当前变化：${changeCount}条）\n\n`
      } else {
        message += '距离上次备份已超过24小时\n\n'
      }
      message += '建议现在备份单词数据，避免数据丢失。\n'
      message += '备份文件将下载到您的电脑。\n\n'
      message += '是否立即备份？'
      
      const shouldBackup = confirm(message)
      
      if (shouldBackup) {
        // 触发备份（需要从外部传入数据）
        return
      } else {
        // 延后备份提醒（但不更新计数，下次还会提醒）
        localStorage.setItem(this.LAST_BACKUP_KEY, Date.now().toString())
      }
    }
  }
  
  // 获取上次备份时间
  static getLastBackupTime(): Date | null {
    const lastBackup = localStorage.getItem(this.LAST_BACKUP_KEY)
    if (!lastBackup) return null
    return new Date(parseInt(lastBackup))
  }

  // 设置备份文件夹（使用File System Access API）
  static async selectBackupFolder(): Promise<boolean> {
    try {
      // @ts-ignore - File System Access API
      if (!window.showDirectoryPicker) {
        alert('您的浏览器不支持文件夹选择功能\n建议使用最新版Chrome/Edge浏览器')
        return false
      }

      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      })

      // 验证权限
      const permission = await dirHandle.queryPermission({ mode: 'readwrite' })
      if (permission !== 'granted') {
        const request = await dirHandle.requestPermission({ mode: 'readwrite' })
        if (request !== 'granted') {
          alert('需要文件夹写入权限才能自动备份')
          return false
        }
      }

      // 保存文件夹句柄到内存（注意：刷新页面后会失效）
      this.folderHandle = dirHandle
      localStorage.setItem(this.BACKUP_FOLDER_NAME_KEY, dirHandle.name)
      
      console.log('✅ 备份文件夹已设置:', dirHandle.name)
      alert(`✅ 备份文件夹设置成功！\n\n文件夹：${dirHandle.name}\n\n下次点击"立即备份"时，文件将自动保存到此文件夹\n\n⚠️ 注意：刷新页面后需要重新设置文件夹`)
      return true
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.log('用户取消了文件夹选择')
      } else {
        console.error('设置备份文件夹失败:', error)
        alert('❌ 设置失败: ' + (error?.message || '未知错误'))
      }
      return false
    }
  }
  
  // 获取保存的文件夹名称
  static getBackupFolderName(): string | null {
    return localStorage.getItem(this.BACKUP_FOLDER_NAME_KEY)
  }
  
  // 清除文件夹设置
  static clearBackupFolder(): void {
    this.folderHandle = null
    localStorage.removeItem(this.BACKUP_FOLDER_NAME_KEY)
  }

  // 保存到指定文件夹
  static async saveToFolder(data: any, dirHandle: any): Promise<boolean> {
    try {
      const fileName = `英语单词自动备份_${new Date().toISOString().split('T')[0]}.json`
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      
      const exportData = {
        words: data.words || [],
        wordbooks: data.wordbooks || [],
        settings: data.settings || {},
        exportTime: new Date().toISOString(),
        version: '2.0',
        source: 'auto-backup'
      }

      await writable.write(JSON.stringify(exportData, null, 2))
      await writable.close()

      console.log('✅ 备份已保存到文件夹:', fileName)
      return true
    } catch (error) {
      console.error('保存到文件夹失败:', error)
      return false
    }
  }

  // 保存到选择的文件夹（支持自定义文件名）
  static async saveToSelectedFolder(data: any, fileName: string): Promise<boolean> {
    try {
      // 如果有缓存的文件夹句柄，使用它
      if (this.folderHandle) {
        try {
          const fileHandle = await this.folderHandle.getFileHandle(fileName, { create: true })
          const writable = await fileHandle.createWritable()
          
          await writable.write(JSON.stringify(data, null, 2))
          await writable.close()
          
          console.log(`✅ 备份已保存到文件夹: ${fileName}`)
          return true
        } catch (error) {
          console.warn('⚠️ 保存到指定文件夹失败，文件夹权限可能已失效:', error)
          this.folderHandle = null
        }
      }
      
      // 如果没有文件夹或保存失败，弹出文件夹选择器
      // @ts-ignore
      if (window.showDirectoryPicker) {
        if (confirm('需要选择保存位置。是否现在选择备份文件夹？\n\n（如果已设置过，可能是权限过期，需要重新选择）')) {
          // @ts-ignore
          const dirHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents'
          })
          
          // 保存文件夹句柄
          this.folderHandle = dirHandle
          localStorage.setItem(this.BACKUP_FOLDER_NAME_KEY, dirHandle.name)
          
          // 保存文件
          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
          const writable = await fileHandle.createWritable()
          await writable.write(JSON.stringify(data, null, 2))
          await writable.close()
          
          console.log(`✅ 备份已保存到新文件夹: ${dirHandle.name}/${fileName}`)
          return true
        } else {
          // 用户取消，降级为下载
          return this.downloadFile(data, fileName)
        }
      } else {
        // 浏览器不支持，降级为下载
        return this.downloadFile(data, fileName)
      }
    } catch (error) {
      console.error('❌ 保存到文件夹失败:', error)
      // 降级为下载
      return this.downloadFile(data, fileName)
    }
  }

  // 下载文件（降级方案）
  private static downloadFile(data: any, fileName: string): boolean {
    try {
      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      console.log(`✅ 备份已下载: ${fileName}`)
      return true
    } catch (error) {
      console.error('❌ 下载失败:', error)
      return false
    }
  }
}

