import { useEffect, useRef, useState, type FormEvent } from 'react'
import { coordToAddress, loadKakao, searchPlaces, type SearchResult } from '../lib/kakao'
import { avgRating, categoryEmoji, categoryLeaf } from '../lib/util'
import type { NewPlace, Place } from '../types'

interface Props {
  places: Place[]
  selectedId: string | null
  visible: boolean
  onSelect: (id: string) => void
  onAdd: (input: NewPlace) => Promise<void>
}

const SEOUL = { lat: 37.5665, lng: 126.978 }

export default function MapView({ places, selectedId, visible, onSelect, onAdd }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const kakaoRef = useRef<any>(null)
  const mapRef = useRef<any>(null)
  const overlays = useRef<any[]>([])
  const previewOverlay = useRef<any>(null)
  const fitted = useRef(false)

  const [status, setStatus] = useState<'loading' | 'ready' | 'nokey' | 'error'>('loading')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [preview, setPreview] = useState<SearchResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    loadKakao()
      .then((kakao) => {
        if (cancelled || !el.current) return
        kakaoRef.current = kakao
        mapRef.current = new kakao.maps.Map(el.current, {
          center: new kakao.maps.LatLng(SEOUL.lat, SEOUL.lng),
          level: 7,
        })
        setStatus('ready')
      })
      .catch((e: Error) => !cancelled && setStatus(e.message === 'NO_KEY' ? 'nokey' : 'error'))
    return () => {
      cancelled = true
    }
  }, [])

  // 기록한 장소 마커
  useEffect(() => {
    const kakao = kakaoRef.current
    const map = mapRef.current
    if (status !== 'ready' || !map) return
    overlays.current.forEach((o) => o.setMap(null))
    overlays.current = places.map((p) => {
      const avg = avgRating(p)
      const pin = document.createElement('button')
      pin.className = 'pin' + (p.id === selectedId ? ' selected' : '')
      pin.textContent = `${categoryEmoji(p.category)} ${avg === null ? '–' : avg.toFixed(1)}`
      pin.title = p.name
      pin.onclick = () => onSelect(p.id)
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(p.lat, p.lng),
        content: pin,
        yAnchor: 1.15,
        clickable: true,
        zIndex: p.id === selectedId ? 10 : 1,
      })
      overlay.setMap(map)
      return overlay
    })
    if (!fitted.current && places.length) {
      fitted.current = true
      const bounds = new kakao.maps.LatLngBounds()
      places.forEach((p) => bounds.extend(new kakao.maps.LatLng(p.lat, p.lng)))
      map.setBounds(bounds)
    }
  }, [places, selectedId, status, onSelect])

  // 목록에서 고른 장소로 이동
  useEffect(() => {
    const p = places.find((x) => x.id === selectedId)
    if (p && mapRef.current) mapRef.current.panTo(new kakaoRef.current.maps.LatLng(p.lat, p.lng))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, status])

  // 탭 전환으로 숨겨졌다 다시 보이면 크기를 다시 계산해야 한다
  useEffect(() => {
    if (visible) mapRef.current?.relayout()
  }, [visible])

  // 검색 결과 미리보기 핀
  useEffect(() => {
    previewOverlay.current?.setMap(null)
    previewOverlay.current = null
    const kakao = kakaoRef.current
    if (!preview || !kakao) return
    const pos = new kakao.maps.LatLng(preview.lat, preview.lng)
    const dot = document.createElement('div')
    dot.className = 'pin preview'
    dot.textContent = '📌'
    previewOverlay.current = new kakao.maps.CustomOverlay({ position: pos, content: dot, yAnchor: 1.15, zIndex: 20 })
    previewOverlay.current.setMap(mapRef.current)
    mapRef.current.setLevel(3)
    mapRef.current.panTo(pos)
  }, [preview])

  const search = async (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q || status !== 'ready') return
    setError('')
    setPreview(null)
    try {
      setResults(await searchPlaces(kakaoRef.current, q, mapRef.current.getCenter()))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const clear = () => {
    setQuery('')
    setResults(null)
    setPreview(null)
    setError('')
  }

  const pickManual = async () => {
    const c = mapRef.current.getCenter()
    const lat = c.getLat()
    const lng = c.getLng()
    const address = await coordToAddress(kakaoRef.current, lat, lng)
    setResults(null)
    setPreview({ kakaoId: '', name: query.trim(), address, category: '', lat, lng, url: null })
  }

  const existing = preview?.kakaoId ? places.find((p) => p.kakaoId === preview.kakaoId) : undefined

  const confirm = async () => {
    if (!preview) return
    if (existing) {
      clear()
      return onSelect(existing.id)
    }
    setBusy(true)
    try {
      await onAdd({ ...preview, kakaoId: preview.kakaoId || null })
      clear()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        mapRef.current?.setLevel(4)
        mapRef.current?.panTo(new kakaoRef.current.maps.LatLng(pos.coords.latitude, pos.coords.longitude))
      },
      () => setError('현재 위치를 가져오지 못했어요. 위치 권한을 확인해주세요.'),
    )
  }

  return (
    <div className="map-wrap" style={{ display: visible ? undefined : 'none' }}>
      <div ref={el} className="map" />

      {status === 'nokey' && (
        <div className="map-msg">
          <b>카카오맵 키가 필요해요</b>
          <span>.env 파일의 VITE_KAKAO_JS_KEY 를 설정한 뒤 다시 실행해주세요. (README 참고)</span>
        </div>
      )}
      {status === 'error' && (
        <div className="map-msg">
          <b>지도를 불러오지 못했어요</b>
          <span>카카오 개발자 콘솔에 이 사이트 주소가 등록되어 있는지 확인해주세요.</span>
        </div>
      )}

      {status === 'ready' && (
        <>
          <form className="search" onSubmit={search}>
            <input
              placeholder="다녀온 곳 검색 (예: 성수 카페)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              enterKeyHint="search"
            />
            {(query || results || preview) && (
              <button type="button" className="icon" onClick={clear} aria-label="지우기">
                ✕
              </button>
            )}
            <button className="icon" aria-label="검색">
              🔍
            </button>
          </form>

          {error && <div className="toast">{error}</div>}

          {results && (
            <ul className="results">
              {results.map((r) => (
                <li key={r.kakaoId}>
                  <button
                    onClick={() => {
                      setResults(null)
                      setPreview(r)
                    }}
                  >
                    <b>
                      {categoryEmoji(r.category)} {r.name}
                    </b>
                    <span>
                      {categoryLeaf(r.category)} · {r.address}
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="empty">검색 결과가 없어요.</li>}
              <li>
                <button onClick={pickManual}>
                  <b>📌 “{query.trim()}” 직접 추가</b>
                  <span>검색에 안 나오면 지도를 원하는 위치로 옮긴 뒤 눌러주세요 (지도 중심에 추가)</span>
                </button>
              </li>
            </ul>
          )}

          {preview && (
            <div className="preview-card">
              <div>
                <b>{preview.name}</b>
                <span>{preview.address || '주소 정보 없음'}</span>
              </div>
              <button className="primary" onClick={confirm} disabled={busy}>
                {existing ? '기록 보기' : '여기 기록하기'}
              </button>
            </div>
          )}

          <button className="locate" onClick={locate} aria-label="내 위치">
            ◎
          </button>
        </>
      )}
    </div>
  )
}
