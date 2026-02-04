// 简单可靠的存储系统
class SimpleStorage {
  private storageKey = 'engmemo_backgrounds'
  
  // 保存背景文件
  saveBackgrounds(backgrounds: any[]): void {
    try {
      const data = {
        backgrounds,
        timestamp: Date.now(),
        version: '1.0'
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data))
      console.log('✅ 背景文件已保存到localStorage:', backgrounds.length)
    } catch (error) {
      console.error('❌ 保存失败:', error)
    }
  }
  
  // 加载背景文件
  loadBackgrounds(): any[] {
    try {
      const data = localStorage.getItem(this.storageKey)
      if (data) {
        const parsed = JSON.parse(data)
        console.log('✅ 从localStorage加载背景文件:', parsed.backgrounds?.length || 0)
        return parsed.backgrounds || []
      }
      return []
    } catch (error) {
      console.error('❌ 加载失败:', error)
      return []
    }
  }
  
  // 添加单个背景文件
  addBackground(background: any, allBackgrounds: any[]): any[] {
    const newBackgrounds = [background, ...allBackgrounds]
    this.saveBackgrounds(newBackgrounds)
    console.log('✅ 背景文件已添加到存储，总数:', newBackgrounds.length)
    return newBackgrounds
  }
  
  // 删除背景文件
  removeBackground(id: string, allBackgrounds: any[]): any[] {
    const newBackgrounds = allBackgrounds.filter(bg => bg.id !== id)
    this.saveBackgrounds(newBackgrounds)
    return newBackgrounds
  }
}

export const simpleStorage = new SimpleStorage()
