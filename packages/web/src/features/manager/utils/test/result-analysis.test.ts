import { describe, expect, it } from "vitest"
import type { GameResult, QuestionResult } from "@razzia/common/types/game"
import {
  analyzeResult,
  resultPlayersCsv,
} from "@razzia/web/features/manager/utils/result-analysis"

const question = (overrides: Partial<QuestionResult>): QuestionResult => ({
  type: "single",
  question: "Pick yes",
  answers: ["Yes", "No"],
  solutions: [0],
  cooldown: 3,
  time: 30,
  playerAnswers: [],
  ...overrides,
})

const result = (overrides: Partial<GameResult> = {}): GameResult => ({
  id: "analysis-test",
  subject: "Analysis",
  date: "2026-11-17T00:00:00.000Z",
  gameMode: "quiz",
  players: [
    { username: "Alice", points: 1200, rank: 2 },
    { username: "Bob", points: 1400, rank: 1 },
  ],
  questions: [
    question({
      playerAnswers: [
        { playerName: "Alice", answerIds: [0], correct: true, points: 1000 },
        { playerName: "Bob", answerIds: [1], correct: false, points: 0 },
      ],
    }),
    question({
      playerAnswers: [
        { playerName: "Alice", answerIds: [1], correct: false, points: 0 },
        { playerName: "Bob", answerIds: [0], correct: true, points: 1400 },
      ],
    }),
    question({
      playerAnswers: [
        { playerName: "Alice", answerIds: [], correct: false, points: 0 },
        { playerName: "Bob", answerIds: null, correct: false, points: 0 },
      ],
    }),
  ],
  ...overrides,
})

describe("result analysis", () => {
  it("uses final standings and total questions as the accuracy denominator", () => {
    const analysis = analyzeResult(result())

    expect(analysis.players).toMatchObject([
      {
        username: "Bob",
        rank: 1,
        points: 1400,
        answered: 2,
        correct: 1,
        incorrect: 1,
        unanswered: 1,
        accuracy: 33.3,
        completion: 66.7,
      },
      {
        username: "Alice",
        rank: 2,
        points: 1200,
        answered: 2,
        correct: 1,
        incorrect: 1,
        unanswered: 1,
        accuracy: 33.3,
        completion: 66.7,
      },
    ])
    expect(analysis.averageAccuracy).toBe(33.3)
    expect(analysis.averagePoints).toBe(1300)
    expect(analysis.highestPoints).toBe(1400)
    expect(analysis.questions[0]).toMatchObject({
      answered: 2,
      correct: 1,
      incorrect: 1,
      unanswered: 0,
      accuracy: 50,
    })
    expect(analysis.questions[2]).toMatchObject({
      answered: 0,
      correct: 0,
      unanswered: 2,
      accuracy: 0,
    })
  })

  it("recovers correctness for legacy strict and balanced multiple choice", () => {
    const analysis = analyzeResult(
      result({
        questions: [
          question({
            type: "multi",
            answers: ["A", "B", "C"],
            solutions: [0, 1],
            options: { scoringMode: "strict" },
            playerAnswers: [
              { playerName: "Alice", answerIds: [0] },
              { playerName: "Bob", answerIds: [0, 1] },
            ],
          }),
          question({
            type: "multi",
            answers: ["A", "B", "C"],
            solutions: [0, 1],
            options: { scoringMode: "balanced" },
            playerAnswers: [
              { playerName: "Alice", answerIds: [0, 2] },
              { playerName: "Bob", answerIds: [0] },
            ],
          }),
        ],
      }),
    )

    expect(
      analysis.players.map((player) => [player.username, player.correct]),
    ).toEqual([
      ["Bob", 2],
      ["Alice", 0],
    ])
  })

  it("includes players seen only in question records without inventing a final rank or score", () => {
    const analysis = analyzeResult(
      result({
        questions: [
          question({
            playerAnswers: [
              { playerName: "Left early", answerIds: [0], correct: true },
            ],
          }),
        ],
      }),
    )

    expect(analysis.totalPlayers).toBe(3)
    expect(analysis.players[2]).toMatchObject({
      username: "Left early",
      rank: null,
      points: null,
      accuracy: 100,
    })
    expect(analysis.questions[0].unanswered).toBe(2)
  })

  it("keeps legacy repeated names as separate standings and counts every answer", () => {
    const analysis = analyzeResult(
      result({
        players: [
          { username: "Same name", points: 1000, rank: 1 },
          { username: "Same name", points: 0, rank: 2 },
        ],
        questions: [
          question({
            playerAnswers: [
              { playerName: "Same name", answerIds: [0], correct: true },
              { playerName: "Same name", answerIds: [1], correct: false },
            ],
          }),
        ],
      }),
    )

    expect(analysis.totalPlayers).toBe(2)
    expect(
      analysis.players.map((player) => [
        player.rank,
        player.points,
        player.accuracy,
        player.identityAmbiguous,
      ]),
    ).toEqual([
      [1, 1000, null, true],
      [2, 0, null, true],
    ])
    expect(analysis.questions[0]).toMatchObject({
      answered: 2,
      correct: 1,
      accuracy: 50,
    })
    expect(analysis.averageAccuracy).toBe(50)
  })

  it("matches repeated names by stable participant IDs in new results", () => {
    const analysis = analyzeResult(
      result({
        players: [
          { id: "first", username: "Same name", points: 1000, rank: 1 },
          { id: "second", username: "Same name", points: 0, rank: 2 },
        ],
        questions: [
          question({
            playerAnswers: [
              {
                playerId: "second",
                playerName: "Same name",
                answerIds: [1],
                correct: false,
              },
              {
                playerId: "first",
                playerName: "Same name",
                answerIds: [0],
                correct: true,
              },
            ],
          }),
        ],
      }),
    )

    expect(
      analysis.players.map((player) => [
        player.rank,
        player.accuracy,
        player.identityAmbiguous,
      ]),
    ).toEqual([
      [1, 100, false],
      [2, 0, false],
    ])
    expect(analysis.hasAmbiguousNames).toBe(false)
  })

  it("shows participation without correctness in surveys", () => {
    const analysis = analyzeResult(result({ gameMode: "survey" }))

    expect(analysis.averageAccuracy).toBeNull()
    expect(analysis.players.every((player) => player.accuracy === null)).toBe(
      true,
    )
    expect(analysis.completion).toBe(66.7)
  })

  it("handles an empty result", () => {
    const analysis = analyzeResult(result({ players: [], questions: [] }))

    expect(analysis.players).toMatchObject([])
    expect(analysis.averageAccuracy).toBe(0)
    expect(analysis.averagePoints).toBe(0)
    expect(analysis.highestPoints).toBe(0)
  })

  it("exports UTF-8 CSV with escaped names and formula protection", () => {
    expect(
      resultPlayersCsv([
        ["姓名", "分数"],
        ['张三,"同学"', 900],
        ["=1+1", -100],
      ]),
    ).toBe(
      '\uFEFF"姓名","分数"\r\n"张三,""同学""","900"\r\n"\'=1+1","-100"\r\n',
    )
  })
})
