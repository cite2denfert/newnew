import { useMemo, useState } from 'react'
import { avgRating, categoryEmoji, categoryGroup, categoryLeaf } from '../lib/util'
import type { Place } from '../types'
import Stars from './Stars'

type Sort = 'recent' | 'rating' | 'name'

export default function PlaceList({ places, onSelect }: { places: Place[]; onSelect: (id: string) => void }) {
  const [sort, setSort] = useState<Sort>('recent')
  const [group, setGroup] = useState('전체')

  const groups = useMemo(() => ['전체', ...new Set(places.map((p) => categoryGroup(p.category)))], [places])

  const shown = useMemo(() => {
    const list = places.filter((p) => group === '전체' || categoryGroup(p.category) === group)
    if (sort === 'rating') list.sort((a, b) => (avgRating(b) ?? -1) - (avgRating(a) ?? -1))
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return list
  }, [places, sort, group])

  if (!places.length) {
    return (
      <div className="list empty-state">
        <p>아직 기록한 곳이 없어요.</p>
        <p className="muted">지도 탭에서 다녀온 곳을 검색해 첫 기록을 남겨보세요.</p>
      </div>
    )
  }

  return (
    <div className="list">
      <div className="list-tools">
        <div className="chips">
          {groups.map((g) => (
            <button key={g} className={g === group ? 'on' : ''} onClick={() => setGroup(g)}>
              {g}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="정렬">
          <option value="recent">최근 기록순</option>
          <option value="rating">평점 높은순</option>
          <option value="name">이름순</option>
        </select>
      </div>
      <ul>
        {shown.map((p) => {
          const avg = avgRating(p)
          return (
            <li key={p.id}>
              <button onClick={() => onSelect(p.id)}>
                {p.photos[0] ? (
                  <img src={p.photos[0].url} alt="" loading="lazy" />
                ) : (
                  <span className="thumb">{categoryEmoji(p.category)}</span>
                )}
                <span className="info">
                  <b>{p.name}</b>
                  <span className="muted">{[categoryLeaf(p.category), p.address].filter(Boolean).join(' · ')}</span>
                  <span className="rating-line">
                    {avg === null ? (
                      <span className="muted">아직 평점 없음</span>
                    ) : (
                      <>
                        <Stars value={avg} size={14} /> <b>{avg.toFixed(1)}</b>
                        <span className="muted">· 후기 {p.reviews.length}</span>
                      </>
                    )}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
