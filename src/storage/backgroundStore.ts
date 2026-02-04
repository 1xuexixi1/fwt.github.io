// 背景文件IndexedDB持久化存储系统
import { set, get, del, keys } from 'idb-keyval';

// 背景文件元数据类型
export type BgFileMeta = {
  id: string;            // uuid
  name: string;
  type: string;
  size: number;
  lastModified: number;
  createdAt: number;
  isDefault?: boolean;
};

// 唯一键结构：bg:<uuid>
const BLOB_KEY_PREFIX = 'bg:blob:';
const META_LIST_KEY = 'bg:metaList';

/**
 * 保存背景文件到IndexedDB
 */
export async function saveBgFile(file: File): Promise<BgFileMeta> {
  const id = crypto.randomUUID();
  
  // 智能检测文件类型
  const getFileType = (file: File): string => {
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    // 基于文件扩展名和MIME类型判断
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
  
  const meta: BgFileMeta = {
    id,
    name: file.name,
    type: getFileType(file),
    size: file.size,
    lastModified: file.lastModified ?? Date.now(),
    createdAt: Date.now(),
    isDefault: false
  };
  
  try {
    // 1) 保存 Blob 到 IndexedDB
    await set(`${BLOB_KEY_PREFIX}${id}`, file);
    console.log('✅ 背景文件Blob已保存到IndexedDB:', file.name);
    
    // 2) 保存 meta 到列表
    const list: BgFileMeta[] = (await get(META_LIST_KEY)) ?? [];
    list.push(meta);
    await set(META_LIST_KEY, list);
    console.log('✅ 背景文件元数据已保存，总数:', list.length);
    
    return meta;
  } catch (error) {
    console.error('❌ 保存背景文件失败:', error);
    throw error;
  }
}

/**
 * 获取所有背景文件元数据列表
 */
export async function listBgFiles(): Promise<BgFileMeta[]> {
  try {
    const list: BgFileMeta[] = (await get(META_LIST_KEY)) ?? [];
    console.log('✅ 从IndexedDB加载背景文件列表，数量:', list.length);
    return list;
  } catch (error) {
    console.error('❌ 加载背景文件列表失败:', error);
    return [];
  }
}

/**
 * 根据ID加载背景文件Blob
 */
export async function loadBgBlob(id: string): Promise<Blob | undefined> {
  try {
    const blob = await get(`${BLOB_KEY_PREFIX}${id}`);
    if (blob) {
      console.log('✅ 从IndexedDB加载背景文件Blob:', id);
    }
    return blob;
  } catch (error) {
    console.error('❌ 加载背景文件Blob失败:', error);
    return undefined;
  }
}

/**
 * 删除背景文件
 */
export async function deleteBgFile(id: string): Promise<void> {
  try {
    // 删除Blob
    await del(`${BLOB_KEY_PREFIX}${id}`);
    
    // 从元数据列表中删除
    const list: BgFileMeta[] = (await get(META_LIST_KEY)) ?? [];
    const newList = list.filter(item => item.id !== id);
    await set(META_LIST_KEY, newList);
    
    console.log('✅ 背景文件已删除:', id);
  } catch (error) {
    console.error('❌ 删除背景文件失败:', error);
    throw error;
  }
}

/**
 * 清空所有背景文件
 */
export async function clearAllBgFiles(): Promise<void> {
  try {
    const allKeys = await keys();
    const bgKeys = allKeys.filter(k => 
      typeof k === 'string' && k.startsWith(BLOB_KEY_PREFIX)
    );
    
    // 删除所有Blob
    await Promise.all(bgKeys.map(k => del(k as string)));
    
    // 清空元数据列表
    await set(META_LIST_KEY, []);
    
    console.log('✅ 所有背景文件已清空');
  } catch (error) {
    console.error('❌ 清空背景文件失败:', error);
    throw error;
  }
}

/**
 * 申请持久化存储，降低被系统回收概率
 */
export async function ensurePersist(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const persisted = await navigator.storage.persist();
      console.log('✅ 持久化存储申请结果:', persisted);
      return persisted;
    }
    return false;
  } catch (error) {
    console.warn('⚠️ 持久化存储申请失败:', error);
    return false;
  }
}

/**
 * 获取存储使用情况
 */
export async function getStorageInfo(): Promise<{
  fileCount: number;
  totalSize: number;
  persisted: boolean;
}> {
  try {
    const list = await listBgFiles();
    const totalSize = list.reduce((sum, item) => sum + item.size, 0);
    
    let persisted = false;
    if (navigator.storage && navigator.storage.persist) {
      persisted = await navigator.storage.persist();
    }
    
    return {
      fileCount: list.length,
      totalSize,
      persisted
    };
  } catch (error) {
    console.error('❌ 获取存储信息失败:', error);
    return { fileCount: 0, totalSize: 0, persisted: false };
  }
}

/**
 * 导出背景文件备份
 */
export async function exportBgFiles(): Promise<{
  metaList: BgFileMeta[];
  files: { id: string; data: Uint8Array }[];
}> {
  try {
    const metaList = await listBgFiles();
    const files = await Promise.all(
      metaList.map(async (meta) => {
        const blob = await loadBgBlob(meta.id);
        if (!blob) throw new Error(`无法加载文件: ${meta.id}`);
        
        const arrayBuffer = await blob.arrayBuffer();
        return {
          id: meta.id,
          data: new Uint8Array(arrayBuffer)
        };
      })
    );
    
    console.log('✅ 背景文件备份数据已准备，文件数:', files.length);
    return { metaList, files };
  } catch (error) {
    console.error('❌ 导出背景文件失败:', error);
    throw error;
  }
}

/**
 * 导入背景文件备份
 */
export async function importBgFiles(backup: {
  metaList: BgFileMeta[];
  files: { id: string; data: Uint8Array }[];
}): Promise<void> {
  try {
    // 清空现有数据
    await clearAllBgFiles();
    
    // 导入新数据
    for (const file of backup.files) {
      const meta = backup.metaList.find(m => m.id === file.id);
      if (!meta) continue;
      
      const blob = new Blob([file.data], { type: meta.type });
      await set(`${BLOB_KEY_PREFIX}${meta.id}`, blob);
    }
    
    // 更新元数据列表
    await set(META_LIST_KEY, backup.metaList);
    
    console.log('✅ 背景文件备份已导入，文件数:', backup.files.length);
  } catch (error) {
    console.error('❌ 导入背景文件失败:', error);
    throw error;
  }
}
