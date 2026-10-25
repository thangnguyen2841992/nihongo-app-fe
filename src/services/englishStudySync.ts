import { gatewayUrl } from '@/api/authApi'
import { normalizeRecord, type EnglishStudyRecord } from './englishSelfStudy'

/** The learner's notebook as stored on the server, with the revision used to detect edits from another device. */
export interface RemoteEnglishStudy {
  version: number
  updatedAt: number
  data: EnglishStudyRecord
}
export class EnglishStudyConflict extends Error {
  readonly current: RemoteEnglishStudy | null
  constructor(current: RemoteEnglishStudy | null) {
    super('Sổ tay đã thay đổi trên thiết bị khác.')
    this.current = current
  }
}

const path = '/api/nihongo-user/english-study'
const fromServer = (value: { version: number; updatedAt: number; data: unknown }): RemoteEnglishStudy => ({
  version: value.version,
  updatedAt: value.updatedAt,
  data: normalizeRecord(value.data),
})

export async function fetchRemoteStudy(): Promise<RemoteEnglishStudy | null> {
  const response = await gatewayUrl.get(path)
  return response.status === 204 || !response.data ? null : fromServer(response.data)
}

export async function pushRemoteStudy(version: number, data: EnglishStudyRecord): Promise<RemoteEnglishStudy> {
  try {
    const { data: saved } = await gatewayUrl.put(path, { version, data })
    return fromServer(saved)
  } catch (error: unknown) {
    const response = (error as { response?: { status?: number; data?: { current?: { version: number; updatedAt: number; data: unknown } | null } } }).response
    if (response?.status === 409) throw new EnglishStudyConflict(response.data?.current ? fromServer(response.data.current) : null)
    throw error
  }
}
