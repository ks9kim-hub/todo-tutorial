import { head, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import type { Todo } from "@/lib/types";

// 모든 할 일을 하나의 JSON blob에 저장한다. 고정된 경로명을 사용해
// 덮어쓰기(allowOverwrite)로 갱신하고, 매번 같은 경로로 조회한다.
const BLOB_PATH = "todos.json";

export async function GET() {
  try {
    const blob = await head(BLOB_PATH);
    const res = await fetch(blob.url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json([] as Todo[]);
    }
    const todos = (await res.json()) as Todo[];
    return NextResponse.json(todos);
  } catch {
    // blob이 아직 없는 경우(첫 실행) 빈 목록 반환
    return NextResponse.json([] as Todo[]);
  }
}

export async function PUT(request: Request) {
  const todos = (await request.json()) as Todo[];
  await put(BLOB_PATH, JSON.stringify(todos), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return NextResponse.json({ ok: true });
}
