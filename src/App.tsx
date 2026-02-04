import { NavLink, Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import Quiz from './pages/Quiz'
import Words from './pages/Words'
import ImportExport from './pages/ImportExport'
import Settings from './pages/Settings'
import QuickAdd from './pages/QuickAdd'
import DataRecovery from './pages/DataRecovery'
import BackgroundManager from './pages/BackgroundManager'
import Practice from './pages/Practice'
import AudioExport from './pages/AudioExport'
import ShortcutSettings from './pages/ShortcutSettings'
import { loadBgBlob, listBgFiles } from './storage/backgroundStore'
import { useRef, useEffect } from 'react'
import { AutoBackup } from './lib/autoBackup'

export default function App(){
  const { settings, setSettings } = useStore()
  const currentObjectUrlRef = useRef<string | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const linkBase = "px-0.5 py-0.5 rounded hover:bg-gray-100 text-xs"
  const active = ({isActive}:{isActive:boolean})=> isActive? `${linkBase} bg-gray-200` : linkBase

  // 进入/退出全屏
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // 进入全屏
        await containerRef.current?.requestFullscreen()
      } else {
        // 退出全屏
        await document.exitFullscreen()
      }
    } catch (error) {
      console.warn('全屏切换失败:', error)
    }
  }

  // 监听欣赏模式变化，自动进入/退出全屏
  useEffect(() => {
    const handleAppreciationMode = async () => {
      if (settings.backgroundAppreciationMode) {
        // 进入欣赏模式时自动全屏
        try {
          if (!document.fullscreenElement && containerRef.current) {
            await containerRef.current.requestFullscreen()
          }
        } catch (error) {
          console.warn('自动全屏失败:', error)
        }
      } else {
        // 退出欣赏模式时自动退出全屏
        try {
          if (document.fullscreenElement) {
            await document.exitFullscreen()
          }
        } catch (error) {
          console.warn('退出全屏失败:', error)
        }
      }
    }
    handleAppreciationMode()
  }, [settings.backgroundAppreciationMode])
  // 获取当前背景类型 - 优先读取设置中保存的类型
  const getBackgroundType = () => {
    if (!settings.customBackground) return 'gradient'
    if (settings.customBackgroundType) return settings.customBackgroundType
    return 'image'
  }

  const backgroundType = getBackgroundType()

  // 当重启/刷新后，如果我们只保存了背景文件的ID，需要用ID从IndexedDB重建objectURL
  useEffect(() => {
    const rebuildUrl = async () => {
      if (!settings.customBackgroundId) return
      try {
        const blob = await loadBgBlob(settings.customBackgroundId)
        if (!blob) return
        const newUrl = URL.createObjectURL(blob)
        // 释放旧的URL
        if (currentObjectUrlRef.current && currentObjectUrlRef.current !== newUrl) {
          try { URL.revokeObjectURL(currentObjectUrlRef.current) } catch {}
        }
        currentObjectUrlRef.current = newUrl
        setSettings({ customBackground: newUrl })
      } catch (e) {
        console.warn('重建背景URL失败:', e)
      }
    }
    rebuildUrl()
    return () => {
      if (currentObjectUrlRef.current) {
        try { URL.revokeObjectURL(currentObjectUrlRef.current) } catch {}
        currentObjectUrlRef.current = undefined
      }
    }
  }, [settings.customBackgroundId, setSettings])

  // 兜底：如果没有保存 customBackgroundId，但 IndexedDB 中有文件，自动选择一个重建 URL
  useEffect(() => {
    const fallbackRebuild = async () => {
      if (settings.customBackgroundId) return
      try {
        const metas = await listBgFiles()
        if (!metas || metas.length === 0) return
        const meta = metas.find(m => (m as any).type === 'video') || metas[0]
        const blob = await loadBgBlob((meta as any).id)
        if (!blob) return
        const newUrl = URL.createObjectURL(blob)
        if (currentObjectUrlRef.current) {
          try { URL.revokeObjectURL(currentObjectUrlRef.current) } catch {}
        }
        currentObjectUrlRef.current = newUrl
        setSettings({ 
          customBackground: newUrl, 
          customBackgroundId: (meta as any).id, 
          customBackgroundType: (meta as any).type 
        })
      } catch (e) {
        console.warn('fallback 重建背景失败:', e)
      }
    }
    fallbackRebuild()
    // 只在初次挂载时兜底一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 自动备份检查 - 启动时检查是否需要备份
  useEffect(() => {
    const checkBackup = () => {
      const { words, wordbooks, settings } = useStore.getState()
      
      if (AutoBackup.shouldAutoBackup(words.length)) {
        // 延迟3秒后提示，避免干扰用户
        setTimeout(() => {
          const lastCount = parseInt(localStorage.getItem('engmemo_last_word_count') || '0')
          const changeCount = Math.abs(words.length - lastCount)
          
          let message = '💾 数据安全提醒\n\n'
          if (changeCount >= 100) {
            message += `数据变化已超过100条（当前变化：${changeCount}条）\n\n`
          } else {
            message += '距离上次备份已超过24小时\n\n'
          }
          message += '建议立即备份单词数据到本地文件，避免数据丢失。\n\n'
          message += `当前有 ${words.length} 个单词，${wordbooks.length} 个单词本\n\n`
          message += '是否立即备份？'
          
          const shouldBackup = confirm(message)
          
          if (shouldBackup) {
            AutoBackup.autoExportToFile({ words, wordbooks, settings })
          } else {
            // 用户选择稍后备份，24小时后再次提醒
            localStorage.setItem('engmemo_last_auto_backup', Date.now().toString())
          }
        }, 3000)
      }
    }
    checkBackup()
  }, [])

  return (
    <div ref={containerRef} className="min-h-screen relative">
      {/* 自定义背景 */}
      {settings.customBackground && (
        <>
          {backgroundType === 'video' ? (
            <video
              key={settings.customBackground}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                settings.backgroundAppreciationMode ? 'opacity-100' : 'opacity-20'
              }`}
              autoPlay
              loop
              muted={!settings.backgroundAudioEnabled}
              playsInline
              onError={() => {
                // 如果video播放失败，尝试强制重建URL（在未来我们可以在这里做重试策略）
                console.warn('视频播放失败，可能是objectURL失效')
              }}
            >
              <source src={settings.customBackground} type="video/mp4" />
              <source src={settings.customBackground} type="video/webm" />
              <source src={settings.customBackground} type="video/quicktime" />
            </video>
          ) : backgroundType === 'audio' ? (
            <>
              {/* 音频背景 - 显示渐变背景 + 音频播放 */}
              <div 
                className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
                  settings.backgroundAppreciationMode ? 'opacity-100' : 'opacity-20'
                }`}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
              />
              <audio
                className="absolute inset-0 w-full h-full opacity-0"
                autoPlay
                loop
                muted={!settings.backgroundAudioEnabled}
                controls={false}
              >
                <source src={settings.customBackground} type="audio/mpeg" />
                <source src={settings.customBackground} type="audio/wav" />
                <source src={settings.customBackground} type="audio/ogg" />
              </audio>
            </>
          ) : (
            <div 
              className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${
                settings.backgroundAppreciationMode ? 'opacity-100' : 'opacity-20'
              }`}
              style={{
                backgroundImage: `url(${settings.customBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            />
          )}
        </>
      )}
      
      {/* 默认渐变背景 */}
      {!settings.customBackground && (
        <div 
          className="absolute inset-0 w-full h-full"
          style={{
            background: 'linear-gradient(to bottom right, #eff6ff, #e0e7ff, #f3e8ff)'
          }}
        />
      )}
      {/* 背景装饰 - 只在没有自定义背景时显示 */}
      {!settings.customBackground && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full opacity-20 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-200 rounded-full opacity-10 blur-3xl"></div>
        </div>
      )}
      
      <header className={`sticky top-0 z-10 backdrop-blur-sm border-b transition-all duration-500 ${
        settings.backgroundAppreciationMode 
          ? 'bg-white/20 border-white/10' 
          : 'bg-white/80 border-white/20'
      }`}>
        <div className="max-w-5xl mx-auto px-0.5 py-0.5 flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <div className="font-bold text-xs">英语学习助手</div>
            <nav className="flex gap-0.5">
            <NavLink to="/quick-add" className={active} replace>🚀 快速添加</NavLink>
            <NavLink to="/practice" className={active} replace>🎯 单词练习</NavLink>
            <NavLink to="/quiz" className={active} replace>📝 测验</NavLink>
            <NavLink to="/words" className={active} replace>📚 单词本</NavLink>
            <NavLink to="/audio-export" className={active} replace>🎤 录音导出</NavLink>
            <NavLink to="/import-export" className={active} replace>📤 导入导出</NavLink>
            <NavLink to="/data-recovery" className={active} replace>🔄 数据恢复</NavLink>
            <NavLink to="/background" className={active} replace>🎨 背景图</NavLink>
            <NavLink to="/settings" className={active} replace>⚙️ 设置</NavLink>
            </nav>
          </div>
          
          {/* 背景控制按钮 */}
          {settings.customBackground && (
            <div className="flex items-center gap-0.5">
              {/* 背景音频控制 */}
              {(backgroundType === 'video' || backgroundType === 'audio') && (
                <button
                  onClick={() => setSettings({ backgroundAudioEnabled: !settings.backgroundAudioEnabled })}
                  className={`px-1 py-0.5 text-xs rounded transition-colors ${
                    settings.backgroundAudioEnabled 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-gray-500 text-white hover:bg-gray-600'
                  }`}
                  title={settings.backgroundAudioEnabled ? '关闭背景音频' : '开启背景音频'}
                >
                  {settings.backgroundAudioEnabled ? '🔊' : '🔇'}
                </button>
              )}
              
              {/* 背景欣赏模式 */}
              <button
                onClick={() => setSettings({ backgroundAppreciationMode: !settings.backgroundAppreciationMode })}
                className={`px-1 py-0.5 text-xs rounded transition-colors ${
                  settings.backgroundAppreciationMode 
                    ? 'bg-purple-500 text-white hover:bg-purple-600' 
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
                title={settings.backgroundAppreciationMode ? '退出欣赏模式（自动退出全屏）' : '进入欣赏模式（自动全屏）'}
              >
                {settings.backgroundAppreciationMode ? '🎭 欣赏中' : '🎭 欣赏'}
              </button>
              
              {/* 全屏切换按钮 */}
              <button
                onClick={toggleFullscreen}
                className="px-1 py-0.5 text-xs rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                title="手动切换全屏"
              >
                🖥️ 全屏
              </button>
            </div>
          )}
        </div>
      </header>
      <main className={`max-w-5xl mx-auto px-0.5 py-0.5 relative z-10 transition-all duration-500 ${
        settings.backgroundAppreciationMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <Routes>
          <Route path="/" element={<QuickAdd/>} />
          <Route path="/quick-add" element={<QuickAdd/>} />
          <Route path="/practice" element={<Practice/>} />
          <Route path="/quiz" element={<Quiz/>} />
          <Route path="/words" element={<Words/>} />
          <Route path="/audio-export" element={<AudioExport/>} />
          <Route path="/import-export" element={<ImportExport/>} />
          <Route path="/data-recovery" element={<DataRecovery/>} />
          <Route path="/background" element={<BackgroundManager/>} />
          <Route path="/settings" element={<Settings/>} />
          <Route path="/shortcuts" element={<ShortcutSettings/>} />
        </Routes>
      </main>
    </div>
  )
}
