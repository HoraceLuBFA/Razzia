import type { Page } from "@playwright/test"
import type { Question, QuestionResult } from "@razzia/common/types/game"
import { expect, test } from "@razzia/e2e/utils/fixtures"
import { t } from "@razzia/e2e/utils/i18n"
import { loginManager } from "@razzia/e2e/utils/manager"
import { seedResult } from "@razzia/e2e/utils/results"

const question = (
  overrides: Partial<Question>,
  playerAnswers: QuestionResult["playerAnswers"],
): QuestionResult => ({
  type: "single",
  question: "",
  answers: ["Yes", "No"],
  solutions: [0],
  cooldown: 3,
  time: -1,
  ...overrides,
  playerAnswers,
})

const openResult = async (manager: Page, subject: string, details = true) => {
  await loginManager(manager)
  await manager
    .getByRole("button", { name: t("manager:tabs.results"), exact: true })
    .click()

  const row = manager.getByRole("button", {
    name: new RegExp(subject, "u"),
    includeHidden: true,
  })

  await row.click()

  const heading = manager.getByRole("heading", { name: subject })

  await expect(heading).toBeVisible()

  if (details) {
    await manager
      .getByRole("tab", { name: t("manager:result.analytics.details") })
      .click()
  }

  return { row, heading }
}

const CORRECT = t("manager:result.table.correct").trim()
const INCORRECT = t("manager:result.table.incorrect").trim()

const expectRow = (manager: Page, name: string) =>
  expect(manager.getByRole("row", { name, exact: true })).toBeVisible()

test("shows the stats, answers and points of each question", async ({
  page: manager,
}) => {
  const subject = `Results quizz ${Date.now()}`

  seedResult({
    gameMode: "quiz",
    subject,
    players: [
      { username: "Bob", points: 1000, rank: 1 },
      { username: "Alice", points: 900, rank: 2 },
    ],
    questions: [
      question({ question: "Capital of France?", answers: ["Paris", "Lyon"] }, [
        { playerName: "Alice", answerIds: [0], correct: true, points: 1000 },
        { playerName: "Bob", answerIds: [1], correct: false, points: 0 },
      ]),
      question(
        {
          type: "multi",
          question: "Primary colors?",
          answers: ["Red", "Blue", "Green"],
          solutions: [0, 1],
          options: { scoringMode: "strict" },
        },
        [
          { playerName: "Alice", answerIds: [0], correct: false, points: -100 },
          { playerName: "Bob", answerIds: [0, 1], correct: true, points: 1000 },
        ],
      ),
      question({ question: "Nobody answers" }, [
        { playerName: "Alice", answerIds: null, correct: false, points: 0 },
        { playerName: "Bob", answerIds: null, correct: false, points: 0 },
      ]),
    ],
  })

  const { row, heading } = await openResult(manager, subject)
  const previous = manager.getByRole("button", { name: t("common:previous") })
  const nextQuestion = manager.getByRole("button", { name: t("common:next") })

  await expect(row).toContainText(t("manager:result.playerCount", { count: 2 }))
  await expect(
    manager.getByText(`1${t("manager:result.paginationOf")}3`),
  ).toBeVisible()
  await expect(previous).toBeDisabled()
  await expect(manager.getByText("50%")).toBeVisible()
  await expect(manager.getByText("2/2")).toBeVisible()
  await expectRow(manager, `Alice A Paris ${CORRECT} 1000`)
  await expectRow(manager, `Bob B Lyon ${INCORRECT} 0`)

  await nextQuestion.click()
  await expect(
    manager.getByText(`2${t("manager:result.paginationOf")}3`),
  ).toBeVisible()
  await expect(
    manager.getByText(t("quizz:question.config.scoringMode.strict"), {
      exact: true,
    }),
  ).toBeVisible()
  await expect(manager.getByText("50%")).toBeVisible()
  await expectRow(manager, `Alice A Red ${INCORRECT} -100`)
  await expectRow(manager, `Bob A Red B Blue ${CORRECT} 1000`)

  await nextQuestion.click()
  await expect(
    manager.getByText(`3${t("manager:result.paginationOf")}3`),
  ).toBeVisible()
  await expect(nextQuestion).toBeDisabled()
  await expect(manager.getByText("0/2")).toBeVisible()
  await expect(manager.getByText("0%")).toBeVisible()
  await expectRow(manager, `Alice - ${INCORRECT} 0`)

  await manager.getByRole("button", { name: t("common:close") }).click()
  await expect(heading).toBeHidden()

  await row
    .locator("..")
    .getByRole("button", { name: t("manager:result.delete") })
    .click()
  await manager
    .getByRole("alertdialog")
    .getByRole("button", { name: t("common:delete") })
    .click()

  await expect(manager.getByText(t("manager:result.deleted"))).toBeVisible()
  await expect(row).toBeHidden()
})

