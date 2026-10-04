import { gatewayBaseUrl } from '@/services/endpoints'
export interface ImportAudio { id: string; name: string; mediaType: string; bytes: number }
export interface ImportExample { nihongo: string; vietnamese: string }
export interface ImportGrammar { title: string; description: string; examples: ImportExample[] }
export interface ImportQuestion { groupName: string; contentNihongo: string; answerA: string; answerB: string; answerC: string; answerD: string; correctAnswer: string; audioId: string }
export interface QuestionSuggestion extends Omit<ImportQuestion, 'audioId'> { basis: 'SOURCE' | 'REASONING' | 'UNRESOLVED'; explanation: string; sourcePage: number; evidence: string; warnings: string[] }
export interface ImportLesson { name: string; description: string; firstPage: number; lastPage: number; reading: string; audioId: string; grammars: ImportGrammar[]; exercises: ImportQuestion[] }
export interface ImportContent { bookName: string; levelId: number; typeId: number; description: string; audio: ImportAudio[]; lessons: ImportLesson[] }
export interface ImportSummary { id: string; fileName: string; bookName: string; state: string; pageCount: number; processedPages: number; message: string; bookId: number | null; version: number; autoMode?: string; aiProcessedPages?: number; aiCompleted?: boolean }
export interface ImportDetail { summary: ImportSummary; content: ImportContent; pages: { number: number; method: string; text: string }[]; warnings?: string[] }
export const importStateLabel: Record<string, string> = { QUEUED: 'Chờ nhận dạng', PROCESSING: 'Đang nhận dạng', REVIEW: 'Cần biên tập', READY: 'Đã duyệt', IMPORTED: 'Đã nhập', FAILED: 'Cần thử lại', ANALYZING: 'AI đang tạo nội dung', AI_FAILED: 'Tạm dừng AI' }
export function importedAudioUrl(path?: string | null): string | undefined {
  return path && /^\/api\/staff\/(?:imported-audio\/(?:lessons|exercises)\/\d+|book-imports\/[a-f0-9-]{36}\/audio\/[a-f0-9-]{36})$/.test(path) ? `${gatewayBaseUrl}${path}` : undefined
}
