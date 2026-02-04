// 文件存储系统 - 使用IndexedDB保存背景文件
class FileStorage {
  private dbName = 'EngMemoFileStorage'
  private version = 1
  private db: IDBDatabase | null = null

  // 初始化数据库
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // 创建背景文件存储
        if (!db.objectStoreNames.contains('backgroundFiles')) {
          const store = db.createObjectStore('backgroundFiles', { keyPath: 'id' })
          store.createIndex('name', 'name', { unique: false })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
        
        // 创建设置存储
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
      }
    })
  }

  // 保存背景文件
  async saveBackgroundFile(file: {
    id: string
    name: string
    url: string
    type: 'image' | 'video' | 'gif' | 'audio'
    createdAt: number
    isDefault?: boolean
  }): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backgroundFiles'], 'readwrite')
      const store = transaction.objectStore('backgroundFiles')
      const request = store.put(file)
      
      request.onsuccess = () => {
        console.log('✅ 背景文件已保存到IndexedDB:', file.name)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 获取所有背景文件
  async getAllBackgroundFiles(): Promise<any[]> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backgroundFiles'], 'readonly')
      const store = transaction.objectStore('backgroundFiles')
      const request = store.getAll()
      
      request.onsuccess = () => {
        console.log('✅ 从IndexedDB加载背景文件:', request.result.length, '个')
        resolve(request.result)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 删除背景文件
  async deleteBackgroundFile(id: string): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backgroundFiles'], 'readwrite')
      const store = transaction.objectStore('backgroundFiles')
      const request = store.delete(id)
      
      request.onsuccess = () => {
        console.log('✅ 背景文件已从IndexedDB删除:', id)
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 保存设置
  async saveSetting(key: string, value: any): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite')
      const store = transaction.objectStore('settings')
      const request = store.put({ key, value })
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 获取设置
  async getSetting(key: string): Promise<any> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readonly')
      const store = transaction.objectStore('settings')
      const request = store.get(key)
      
      request.onsuccess = () => {
        resolve(request.result?.value || null)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // 清空所有数据
  async clearAll(): Promise<void> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backgroundFiles', 'settings'], 'readwrite')
      
      const clearBackgrounds = transaction.objectStore('backgroundFiles').clear()
      const clearSettings = transaction.objectStore('settings').clear()
      
      transaction.oncomplete = () => {
        console.log('✅ IndexedDB数据已清空')
        resolve()
      }
      transaction.onerror = () => reject(transaction.error)
    })
  }

  // 获取存储信息
  async getStorageInfo(): Promise<{ count: number, size: number }> {
    if (!this.db) await this.init()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backgroundFiles'], 'readonly')
      const store = transaction.objectStore('backgroundFiles')
      const request = store.count()
      
      request.onsuccess = () => {
        resolve({ count: request.result, size: 0 }) // IndexedDB不提供大小信息
      }
      request.onerror = () => reject(request.error)
    })
  }
}

// 导出单例
export const fileStorage = new FileStorage()
