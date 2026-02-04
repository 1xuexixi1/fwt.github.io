import { useState } from 'react'
import { useStore } from '../store'
import { localFileStorage } from '../lib/localFileStorage'

export default function LocalFolderManager() {
  const { backgroundImages } = useStore()
  const [message, setMessage] = useState('')

  const handleExportAll = async () => {
    try {
      await localFileStorage.exportAllFiles(backgroundImages)
      setMessage('✅ 开始批量导出，请查看下载文件夹')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('❌ 导出失败')
      setTimeout(() => setMessage(''), 2000)
    }
  }

  const handleDownloadFileList = () => {
    try {
      localFileStorage.downloadFileList(backgroundImages)
      setMessage('✅ 文件列表已下载')
      setTimeout(() => setMessage(''), 2000)
    } catch (error) {
      setMessage('❌ 下载文件列表失败')
      setTimeout(() => setMessage(''), 2000)
    }
  }

  const handleCreateFolderStructure = () => {
    const structure = localFileStorage.getFolderStructure()
    const blob = new Blob([structure], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = 'F背景图文件夹结构.txt'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
    setMessage('✅ 文件夹结构说明已下载')
    setTimeout(() => setMessage(''), 2000)
  }

  return (
    <div className="space-y-4 p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-4">
        <h1 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">📁</span>
          </span>
          本地文件夹管理
        </h1>
        
        <div className="mb-4">
          <h2 className="font-medium mb-2">📂 目标文件夹：F:\背景图</h2>
          <p className="text-sm text-gray-600 mb-3">
            将背景文件保存到本地文件夹，避免浏览器存储限制
          </p>
        </div>

        {message && (
          <div className={`p-2 rounded text-sm font-medium mb-4 ${
            message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="font-medium">📤 导出操作</h3>
            
            <button
              onClick={handleExportAll}
              className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              <span>💾</span>
              <span>导出所有文件到本地</span>
            </button>
            
            <button
              onClick={handleDownloadFileList}
              className="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors flex items-center gap-2"
            >
              <span>📋</span>
              <span>下载文件列表JSON</span>
            </button>
            
            <button
              onClick={handleCreateFolderStructure}
              className="w-full px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <span>📁</span>
              <span>下载文件夹结构说明</span>
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">📊 当前状态</h3>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm space-y-1">
                <div>总文件数：<span className="font-medium">{backgroundImages.length}</span></div>
                <div>图片文件：<span className="font-medium">{backgroundImages.filter(f => f.type === 'image').length}</span></div>
                <div>视频文件：<span className="font-medium">{backgroundImages.filter(f => f.type === 'video').length}</span></div>
                <div>音频文件：<span className="font-medium">{backgroundImages.filter(f => f.type === 'audio').length}</span></div>
                <div>动图文件：<span className="font-medium">{backgroundImages.filter(f => f.type === 'gif').length}</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium mb-2">💡 使用说明</h3>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>1. 点击"导出所有文件"开始批量下载</li>
            <li>2. 将下载的文件移动到 F:\背景图 文件夹</li>
            <li>3. 下载"文件列表JSON"记录文件信息</li>
            <li>4. 下载"文件夹结构说明"了解组织方式</li>
            <li>5. 文件会按类型自动分类保存</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <h3 className="font-medium mb-2">⚠️ 注意事项</h3>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>• 浏览器会逐个下载文件，请耐心等待</li>
            <li>• 建议在下载完成后手动整理到 F:\背景图 文件夹</li>
            <li>• 大文件可能需要较长时间下载</li>
            <li>• 确保有足够的磁盘空间存储文件</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
