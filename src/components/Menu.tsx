import { useState } from 'react'
import { store } from '../store'
import type { Space, User } from '../types'

export default function Menu({ space, user, count, onClose }: { space: Space; user: User; count: number; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const local = store.mode === 'local'

  const copy = async () => {
    await navigator.clipboard.writeText(space.inviteCode)
    setCopied(true)
  }

  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <section className="sheet" role="dialog" aria-label="메뉴">
        <header>
          <div>
            <h2>{space.name}</h2>
            <p className="muted">
              {space.members.map((m) => m.nickname).join(' ♥ ')} · 기록 {count}곳
            </p>
          </div>
          <button className="icon" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        {local ? (
          <p className="notice">
            체험 모드예요. 기록이 이 기기에만 저장되고 친구와 공유되지 않아요. Supabase를 연결하면 함께 쓸 수 있어요 (README 참고).
          </p>
        ) : (
          <>
            {space.members.length < 2 && (
              <div className="invite">
                <p>친구에게 초대 코드를 보내주세요.</p>
                <button className="code" onClick={copy}>
                  {space.inviteCode}
                </button>
                <p className="muted small">{copied ? '복사했어요!' : '누르면 복사돼요'}</p>
              </div>
            )}
            <p className="muted small">{user.email}</p>
            <button className="ghost" onClick={() => store.signOut()}>
              로그아웃
            </button>
          </>
        )}
      </section>
    </>
  )
}
