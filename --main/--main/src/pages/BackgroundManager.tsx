import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { 
  saveBgFile, 
  listBgFiles, 
  loadBgBlob, 
  deleteBgFile, 
  ensurePersist,
  getStorageInfo,
  exportBgFiles,
  importBgFiles,
  type BgFileMeta 
} from '../storage/backgroundStore'

export default function BackgroundManager() {
  const { 
    settings, 
    setCustomBackground, 
    clearCustomBackground
  } = useStore()
  
  const [message, setMessage] = useState('')
  const [backgroundFiles, setBackgroundFiles] = useState<{meta: BgFileMeta; url: string}[]>([])
  const [storageInfo, setStorageInfo] = useState({ fileCount: 0, totalSize: 0, persisted: false })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 页面加载时初始化IndexedDB存储
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // 申请持久化存储
        await ensurePersist()
        
        // 加载背景文件列表
        const metas = await listBgFiles()
        
        // 修复文件类型检测
        const fixedMetas = metas.map(meta => {
          const fileName = meta.name.toLowerCase()
          let correctType = meta.type
          
          // 如果类型不正确，重新检测
          if (fileName.includes('.mp4') || fileName.includes('.webm') || fileName.includes('.mov')) {
            correctType = 'video'
          } else if (fileName.includes('.mp3') || fileName.includes('.wav') || fileName.includes('.ogg')) {
            correctType = 'audio'
          } else if (fileName.includes('.gif')) {
            correctType = 'gif'
          } else if (fileName.includes('.jpg') || fileName.includes('.jpeg') || fileName.includes('.png') || 
                     fileName.includes('.webp') || fileName.includes('.bmp')) {
            correctType = 'image'
          }
          
          return { ...meta, type: correctType }
        })
        
        // 如果有类型被修复，更新存储
        const needsUpdate = fixedMetas.some((meta, index) => meta.type !== metas[index].type)
        if (needsUpdate) {
          console.log('🔧 修复文件类型检测...')
          // 这里可以添加更新逻辑，暂时只记录
        }
        
        const withUrls = await Promise.all(
          fixedMetas.map(async (meta) => {
            const blob = await loadBgBlob(meta.id)
            const url = blob ? URL.createObjectURL(blob) : ''
            return { meta, url }
          })
        )
        
        setBackgroundFiles(withUrls)
        
        // 获取存储信息
        const info = await getStorageInfo()
        setStorageInfo(info)
        
        console.log('✅ 背景文件存储初始化完成，文件数:', withUrls.length)
        console.log('📊 存储信息:', info)
        console.log('🔧 文件类型修复:', needsUpdate ? '已修复' : '无需修复')
      } catch (error) {
        console.error('❌ 背景文件存储初始化失败:', error)
        setMessage('❌ 存储初始化失败')
        setTimeout(() => setMessage(''), 3000)
      }
    }
    
    initializeStorage()
  }, [])

  // 清理URL：不要撤销正在作为背景使用的那一个
  useEffect(() => {
    return () => {
      backgroundFiles.forEach(item => {
        if (item.url && item.url !== settings.customBackground) {
          URL.revokeObjectURL(item.url)
        }
      })
    }
  }, [backgroundFiles, settings.customBackground])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 智能检测文件类型
    const getFileType = (file: File): string => {
      const fileName = file.name.toLowerCase();
      const mimeType = file.type.toLowerCase();
      
      if (fileName.includes('.mp4') || fileName.includes('.webm') || fileName.includes('.mov') || 
          mimeType.includes('video/')) {
        return 'video';
      } else if (fileName.includes('.mp3') || fileName.includes('.wav') || fileName.includes('.ogg') || 
                 mimeType.includes('audio/')) {
        return 'audio';
      } else if (fileName.includes('.gif') || mimeType.includes('image/gif')) {
        return 'gif';
      } else if (fileName.includes('.jpg') || fileName.includes('.jpeg') || fileName.includes('.png') || 
                 fileName.includes('.webp') || fileName.includes('.bmp') || mimeType.includes('image/')) {
        return 'image';
      } else {
        return 'unknown';
      }
    };
    
    const fileType = getFileType(file);
    
    if (fileType === 'unknown') {
      setMessage('❌ 请选择图片、视频或音频文件')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    // 移除文件大小限制，允许上传任意大小的文件

    try {
      setMessage('⏳ 正在保存文件...')
      
      // 保存到IndexedDB
      const meta = await saveBgFile(file)
      
      // 生成URL并添加到列表
      const blob = await loadBgBlob(meta.id)
      const url = blob ? URL.createObjectURL(blob) : ''
      
      setBackgroundFiles(prev => [...prev, { meta, url }])
      
      // 更新存储信息
      const info = await getStorageInfo()
      setStorageInfo(info)
      
      setMessage(`✅ ${fileType === 'video' ? '视频' : fileType === 'audio' ? '音频' : '图片'}上传成功！`)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('❌ 上传失败:', error)
      setMessage('❌ 上传失败')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleSetBackground = (url: string, meta?: BgFileMeta) => {
    // 将URL和类型写入设置，用于App渲染时正确选择video/image/audio
    if (meta) {
      useStore.getState().setSettings({
        customBackground: url,
        customBackgroundId: meta.id,
        customBackgroundType: (meta.type as any)
      })
    } else {
      setCustomBackground(url)
    }
    setMessage('✅ 背景图已设置！')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleRemoveImage = async (id: string) => {
    if (confirm('确定要删除这个背景图吗？')) {
      try {
        // 从IndexedDB删除
        await deleteBgFile(id)
        
        // 从状态中移除并释放URL
        setBackgroundFiles(prev => {
          const item = prev.find(p => p.meta.id === id)
          // 如果正在使用该URL作为背景，则不要立即释放，由App负责在切换时释放
          if (item?.url && item.url !== settings.customBackground) {
            URL.revokeObjectURL(item.url)
          }
          return prev.filter(p => p.meta.id !== id)
        })
        
        // 更新存储信息
        const info = await getStorageInfo()
        setStorageInfo(info)
        
        // 如果删除的是当前背景，清除设置
        const current = backgroundFiles.find(p => p.meta.id === id)
        if (current && settings.customBackground === current.url) {
          clearCustomBackground()
        }
        
        setMessage('✅ 背景图已删除！')
        setTimeout(() => setMessage(''), 3000)
      } catch (error) {
        console.error('❌ 删除失败:', error)
        setMessage('❌ 删除失败')
        setTimeout(() => setMessage(''), 3000)
      }
    }
  }

  const handleClearBackground = () => {
    if (confirm('确定要清除当前背景图吗？')) {
      clearCustomBackground()
      setMessage('✅ 背景图已清除！')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleExportBackgrounds = async () => {
    try {
      setMessage('⏳ 正在导出背景文件...')
      
      const backup = await exportBgFiles()
      const exportData = {
        ...backup,
        settings: { customBackground: settings.customBackground },
        exportTime: new Date().toISOString(),
        version: '2.0'
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `背景文件备份_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setMessage('✅ 背景文件已导出！')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('❌ 导出失败:', error)
      setMessage('❌ 导出失败')
      setTimeout(() => setMessage(''), 3000)
    }
  }


  const handleImportBackgrounds = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 检查是否是JSON备份文件
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          setMessage('⏳ 正在导入背景文件...')
          
          const importData = JSON.parse(e.target?.result as string)
          
          if (!importData.metaList || !importData.files) {
            throw new Error('无效的备份文件格式')
          }

          // 导入到IndexedDB
          await importBgFiles({
            metaList: importData.metaList,
            files: importData.files
          })

          // 重新加载背景文件列表
          const metas = await listBgFiles()
          const withUrls = await Promise.all(
            metas.map(async (meta) => {
              const blob = await loadBgBlob(meta.id)
              const url = blob ? URL.createObjectURL(blob) : ''
              return { meta, url }
            })
          )
          
          setBackgroundFiles(withUrls)
          
          // 更新存储信息
          const info = await getStorageInfo()
          setStorageInfo(info)

          // 恢复背景设置
          if (importData.settings?.customBackground) {
            setCustomBackground(importData.settings.customBackground)
          }

          setMessage('✅ 背景文件导入成功！')
          setTimeout(() => setMessage(''), 3000)
        } catch (error) {
          console.error('❌ 导入失败:', error)
          setMessage('❌ 导入失败，请检查文件格式')
          setTimeout(() => setMessage(''), 3000)
        }
      }
      reader.readAsText(file)
    } else {
      // 如果不是JSON文件，当作普通文件上传处理
      handleFileUpload(event)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  return (
    <div className="space-y-1">
      {/* 调试信息 */}
      <div className="bg-yellow-50/80 backdrop-blur-sm border border-yellow-200/50 rounded p-1">
        <div className="text-xs text-yellow-800">
          <div className="font-medium mb-0.5">🔍 调试信息</div>
          <div>背景文件数: {backgroundFiles.length}</div>
          <div>存储信息: {JSON.stringify(storageInfo)}</div>
          <div>消息: {message || '无'}</div>
        </div>
      </div>
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-1">
        <h1 className="text-xs font-semibold mb-0.5">🎨 背景图管理</h1>
        <p className="text-xs text-gray-600 mb-1">
          当前背景：{settings.customBackground ? '自定义背景' : '默认渐变背景'}
          {settings.customBackground && settings.backgroundAudioEnabled && (
            <span className="ml-1 text-green-600">🔊 音频开启</span>
          )}
        </p>
        <p className="text-xs text-blue-600 mb-1">
          💾 背景文件已保存到IndexedDB，刷新页面不会丢失
        </p>
        <div className="flex gap-1 items-center">
          <span className="text-xs text-gray-500">
            当前文件：{storageInfo.fileCount} 个
          </span>
          <span className="text-xs text-gray-500">
            总大小：{(storageInfo.totalSize / 1024 / 1024).toFixed(1)}MB
          </span>
          {storageInfo.persisted && (
            <span className="text-xs text-green-600">🔒 持久化存储</span>
          )}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-1">
        <div className="flex gap-1 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            📁 上传文件
          </button>
          <button
            onClick={async () => {
              setMessage('🔄 正在刷新文件类型...')
              try {
                // 重新加载文件列表
                const metas = await listBgFiles()
                const withUrls = await Promise.all(
                  metas.map(async (meta) => {
                    const blob = await loadBgBlob(meta.id)
                    const url = blob ? URL.createObjectURL(blob) : ''
                    return { meta, url }
                  })
                )
                setBackgroundFiles(withUrls)
                setMessage('✅ 文件类型已刷新')
                setTimeout(() => setMessage(''), 3000)
              } catch (error) {
                setMessage('❌ 刷新失败')
                setTimeout(() => setMessage(''), 3000)
              }
            }}
            className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
          >
            🔄 刷新类型
          </button>
          {backgroundFiles.length > 0 && (
            <button
              onClick={handleExportBackgrounds}
              className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
            >
              💾 导出备份
            </button>
          )}
          <input
            type="file"
            accept=".json"
            onChange={handleImportBackgrounds}
            className="hidden"
            id="import-backgrounds"
          />
          <button
            onClick={() => document.getElementById('import-backgrounds')?.click()}
            className="px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors"
          >
            📥 导入备份
          </button>
          {settings.customBackground && (
            <button
              onClick={handleClearBackground}
              className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
            >
              🗑️ 清除背景
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-0.5 rounded text-center text-xs font-medium ${
          message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 
          'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-1">
        <h2 className="text-xs font-semibold mb-0.5">🎬 背景文件库</h2>
        
        {backgroundFiles.length === 0 ? (
          <p className="text-xs text-gray-500">暂无背景文件</p>
        ) : (
          <div className="space-y-0.5">
            {backgroundFiles.map(({ meta, url }) => (
              <div key={meta.id} className="flex items-center justify-between p-0.5 bg-gray-50 rounded">
                <div className="flex items-center gap-0.5 flex-1">
                  <div className="w-8 h-8 rounded border border-gray-300 overflow-hidden">
                    {meta.type === 'video' ? (
                      <video 
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                        controls={false}
                        playsInline
                      >
                        <source src={url} type="video/mp4" />
                        <source src={url} type="video/webm" />
                        <source src={url} type="video/quicktime" />
                      </video>
                    ) : meta.type === 'audio' ? (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                        <span className="text-white text-lg">🎵</span>
                      </div>
                    ) : (
                      <div 
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${url})` }}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium">{meta.name}</span>
                      <span className={`px-1 py-0.5 text-xs rounded ${
                        meta.type === 'video' ? 'bg-red-100 text-red-800' :
                        meta.type === 'gif' ? 'bg-purple-100 text-purple-800' :
                        meta.type === 'audio' ? 'bg-pink-100 text-pink-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {meta.type === 'video' ? '🎥 视频' : 
                         meta.type === 'gif' ? '🎞️ 动图' : 
                         meta.type === 'audio' ? '🎵 音频' : '🖼️ 图片'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(meta.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {settings.customBackgroundId === meta.id ? (
                    <span className="px-1 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                      使用中
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetBackground(url, meta)}
                      className="px-1 py-0.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                    >
                      使用
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveImage(meta.id)}
                    className="px-1 py-0.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-yellow-50/80 backdrop-blur-sm border border-yellow-200/50 rounded p-0.5">
        <div className="text-xs text-yellow-800">
          <div className="font-medium mb-0.5">💡 使用说明</div>
          <ul className="space-y-0.5 text-xs">
            <li>• 支持 JPG、PNG、GIF、WebP、BMP 等图片格式</li>
            <li>• 支持 MP4、WebM、MOV、AVI 等视频格式</li>
            <li>• 支持 MP3、WAV、OGG、M4A 等音频格式</li>
            <li>• 无文件大小限制，支持上传任意大小的文件</li>
            <li>• 建议使用 1920x1080 或更高分辨率的文件</li>
            <li>• 视频和音频默认静音播放，可在设置中开启音频</li>
            <li>• 点击"🎭 欣赏"按钮可进入背景欣赏模式</li>
            <li>• 删除文件会同时清除使用该文件的背景设置</li>
            <li>• 背景文件已保存到IndexedDB，刷新页面不会丢失</li>
            <li>• 可以导出/导入背景文件备份</li>
            <li>• 支持直接上传视频、音频、图片文件</li>
            <li>• 支持导入JSON格式的备份文件</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
