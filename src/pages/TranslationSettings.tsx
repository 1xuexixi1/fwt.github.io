import { useState, useEffect } from 'react'
import { getUserTranslationConfig, saveUserTranslationConfig, getAvailableTranslationServices, TranslationConfig } from '../lib/translationConfig'

export default function TranslationSettings() {
  const [config, setConfig] = useState<TranslationConfig>({})
  const [message, setMessage] = useState('')

  useEffect(() => {
    setConfig(getUserTranslationConfig())
  }, [])

  const handleSave = () => {
    saveUserTranslationConfig(config)
    setMessage('✅ 翻译配置已保存')
    setTimeout(() => setMessage(''), 3000)
  }

  const handleReset = () => {
    localStorage.removeItem('translation_config')
    setConfig(getUserTranslationConfig())
    setMessage('✅ 配置已重置为默认值')
    setTimeout(() => setMessage(''), 3000)
  }

  const services = getAvailableTranslationServices()

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🌐 翻译服务配置</h1>
        
        {/* 服务状态概览 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">📊 可用服务</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-800">{service.name}</h3>
                  <div className="flex gap-2">
                    {service.free && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">免费</span>
                    )}
                    {service.needsApiKey && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">需密钥</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* API 密钥配置 */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-gray-700">🔑 API 密钥配置</h2>
          
          {/* 百度翻译 */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-3">百度翻译 API</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">APP ID</label>
                <input
                  type="text"
                  value={config.baiduAppId || ''}
                  onChange={(e) => setConfig({...config, baiduAppId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="百度翻译 APP ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">密钥</label>
                <input
                  type="password"
                  value={config.baiduSecret || ''}
                  onChange={(e) => setConfig({...config, baiduSecret: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="百度翻译密钥"
                />
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              免费额度：每月5万字符 | 
              <a href="https://fanyi-api.baidu.com/" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                申请地址
              </a>
            </p>
          </div>

          {/* DeepL */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="font-medium text-purple-800 mb-3">DeepL API</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API 密钥</label>
              <input
                type="password"
                value={config.deeplApiKey || ''}
                onChange={(e) => setConfig({...config, deeplApiKey: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="DeepL API 密钥"
              />
            </div>
            <p className="text-xs text-purple-600 mt-2">
              免费额度：每月50万字符 | 
              <a href="https://www.deepl.com/pro-api" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                申请地址
              </a>
            </p>
          </div>

          {/* OpenAI 兼容接口 */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h3 className="font-medium text-green-800 mb-3">OpenAI 兼容接口 (OpenRouter, Together AI 等)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API 密钥</label>
                <input
                  type="password"
                  value={config.openaiCompatibleKey || ''}
                  onChange={(e) => setConfig({...config, openaiCompatibleKey: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="API 密钥"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">基础URL</label>
                <input
                  type="text"
                  value={config.openaiCompatibleBaseUrl || ''}
                  onChange={(e) => setConfig({...config, openaiCompatibleBaseUrl: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="https://openrouter.ai/api/v1"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
              <input
                type="text"
                value={config.openaiCompatibleModel || ''}
                onChange={(e) => setConfig({...config, openaiCompatibleModel: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="meta-llama/llama-3.1-8b-instruct:free"
              />
            </div>
            <p className="text-xs text-green-600 mt-2">
              推荐：OpenRouter 有免费模型 | 
              <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                申请地址
              </a>
            </p>
          </div>

          {/* Cohere */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <h3 className="font-medium text-orange-800 mb-3">Cohere API</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">API 密钥</label>
              <input
                type="password"
                value={config.cohereApiKey || ''}
                onChange={(e) => setConfig({...config, cohereApiKey: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Cohere API 密钥"
              />
            </div>
            <p className="text-xs text-orange-600 mt-2">
              免费额度：每月100次调用 | 
              <a href="https://cohere.ai/" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                申请地址
              </a>
            </p>
          </div>

          {/* 本地 Ollama */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-medium text-gray-800 mb-3">本地 Ollama 大模型</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">服务地址</label>
                <input
                  type="text"
                  value={config.ollamaBaseUrl || ''}
                  onChange={(e) => setConfig({...config, ollamaBaseUrl: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="http://localhost:11434"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">模型名称</label>
                <input
                  type="text"
                  value={config.ollamaModel || ''}
                  onChange={(e) => setConfig({...config, ollamaModel: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="llama2"
                />
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              完全免费，需要本地安装 Ollama | 
              <a href="https://ollama.ai/" target="_blank" rel="noopener noreferrer" className="underline ml-1">
                安装指南
              </a>
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            💾 保存配置
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔄 重置配置
          </button>
        </div>

        {message && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg border border-green-200">
            {message}
          </div>
        )}

        {/* 使用说明 */}
        <div className="mt-8 bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <h3 className="font-medium text-yellow-800 mb-2">💡 使用说明</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 系统会按优先级依次尝试各种翻译服务</li>
            <li>• 内置词典 → AI模型 → 在线API → 本地模型</li>
            <li>• 建议配置多个服务作为备选，提高翻译成功率</li>
            <li>• 大部分服务都有免费额度，足够个人学习使用</li>
            <li>• 本地模型（Ollama）完全免费但需要自己部署</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
