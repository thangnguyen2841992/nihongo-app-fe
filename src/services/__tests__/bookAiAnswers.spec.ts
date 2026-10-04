import { expect, it } from 'vitest'
import { bookAiAnswer } from '../bookAiAnswers'
const answer = { correctAnswer: 'C', contentNihongo: '<p>Question</p>', choices: ['a','b','c','d'], explanation: 'Explanation', evidence: 'Evidence', source: 'AI_REASONING' }
const exercise = { exerciseKeywordId: 1, contentNihongo: answer.contentNihongo,
  answerA: 'a', answerB: 'b', answerC: 'c', answerD: 'd', correctAnswer: answer.correctAnswer, aiSolution: answer }
it('hides AI explanations after an exercise or answer has been edited', () => {
  expect(bookAiAnswer(exercise)?.explanation).toBe(answer.explanation)
  expect(bookAiAnswer({ ...exercise, contentNihongo: 'Edited question' })).toBeUndefined()
  expect(bookAiAnswer({ ...exercise, answerA: 'Edited choice' })).toBeUndefined()
  expect(bookAiAnswer({ ...exercise, correctAnswer: null })).toBeUndefined()
})
it('can reveal practice explanations when the learner API withholds the answer', () => {
  expect(bookAiAnswer({ ...exercise, correctAnswer: null }, true)?.correctAnswer).toBe(answer.correctAnswer)
  expect(bookAiAnswer({ ...exercise, aiSolution: null }, true)).toBeUndefined()
})
