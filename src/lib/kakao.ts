// 카카오맵 JavaScript SDK 로더. SDK에는 공식 타입이 없어서 any로 다룬다.
/* eslint-disable @typescript-eslint/no-explicit-any */

export const KAKAO_KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined

let loading: Promise<any> | null = null

export function loadKakao(): Promise<any> {
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const ready = () => (window as any).kakao.maps.load(() => resolve((window as any).kakao))
    if ((window as any).kakao?.maps) return ready()
    if (!KAKAO_KEY) return reject(new Error('NO_KEY'))
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`
    script.onload = ready
    script.onerror = () => reject(new Error('LOAD_FAILED'))
    document.head.appendChild(script)
  })
  loading.catch(() => (loading = null))
  return loading
}

export interface SearchResult {
  kakaoId: string
  name: string
  address: string
  category: string
  lat: number
  lng: number
  url: string | null
}

export function searchPlaces(kakao: any, query: string, center?: any): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    const { Places, Status } = kakao.maps.services
    new Places().keywordSearch(
      query,
      (data: any[], status: string) => {
        if (status === Status.ZERO_RESULT) return resolve([])
        if (status !== Status.OK) return reject(new Error('검색에 실패했어요. 잠시 후 다시 시도해주세요.'))
        resolve(
          data.map((d) => ({
            kakaoId: String(d.id),
            name: d.place_name,
            address: d.road_address_name || d.address_name || '',
            category: d.category_name || d.category_group_name || '',
            lat: Number(d.y),
            lng: Number(d.x),
            url: d.place_url || null,
          })),
        )
      },
      center ? { location: center, size: 10 } : { size: 10 },
    )
  })
}

export function coordToAddress(kakao: any, lat: number, lng: number): Promise<string> {
  return new Promise((resolve) => {
    new kakao.maps.services.Geocoder().coord2Address(lng, lat, (res: any[], status: string) => {
      if (status !== kakao.maps.services.Status.OK || !res[0]) return resolve('')
      resolve(res[0].road_address?.address_name || res[0].address?.address_name || '')
    })
  })
}
