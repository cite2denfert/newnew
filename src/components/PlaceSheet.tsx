import { useEffect, useRef, useState } from 'react'
import { avgRating, categoryEmoji, categoryLeaf, compressImage, today } from '../lib/util'
import { store } from '../store'
import type { Photo, Place, Space, User } from '../types'
import Stars from './Stars'

interface Props {
  place: Place
  space: Space
  user: User
  onClose: () => void
  onChanged: () => Promise<void>
  onDeleted: () => void
}

export default function PlaceSheet({ place, space, user, onClose, onChanged, onDeleted }: Props) {
  const mine = place.reviews.find((r) => r.userId === user.id)
  const [rating, setRating] = useState(mine?.rating ?? 0)
  const [comment, setComment] = useState(mine?.comment ?? '')
  const [visitedOn, setVisitedOn] = useState(mine?.visitedOn ?? today())
  const [editing, setEditing] = useState(!mine)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [viewer, setViewer] = useState<Photo | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // 다른 장소로 바뀌면 입력값 초기화
  useEffect(() => {
    setRating(mine?.rating ?? 0)
    setComment(mine?.comment ?? '')
    setVisitedOn(mine?.visitedOn ?? today())
    setEditing(!mine)
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.id])

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy('')
    }
  }

  const save = () =>
    run('저장 중…', async () => {
      if (!rating) throw new Error('별점을 눌러 선택해주세요.')
      await store.saveReview(place.id, { rating, comment: comment.trim(), visitedOn: visitedOn || null })
      await onChanged()
      setEditing(false)
    })

  const upload = (files: FileList | null) => {
    if (!files?.length) return
    const list = Array.from(files)
    run('사진 올리는 중…', async () => {
      for (const f of list) await store.addPhoto(place, await compressImage(f))
      await onChanged()
    })
  }

  const removePhoto = (photo: Photo) =>
    run('삭제 중…', async () => {
      await store.deletePhoto(photo)
      setViewer(null)
      await onChanged()
    })

  const removePlace = () => {
    if (!confirm(`“${place.name}” 기록을 삭제할까요? 평점·후기·사진이 모두 지워져요.`)) return
    run('삭제 중…', async () => {
      await store.deletePlace(place)
      onDeleted()
    })
  }

  const avg = avgRating(place)
  const nick = (id: string) => (id === user.id ? '나' : space.members.find((m) => m.userId === id)?.nickname ?? '친구')
  const others = place.reviews.filter((r) => r.userId !== user.id)
  const waiting = space.members.filter((m) => m.userId !== user.id && !others.some((r) => r.userId === m.userId))

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <section className="sheet" role="dialog" aria-label={place.name}>
        <header>
          <div>
            <h2>
              {categoryEmoji(place.category)} {place.name}
            </h2>
            <p className="muted">
              {[categoryLeaf(place.category), place.address].filter(Boolean).join(' · ')}
              {place.url && (
                <>
                  {' · '}
                  <a href={place.url} target="_blank" rel="noreferrer">
                    카카오맵
                  </a>
                </>
              )}
            </p>
          </div>
          <button className="icon" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        <div className="avg">
          <strong>{avg === null ? '–' : avg.toFixed(1)}</strong>
          <Stars value={avg ?? 0} size={22} />
          <span className="muted">우리 평점</span>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="review mine">
          <div className="review-head">
            <b>나</b>
            {!editing && mine && (
              <>
                <Stars value={mine.rating} />
                <span>{mine.rating.toFixed(1)}</span>
                <button className="link" onClick={() => setEditing(true)}>
                  수정
                </button>
              </>
            )}
          </div>
          {editing ? (
            <>
              <div className="rate-row">
                <Stars value={rating} onChange={setRating} size={34} />
                <span>{rating ? rating.toFixed(1) : '별을 눌러주세요'}</span>
              </div>
              <textarea
                placeholder="어땠나요? 메뉴, 분위기, 기억에 남는 일…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
              />
              <label className="date">
                다녀온 날
                <input type="date" value={visitedOn} max={today()} onChange={(e) => setVisitedOn(e.target.value)} />
              </label>
              <div className="row">
                {mine && (
                  <button className="ghost" onClick={() => setEditing(false)}>
                    취소
                  </button>
                )}
                <button className="primary" onClick={save} disabled={!!busy}>
                  저장
                </button>
              </div>
            </>
          ) : (
            mine && (
              <>
                {mine.comment && <p className="comment">{mine.comment}</p>}
                {mine.visitedOn && <p className="muted small">{mine.visitedOn} 방문</p>}
              </>
            )
          )}
        </div>

        {others.map((r) => (
          <div className="review" key={r.userId}>
            <div className="review-head">
              <b>{nick(r.userId)}</b>
              <Stars value={r.rating} />
              <span>{r.rating.toFixed(1)}</span>
            </div>
            {r.comment && <p className="comment">{r.comment}</p>}
            {r.visitedOn && <p className="muted small">{r.visitedOn} 방문</p>}
          </div>
        ))}
        {waiting.map((m) => (
          <div className="review" key={m.userId}>
            <div className="review-head">
              <b>{m.nickname}</b>
              <span className="muted">아직 평가하지 않았어요</span>
            </div>
          </div>
        ))}

        <h3>사진 {place.photos.length > 0 && <span className="muted">{place.photos.length}</span>}</h3>
        <div className="photos">
          {place.photos.map((ph) => (
            <button key={ph.id} className="photo" onClick={() => setViewer(ph)}>
              <img src={ph.url} alt="" loading="lazy" />
            </button>
          ))}
          <button className="photo add" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            ＋<span>사진 추가</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              upload(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {busy && <p className="notice">{busy}</p>}

        <button className="link danger" onClick={removePlace} disabled={!!busy}>
          이 장소 기록 삭제
        </button>
      </section>

      {viewer && (
        <div className="viewer" onClick={() => setViewer(null)}>
          <img src={viewer.url} alt="" />
          <div className="viewer-bar" onClick={(e) => e.stopPropagation()}>
            <span>{nick(viewer.userId)} 님이 올림</span>
            {viewer.userId === user.id && (
              <button className="link danger" onClick={() => removePhoto(viewer)} disabled={!!busy}>
                삭제
              </button>
            )}
            <button className="link" onClick={() => setViewer(null)}>
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  )
}
