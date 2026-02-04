// TTS API 服务 - 获取真实语音MP3

// 主TTS函数 - 调用本地代理服务获取真实MP3
export async function generateSpeechWithQwenTTS(
  text: string, 
  lang: 'en' | 'zh' = 'en',
  voice: string = 'Cherry'
): Promise<Blob> {
  try {
    console.log('🎙️ 调用TTS API, text:', text, 'lang:', lang, 'voice:', voice)
    
    const langCode = lang === 'zh' ? 'zh-CN' : 'en-US'
    
    // 使用POST请求发送JSON数据
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang: langCode, voice })
    })
    
    // 处理错误响应
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      const errorMsg = errorData?.error || errorData?.message || `HTTP ${response.status}`
      throw new Error(`TTS API错误: ${errorMsg}`)
    }
    
    // 检查返回的内容类型
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      // 如果返回JSON，说明可能有audioUrl
      const data = await response.json()
      if (data.audioUrl) {
        // 下载音频URL
        const audioResponse = await fetch(data.audioUrl)
        const blob = await audioResponse.blob()
        console.log(`✅ TTS生成成功（URL）: "${text.substring(0, 30)}...", 大小: ${blob.size} bytes`)
        return blob
      } else if (data.audioBase64) {
        // Base64数据
        const binaryString = atob(data.audioBase64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' })
        console.log(`✅ TTS生成成功（Base64）: "${text.substring(0, 30)}...", 大小: ${blob.size} bytes`)
        return blob
      }
    }
    
    // 直接返回音频流
    const blob = await response.blob()
    console.log(`✅ TTS生成成功（直接流）: "${text.substring(0, 30)}...", 大小: ${blob.size} bytes`)
    return blob
    
  } catch (error) {
    console.error('❌ TTS生成失败:', error)
    throw error
  }
}

// 方法1: 使用浏览器内置TTS并录制（备用）
export async function generateSpeechWithBrowserTTS(text: string, lang: string = 'en-US'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('浏览器不支持语音合成'))
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0
    
    utterance.onend = () => {
      // 浏览器TTS无法直接生成Blob，返回空Blob
      resolve(new Blob([''], { type: 'audio/mpeg' }))
    }
    utterance.onerror = () => reject(new Error('语音合成失败'))
    
    window.speechSynthesis.speak(utterance)
  })
}
