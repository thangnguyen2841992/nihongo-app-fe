export interface AiExercise {
  exerciseKeywordId: number; contentNihongo: string;
  answerA: string; answerB: string; answerC: string; answerD: string;
  correctAnswer?: string | null;
  aiSolution?: AiAnswer | null;
}
export interface AiAnswer {
  correctAnswer: string; contentNihongo: string; choices: string[];
  explanation: string; evidence: string; source: string;
}
export function bookAiAnswer(exercise: AiExercise, answerKeyHidden = false): AiAnswer | undefined {
  const answer = exercise.aiSolution
  // Hide an old solution as soon as a staff edit changes its question, choices or key.
  if (!answer || answer.contentNihongo !== exercise.contentNihongo ||
      answer.choices.some((choice, i) => choice !== [exercise.answerA, exercise.answerB, exercise.answerC, exercise.answerD][i]) ||
      (answerKeyHidden ? !!exercise.correctAnswer && exercise.correctAnswer !== answer.correctAnswer : (exercise.correctAnswer || '') !== answer.correctAnswer)) return undefined
  return answer
}