test("falls back to computed values for older results", async ({
  page: manager,
}) => {
  const subject = `Legacy result ${Date.now()}`

  seedResult({
    gameMode: "quiz",
    subject,
    players: [{ username: "Alice", points: 1500, rank: 1 }],
    questions: [
      question({ question: "Old question" }, [
        { playerName: "Alice", answerIds: [0] },
      ]),
    ],
  })

  await openResult(manager, subject)

  await expectRow(manager, `Alice A Yes ${CORRECT} 1500`)
})

test("hides correctness in the result of a survey", async ({
  page: manager,
}) => {
  const subject = `Survey result ${Date.now()}`

  seedResult({
    gameMode: "survey",
    subject,
    players: [
      { username: "Alice", points: 0, rank: 1 },
      { username: "Bob", points: 0, rank: 2 },
    ],
    questions: [
      question({ question: "Favorite?", solutions: undefined }, [
        { playerName: "Alice", answerIds: [0] },
        { playerName: "Bob", answerIds: [0] },
      ]),
    ],
  })

  await openResult(manager, subject)

  await expect(manager.getByText("2/2")).toBeVisible()
  await expect(
    manager.getByText(t("manager:result.stats.correctAnswers")),
  ).toBeHidden()
  await expect(
    manager.getByRole("columnheader", {
      name: t("manager:result.table.correctIncorrect"),
    }),
  ).toBeHidden()
  await expectRow(manager, "Alice A Yes 0")
})

test("analyzes every player, preserves final ranks and exports the full roster", async ({
  page: manager,
}) => {
  const subject = `Results overview ${Date.now()}`

  seedResult({
    gameMode: "quiz",
    subject,
    players: [
      { username: "Alice", points: 1100, rank: 2 },
      { username: "Bob", points: 1800, rank: 1 },
      { username: "陈同学", points: 0, rank: 3 },
    ],
    questions: [
      question({ question: "First question" }, [
        { playerName: "Alice", answerIds: [0], correct: true, points: 1000 },
        { playerName: "Bob", answerIds: [1], correct: false, points: 0 },
        { playerName: "陈同学", answerIds: null, correct: false, points: 0 },
      ]),
      question({ question: "Second question" }, [
        { playerName: "Alice", answerIds: [0], correct: true, points: 100 },
        { playerName: "Bob", answerIds: [0], correct: true, points: 1800 },
        { playerName: "陈同学", answerIds: [1], correct: false, points: 0 },
      ]),
    ],
  })

  await openResult(manager, subject, false)

  const table = manager.getByRole("table", {
    name: t("manager:result.analytics.players"),
  })

  await expect(table.getByRole("row").nth(1)).toHaveText(
    "1Bob180050%1102/2100%",
  )
  await expect(table.getByRole("row").nth(2)).toHaveText(
    "2Alice1100100%2002/2100%",
  )
  await expect(table.getByRole("row").nth(3)).toHaveText("3陈同学00%0111/250%")
  await manager
    .getByRole("combobox", { name: t("manager:result.analytics.sort") })
    .selectOption("accuracy")
  await expect(table.getByRole("row").nth(1)).toContainText("Alice")
  await manager
    .getByRole("searchbox", { name: t("manager:result.analytics.search") })
    .fill("陈")
  await expect(table.getByRole("row")).toHaveCount(2)

  const download = manager.waitForEvent("download")

  await manager
    .getByRole("button", { name: t("manager:result.analytics.download") })
    .click()

  const fs = await import("node:fs/promises")
  const csv = await fs.readFile(await (await download).path(), "utf8")

  expect(csv.startsWith("\uFEFF")).toBe(true)
  expect(csv).toContain('"1","Bob","1800","50","1","1","0","2","2","100"')
  expect(csv).toContain('"2","Alice","1100","100","2","0","0","2","2","100"')
  expect(csv).toContain('"3","陈同学","0","0","0","1","1","1","2","50"')

  await manager.getByRole("button", { name: /2 Second question/u }).click()
  await expect(
    manager.getByRole("tab", { name: t("manager:result.analytics.details") }),
  ).toHaveAttribute("data-state", "active")
  await expect(
    manager.getByText(`2${t("manager:result.paginationOf")}2`),
  ).toBeVisible()
})

