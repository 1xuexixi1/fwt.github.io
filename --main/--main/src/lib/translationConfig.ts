// 翻译服务配置文件
// 用户可以在这里配置各种翻译服务的API密钥

export interface TranslationConfig {
  // 百度翻译
  baiduAppId?: string
  baiduSecret?: string
  
  // DeepL 翻译
  deeplApiKey?: string
  
  // OpenAI 兼容接口 (OpenRouter, Together AI, etc.)
  openaiCompatibleKey?: string
  openaiCompatibleBaseUrl?: string
  openaiCompatibleModel?: string
  
  // Cohere
  cohereApiKey?: string
  
  // Anthropic Claude
  anthropicApiKey?: string
  
  // Google Translate (需要服务账号密钥)
  googleApiKey?: string
  
  // Azure Translator
  azureKey?: string
  azureRegion?: string
  
  // 本地大模型配置
  ollamaBaseUrl?: string
  ollamaModel?: string
}

// 默认配置
export const defaultTranslationConfig: TranslationConfig = {
  // 百度翻译（已配置）
  baiduAppId: '20251012002473655',
  baiduSecret: '16y2hJESHVKdIjHMKWWK',
  
  // OpenAI兼容接口默认配置
  openaiCompatibleBaseUrl: 'https://openrouter.ai/api/v1',
  openaiCompatibleModel: 'meta-llama/llama-3.1-8b-instruct:free',
  
  // 本地Ollama默认配置
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaModel: 'llama2',
}

// 从localStorage获取用户配置
export function getUserTranslationConfig(): TranslationConfig {
  try {
    const stored = localStorage.getItem('translation_config')
    if (stored) {
      const userConfig = JSON.parse(stored)
      return { ...defaultTranslationConfig, ...userConfig }
    }
  } catch (error) {
    console.error('获取翻译配置失败:', error)
  }
  return defaultTranslationConfig
}

// 保存用户配置到localStorage
export function saveUserTranslationConfig(config: Partial<TranslationConfig>) {
  try {
    const currentConfig = getUserTranslationConfig()
    const newConfig = { ...currentConfig, ...config }
    localStorage.setItem('translation_config', JSON.stringify(newConfig))
    console.log('翻译配置已保存')
  } catch (error) {
    console.error('保存翻译配置失败:', error)
  }
}

// 获取可用的翻译服务列表
export function getAvailableTranslationServices(): Array<{
  name: string
  key: keyof TranslationConfig
  description: string
  free: boolean
  needsApiKey: boolean
}> {
  return [
    {
      name: '内置词典',
      key: 'baiduAppId',
      description: '常用词汇的内置映射，无需网络',
      free: true,
      needsApiKey: false
    },
    {
      name: 'Hugging Face',
      key: 'baiduAppId',
      description: '免费的AI翻译模型，无需API密钥',
      free: true,
      needsApiKey: false
    },
    {
      name: 'Google Translate',
      key: 'googleApiKey',
      description: 'Google免费翻译接口（有限制）',
      free: true,
      needsApiKey: false
    },
    {
      name: 'LibreTranslate',
      key: 'baiduAppId',
      description: '开源免费翻译服务',
      free: true,
      needsApiKey: false
    },
    {
      name: '百度翻译',
      key: 'baiduAppId',
      description: '百度翻译API，每月免费5万字符',
      free: true,
      needsApiKey: true
    },
    {
      name: 'MyMemory',
      key: 'baiduAppId',
      description: '免费翻译记忆库',
      free: true,
      needsApiKey: false
    },
    {
      name: 'DeepL',
      key: 'deeplApiKey',
      description: '高质量翻译，每月免费50万字符',
      free: true,
      needsApiKey: true
    },
    {
      name: 'OpenRouter',
      key: 'openaiCompatibleKey',
      description: '多种大模型，部分免费',
      free: true,
      needsApiKey: true
    },
    {
      name: 'Cohere',
      key: 'cohereApiKey',
      description: 'AI翻译，有免费额度',
      free: true,
      needsApiKey: true
    },
    {
      name: 'Ollama本地',
      key: 'ollamaBaseUrl',
      description: '本地部署的大模型，完全免费',
      free: true,
      needsApiKey: false
    }
  ]
}
