/** Google Drive share links -> a direct thumbnail URL the browser can show. */
export function driveFileId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=|thumbnail\?id=)([\w-]{20,})/);
  return m ? m[1] : null;
}

export function thumbnailFor(c: { thumbnail_url: string; file_url: string }, width = 600): string | null {
  const src = c.thumbnail_url || c.file_url;
  if (!src) return null;
  const id = driveFileId(src);
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
  return /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(src) || src.startsWith("data:image/") ? src : null;
}