test("shows a survey overview without ranking or correctness", async ({
  page: manager,
}) => {
  const subject = `Survey overview ${Date.now()}`

  seedResult({
    gameMode: "survey",
    subject,
    players: [{ username: "Alice", points: 0, rank: 1 }],
    questions: [
      question({ question: "Opinion" }, [
        { playerName: "Alice", answerIds: [1] },
      ]),
    ],
  })

  await openResult(manager, subject, false)

  const table = manager.getByRole("table", {
    name: t("manager:result.analytics.players"),
  })

  await expect(table.getByRole("row").nth(1)).toHaveText("Alice01/1100%")
  await expect(
    table.getByRole("columnheader", {
      name: t("manager:result.analytics.rank"),
    }),
  ).toHaveCount(0)
  await expect(
    table.getByRole("columnheader", {
      name: t("manager:result.analytics.accuracy"),
    }),
  ).toHaveCount(0)
  await manager.keyboard.press("Escape")
  await expect(manager.getByRole("dialog")).toBeHidden()
})

for (const withIds of [false, true]) {
  test(`keeps repeated nicknames separate (${withIds ? "participant IDs" : "legacy names"})`, async ({
    page: manager,
  }) => {
    const subject = `Repeated nicknames ${withIds} ${Date.now()}`
    const id = (value: string) => (withIds ? { id: value } : {})
    const playerId = (value: string) => (withIds ? { playerId: value } : {})

    seedResult({
      gameMode: "quiz",
      subject,
      players: [
        { ...id("first"), username: "Same nickname", points: 1000, rank: 1 },
        { ...id("second"), username: "Same nickname", points: 0, rank: 2 },
      ],
      questions: [
        question({ question: "Separate identities" }, [
          {
            ...playerId("second"),
            playerName: "Same nickname",
            answerIds: [1],
            correct: false,
            points: 0,
          },
          {
            ...playerId("first"),
            playerName: "Same nickname",
            answerIds: [0],
            correct: true,
            points: 1000,
          },
        ]),
      ],
    })

    const { row } = await openResult(manager, subject, false)
    const table = manager.getByRole("table", {
      name: t("manager:result.analytics.players"),
    })

    await expect(table.getByRole("row")).toHaveCount(3)

    if (withIds) {
      await expect(table.getByRole("row").nth(1)).toHaveText(
        "1Same nickname1000100%1001/1100%",
      )
      await expect(table.getByRole("row").nth(2)).toHaveText(
        "2Same nickname00%0101/1100%",
      )
    } else {
      await expect(
        manager.getByText(t("manager:result.analytics.identityHint")),
      ).toBeVisible()
      await expect(table.getByRole("row").nth(1)).toContainText("1000")
      await expect(table.getByRole("row").nth(1).getByRole("cell")).toHaveText([
        "1",
        "1000",
        "—",
        "—",
        "—",
        "—",
        "—",
        "—",
      ])
      const download = manager.waitForEvent("download")
      await manager
        .getByRole("button", { name: t("manager:result.analytics.download") })
        .click()
      const fs = await import("node:fs/promises")
      const csv = await fs.readFile(await (await download).path(), "utf8")
      expect(csv).toContain(
        '"1","Same nickname","1000","","","","","","1","","Repeated nickname"',
      )
    }

    await manager.keyboard.press("Escape")
    await expect(row).toBeFocused()
  })
}
