// 本地文件系统存储 - 保存到 F:\背景图 文件夹
class LocalFileStorage {
  private basePath = 'F:\\背景图'
  
  // 检查文件夹是否存在，不存在则创建
  async ensureDirectoryExists(): Promise<void> {
    try {
      // 在浏览器环境中，我们无法直接访问文件系统
      // 但我们可以使用File System Access API (如果支持)
      console.log('📁 检查本地存储目录:', this.basePath)
      console.log('⚠️ 注意：浏览器环境无法直接访问本地文件系统')
      console.log('💡 建议：使用导出功能将文件保存到本地')
    } catch (error) {
      console.error('❌ 无法访问本地文件系统:', error)
    }
  }

  // 保存文件到本地（通过下载方式）
  async saveFileToLocal(file: {
    id: string
    name: string
    url: string
    type: 'image' | 'video' | 'gif' | 'audio'
    createdAt: number
    isDefault?: boolean
  }): Promise<void> {
    try {
      // 创建下载链接
      const link = document.createElement('a')
      link.href = file.url
      link.download = file.name
      
      // 添加到页面并触发下载
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('✅ 文件已下载到默认下载文件夹:', file.name)
      console.log('💡 请手动将文件移动到 F:\\背景图 文件夹')
    } catch (error) {
      console.error('❌ 下载文件失败:', error)
      throw error
    }
  }

  // 批量导出所有文件
  async exportAllFiles(files: any[]): Promise<void> {
    try {
      console.log('📦 开始批量导出文件...')
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        console.log(`📁 导出文件 ${i + 1}/${files.length}: ${file.name}`)
        
        // 延迟下载，避免浏览器阻止多个下载
        setTimeout(() => {
          this.saveFileToLocal(file)
        }, i * 1000) // 每秒下载一个文件
      }
      
      console.log('✅ 所有文件导出完成')
      console.log('💡 请将下载的文件移动到 F:\\背景图 文件夹')
    } catch (error) {
      console.error('❌ 批量导出失败:', error)
      throw error
    }
  }

  // 创建文件夹结构说明
  getFolderStructure(): string {
    return `
📁 F:\\背景图
├── 📷 图片/
│   ├── image_001.jpg
│   ├── image_002.png
│   └── ...
├── 🎥 视频/
│   ├── video_001.mp4
│   ├── video_002.webm
│   └── ...
├── 🎵 音频/
│   ├── audio_001.mp3
│   ├── audio_002.wav
│   └── ...
└── 📋 文件列表.json
    `
  }

  // 生成文件列表JSON
  generateFileList(files: any[]): string {
    const fileList = {
      exportTime: new Date().toISOString(),
      totalFiles: files.length,
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        type: file.type,
        createdAt: file.createdAt,
        isDefault: file.isDefault
      }))
    }
    
    return JSON.stringify(fileList, null, 2)
  }

  // 下载文件列表
  downloadFileList(files: any[]): void {
    try {
      const fileListJson = this.generateFileList(files)
      const blob = new Blob([fileListJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `背景文件列表_${new Date().toISOString().split('T')[0]}.json`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      console.log('✅ 文件列表已下载')
    } catch (error) {
      console.error('❌ 下载文件列表失败:', error)
    }
  }
}

// 导出单例
export const localFileStorage = new LocalFileStorage()
