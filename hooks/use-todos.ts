"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_PRIORITY,
  type Category,
  type Priority,
  type Todo,
} from "@/lib/types";

const API_URL = "/api/todos";

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loaded, setLoaded] = useState(false);
  // 로드 시 실패 여부 — 실패한 경우 빈 배열로 서버 데이터를 덮어쓰지 않기 위해 사용
  const loadErrorRef = useRef(false);
  // 서버 로드가 끝나기 전에 사용자가 먼저 변경(추가/토글/삭제/편집)했는지 여부 —
  // 그런 경우 뒤늦게 도착한 서버 응답이 방금 만든 로컬 변경을 덮어쓰지 않도록 한다.
  const mutatedBeforeLoadRef = useRef(false);

  // 마운트 후 서버(Vercel Blob)에서 로드 (SSR hydration mismatch 방지)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("failed to load todos");
        // priority/createdAt 도입 이전에 저장된 데이터와의 호환을 위해 기본값으로 보정
        const parsed = (await res.json()) as (Omit<
          Todo,
          "priority" | "createdAt"
        > & {
          priority?: Priority;
          createdAt?: number;
        })[];
        // createdAt이 없던 데이터는 기존 배열 순서(앞쪽이 최신)를 유지하도록
        // index가 작을수록 큰 값을 부여한다.
        const base = Date.now();
        if (!mutatedBeforeLoadRef.current) {
          // 마운트 후 서버 값으로 동기화 — hydration mismatch 방지를 위해 의도적으로 effect에서 설정
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setTodos(
            parsed.map((todo, index) => ({
              ...todo,
              priority: todo.priority ?? DEFAULT_PRIORITY,
              createdAt: todo.createdAt ?? base - index,
            }))
          );
        }
      } catch {
        // 로드 실패 시 빈 목록 유지하되, 서버의 기존 데이터를 자동으로 덮어쓰지 않도록 표시
        loadErrorRef.current = true;
      }
      setLoaded(true);
    })();
  }, []);

  // 변경 시 저장 (로드 완료 후에만 — 초기 빈 배열이 기존 데이터를 덮어쓰지 않도록)
  useEffect(() => {
    if (!loaded) return;
    // 로드 실패 후 사용자가 아무것도 추가하지 않았다면 손상된 원본을 빈 배열로 덮어쓰지 않는다.
    if (loadErrorRef.current && todos.length === 0) return;
    fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(todos),
    }).catch(() => {
      // 저장 실패는 조용히 무시 — 다음 변경 시 다시 시도된다.
    });
  }, [todos, loaded]);

  function addTodo(
    text: string,
    priority: Priority = DEFAULT_PRIORITY,
    dueDate?: string,
    category?: Category
  ) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const todo: Todo = {
      id: crypto.randomUUID(),
      text: trimmed,
      completed: false,
      priority,
      createdAt: Date.now(),
      dueDate: dueDate || undefined,
      category,
    };
    mutatedBeforeLoadRef.current = true;
    setTodos((prev) => [todo, ...prev]);
  }

  function toggleTodo(id: string) {
    mutatedBeforeLoadRef.current = true;
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  function deleteTodo(id: string) {
    mutatedBeforeLoadRef.current = true;
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  }

  function editTodo(id: string, text: string) {
    const trimmed = text.trim();
    // 빈 문자열로 편집하면 삭제 처리
    if (!trimmed) {
      deleteTodo(id);
      return;
    }
    mutatedBeforeLoadRef.current = true;
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, text: trimmed } : todo
      )
    );
  }

  return { todos, loaded, addTodo, toggleTodo, deleteTodo, editTodo };
}
