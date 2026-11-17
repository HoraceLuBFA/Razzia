import { seedQuizz } from "@razzia/e2e/utils/editor"
import { expect, test } from "@razzia/e2e/utils/fixtures"
import { t } from "@razzia/e2e/utils/i18n"
import { createGame, next, startGame } from "@razzia/e2e/utils/manager"
import { answer, joinGame } from "@razzia/e2e/utils/player"

test("matches color answers on the host, phone and answer reveal", async ({
  page: manager,
  newPage,
}) => {
  const subject = `Color answers ${Date.now()}`
  const answers = ["红色", "蓝色", "黄色", "绿色"]
  const colors = [
    "rgb(198, 40, 40)",
    "rgb(21, 101, 192)",
    "rgb(253, 216, 53)",
    "rgb(46, 125, 50)",
  ]

  seedQuizz(subject, {
    questions: [
      {
        type: "single",
        question: "白光 → 青色滤色片 → 品红滤色片 = ？",
        answers,
        solutions: [1],
        cooldown: 3,
        time: 60,
      },
    ],
  })

  const pin = await createGame(manager, subject)
  const phone = await newPage({ viewport: { width: 390, height: 844 } })

  await joinGame(phone, pin, "Color player")
  await expect(manager.getByText("Color player")).toBeVisible()
  await startGame(manager)

  const buttons = (page: typeof phone) =>
    answers.map((label, index) =>
      page.getByRole("button", {
        name: `${String.fromCharCode(65 + index)} ${label}`,
        exact: true,
      }),
    )

  await Promise.all(
    [manager, phone].flatMap((page) =>
      buttons(page).map((button, index) =>
        expect(button).toHaveCSS("background-color", colors[index]),
      ),
    ),
  )
  await expect(buttons(phone)[2]).toHaveCSS("color", "rgb(0, 0, 0)")
  await answer(phone, "蓝色")
  await expect(phone.getByText(t("game:correct"))).toBeVisible()
  await Promise.all(
    buttons(manager).map((button, index) =>
      expect(button).toHaveCSS("background-color", colors[index]),
    ),
  )
  await next(manager)
  await expect(
    phone.getByText(t("game:rank", { count: 1, ordinal: true })),
  ).toBeVisible()
})
