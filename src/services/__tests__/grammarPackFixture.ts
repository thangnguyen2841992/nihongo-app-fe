import type { EnglishGrammarPack } from '../englishGrammarPack'

export function grammarPackFixture(): EnglishGrammarPack {
  return {
    kind: 'essential-grammar-personal',
    version: 1,
    source: {
      filename: 'personal-test.pdf',
      pageCount: 318,
      sha256: 'a'.repeat(64),
      dataBase64: btoa('%PDF-1.4\nTest fixture'),
    },
    units: Array.from({ length: 115 }, (_, index) => ({
      id: index + 1,
      title: index === 0 ? 'am / is / are' : `Grammar ${index + 1}`,
      titleVi: index === 0 ? 'Động từ be: là, thì, ở' : `Bài ngữ pháp ${index + 1}`,
      category: 'Hiện tại',
      explanation: 'Dùng be để giới thiệu hoặc mô tả trạng thái.',
      pattern: 'I am; he/she/it is; we/you/they are',
      example: { en: 'My sister is a nurse.', vi: 'Chị tôi là y tá.' },
      caution: 'Không bỏ be trong câu mô tả trạng thái.',
      exercise: {
        prompt: 'My parents ___ at home.',
        options: ['am', 'is', 'are'],
        answer: 2,
        explanation: 'Parents là số nhiều nên dùng are.',
      },
      theoryPage: 2 * (index + 1) + 9,
      exercisePage: 2 * (index + 1) + 10,
      keyPages: [281],
    })),
  }
}
