import { get, set } from 'idb-keyval'
import type { Place, Space, Store, User } from '../types'

// Supabase 키가 없을 때 쓰는 체험 모드: 이 기기(IndexedDB)에만 저장된다.

interface StoredPhoto {
  id: string
  userId: string
  blob: Blob
  createdAt: string
}
type StoredPlace = Omit<Place, 'photos'> & { photos: StoredPhoto[] }

const KEY = 'uri-jido-local'
const ME: User = { id: 'local-me', email: '체험 모드' }
const SPACE: Space = {
  id: 'local-space',
  name: '우리지도 (체험)',
  inviteCode: '--------',
  members: [{ userId: ME.id, nickname: '나' }],
}

export function createLocalStore(): Store {
  const urls = new Map<string, string>()
  const load = async (): Promise<StoredPlace[]> => (await get(KEY)) ?? []
  const save = (places: StoredPlace[]) => set(KEY, places)

  const mutate = async (placeId: string, fn: (p: StoredPlace) => void) => {
    const places = await load()
    const place = places.find((p) => p.id === placeId)
    if (!place) throw new Error('장소를 찾을 수 없어요.')
    fn(place)
    await save(places)
  }

  return {
    mode: 'local',
    getUser: async () => ME,
    onAuthChange: () => () => {},
    signIn: async () => {},
    signUp: async () => ({ needsConfirm: false }),
    signOut: async () => {},
    getSpace: async () => SPACE,
    createSpace: async () => {},
    joinSpace: async () => {},

    async listPlaces() {
      const places = await load()
      return places.map((p) => ({
        ...p,
        photos: p.photos.map((ph) => {
          if (!urls.has(ph.id)) urls.set(ph.id, URL.createObjectURL(ph.blob))
          return { id: ph.id, userId: ph.userId, path: `${p.id}/${ph.id}`, url: urls.get(ph.id)!, createdAt: ph.createdAt }
        }),
      }))
    },

    async addPlace(spaceId, input) {
      const places = await load()
      const id = crypto.randomUUID()
      places.unshift({
        ...input,
        id,
        spaceId,
        createdBy: ME.id,
        createdAt: new Date().toISOString(),
        reviews: [],
        photos: [],
      })
      await save(places)
      return id
    },

    async deletePlace(place) {
      await save((await load()).filter((p) => p.id !== place.id))
    },

    saveReview: (placeId, input) =>
      mutate(placeId, (p) => {
        p.reviews = [{ ...input, userId: ME.id, updatedAt: new Date().toISOString() }]
      }),

    addPhoto: (place, blob) =>
      mutate(place.id, (p) => {
        p.photos.push({ id: crypto.randomUUID(), userId: ME.id, blob, createdAt: new Date().toISOString() })
      }),

    deletePhoto: (photo) =>
      mutate(photo.path.split('/')[0], (p) => {
        p.photos = p.photos.filter((ph) => ph.id !== photo.id)
      }),

    subscribe: () => () => {},
  }
}
