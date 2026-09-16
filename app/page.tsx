import { TodoList } from "@/components/todo-list"
import { AuroraText } from "@/components/ui/aurora-text"

export default function Page() {
  const title = (
    <h1 className="text-3xl font-bold tracking-tight">
      ✨ <AuroraText>할 일</AuroraText>
    </h1>
  )

  return (
    <div className="flex min-h-svh justify-center p-6">
      <div className="flex w-full max-w-md min-w-0 flex-col gap-6">
        <div>
          {title}
          <p className="font-mono text-xs text-muted-foreground">
            (다크 모드를 전환하려면 <kbd>d</kbd>를 누르세요)
          </p>
        </div>
        <TodoList />
      </div>
    </div>
  )
}
