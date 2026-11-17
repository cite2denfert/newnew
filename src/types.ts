export interface User {
  id: string
  email: string
}

export interface Member {
  userId: string
  nickname: string
}

export interface Space {
  id: string
  name: string
  inviteCode: string
  members: Member[]
}

export interface Review {
  userId: string
  rating: number
  comment: string
  visitedOn: string | null
  updatedAt: string
}

export interface Photo {
  id: string
  userId: string
  path: string
  url: string
  createdAt: string
}

export interface Place {
  id: string
  spaceId: string
  kakaoId: string | null
  name: string
  address: string
  category: string
  lat: number
  lng: number
  url: string | null
  createdBy: string
  createdAt: string
  reviews: Review[]
  photos: Photo[]
}

export type NewPlace = Pick<Place, 'kakaoId' | 'name' | 'address' | 'category' | 'lat' | 'lng' | 'url'>

export interface ReviewInput {
  rating: number
  comment: string
  visitedOn: string | null
}

export interface Store {
  mode: 'supabase' | 'local'
  getUser(): Promise<User | null>
  onAuthChange(cb: (u: User | null) => void): () => void
  signIn(email: string, password: string): Promise<void>
  /** 이메일 인증이 필요하면 needsConfirm = true */
  signUp(email: string, password: string): Promise<{ needsConfirm: boolean }>
  signOut(): Promise<void>
  getSpace(): Promise<Space | null>
  createSpace(name: string, nickname: string): Promise<void>
  joinSpace(code: string, nickname: string): Promise<void>
  listPlaces(spaceId: string): Promise<Place[]>
  addPlace(spaceId: string, input: NewPlace): Promise<string>
  deletePlace(place: Place): Promise<void>
  saveReview(placeId: string, input: ReviewInput): Promise<void>
  addPhoto(place: Place, blob: Blob): Promise<void>
  deletePhoto(photo: Photo): Promise<void>
  /** 상대방이 기록을 바꾸면 호출됨 */
  subscribe(spaceId: string, cb: () => void): () => void
}
