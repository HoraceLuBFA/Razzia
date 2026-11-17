import { Download, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useResultModal } from "@razzia/web/features/manager/contexts/result-modal-context"
import {
  analyzeResult,
  resultPlayersCsv,
  type PlayerAnalysis,
} from "@razzia/web/features/manager/utils/result-analysis"

type Sort = "rank" | "accuracy" | "points" | "completion"

interface Props {
  onSelectQuestion: (_index: number) => void
}

const ResultOverview = ({ onSelectQuestion }: Props) => {
  const { result } = useResultModal()
  const { t } = useTranslation()
  const analysis = useMemo(() => analyzeResult(result), [result])
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<Sort>(
    analysis.survey ? "completion" : "rank",
  )
  const { survey } = analysis
  const label = (key: string) => t(`manager:result.analytics.${key}`)
  const number = (value: number | null) =>
    value === null ? "—" : String(value)
  const percent = (value: number | null) => (value === null ? "—" : `${value}%`)
  const players = analysis.players
    .filter((player) =>
      player.username
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
    )
    .sort((a, b) => {
      if (sort !== "rank") {
        const difference = (b[sort] ?? -Infinity) - (a[sort] ?? -Infinity)

        if (difference) {
          return difference
        }
      }

      return (
        (a.rank ?? Infinity) - (b.rank ?? Infinity) ||
        a.username.localeCompare(b.username)
      )
    })

  const exportCsv = () => {
    const headings = [
      ...(survey ? [] : [label("rank")]),
      t("manager:result.table.player"),
      ...(survey
        ? []
        : [
            t("manager:result.table.points"),
            `${label("accuracy")} (%)`,
            t("manager:result.table.correct").trim(),
            t("manager:result.table.incorrect").trim(),
          ]),
      label("unanswered"),
      t("manager:result.table.answered"),
      label("totalQuestions"),
      `${label("completion")} (%)`,
      label("note"),
    ]
    const rows = analysis.players.map((player) => [
      ...(survey ? [] : [player.rank]),
      player.username,
      ...(survey
        ? []
        : [player.points, player.accuracy, player.correct, player.incorrect]),
      player.unanswered,
      player.answered,
      analysis.totalQuestions,
      player.completion,
      player.identityAmbiguous ? label("duplicateName") : "",
    ])
    const url = URL.createObjectURL(
      new Blob([resultPlayersCsv([headings, ...rows])], {
        type: "text/csv;charset=utf-8",
      }),
    )
    const anchor = document.createElement("a")

    anchor.href = url
    anchor.download = `${result.subject.replace(/[\\/:*?"<>|]/gu, "-")}-${result.id}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const cards = [
    { title: label("participants"), value: analysis.totalPlayers },
    { title: label("totalQuestions"), value: analysis.totalQuestions },
    ...(survey
      ? [{ title: label("completion"), value: percent(analysis.completion) }]
      : [
          {
            title: label("averageAccuracy"),
            value: percent(analysis.averageAccuracy),
          },
          { title: label("averagePoints"), value: analysis.averagePoints },
          { title: label("highestPoints"), value: analysis.highestPoints },
        ]),
  ]

  const playerCells = (player: PlayerAnalysis) => (
    <tr key={player.key}>
      {!survey && (
        <td className="px-4 py-3 font-semibold tabular-nums">
          {number(player.rank)}
        </td>
      )}
      <th
        scope="row"
        className="max-w-60 px-4 py-3 text-left font-medium break-words"
      >
        {player.username}
        {player.identityAmbiguous && (
          <span className="mt-1 block text-xs font-normal text-amber-700 dark:text-amber-400">
            {label("duplicateName")}
          </span>
        )}
      </th>
      {!survey && (
        <>
          <td className="px-4 py-3 text-right font-semibold tabular-nums">
            {number(player.points)}
          </td>
          <td className="px-4 py-3 text-right font-semibold tabular-nums">
            {percent(player.accuracy)}
          </td>
          <td className="px-4 py-3 text-right tabular-nums">
            {number(player.correct)}
          </td>
          <td className="px-4 py-3 text-right tabular-nums">
            {number(player.incorrect)}
          </td>
        </>
      )}
      <td className="px-4 py-3 text-right tabular-nums">
        {number(player.unanswered)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {player.answered === null
          ? "—"
          : `${player.answered}/${analysis.totalQuestions}`}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {percent(player.completion)}
      </td>
    </tr>
  )

  return (
    <div className="space-y-6 p-4 sm:p-5">
      <dl
        className={`grid grid-cols-2 gap-3 ${survey ? "sm:grid-cols-3" : "lg:grid-cols-5"}`}
      >
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-accent bg-muted/30 p-4"
          >
            <dt className="text-xs text-muted-foreground">{card.title}</dt>
            <dd className="mt-2 text-2xl font-bold text-foreground tabular-nums">
              {card.value}
            </dd>
          </div>
        ))}
      </dl>
      <section aria-label={label("players")} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold">{label("players")}</h3>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Download className="size-4" />
            {label("download")}
          </button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {label(survey ? "surveyHint" : "accuracyHint")}
        </p>
        {analysis.hasAmbiguousNames && (
          <p className="rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {label("identityHint")}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-40 flex-1">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <input
              type="search"
              aria-label={label("search")}
              placeholder={label("search")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-md border border-accent bg-background py-2 pr-3 pl-9 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            {label("sort")}
            <select
              aria-label={label("sort")}
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className="rounded-md border border-accent bg-background px-3 py-2 text-foreground"
            >
              {!survey && (
                <>
                  <option value="rank">{label("rank")}</option>
                  <option value="accuracy">{label("accuracy")}</option>
                  <option value="points">
                    {t("manager:result.table.points")}
                  </option>
                </>
              )}
              <option value="completion">{label("completion")}</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto rounded-lg border border-accent">
          <table
            className="w-full min-w-max text-sm"
            aria-label={label("players")}
          >
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                {!survey && <th className="px-4 py-3">{label("rank")}</th>}
                <th className="px-4 py-3">
                  {t("manager:result.table.player")}
                </th>
                {!survey && (
                  <>
                    <th className="px-4 py-3 text-right">
                      {t("manager:result.table.points")}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {label("accuracy")}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {t("manager:result.table.correct")}
                    </th>
                    <th className="px-4 py-3 text-right">
                      {t("manager:result.table.incorrect")}
                    </th>
                  </>
                )}
                <th className="px-4 py-3 text-right">{label("unanswered")}</th>
                <th className="px-4 py-3 text-right">
                  {t("manager:result.table.answered")}
                </th>
                <th className="px-4 py-3 text-right">{label("completion")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-accent">
              {players.map(playerCells)}
              {players.length === 0 && (
                <tr>
                  <td
                    colSpan={survey ? 5 : 9}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    {label("noMatches")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-label={label("questionAnalysis")} className="space-y-3">
        <h3 className="text-base font-bold">{label("questionAnalysis")}</h3>
        <div className="space-y-2">
          {analysis.questions.map((question) => (
            <button
              key={question.index}
              onClick={() => onSelectQuestion(question.index)}
              className="flex w-full items-center gap-3 rounded-lg border border-accent px-3 py-3 text-left hover:bg-muted/50"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                {question.index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {question.question}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t("manager:result.table.answered")}: {question.answered}/
                  {analysis.totalPlayers} · {label("unanswered")}:{" "}
                  {question.unanswered}
                </span>
              </span>
              <span className="w-24 shrink-0 text-right">
                <span className="text-sm font-semibold tabular-nums">
                  {percent(survey ? question.completion : question.accuracy)}
                </span>
                <span className="mt-1 block h-1.5 rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-blue-600"
                    style={{
                      width: `${survey ? question.completion : question.accuracy}%`,
                    }}
                  />
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {label(survey ? "completion" : "accuracy")}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ResultOverview
