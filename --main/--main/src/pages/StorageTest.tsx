import { useState } from 'react'
import { fileStorage } from '../lib/fileStorage'

export default function StorageTest() {
  const [message, setMessage] = useState('')
  const [testResults, setTestResults] = useState<string[]>([])

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const testIndexedDB = async () => {
    setTestResults([])
    addTestResult('开始测试IndexedDB存储...')

    try {
      // 测试保存文件
      const testFile = {
        id: 'test-' + Date.now(),
        name: '测试文件.jpg',
        url: 'data:image/jpeg;base64,test-data',
        type: 'image' as const,
        createdAt: Date.now()
      }

      await fileStorage.saveBackgroundFile(testFile)
      addTestResult('✅ 文件保存成功')

      // 测试获取文件
      const files = await fileStorage.getAllBackgroundFiles()
      addTestResult(`✅ 获取文件成功，共${files.length}个文件`)

      // 测试存储信息
      const info = await fileStorage.getStorageInfo()
      addTestResult(`✅ 存储信息：${info.count}个文件`)

      // 测试删除文件
      await fileStorage.deleteBackgroundFile(testFile.id)
      addTestResult('✅ 文件删除成功')

      // 最终验证
      const finalFiles = await fileStorage.getAllBackgroundFiles()
      addTestResult(`✅ 最终验证：${finalFiles.length}个文件`)

      setMessage('✅ IndexedDB测试完成，所有功能正常！')
    } catch (error) {
      addTestResult(`❌ 测试失败: ${error}`)
      setMessage('❌ IndexedDB测试失败')
    }
  }

  const clearAllData = async () => {
    try {
      await fileStorage.clearAll()
      addTestResult('✅ 所有数据已清空')
      setMessage('✅ 数据清空完成')
    } catch (error) {
      addTestResult(`❌ 清空失败: ${error}`)
      setMessage('❌ 数据清空失败')
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-4">
        <h1 className="text-lg font-semibold mb-4">🔧 IndexedDB存储测试</h1>
        
        <div className="space-y-2">
          <button
            onClick={testIndexedDB}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            🧪 开始测试
          </button>
          
          <button
            onClick={clearAllData}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors ml-2"
          >
            🗑️ 清空所有数据
          </button>
        </div>

        {message && (
          <div className={`p-2 rounded text-sm font-medium ${
            message.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {testResults.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">测试结果：</h3>
            <div className="bg-gray-50 rounded p-3 max-h-60 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
