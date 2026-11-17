import { useState, type FormEvent } from 'react'
import { store } from '../store'

export default function SpaceSetup({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [nickname, setNickname] = useState('')
  const [name, setName] = useState('우리지도')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (tab === 'create') await store.createSpace(name.trim(), nickname.trim())
      else await store.joinSpace(code, nickname.trim())
      onDone()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="center-screen">
      <form className="card" onSubmit={submit}>
        <h1>지도 시작하기</h1>
        <div className="segmented">
          <button type="button" className={tab === 'create' ? 'on' : ''} onClick={() => setTab('create')}>
            새로 만들기
          </button>
          <button type="button" className={tab === 'join' ? 'on' : ''} onClick={() => setTab('join')}>
            초대 코드로 참여
          </button>
        </div>
        <input placeholder="내 닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} required maxLength={12} />
        {tab === 'create' ? (
          <input placeholder="지도 이름" value={name} onChange={(e) => setName(e.target.value)} required maxLength={20} />
        ) : (
          <input
            placeholder="친구에게 받은 초대 코드"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            maxLength={8}
            autoCapitalize="characters"
          />
        )}
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {tab === 'create' ? '만들기' : '참여하기'}
        </button>
        <button type="button" className="link" onClick={() => store.signOut()}>
          로그아웃
        </button>
      </form>
    </div>
  )
}
