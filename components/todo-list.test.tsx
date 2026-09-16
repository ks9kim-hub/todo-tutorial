import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TodoList } from "@/components/todo-list";

// TodoList는 useTodos(Vercel Blob 기반 /api/todos)를 직접 사용하므로
// 입력 → 목록 → 영속화까지 전체 흐름을 통합으로 검증한다.
// fetch를 메모리 상의 가짜 저장소에 응답하도록 목 처리해 서버 역할을 대신한다.

let serverStore: unknown = [];

beforeEach(() => {
  serverStore = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        serverStore = JSON.parse(init.body as string);
        return Promise.resolve(new Response(JSON.stringify({ ok: true })));
      }
      return Promise.resolve(new Response(JSON.stringify(serverStore)));
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// 입력 필드에 텍스트를 입력하고 Enter로 제출하는 헬퍼
async function addTodo(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = screen.getByRole("textbox", { name: "새 할 일" });
  await user.type(input, `${text}{Enter}`);
}

// 마감일을 지정해 추가하는 헬퍼
async function addTodoWithDue(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
  due: string
) {
  fireEvent.change(screen.getByLabelText("마감일"), {
    target: { value: due },
  });
  const input = screen.getByRole("textbox", { name: "새 할 일" });
  await user.type(input, `${text}{Enter}`);
}

// 5개(완료 2 / 미완료 3) 상태를 만드는 헬퍼.
// addTodo가 앞쪽에 추가하므로 DOM 순서는 할일5..할일1이고,
// 위쪽 체크박스 2개를 클릭해 완료로 만든다.
async function seedFiveTodos(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 1; i <= 5; i++) {
    await addTodo(user, `할일${i}`);
  }
  const checkboxes = screen.getAllByRole("checkbox");
  await user.click(checkboxes[0]);
  await user.click(checkboxes[1]);
}

