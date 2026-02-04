export type Word = {
  id: string
  term: string
  ipa?: string
  meaningZh: string
  meaningEn?: string
  examples?: string[]
  tags?: string[]
  audioUrls?: string[]
  proficiency: number // 0-5
  createdAt: number
  updatedAt: number
  archived?: boolean
  wordbookId: string // 所属单词本ID
  // 新的练习状态字段
  errorCount?: number // 错误次数计数器
  correctStreak?: number // 连续正确次数计数器
}

export type Wordbook = {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  isDefault?: boolean
}

export type Settings = {
  ttsRate: number // 0.5~1.5
  ttsRepeat: number // 1~10
  ttsVoiceName?: string
  showIPA: boolean
  quizOrder: 'random' | 'sequential'
  quizMode: 'zh_to_en' | 'en_to_zh'
  currentWordbookId?: string // 当前选中的单词本
  customBackground?: string // 自定义背景图URL
  customBackgroundId?: string // 自定义背景文件ID（IndexedDB中的键）
  customBackgroundType?: 'image' | 'video' | 'audio' | 'gif' // 背景类型
  backgroundAudioEnabled?: boolean // 背景音频开关
  backgroundAppreciationMode?: boolean // 背景欣赏模式
  wordsPerPage?: number // 每页显示单词数量（50或100）
  // 顺序模式进度保存
  quizProgress?: {
    wordbookId: string
    currentIndex: number
    wordQueue: Array<{wordId: string, remainingTimes: number, errorCount: number}>
    totalAttempts: number
    correctAttempts: number
  }
  practiceProgress?: {
    wordbookId: string
    currentIndex: number
    wordQueue: Array<{wordId: string, remainingTimes: number, errorCount: number}>
    score: number
    totalQuestions: number
  }
}

export type BackgroundImage = {
  id: string
  name: string
  url: string
  type: 'image' | 'video' | 'gif' | 'audio'
  createdAt: number
  isDefault?: boolean
}
