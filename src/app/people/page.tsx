// src/app/people/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import type { Person } from "@/types";

import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Label, Input } from "@/components/ui/Field";

type P = Person & {
  id?: string;
  nameKana?: string; // なまえ（かな）※存在しなくてもOK
  namePron?: string; // 呼び方
  nickname?: string; // 呼び名
};

const initials = (name?: string) => (name?.trim()?.slice(0, 2) || "？");

export default function PeopleListPage() {
  const [uid, setUid] = useState("");
  const [items, setItems] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [kw, setKw] = useState("");

  const fetchPeople = useCallback(async (u: string) => {
    setLoading(true);
    try {
      const col = collection(db, "users", u, "people");
      const snap = await getDocs(query(col, orderBy("updatedAt", "desc")));
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as P) })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUid("");
        setItems([]);
        setLoading(false);
        return;
      }
      setUid(u.uid);
      fetchPeople(u.uid);
    });
  }, [fetchPeople]);

  const filtered = useMemo(() => {
    const k = kw.trim().toLowerCase();
    if (!k) return items;
    const keys = k.split(/\s+/);
    return items.filter((p) => {
      const hay = [
        p.name ?? "",
        (p as any).nameKana ?? "",
        (p as any).namePron ?? "",
        (p as any).nickname ?? "",
        p.company ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return keys.every((t) => hay.includes(t));
    });
  }, [kw, items]);

  const handleDelete = async (id?: string) => {
    if (!uid || !id) return;
    if (!confirm("この人を削除します。よろしいですか？\n（面談ログは削除されません）")) return;
    await deleteDoc(doc(db, "users", uid, "people", id));
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  if (!uid) {
    return (
      <Container>
        <Card>ログインしてください。</Card>
      </Container>
    );
  }

  return (
    <Container className="max-w-[820px]">
      {/* タイトル行 */}
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-bold">会った人</h1>
        <Link href="/people/new">
          <Button>新規登録</Button>
        </Link>
      </div>

      {/* 検索 */}
      <Card className="space-y-3">
        <label className="flex items-center gap-2">
          <Label className="w-20 shrink-0">検索</Label>
          <Input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder="名前 / なまえ / 呼び方 / 会社名 で検索"
          />
        </label>
      </Card>

      {/* 結果一覧 */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <Card>読み込み中…</Card>
        ) : filtered.length === 0 ? (
          <Card>該当する人がいません。</Card>
        ) : (
          filtered.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-center gap-4">
                {/* アバター */}
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                  {initials(p.name)}
                </div>

                {/* 本文 */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-semibold">
                      {p.name}
                    </div>
                    {p.company && (
                      <div className="truncate text-xs text-gray-500">
                        {p.company}
                      </div>
                    )}
                  </div>
                </div>

                {/* 操作 */}
                <div className="shrink-0 flex items-center gap-3">
                  {p.id && (
                    <Link
                      href={`/people/${p.id}`}
                      className="text-blue-600 underline"
                    >
                      編集
                    </Link>
                  )}
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-600 underline"
                  >
                    削除
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </Container>
  );
}