import fs from "node:fs/promises"
import { MANAGER_PASSWORD } from "@razzia/e2e/utils/constants"
import { seedQuizz } from "@razzia/e2e/utils/editor"
import { expect, test } from "@razzia/e2e/utils/fixtures"
import { seedResult } from "@razzia/e2e/utils/results"

test("detects Chinese and persists language changes with the matching label", async ({
  newPage,
}) => {
  const page = await newPage({ locale: "zh-CN" })

  await page.goto("/manager")
  await expect(page.getByPlaceholder("密码")).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("lang", "zh")
  const language = page.getByRole("combobox", { name: "切换语言" })

  await expect(language).toHaveText("ZH")
  await language.click()
  await expect(
    page.getByRole("option", { name: "简体中文", exact: true }),
  ).toHaveAttribute("data-state", "checked")
  await page
    .getByRole("option", { name: "English · 英语", exact: true })
    .click()
  await expect(page.getByPlaceholder("Password")).toBeVisible()
  await expect(
    page.getByRole("combobox", { name: "Change language" }),
  ).toHaveText("EN")
  await page.reload()
  await expect(page.getByPlaceholder("Password")).toBeVisible()
  await page.getByRole("combobox", { name: "Change language" }).click()
  await page.getByRole("option", { name: "简体中文", exact: true }).click()
  await page.reload()
  await expect(page.getByPlaceholder("密码")).toBeVisible()
  await expect(page.locator("html")).toHaveAttribute("lang", "zh")
})

test("loads Chinese for a saved regional language and translates results and CSV", async ({
  newPage,
}) => {
  const subject = `中文成绩 ${Date.now()}`

  seedResult({
    subject,
    gameMode: "quiz",
    players: [{ username: "中文参与者", points: 1000, rank: 1 }],
    questions: [
      {
        type: "single",
        question: "中文测试题",
        answers: ["正确", "错误"],
        solutions: [0],
        cooldown: 3,
        time: 30,
        playerAnswers: [
          {
            playerName: "中文参与者",
            answerIds: [0],
            correct: true,
            points: 1000,
          },
        ],
      },
    ],
  })
  const page = await newPage({ locale: "en-US" })

  await page.addInitScript(() => {
    if (!localStorage.getItem("i18nextLng")) {
      localStorage.setItem("i18nextLng", "zh-CN")
    }
  })
  await page.goto("/manager")
  await page.getByPlaceholder("密码").fill(MANAGER_PASSWORD)
  await page.getByRole("button", { name: "提交", exact: true }).click()
  await expect(page.getByText("管理后台", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "成绩分析", exact: true }).click()
  await page.getByRole("button", { name: new RegExp(subject, "u") }).click()
  await expect(page.getByRole("tab", { name: "整场概览" })).toBeVisible()
  await expect(
    page
      .getByRole("table", { name: "个人成绩" })
      .getByRole("columnheader", { name: "最终排名" }),
  ).toBeVisible()
  const download = page.waitForEvent("download")

  await page.getByRole("button", { name: "导出 CSV", exact: true }).click()
  const csv = await fs.readFile(await (await download).path(), "utf8")

  expect(csv).toContain('"最终排名","参与者","得分","正确率 (%)"')
  expect(csv).toContain('"1","中文参与者","1000","100"')
  await page.getByRole("tab", { name: "逐题详情" }).click()
  await expect(
    page.getByRole("row", { name: "中文参与者 A 正确 答对 1000", exact: true }),
  ).toBeVisible()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "题库管理", exact: true }).click()
  await page.getByRole("button", { name: "创建题库", exact: true }).click()
  await expect(page.getByPlaceholder("请输入题库名称…")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "添加题目", exact: true }),
  ).toBeVisible()
})

test("shows the resolved English label when a stored language is unsupported", async ({
  newPage,
}) => {
  const page = await newPage({ locale: "ko-KR" })

  await page.addInitScript(() => localStorage.setItem("i18nextLng", "ko"))
  await page.goto("/manager")
  await expect(page.getByPlaceholder("Password")).toBeVisible()
  await expect(
    page.getByRole("combobox", { name: "Change language" }),
  ).toHaveText("EN")
  await expect(page.locator("html")).toHaveAttribute("lang", "en")
})

test("runs the host and two players through Chinese answers, ranks and saved results", async ({
  newPage,
}) => {
  const subject = `中文流程 ${Date.now()}`

  seedQuizz(subject, {
    questions: [
      {
        type: "single",
        question: "请选择蓝色",
        answers: ["蓝色", "红色"],
        solutions: [0],
        cooldown: 3,
        time: -1,
      },
    ],
  })
  const manager = await newPage({ locale: "zh-CN" })

  await manager.goto("/manager")
  await manager.getByPlaceholder("密码").fill(MANAGER_PASSWORD)
  await manager.getByRole("button", { name: "提交", exact: true }).click()
  await manager.getByRole("button", { name: subject, exact: true }).click()
  await manager.getByRole("button", { name: "创建场次", exact: true }).click()
  const pin = await manager.getByText(/^\d{6}$/u).textContent()
  const players = await Promise.all([
    newPage({ locale: "zh-CN", viewport: { width: 390, height: 844 } }),
    newPage({ locale: "zh-CN", viewport: { width: 390, height: 844 } }),
  ])

  await Promise.all(
    players.map(async (player, i) => {
      await player.goto(`/?pin=${pin}`)
      await player.getByPlaceholder("请输入昵称").fill(`中文学生${i + 1}`)
      await player.getByRole("button", { name: "提交", exact: true }).click()
      await expect(
        player.getByText("等待参与者加入", { exact: true }),
      ).toBeVisible()
    }),
  )
  await expect(manager.getByText("中文学生2", { exact: true })).toBeVisible()
  await manager.getByRole("button", { name: "开始", exact: true }).click()
  await players[0].getByRole("button", { name: "A 蓝色", exact: true }).click()
  await players[1].getByRole("button", { name: "B 红色", exact: true }).click()
  await expect(
    players[0].getByRole("heading", { name: "答对了！", exact: true }),
  ).toBeVisible()
  await expect(
    players[1].getByRole("heading", { name: "答错了", exact: true }),
  ).toBeVisible()
  await manager.getByRole("button", { name: "下一步", exact: true }).click()
  await expect(players[0].getByText("第 1 名", { exact: true })).toBeVisible()
  await expect(players[1].getByText("第 2 名", { exact: true })).toBeVisible()
  await expect(players[0].getByText(/^\d+ 分$/u)).toBeVisible()
  await manager.getByRole("button", { name: "退出", exact: true }).click()
  await manager.getByRole("button", { name: "成绩分析", exact: true }).click()
  await manager.getByRole("button", { name: new RegExp(subject, "u") }).click()
  const table = manager.getByRole("table", { name: "个人成绩", exact: true })

  await expect(table.getByRole("row").nth(1)).toContainText("100%")
  await expect(table.getByRole("row").nth(2)).toContainText("0%")
})
