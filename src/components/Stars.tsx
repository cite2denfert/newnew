interface Props {
  value: number
  onChange?: (v: number) => void
  size?: number
}

/** 0.5 단위 별점. onChange가 있으면 입력 가능 */
export default function Stars({ value, onChange, size = 18 }: Props) {
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`별점 ${value}점`}>
      <span className="stars-bg">★★★★★</span>
      <span className="stars-fg" style={{ width: `${(value / 5) * 100}%` }}>
        ★★★★★
      </span>
      {onChange && (
        <span className="stars-input">
          {Array.from({ length: 10 }, (_, i) => (i + 1) / 2).map((v) => (
            <button key={v} type="button" aria-label={`${v}점`} onClick={() => onChange(v)} />
          ))}
        </span>
      )}
    </span>
  )
}
