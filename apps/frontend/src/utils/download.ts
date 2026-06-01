/**
 * 浏览器侧文件下载辅助:对于跨域受限的 video URL,
 * `<a download>` 在 Chrome 等可能被忽略 download 属性而走打开预览。
 * 这里采用稳健的 fetch + Blob 方案,确保用户拿到的是真实下载文件。
 *
 * 失败回退:若 fetch 失败(如 CORS),退化为打开新标签页让用户右键另存。
 */
export async function triggerDownload(url: string, filename: string): Promise<void> {
  if (!url) return;
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new Error(`download failed: HTTP ${resp.status}`);
    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename || extractFilename(url) || 'download';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      // 释放 blob 资源
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  } catch {
    // 回退:打开新标签让用户手动保存
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function extractFilename(url: string): string | null {
  try {
    const u = new URL(url, window.location.href);
    const last = u.pathname.split('/').filter(Boolean).pop();
    return last || null;
  } catch {
    return null;
  }
}

/**
 * 在新标签页打开 URL(用于不想强制下载的场景)
 */
export function openInNewTab(url: string): void {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}
