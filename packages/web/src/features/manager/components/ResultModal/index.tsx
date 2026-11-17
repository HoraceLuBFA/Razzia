import { Dialog, Tabs } from "radix-ui"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { GameResult } from "@razzia/common/types/game"
import ResultModalAnswers from "@razzia/web/features/manager/components/ResultModal/ResultModalAnswers"
import ResultModalHeader from "@razzia/web/features/manager/components/ResultModal/ResultModalHeader"
import ResultModalStats from "@razzia/web/features/manager/components/ResultModal/ResultModalStats"
import ResultModalTable from "@razzia/web/features/manager/components/ResultModal/ResultModalTable"
import ResultOverview from "@razzia/web/features/manager/components/ResultModal/ResultOverview"
import {
  ResultModalProvider,
  useResultModal,
} from "@razzia/web/features/manager/contexts/result-modal-context"

interface Props {
  result: GameResult
  onClose: () => void
}

const ResultViews = () => {
  const [view, setView] = useState("overview")
  const { total, goToQuestion } = useResultModal()
  const { t } = useTranslation()

  const selectQuestion = (index: number) => {
    goToQuestion(index)
    setView("questions")
  }

  return (
    <>
      <ResultModalHeader showPagination={view === "questions"} />
      <Tabs.Root
        value={view}
        onValueChange={setView}
        className="flex min-h-0 flex-1 flex-col"
      >
        <Tabs.List className="flex shrink-0 gap-1 border-b border-accent px-4 pt-2">
          <Tabs.Trigger
            value="overview"
            className="rounded-t-md px-4 py-2.5 text-sm font-semibold text-muted-foreground data-[state=active]:bg-muted data-[state=active]:text-foreground"
          >
            {t("manager:result.analytics.overview")}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="questions"
            disabled={total === 0}
            className="rounded-t-md px-4 py-2.5 text-sm font-semibold text-muted-foreground disabled:opacity-40 data-[state=active]:bg-muted data-[state=active]:text-foreground"
          >
            {t("manager:result.analytics.details")}
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content
          value="overview"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <ResultOverview onSelectQuestion={selectQuestion} />
        </Tabs.Content>
        <Tabs.Content
          value="questions"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <ResultModalAnswers />
          <ResultModalStats />
          <div className="overflow-x-auto">
            <ResultModalTable />
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </>
  )
}

const ResultModal = ({ result, onClose }: Props) => {
  const previousFocus = useRef(document.activeElement)

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-60 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault()

            if (previousFocus.current instanceof HTMLElement) {
              previousFocus.current.focus()
            }
          }}
          className="fixed top-1/2 left-1/2 z-60 flex max-h-[92svh] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-background text-foreground shadow-2xl"
        >
          <ResultModalProvider result={result} onClose={onClose}>
            <ResultViews />
          </ResultModalProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default ResultModal
