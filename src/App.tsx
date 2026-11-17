import { useCallback, useEffect, useState } from 'react'
import Auth from './components/Auth'
import MapView from './components/MapView'
import Menu from './components/Menu'
import PlaceList from './components/PlaceList'
import PlaceSheet from './components/PlaceSheet'
import SpaceSetup from './components/SpaceSetup'
import { store } from './store'
import type { NewPlace, Place, Space, User } from './types'

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [space, setSpace] = useState<Space | null | undefined>(undefined)
  const [places, setPlaces] = useState<Place[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [menu, setMenu] = useState(false)
  const [error, setError] = useState('')

  const userId = user?.id
  const spaceId = space?.id

  useEffect(() => {
    store.getUser().then(setUser)
    return store.onAuthChange((u) => setUser((prev) => (prev?.id === u?.id ? prev : u)))
  }, [])

  const loadSpace = useCallback(async () => {
    try {
      setSpace(await store.getSpace())
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    setSpace(undefined)
    setPlaces([])
    setSelectedId(null)
    setMenu(false)
    if (userId) loadSpace()
  }, [userId, loadSpace])

  const reload = useCallback(async () => {
    if (!spaceId) return
    try {
      setPlaces(await store.listPlaces(spaceId))
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }, [spaceId])

  useEffect(() => {
    if (!spaceId) return
    reload()
    return store.subscribe(spaceId, () => {
      reload()
      loadSpace()
    })
  }, [spaceId, reload, loadSpace])

  const addPlace = useCallback(
    async (input: NewPlace) => {
      const id = await store.addPlace(spaceId!, input)
      await reload()
      setSelectedId(id)
    },
    [spaceId, reload],
  )

  if (user === undefined) return <div className="center-screen muted">불러오는 중…</div>
  if (!user) return <Auth />
  if (space === undefined) return <div className="center-screen muted">{error || '불러오는 중…'}</div>
  if (!space) return <SpaceSetup onDone={loadSpace} />

  const selected = places.find((p) => p.id === selectedId)

  return (
    <div className="app">
      <main>
        <MapView places={places} selectedId={selectedId} visible={view === 'map'} onSelect={setSelectedId} onAdd={addPlace} />
        {view === 'list' && <PlaceList places={places} onSelect={setSelectedId} />}
        {error && <div className="toast">{error}</div>}
      </main>

      <nav className="tabs">
        <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>
          🗺️<span>지도</span>
        </button>
        <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>
          📋<span>목록 {places.length > 0 && places.length}</span>
        </button>
        <button onClick={() => setMenu(true)}>
          👥<span>우리</span>
        </button>
      </nav>

      {selected && (
        <PlaceSheet
          place={selected}
          space={space}
          user={user}
          onClose={() => setSelectedId(null)}
          onChanged={reload}
          onDeleted={() => {
            setSelectedId(null)
            reload()
          }}
        />
      )}
      {menu && <Menu space={space} user={user} count={places.length} onClose={() => setMenu(false)} />}
    </div>
  )
}
