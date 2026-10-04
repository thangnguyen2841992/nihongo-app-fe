import { gatewayUrl } from '@/api/authApi'

export const saveLearningPosition = async (
  courseId: number,
  bookId: number | null = null,
  lessonId: number | null = null
) => {
  await gatewayUrl.put(`/api/nihongo-user/courses/${courseId}/learning-position`, {
    bookId,
    lessonId
  })
}
