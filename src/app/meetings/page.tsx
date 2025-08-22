"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Label, Input, Select } from "@/components/ui/Field";

type Person = {
  id?: string;
  name: string;
  nameKana?: string;
  yobikata?: string;
  company?: string;
};

type Meeting = {
  id?: string;
  personId?: string;
  metAt: number;              // epoch millis
  online?: boolean;
  place?: string;
  memo?: string;
};

const fmtDate = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const fmtTime = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
});
const initials = (name?: string) => (name?.trim()?.slice(0, 2) || "？");

export default function MeetingsPage() {
  const [uid, setUid] = useState("");
  const [loading, setLoading] = useState(true);

  // フィルタ
  const today = useMemo(() => new Date(), []);
  const dateToStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const [from, setFrom] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 14);
    return dateToStr(d);
  });
  const [to, setTo] = useState(() => dateToStr(today));
  const [person, setPerson] = useState<string>("__ALL__");

  // データ
  const [people, setPeople] = useState<Person[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const peopleMap = useMemo(() => {
    const m = new Map<string, Person>();
    people.forEach((p) => p.id && m.set(p.id, p));
    return m;
  }, [people]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUid("");
        setPeople([]);
        setMeetings([]);
        setLoading(false);
        return;
      }
      setUid(u.uid);

      // 相手候補（select 用）
      const pCol = collection(db, "users", u.uid, "people");
      const pSnap = await getDocs(query(pCol, orderBy("updatedAt", "desc")));
      setPeople(pSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Person) })));

      // 初回ロード
      fetchMeetings(u.uid);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMeetings = async (uidArg?: string) => {
    const userId = uidArg ?? uid;
    if (!userId) return;

    setLoading(true);
    try {
      // 日付範囲（終了日の翌0:00未満まで）
      const fromMs = +new Date(`${from}T00:00:00`);
      const toMs = +new Date(`${to}T00:00:00`) + 24 * 60 * 60 * 1000;

      const col = collection(db, "users", userId, "meetings");
      const clauses: any[] = [
        where("metAt", ">=", fromMs),
        where("metAt", "<", toMs),
        orderBy("metAt", "desc"),
      ];
      if (person !== "__ALL__") clauses.splice(0, 0, where("personId", "==", person));

      const q = query(col, ...clauses);
      const snap = await getDocs(q);
      setMeetings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Meeting) })));
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-base font-bold">面談ログ</h1>
        <Link href="/meetings/new">
          <Button>新規作成</Button>
        </Link>
      </div>

      {/* フィルタ */}
      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2">
            <Label className="w-10">開始</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex items-center gap-2">
            <Label className="w-10">終了</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="flex items-center gap-2">
            <Label className="w-10">相手</Label>
            <Select value={person} onChange={(e) => setPerson(e.target.value)}>
              <option value="__ALL__">全員</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.company ? `（${p.company}）` : ""}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => fetchMeetings()}>検索</Button>
          <Button
            variant="outline"
            onClick={() => {
              const d = new Date();
              const fromReset = new Date(d);
              fromReset.setDate(d.getDate() - 14);
              setFrom(dateToStr(fromReset));
              setTo(dateToStr(d));
              setPerson("__ALL__");
              setTimeout(() => fetchMeetings(), 0);
            }}
          >
            直近2週間にリセット
          </Button>
        </div>
      </Card>

      {/* 結果一覧 */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <Card>読み込み中…</Card>
        ) : meetings.length === 0 ? (
          <Card>該当する面談はありません。</Card>
        ) : (
          meetings.map((m) => {
            const who = m.personId ? peopleMap.get(m.personId) : undefined;
            const dt = new Date(m.metAt);
            return (
              <Card key={m.id} className="p-4">
                <div className="flex items-center gap-4">
                  {/* アバター */}
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gray-900 text-xs font-semibold text-white">
                    {initials(who?.name)}
                  </div>

                  {/* 本文 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-semibold">
                        {who?.name || "（相手未指定）"}
                      </div>
                      {who?.company && (
                        <div className="truncate text-xs text-gray-500">
                          {who.company}
                        </div>
                      )}
                    </div>

                    <div className="mt-0.5 text-xs text-gray-600">
                      {fmtDate.format(dt)} {fmtTime.format(dt)}{" "}
                      {m.online ? "/ オンライン" : m.place ? `/ ${m.place}` : "/ （場所未設定）"}
                    </div>

                    {m.memo && (
                      <div className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {m.memo}
                      </div>
                    )}
                  </div>

                  {/* 操作 */}
                  <div className="shrink-0">
                    {m.id && (
                      <Link
                        href={`/meetings/${m.id}`}
                        className="text-blue-600 underline"
                      >
                        編集
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </Container>
  );
}
