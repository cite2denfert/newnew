import { useState, type FormEvent } from 'react'
import { store } from '../store'

export default function Auth() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'in') await store.signIn(email, password)
      else {
        const { needsConfirm } = await store.signUp(email, password)
        if (needsConfirm) {
          setNotice('인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해주세요.')
          setMode('in')
        }
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-screen">
      <form className="card" onSubmit={submit}>
        <img src="/icon.svg" alt="" className="logo" />
        <h1>우리지도</h1>
        <p className="muted">둘이 함께 다녀온 곳을 기록해요</p>
        <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <input
          type="password"
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
        />
        {error && <p className="error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}
        <button className="primary" disabled={busy}>
          {mode === 'in' ? '로그인' : '가입하기'}
        </button>
        <button type="button" className="link" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? '처음이신가요? 가입하기' : '이미 계정이 있어요'}
        </button>
      </form>
    </div>
  )
}
