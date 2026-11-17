import type { Place } from '../types'

export function avgRating(place: Place): number | null {
  if (!place.reviews.length) return null
  return place.reviews.reduce((s, r) => s + r.rating, 0) / place.reviews.length
}

/** 카카오 카테고리("음식점 > 한식 > 냉면")의 대분류 */
export function categoryGroup(category: string): string {
  if (category.includes('카페')) return '카페'
  if (category.includes('술집')) return '술집'
  const head = category.split('>')[0].trim()
  if (!head) return '기타'
  if (head.includes('음식')) return '음식점'
  return head
}

export function categoryLeaf(category: string): string {
  const parts = category.split('>').map((s) => s.trim()).filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

export function categoryEmoji(category: string): string {
  if (category.includes('술집') || category.includes('호프') || category.includes('바(')) return '🍺'
  if (category.includes('카페') || category.includes('디저트') || category.includes('제과')) return '☕'
  if (category.includes('음식')) return '🍚'
  if (category.includes('여행') || category.includes('관광') || category.includes('공원')) return '🏞️'
  if (category.includes('문화') || category.includes('영화') || category.includes('전시')) return '🎭'
  if (category.includes('숙박')) return '🏨'
  if (category.includes('쇼핑') || category.includes('백화점')) return '🛍️'
  return '📍'
}

/** 업로드 전에 긴 변 기준으로 줄이고 JPEG로 변환 */
export async function compressImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('사진을 변환하지 못했어요.'))), 'image/jpeg', quality),
  )
}

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
