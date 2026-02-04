import { useState, useEffect } from 'react'
import { 
  saveBgFile, 
  listBgFiles, 
  loadBgBlob, 
  deleteBgFile, 
  clearAllBgFiles,
  ensurePersist,
  getStorageInfo,
  type BgFileMeta 
} from '../storage/backgroundStore'

export default function IndexedDBTest() {
  const [message] = useState('')
  const [testResults, setTestResults] = useState<string[]>([])
  const [files, setFiles] = useState<BgFileMeta[]>([])

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const testIndexedDB = async () => {
    try {
      addTestResult('🧪 开始测试IndexedDB...')
      
      // 测试1: 申请持久化存储
      const persisted = await ensurePersist()
      addTestResult(`持久化存储: ${persisted ? '✅ 已申请' : '❌ 未申请'}`)
      
      // 测试2: 获取存储信息
      const info = await getStorageInfo()
      addTestResult(`存储信息: ${info.fileCount}个文件, ${(info.totalSize/1024/1024).toFixed(1)}MB`)
      
      // 测试3: 列出文件
      const fileList = await listBgFiles()
      addTestResult(`文件列表: ${fileList.length}个文件`)
      setFiles(fileList)
      
      addTestResult('✅ IndexedDB测试完成')
      
    } catch (error) {
      addTestResult(`❌ 测试失败: ${error}`)
      console.error('IndexedDB测试失败:', error)
    }
  }

  const testFileUpload = async () => {
    try {
      // 创建一个测试文件
      const testContent = 'Hello IndexedDB!'
      const blob = new Blob([testContent], { type: 'text/plain' })
      const file = new File([blob], 'test.txt', { type: 'text/plain' })
      
      addTestResult('📁 测试文件上传...')
      const meta = await saveBgFile(file)
      addTestResult(`✅ 文件已保存: ${meta.name}`)
      
      // 重新加载文件列表
      const fileList = await listBgFiles()
      setFiles(fileList)
      addTestResult(`📊 当前文件数: ${fileList.length}`)
      
    } catch (error) {
      addTestResult(`❌ 上传测试失败: ${error}`)
    }
  }

  const testFileLoad = async (id: string) => {
    try {
      addTestResult(`📥 测试加载文件: ${id}`)
      const blob = await loadBgBlob(id)
      if (blob) {
        const text = await blob.text()
        addTestResult(`✅ 文件内容: ${text}`)
      } else {
        addTestResult('❌ 文件加载失败')
      }
    } catch (error) {
      addTestResult(`❌ 加载失败: ${error}`)
    }
  }

  const testFileDelete = async (id: string) => {
    try {
      addTestResult(`🗑️ 测试删除文件: ${id}`)
      await deleteBgFile(id)
      addTestResult('✅ 文件已删除')
      
      // 重新加载文件列表
      const fileList = await listBgFiles()
      setFiles(fileList)
      addTestResult(`📊 当前文件数: ${fileList.length}`)
      
    } catch (error) {
      addTestResult(`❌ 删除失败: ${error}`)
    }
  }

  const clearAll = async () => {
    try {
      addTestResult('🧹 清空所有文件...')
      await clearAllBgFiles()
      setFiles([])
      addTestResult('✅ 所有文件已清空')
    } catch (error) {
      addTestResult(`❌ 清空失败: ${error}`)
    }
  }

  useEffect(() => {
    testIndexedDB()
  }, [])

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">🧪 IndexedDB 测试页面</h1>
      
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-4">
        <h2 className="text-lg font-semibold mb-2">测试操作</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={testIndexedDB}
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            🔄 重新测试
          </button>
          <button
            onClick={testFileUpload}
            className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
          >
            📁 测试上传
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
          >
            🧹 清空所有
          </button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-4">
        <h2 className="text-lg font-semibold mb-2">文件列表 ({files.length})</h2>
        {files.length === 0 ? (
          <p className="text-gray-500">暂无文件</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{file.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({file.type}, {(file.size/1024).toFixed(1)}KB)
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => testFileLoad(file.id)}
                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    加载
                  </button>
                  <button
                    onClick={() => testFileDelete(file.id)}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-4">
        <h2 className="text-lg font-semibold mb-2">测试结果</h2>
        <div className="max-h-60 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">暂无测试结果</p>
          ) : (
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono bg-gray-50 p-1 rounded">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