describe("TodoList 검증 체크리스트", () => {
  it('1. 입력 필드에 "장보기" 입력 후 Enter → 목록에 추가됨', async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    await addTodo(user, "장보기");

    expect(await screen.findByText("장보기")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("2. 빈 입력 상태에서 Enter → Todo가 추가되지 않음", async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    // 로드 완료 후 빈 상태 메시지가 나타나는지 먼저 확인
    expect(
      await screen.findByText(/아직 할 일이 없습니다/)
    ).toBeInTheDocument();

    const input = screen.getByRole("textbox", { name: "새 할 일" });
    await user.type(input, "{Enter}");

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByText(/아직 할 일이 없습니다/)).toBeInTheDocument();
  });

  it("3. 체크박스 클릭 → 완료 표시(취소선)", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await addTodo(user, "장보기");
    await screen.findByText("장보기");

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(screen.getByText("장보기")).toHaveClass("line-through");
  });

  it("4. 삭제 버튼 클릭 → 해당 항목 제거", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await addTodo(user, "장보기");
    await screen.findByText("장보기");

    await user.click(screen.getByRole("button", { name: "삭제" }));

    expect(screen.queryByText("장보기")).not.toBeInTheDocument();
    expect(
      await screen.findByText(/아직 할 일이 없습니다/)
    ).toBeInTheDocument();
  });

  it("6. 우선순위(높음) 선택 후 추가 → 목록에 우선순위가 표시됨", async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    await user.click(screen.getByRole("radio", { name: "높음" }));
    await addTodo(user, "장보기");

    const item = await screen.findByRole("listitem");
    expect(item).toHaveTextContent("장보기");
    expect(item).toHaveTextContent("높음");
  });

  it("7. 우선순위 미선택 시 기본값(보통)으로 추가됨", async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    await addTodo(user, "장보기");

    const item = await screen.findByRole("listitem");
    expect(item).toHaveTextContent("보통");
  });

  it("5. 페이지 새로고침 → 기존 목록 유지", async () => {
    const user = userEvent.setup();

    // 첫 렌더에서 항목 추가 → 서버(Vercel Blob)에 저장됨
    const { unmount } = render(<TodoList />);
    await addTodo(user, "장보기");
    await screen.findByText("장보기");
    unmount();

    // 새로고침을 시뮬레이션: 새 인스턴스를 마운트하면 서버에서 다시 로드
    render(<TodoList />);

    expect(await screen.findByText("장보기")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});

describe("Todo 필터링", () => {
  it("'전체' 필터 선택 → 5개 모두 표시", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await seedFiveTodos(user);

    // 상태 필터 그룹의 '전체'(카테고리 필터에도 '전체'가 있어 그룹으로 한정)
    const statusGroup = screen.getByRole("radiogroup", { name: "필터" });
    await user.click(within(statusGroup).getByRole("radio", { name: "전체" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("'진행중' 필터 선택 → 미완료 3개만 표시", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await seedFiveTodos(user);

    await user.click(screen.getByRole("radio", { name: "진행중" }));

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    // 표시된 항목은 모두 미완료(취소선 없음)여야 한다
    for (const item of items) {
      expect(item.querySelector(".line-through")).toBeNull();
    }
  });

  it("'완료' 필터 선택 → 완료 2개만 표시", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await seedFiveTodos(user);

    await user.click(screen.getByRole("radio", { name: "완료" }));

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // 표시된 항목은 모두 완료(취소선 있음)여야 한다
    for (const item of items) {
      expect(item.querySelector(".line-through")).not.toBeNull();
    }
  });

  it("Todo 0개일 때 '진행중' 선택 → '할 일이 없습니다' 메시지 표시", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await screen.findByText(/할 일이 없습니다/);

    await user.click(screen.getByRole("radio", { name: "진행중" }));

    expect(screen.getByText(/할 일이 없습니다/)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("항목이 있어도 필터 결과가 비면 '할 일이 없습니다' 메시지 표시", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    // 미완료 항목만 추가한 뒤 '완료' 필터 → 결과 0개
    await addTodo(user, "할일1");
    await screen.findByText("할일1");

    await user.click(screen.getByRole("radio", { name: "완료" }));

    expect(screen.getByText(/할 일이 없습니다/)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });

  it("'완료' 필터 중 항목을 미완료로 변경 → 목록에서 사라짐", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await seedFiveTodos(user);

    await user.click(screen.getByRole("radio", { name: "완료" }));
    // seedFiveTodos는 할일5, 할일4를 완료로 만든다
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("할일5")).toBeInTheDocument();

    // 완료였던 '할일5'(첫 항목)를 미완료로 토글하면 '완료' 목록에서 사라진다
    await user.click(screen.getAllByRole("checkbox", { name: "완료 취소" })[0]);

    expect(screen.queryByText("할일5")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});

describe("Todo 정렬", () => {
  it("'이름순' 선택 → 가나다순으로 정렬된다", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await addTodo(user, "바나나");
    await addTodo(user, "사과");
    await addTodo(user, "가지");
    await screen.findByText("가지");

    await user.click(screen.getByRole("radio", { name: "이름순" }));

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("가지");
    expect(items[1]).toHaveTextContent("바나나");
    expect(items[2]).toHaveTextContent("사과");
  });

  it("'생성일순' 선택 → 최신순으로 정렬된다", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await addTodo(user, "첫번째");
    await addTodo(user, "두번째");
    await addTodo(user, "세번째");
    await screen.findByText("세번째");

    // 이름순으로 바꿨다가 다시 생성일순으로 복귀
    await user.click(screen.getByRole("radio", { name: "이름순" }));
    await user.click(screen.getByRole("radio", { name: "생성일순" }));

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("세번째");
    expect(items[1]).toHaveTextContent("두번째");
    expect(items[2]).toHaveTextContent("첫번째");
  });

  it("'마감일순' 선택 → 마감일 가까운 항목부터 표시된다", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await addTodoWithDue(user, "먼일", "2026-07-10");
    await addTodoWithDue(user, "가까운일", "2026-07-01");
    await addTodoWithDue(user, "중간일", "2026-07-05");
    await screen.findByText("중간일");

    await user.click(screen.getByRole("radio", { name: "마감일순" }));

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("가까운일");
    expect(items[1]).toHaveTextContent("중간일");
    expect(items[2]).toHaveTextContent("먼일");
  });

  it("'마감일순' 선택 → 마감일 없는 항목 2개는 맨 뒤에 표시된다", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await addTodoWithDue(user, "마감1", "2026-07-03");
    await addTodo(user, "없음1");
    await addTodoWithDue(user, "마감2", "2026-07-01");
    await addTodo(user, "없음2");
    await addTodoWithDue(user, "마감3", "2026-07-02");
    await screen.findByText("마감3");

    await user.click(screen.getByRole("radio", { name: "마감일순" }));

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(5);
    // 앞 3개: 마감일 있는 항목(가까운 순)
    expect(items[0]).toHaveTextContent("마감2"); // 07-01
    expect(items[1]).toHaveTextContent("마감3"); // 07-02
    expect(items[2]).toHaveTextContent("마감1"); // 07-03
    // 뒤 2개: 마감일 없는 항목
    expect(items[3]).toHaveTextContent("없음");
    expect(items[4]).toHaveTextContent("없음");
  });
});

describe("Todo 검색", () => {
  it("'회의' 검색 → '회의' 포함 항목만 표시된다", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await addTodo(user, "회의 준비");
    await addTodo(user, "장보기");
    await addTodo(user, "팀 회의");
    await screen.findByText("팀 회의");

    await user.type(screen.getByRole("searchbox", { name: "검색" }), "회의");

    expect(screen.getByText("회의 준비")).toBeInTheDocument();
    expect(screen.getByText("팀 회의")).toBeInTheDocument();
    expect(screen.queryByText("장보기")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("검색어를 지우면 전체 목록이 복원된다", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await addTodo(user, "회의 준비");
    await addTodo(user, "장보기");
    await screen.findByText("장보기");

    const search = screen.getByRole("searchbox", { name: "검색" });
    await user.type(search, "회의");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    await user.clear(search);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("Todo 카테고리 태그", () => {
  it("'업무' 태그를 지정해 추가 → 목록에 태그가 표시된다", async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    // 입력 폼의 카테고리 그룹에서 '업무'를 선택(필터 그룹과 이름이 겹치므로 그룹으로 한정)
    const categoryGroup = screen.getByRole("radiogroup", { name: "카테고리" });
    await user.click(within(categoryGroup).getByRole("radio", { name: "업무" }));
    await addTodo(user, "보고서 작성");

    const item = await screen.findByRole("listitem");
    expect(item).toHaveTextContent("보고서 작성");
    expect(item).toHaveTextContent("업무");
  });
});

describe("Todo 카테고리별 필터", () => {
  // 입력 폼 카테고리 그룹에서 태그를 선택해 추가하는 헬퍼
  async function addTodoWithCategory(
    user: ReturnType<typeof userEvent.setup>,
    text: string,
    categoryLabel: string
  ) {
    const group = screen.getByRole("radiogroup", { name: "카테고리" });
    await user.click(within(group).getByRole("radio", { name: categoryLabel }));
    await addTodo(user, text);
  }

  it("'업무' 필터 선택 → 업무 태그 항목만 표시된다", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await addTodoWithCategory(user, "보고서", "업무");
    await addTodoWithCategory(user, "운동", "개인");
    await addTodo(user, "태그없음");
    await screen.findByText("태그없음");

    const filterGroup = screen.getByRole("radiogroup", {
      name: "카테고리 필터",
    });
    await user.click(within(filterGroup).getByRole("radio", { name: "업무" }));

    expect(screen.getByText("보고서")).toBeInTheDocument();
    expect(screen.queryByText("운동")).not.toBeInTheDocument();
    expect(screen.queryByText("태그없음")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("'전체' 선택 → 필터가 해제되고 전체 목록이 표시된다", async () => {
    const user = userEvent.setup();
    render(<TodoList />);
    await addTodoWithCategory(user, "보고서", "업무");
    await addTodoWithCategory(user, "운동", "개인");
    await addTodo(user, "태그없음");
    await screen.findByText("태그없음");

    const filterGroup = screen.getByRole("radiogroup", {
      name: "카테고리 필터",
    });
    await user.click(within(filterGroup).getByRole("radio", { name: "업무" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    await user.click(within(filterGroup).getByRole("radio", { name: "전체" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});
