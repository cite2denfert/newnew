import type { KeyboardEvent, PointerEvent } from 'react'

interface Props {
  value: number
  onChange?: (v: number) => void
  size?: number
}

export const clampRating = (v: number) => Math.min(5, Math.max(0.1, Math.round(v * 10) / 10))

/** 0.1 단위 별점. onChange가 있으면 누르거나 좌우로 끌어서 입력 */
export default function Stars({ value, onChange, size = 18 }: Props) {
  const pick = (e: PointerEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onChange!(clampRating(((e.clientX - rect.left) / rect.width) * 5))
  }
  const onKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 0.1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -0.1 : 0
    if (!step) return
    e.preventDefault()
    onChange!(clampRating(value + step))
  }

  return (
    <span className="stars" style={{ fontSize: size }} aria-label={onChange ? undefined : `별점 ${value}점`}>
      <span className="stars-bg">★★★★★</span>
      <span className="stars-fg" style={{ width: `${(value / 5) * 100}%` }}>
        ★★★★★
      </span>
      {onChange && (
        <span
          className="stars-input"
          role="slider"
          tabIndex={0}
          aria-label="별점"
          aria-valuemin={0.1}
          aria-valuemax={5}
          aria-valuenow={value}
          onKeyDown={onKey}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            pick(e)
          }}
          onPointerMove={(e) => e.buttons > 0 && pick(e)}
        />
      )}
    </span>
  )
}
