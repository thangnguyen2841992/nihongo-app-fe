import { gatewayUrl } from '@/api/authApi.ts'

export interface Vocabulary {
  word: string
  reading: string
  kanjiReading: string
  meaning: string
}

export interface Grammar {
  pattern: string
  explanation: string
}

export interface JapaneseAiResponse {
  originalText: string
  translation: string
  reading: string
  vocabulary: Vocabulary[]
  grammar: Grammar[]
  sentenceStructure: string
  examples: string[]
}

export const analyzeJapanese = async (
  text: string
): Promise<JapaneseAiResponse> => {

  const response = await gatewayUrl.post<JapaneseAiResponse>(
    '/api/nihongo-user/japanese',
    {
      text: text.trim()
    },
    {
      withCredentials: true
    }
  )

  return response.data
}
