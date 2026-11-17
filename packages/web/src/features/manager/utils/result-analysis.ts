import type { GameResult, GameResultPlayer } from "@razzia/common/types/game"
import { QUIZZ_MODES } from "@razzia/common/constants"
import { isAnswerCorrect } from "@razzia/web/features/questions/utils"

export interface PlayerAnalysis {
  key: string
  identityAmbiguous: boolean
  username: string
  rank: number | null
  points: number | null
  answered: number | null
  correct: number | null
  incorrect: number | null
  unanswered: number | null
  accuracy: number | null
  completion: number | null
}

export interface QuestionAnalysis {
  index: number
  question: string
  answered: number
  correct: number
  incorrect: number
  unanswered: number
  accuracy: number | null
  completion: number
}

const percentage = (count: number, total: number) =>
  total > 0 ? Math.round((count / total) * 1000) / 10 : 0

export const analyzeResult = (result: GameResult) => {
  const survey = result.gameMode === QUIZZ_MODES.SURVEY
  const totalQuestions = result.questions.length
  const legacyNames = new Set([
    ...result.players
      .filter((player) => !player.id)
      .map((player) => player.username),
    ...result.questions.flatMap((question) =>
      question.playerAnswers
        .filter((answer) => !answer.playerId)
        .map((answer) => answer.playerName),
    ),
  ])
  const identityKey = (name: string, id?: string) =>
    id && !legacyNames.has(name) ? `id:${id}` : `name:${name}`
  const groups = new Map<
    string,
    { username: string; finalPlayers: GameResultPlayer[]; size: number }
  >()
  const getGroup = (name: string, id?: string) => {
    const key = identityKey(name, id)
    let group = groups.get(key)

    if (!group) {
      group = { username: name, finalPlayers: [], size: 0 }
      groups.set(key, group)
    }

    return group
  }

  result.players.forEach((player) => {
    const group = getGroup(player.username, player.id)

    group.finalPlayers.push(player)
    group.size += 1
  })
  result.questions.forEach((question) => {
    const counts = new Map<string, number>()

    question.playerAnswers.forEach((answer) => {
      const key = identityKey(answer.playerName, answer.playerId)
      const count = (counts.get(key) ?? 0) + 1
      const group = getGroup(answer.playerName, answer.playerId)

      counts.set(key, count)
      group.size = Math.max(group.size, count)
    })
  })
  const uniquePlayers = new Map<string, PlayerAnalysis>()
  const players: PlayerAnalysis[] = Array.from(groups).flatMap(([key, group]) =>
    Array.from({ length: group.size }, (_, index) => {
      const stored = group.finalPlayers.at(index)
      const ambiguous = group.size > 1
      const player: PlayerAnalysis = {
        key: `${key}:${index}`,
        identityAmbiguous: ambiguous,
        username: stored?.username ?? group.username,
        rank: stored?.rank ?? null,
        points: stored?.points ?? null,
        answered: ambiguous ? null : 0,
        correct: ambiguous ? null : 0,
        incorrect: ambiguous ? null : 0,
        unanswered: ambiguous ? null : totalQuestions,
        accuracy: survey || ambiguous ? null : 0,
        completion: ambiguous ? null : 0,
      }

      if (!ambiguous) {
        uniquePlayers.set(key, player)
      }

      return player
    }),
  )
  const totalPlayers = players.length
  const questions: QuestionAnalysis[] = result.questions.map(
    (question, index) => {
      let answered = 0
      let correct = 0

      question.playerAnswers.forEach((answer) => {
        if (!answer.answerIds?.length) {
          return
        }

        const isCorrect =
          !survey &&
          (answer.correct ?? isAnswerCorrect(question, answer.answerIds))
        const player = uniquePlayers.get(
          identityKey(answer.playerName, answer.playerId),
        )

        answered += 1
        correct += Number(isCorrect)

        if (player) {
          player.answered = (player.answered ?? 0) + 1
          player.correct = (player.correct ?? 0) + Number(isCorrect)
          player.incorrect =
            (player.incorrect ?? 0) + Number(!survey && !isCorrect)
        }
      })

      return {
        index,
        question: question.question,
        answered,
        correct,
        incorrect: survey ? 0 : answered - correct,
        unanswered: totalPlayers - answered,
        accuracy: survey ? null : percentage(correct, totalPlayers),
        completion: percentage(answered, totalPlayers),
      }
    },
  )

  uniquePlayers.forEach((player) => {
    player.unanswered = totalQuestions - (player.answered ?? 0)
    player.accuracy = survey
      ? null
      : percentage(player.correct ?? 0, totalQuestions)
    player.completion = percentage(player.answered ?? 0, totalQuestions)
  })
  players.sort(
    (a, b) =>
      (a.rank ?? Infinity) - (b.rank ?? Infinity) ||
      a.username.localeCompare(b.username),
  )

  const correct = questions.reduce((sum, question) => sum + question.correct, 0)
  const answered = questions.reduce(
    (sum, question) => sum + question.answered,
    0,
  )
  const scores = result.players.map((player) => player.points)

  return {
    survey,
    hasAmbiguousNames: players.some((player) => player.identityAmbiguous),
    players,
    questions,
    totalPlayers,
    totalQuestions,
    averageAccuracy: survey
      ? null
      : percentage(correct, totalPlayers * totalQuestions),
    completion: percentage(answered, totalPlayers * totalQuestions),
    averagePoints:
      scores.length > 0
        ? Math.round(
            (scores.reduce((sum, points) => sum + points, 0) / scores.length) *
              10,
          ) / 10
        : 0,
    highestPoints: scores.length > 0 ? Math.max(...scores) : 0,
  }
}

const csvCell = (value: string | number | null) => {
  const text = String(value ?? "")
  const safe =
    typeof value === "string" && /^\s*[=+\-@]/u.test(text) ? `'${text}` : text

  return `"${safe.replace(/"/gu, '""')}"`
}

export const resultPlayersCsv = (rows: Array<Array<string | number | null>>) =>
  `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`
