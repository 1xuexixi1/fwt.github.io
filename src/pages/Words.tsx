import { useMemo, useState, useEffect } from 'react'
import { useStore } from '../store'
import WordForm from '../components/WordForm'
import TTSPlayer from '../components/TTSPlayer'
import WordbookManager from '../components/WordbookManager'
import { fetchWordInfo } from '../lib/dict'

export default function Words(){
  const { words, addWord, updateWord, removeWord, seedIfEmpty, wordbooks, settings, setSettings } = useStore()
  const [editingId, setEditingId] = useState<string|undefined>()
  const [q, setQ] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'english' | 'chinese' | 'tags'>('all')
  const [audioCache, setAudioCache] = useState<Record<string, {americanAudio?: string, britishAudio?: string}>>({})
  const [showWordbookManager, setShowWordbookManager] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useMemo(()=>{ seedIfEmpty() }, [])
  
  // 默认每页显示50个单词
  const wordsPerPage = settings.wordsPerPage || 50

  const filteredList = useMemo(()=>{
    // 只显示当前单词本的单词
    const currentWords = words.filter(w => w.wordbookId === settings.currentWordbookId)
    const k = q.trim()
    if (!k) return currentWords
    
    // 检查是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(k)
    const searchKey = hasChinese ? k : k.toLowerCase()
    
    return currentWords.filter(w => {
      switch (searchType) {
        case 'english':
          return hasChinese ? false : w.term.toLowerCase().includes(searchKey)
        case 'chinese':
          return (w.meaningZh || '').includes(k)
        case 'tags':
          return (w.tags || []).some(tag => 
            hasChinese ? tag.includes(k) : tag.toLowerCase().includes(searchKey)
          )
        case 'all':
        default:
          return (hasChinese ? w.term.includes(k) : w.term.toLowerCase().includes(searchKey)) || 
                 (w.meaningZh || '').includes(k) ||
                 (hasChinese ? (w.meaningEn || '').includes(k) : (w.meaningEn || '').toLowerCase().includes(searchKey)) ||
                 (w.tags || []).some(tag => 
                   hasChinese ? tag.includes(k) : tag.toLowerCase().includes(searchKey)
                 )
      }
    })
  }, [words, q, searchType, settings.currentWordbookId])

  // 计算分页数据
  const totalPages = Math.ceil(filteredList.length / wordsPerPage)
  const list = useMemo(()=>{
    const startIndex = (currentPage - 1) * wordsPerPage
    const endIndex = startIndex + wordsPerPage
    return filteredList.slice(startIndex, endIndex)
  }, [filteredList, currentPage, wordsPerPage])

  // 当搜索条件变化或每页数量变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [q, searchType, wordsPerPage, settings.currentWordbookId])

  // 确保当前页码不超出范围
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const fetchAudioForWord = async (term: string) => {
    if (audioCache[term]) {
      console.log('使用缓存的音频:', term, audioCache[term])
      return audioCache[term]
    }
    
    try {
      console.log('开始获取音频和音标:', term)
      const { americanAudio, britishAudio, americanIPA, britishIPA, ipa } = await fetchWordInfo(term)
      const audioInfo = { 
        americanAudio: americanAudio || undefined, 
        britishAudio: britishAudio || undefined 
      }
      
      console.log('获取到的音频:', term, audioInfo)
      console.log('获取到的音标:', { americanIPA, britishIPA, ipa })
      
      // 即使没有获取到音频，也要缓存结果（避免重复请求）
      setAudioCache(prev => ({ ...prev, [term]: audioInfo }))
      
      // 自动更新音标到单词数据中
      const word = words.find(w => w.term.toLowerCase() === term.toLowerCase())
      if (word && (americanIPA || britishIPA || ipa)) {
        // 优先使用美式音标，其次英式，最后使用通用音标
        const ipaToSave = americanIPA || britishIPA || ipa || ''
        if (ipaToSave && ipaToSave !== word.ipa) {
          updateWord(word.id, { ipa: ipaToSave })
          console.log(`✅ ${term} 音标已自动保存: ${ipaToSave}`)
        }
      }
      
      // 显示结果提示
      if (americanAudio || britishAudio) {
        const hasAmerican = americanAudio ? '✓美式' : ''
        const hasBritish = britishAudio ? '✓英式' : ''
        console.log(`✅ ${term} 发音获取成功: ${hasAmerican} ${hasBritish}`)
      } else {
        console.log(`⚠️ ${term} 未找到在线音频，将使用浏览器TTS`)
      }
      
      return audioInfo
    } catch (error) {
      console.error('获取音频失败:', error)
      // 即使失败也要缓存（避免重复请求）
      const emptyAudio = { americanAudio: undefined, britishAudio: undefined }
      setAudioCache(prev => ({ ...prev, [term]: emptyAudio }))
      return emptyAudio
    }
  }

  const currentWordbook = wordbooks.find(w => w.id === settings.currentWordbookId)

  return (
    <div className="space-y-0.5">
      {/* 单词本选择器 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 p-0.5">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-0.5">
            <span className="text-xs font-medium text-gray-700">当前单词本:</span>
            <span className="font-semibold text-blue-600 text-xs">
              {currentWordbook?.name || '未选择'}
            </span>
          </div>
          <button
            onClick={() => setShowWordbookManager(true)}
            className="px-0.5 py-0.5 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
          >
            📚 管理单词本
          </button>
        </div>
        
        {!settings.currentWordbookId && (
          <div className="text-xs text-orange-600 bg-orange-50 p-0.5 rounded">
            ⚠️ 请先选择一个单词本才能添加单词
          </div>
        )}
      </div>

      <div className="space-y-0.5">
        <div className="flex gap-0.5">
          <div className="flex-1 relative">
            <input 
              className="border rounded px-0.5 py-0.5 w-full pr-1 text-xs" 
              placeholder="搜索单词..." 
              value={q} 
              onChange={e=>setQ(e.target.value)} 
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          <AddButton onAdded={(data)=> addWord({ ...data, proficiency: 0 })} />
        </div>
        
        <div className="flex gap-0.5 items-center">
          <span className="text-xs text-gray-600">搜索范围:</span>
          <div className="flex gap-0.5">
            <button
              onClick={() => setSearchType('all')}
              className={`px-0.5 py-0.5 text-xs rounded ${
                searchType === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setSearchType('english')}
              className={`px-0.5 py-0.5 text-xs rounded ${
                searchType === 'english' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              英文
            </button>
            <button
              onClick={() => setSearchType('chinese')}
              className={`px-0.5 py-0.5 text-xs rounded ${
                searchType === 'chinese' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => setSearchType('tags')}
              className={`px-0.5 py-0.5 text-xs rounded ${
                searchType === 'tags' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              标签
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {q ? (
              <>
                找到 {filteredList.length} 个单词
                {searchType !== 'all' && (
                  <span className="ml-2 text-blue-600">
                    (在{searchType === 'english' ? '英文' : searchType === 'chinese' ? '中文' : '标签'}中搜索)
                  </span>
                )}
              </>
            ) : (
              <>共 {filteredList.length} 个单词</>
            )}
          </div>
          
          {/* 每页数量选择器 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">每页显示:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setSettings({ wordsPerPage: 50 })}
                className={`px-2 py-0.5 text-xs rounded ${
                  wordsPerPage === 50
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                50
              </button>
              <button
                onClick={() => setSettings({ wordsPerPage: 100 })}
                className={`px-2 py-0.5 text-xs rounded ${
                  wordsPerPage === 100
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                100
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left leading-[1.1]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-1 py-0.5 text-xs font-medium text-gray-600">英文单词</th>
                <th className="px-1 py-0.5 text-xs font-medium text-gray-600">音标</th>
                <th className="px-1 py-0.5 text-xs font-medium text-gray-600">中文释义</th>
                <th className="px-1 py-0.5 text-xs font-medium text-gray-600">发音</th>
                <th className="px-1 py-0.5 text-xs font-medium text-gray-600">熟练度</th>
                <th className="px-1 py-0.5 text-xs font-medium text-gray-600 w-12">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map(w=> (
                <tr key={w.id} className="hover:bg-gray-50 align-top">
                  <td className="px-1 py-0.5 font-mono text-xs font-semibold leading-[1.1]">{w.term}</td>
                  <td className="px-1 py-0.5 text-xs text-gray-500 leading-[1.1]">{w.ipa||''}</td>
                  <td className="px-1 py-0.5 text-xs leading-[1.1]">{w.meaningZh}</td>
                  <td className="px-1 py-0.5 leading-[1.1]">
                    <div className="flex items-center gap-1 flex-wrap">
                      <TTSPlayer 
                        text={w.term} 
                        repeat={1} 
                        rate={1} 
                        americanAudio={audioCache[w.term]?.americanAudio}
                        britishAudio={audioCache[w.term]?.britishAudio}
                      />
                      {!audioCache[w.term] ? (
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap underline decoration-dotted"
                          onClick={() => fetchAudioForWord(w.term)}
                          title="从字典API获取真人发音"
                        >
                          获取发音
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400" title="已获取发音数据">
                          {audioCache[w.term]?.americanAudio || audioCache[w.term]?.britishAudio ? '🎵' : 'TTS'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-0.5 text-xs">
                    <div className="flex items-center gap-0.5">
                      <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                        {w.proficiency}
                      </span>
                      {w.errorCount && w.errorCount > 0 && (
                        <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800" title={`需要连续答对2次，当前已答对${w.correctStreak || 0}次`}>
                          {w.correctStreak || 0}/2
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-0.5">
                    <div className="flex gap-0.5">
                      <button 
                        className="px-1 py-0 text-[11px] border border-gray-300 rounded hover:bg-gray-50 transition-colors" 
                        onClick={()=> setEditingId(w.id)}
                      >
                        编辑
                      </button>
                      <button 
                        className="px-1 py-0 text-[11px] border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors" 
                        onClick={()=> removeWord(w.id)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                第 {currentPage} / {totalPages} 页 (显示 {(currentPage - 1) * wordsPerPage + 1} - {Math.min(currentPage * wordsPerPage, filteredList.length)} 条)
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  首页
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                
                {/* 页码显示 */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = []
                    const maxVisible = 5
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2))
                    let endPage = Math.min(totalPages, startPage + maxVisible - 1)
                    
                    if (endPage - startPage < maxVisible - 1) {
                      startPage = Math.max(1, endPage - maxVisible + 1)
                    }
                    
                    if (startPage > 1) {
                      pages.push(
                        <button
                          key={1}
                          onClick={() => setCurrentPage(1)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                        >
                          1
                        </button>
                      )
                      if (startPage > 2) {
                        pages.push(<span key="start-ellipsis" className="px-1 text-xs text-gray-500">...</span>)
                      }
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`px-2 py-1 text-xs rounded ${
                            i === currentPage
                              ? 'bg-blue-500 text-white border border-blue-500'
                              : 'border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {i}
                        </button>
                      )
                    }
                    
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(<span key="end-ellipsis" className="px-1 text-xs text-gray-500">...</span>)
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
                        >
                          {totalPages}
                        </button>
                      )
                    }
                    
                    return pages
                  })()}
                </div>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  末页
                </button>
              </div>
              
              {/* 快速跳转 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">跳转:</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value)
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page)
                    }
                  }}
                  className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {editingId && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-3 text-lg">编辑单词</h3>
            <WordForm
              initial={words.find(w=>w.id===editingId)}
              onSave={(data)=>{ updateWord(editingId, data as any); setEditingId(undefined) }}
              onCancel={()=> setEditingId(undefined)}
            />
          </div>
        </div>
      )}
      
      {showWordbookManager && (
        <WordbookManager onClose={() => setShowWordbookManager(false)} />
      )}
    </div>
  )
}

function AddButton({ onAdded }:{ onAdded: (data:any)=>void }){
  const [open, setOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  return (
    <>
      <button onClick={()=>setOpen(true)} className="px-3 py-2 rounded bg-blue-600 text-white">新增单词</button>
      {open && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 overflow-y-auto z-50">
          <div className="bg-white p-4 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative z-50">
            <h3 className="font-semibold mb-3 text-lg">新增单词</h3>
            
            {/* 错误提示 */}
            {errorMessage && (
              <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                {errorMessage}
              </div>
            )}
            
            <WordForm
              onSave={(data)=>{ 
                try {
                  onAdded(data)
                  setOpen(false)
                  setErrorMessage('') // 清除错误信息
                } catch (error: any) {
                  if (error.message && error.message.includes('已存在于词库中')) {
                    // 单词已存在，显示提示但不关闭窗口
                    setErrorMessage(`⚠️ ${error.message}。提示：你可以修改单词或前往单词列表编辑已有单词。`)
                  } else {
                    setErrorMessage('❌ 保存失败，请重试')
                  }
                }
              }}
              onCancel={()=> {
                setOpen(false)
                setErrorMessage('') // 关闭时清除错误信息
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
