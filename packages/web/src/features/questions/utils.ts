import type { Question } from "@razzia/common/types/game"
import { MIN_ANSWERS } from "@razzia/common/constants"
import { QUESTION_SCORING } from "@razzia/socket/services/scoring"

export const choiceInitialValues = (question: Question): Partial<Question> => {
  if (question.answers.length >= MIN_ANSWERS) {
    return {}
  }

  return { answers: ["", ""], solutions: [0] }
}

export const isAnswerCorrect = (
  question: Question,
  answerIds: number[] | null,
): boolean => {
  if (!answerIds?.length) {
    return false
  }

  const scoring = QUESTION_SCORING[question.type]

  return scoring(question, answerIds) > 0
}
