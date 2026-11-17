import { createClient } from '@supabase/supabase-js'
import type { Place, Space, Store, User } from '../types'

const BUCKET = 'photos'

const MESSAGES: [RegExp, string][] = [
  [/INVALID_CODE/, '초대 코드를 찾을 수 없어요.'],
  [/SPACE_FULL/, '이미 두 명이 함께 쓰고 있는 지도예요.'],
  [/Invalid login credentials/i, '이메일 또는 비밀번호가 맞지 않아요.'],
  [/already registered/i, '이미 가입된 이메일이에요.'],
  [/Email not confirmed/i, '이메일 인증을 먼저 완료해주세요.'],
  [/at least 6 characters/i, '비밀번호는 6자 이상이어야 해요.'],
]

function fail(error: { message: string }): never {
  const hit = MESSAGES.find(([re]) => re.test(error.message))
  throw new Error(hit ? hit[1] : error.message)
}

export function createSupabaseStore(url: string, anonKey: string): Store {
  const sb = createClient(url, anonKey)

  const toUser = (u: { id: string; email?: string } | null | undefined): User | null =>
    u ? { id: u.id, email: u.email ?? '' } : null

  return {
    mode: 'supabase',

    async getUser() {
      const { data } = await sb.auth.getSession()
      return toUser(data.session?.user)
    },

    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, session) => cb(toUser(session?.user)))
      return () => data.subscription.unsubscribe()
    },

    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) fail(error)
    },

    async signUp(email, password) {
      const { data, error } = await sb.auth.signUp({ email, password })
      if (error) fail(error)
      return { needsConfirm: !data.session }
    },

    async signOut() {
      await sb.auth.signOut()
    },

    async getSpace(): Promise<Space | null> {
      const { data: s } = await sb.auth.getSession()
      const uid = s.session?.user.id
      if (!uid) return null
      const { data: mine, error } = await sb
        .from('space_members')
        .select('space_id')
        .eq('user_id', uid)
        .order('joined_at')
        .limit(1)
      if (error) fail(error)
      const spaceId = mine?.[0]?.space_id
      if (!spaceId) return null
      const [space, members] = await Promise.all([
        sb.from('spaces').select('id,name,invite_code').eq('id', spaceId).single(),
        sb.from('space_members').select('user_id,nickname').eq('space_id', spaceId).order('joined_at'),
      ])
      if (space.error) fail(space.error)
      if (members.error) fail(members.error)
      return {
        id: space.data.id,
        name: space.data.name,
        inviteCode: space.data.invite_code,
        members: members.data.map((m) => ({ userId: m.user_id, nickname: m.nickname })),
      }
    },

    async createSpace(name, nickname) {
      const { error } = await sb.rpc('create_space', { p_name: name, p_nickname: nickname })
      if (error) fail(error)
    },

    async joinSpace(code, nickname) {
      const { error } = await sb.rpc('join_space', { p_code: code.trim().toUpperCase(), p_nickname: nickname })
      if (error) fail(error)
    },

    async listPlaces(spaceId): Promise<Place[]> {
      const { data, error } = await sb
        .from('places')
        .select('*, reviews(*), photos(*)')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })
      if (error) fail(error)

      // 사진 버킷은 비공개라서 서명된 URL을 한 번에 받아온다
      const paths: string[] = data.flatMap((p) => p.photos.map((ph: { path: string }) => ph.path))
      const urls = new Map<string, string>()
      if (paths.length) {
        const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(paths, 60 * 60 * 6)
        signed?.forEach((s) => s.path && s.signedUrl && urls.set(s.path, s.signedUrl))
      }

      return data.map((p) => ({
        id: p.id,
        spaceId: p.space_id,
        kakaoId: p.kakao_id,
        name: p.name,
        address: p.address,
        category: p.category,
        lat: p.lat,
        lng: p.lng,
        url: p.url,
        createdBy: p.created_by,
        createdAt: p.created_at,
        reviews: p.reviews.map((r: any) => ({
          userId: r.user_id,
          rating: Number(r.rating),
          comment: r.comment,
          visitedOn: r.visited_on,
          updatedAt: r.updated_at,
        })),
        photos: p.photos
          .map((ph: any) => ({
            id: ph.id,
            userId: ph.user_id,
            path: ph.path,
            url: urls.get(ph.path) ?? '',
            createdAt: ph.created_at,
          }))
          .sort((a: any, b: any) => a.createdAt.localeCompare(b.createdAt)),
      }))
    },

    async addPlace(spaceId, input) {
      const { data, error } = await sb
        .from('places')
        .insert({
          space_id: spaceId,
          kakao_id: input.kakaoId,
          name: input.name,
          address: input.address,
          category: input.category,
          lat: input.lat,
          lng: input.lng,
          url: input.url,
        })
        .select('id')
        .single()
      if (error) fail(error)
      return data.id
    },

    async deletePlace(place) {
      if (place.photos.length) {
        await sb.storage.from(BUCKET).remove(place.photos.map((p) => p.path))
      }
      const { error } = await sb.from('places').delete().eq('id', place.id)
      if (error) fail(error)
    },

    async saveReview(placeId, input) {
      const { error } = await sb.from('reviews').upsert({
        place_id: placeId,
        rating: input.rating,
        comment: input.comment,
        visited_on: input.visitedOn,
        updated_at: new Date().toISOString(),
      })
      if (error) fail(error)
    },

    async addPhoto(place, blob) {
      const path = `${place.spaceId}/${place.id}/${crypto.randomUUID()}.jpg`
      const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
      if (up.error) fail(up.error)
      const { error } = await sb.from('photos').insert({ place_id: place.id, path })
      if (error) {
        await sb.storage.from(BUCKET).remove([path])
        fail(error)
      }
    },

    async deletePhoto(photo) {
      const { error } = await sb.from('photos').delete().eq('id', photo.id)
      if (error) fail(error)
      await sb.storage.from(BUCKET).remove([photo.path])
    },

    subscribe(spaceId, cb) {
      let timer: ReturnType<typeof setTimeout> | undefined
      const fire = () => {
        clearTimeout(timer)
        timer = setTimeout(cb, 300)
      }
      const ch = sb.channel(`space-${spaceId}`)
      for (const table of ['places', 'reviews', 'photos', 'space_members']) {
        ch.on('postgres_changes', { event: '*', schema: 'public', table }, fire)
      }
      ch.subscribe()
      return () => {
        clearTimeout(timer)
        sb.removeChannel(ch)
      }
    },
  }
}
