"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { auth, db, googleProvider } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit as qlimit,
} from "firebase/firestore";
import { invertBusyToFree, type Interval } from "@/lib/freeSlots";

type Person = { id?: string; name: string; company?: string };
type Meeting = { id?: string; personId: string; metAt: number; place?: string };
type FreeItem = { start: Date; end: Date };

const fmtDate = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
});
const fmtTime = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
});
const fmtDT = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const initials = (name?: string) => (name?.trim()?.slice(0, 2) || "？");

export default function TopPage() {
  const [uid, setUid] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [freeList, setFreeList] = useState<FreeItem[]>([]);
  const [freebusyLog, setFreebusyLog] = useState("");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const nextWeekStr = useMemo(() => {
    const d = new Date(Date.now() + 7 * 86400000);
    return d.toISOString().split("T")[0];
  }, []);
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(nextWeekStr);
  const [workStart, setWorkStart] = useState("10:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUid("");
        setDisplayName("");
        setEmail("");
        setPeople([]);
        setMeetings([]);
        setLoading(false);
        return;
      }
      setUid(u.uid);
      setDisplayName(u.displayName ?? "");
      setEmail(u.email ?? "");
      setLoading(true);
      try {
        const pCol = collection(db, "users", u.uid, "people");
        const pSnap = await getDocs(query(pCol, orderBy("updatedAt", "desc")));
        setPeople(pSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Person) })));

        const mCol = collection(db, "users", u.uid, "meetings");
        const mSnap = await getDocs(query(mCol, orderBy("metAt", "desc"), qlimit(5)));
        setMeetings(mSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Meeting) })));
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const filteredPeople = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return [];
    return people.filter((p) => {
      const hay = `${p.name ?? ""} ${p.company ?? ""}`.toLowerCase();
      return k.split(/\s+/).every((t) => hay.includes(t));
    });
  }, [keyword, people]);

  const peopleMap = useMemo(() => {
    const m = new Map<string, Person>();
    people.forEach((p) => p.id && m.set(p.id, p));
    return m;
  }, [people]);

  /** ===== FreeBusy 抽出 ===== */
  const fetchFreebusy = async () => {
    setFreebusyLog("計算中…");
    setFreeList([]);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const cred = GoogleAuthProvider.credentialFromResult(res);
      const token = cred?.accessToken;
      if (!token) throw new Error("アクセストークン取得に失敗しました");

      const r = await fetch("/api/freebusy", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          timeMin: new Date(dateFrom).toISOString(),
          timeMax: new Date(new Date(dateTo).getTime() + 86400000).toISOString(), // 終了日の翌0:00
          timeZone: "Asia/Tokyo",
          calendars: ["primary"],
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(typeof data === "string" ? data : data.error || "unknown");

      const busyRaw: { start: string; end: string }[] = data?.calendars?.primary?.busy ?? [];
      const busyAll: Interval[] = busyRaw.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));

      const days = Math.ceil((+new Date(dateTo) - +new Date(dateFrom)) / 86400000) + 1;
      const items: FreeItem[] = [];
      for (let i = 0; i < days; i++) {
        const day = new Date(dateFrom);
        day.setDate(day.getDate() + i);
        const wStart = new Date(`${day.toDateString()} ${workStart}`);
        const wEnd = new Date(`${day.toDateString()} ${workEnd}`);
        const dayBusy = busyAll.filter((b) => !(b.end <= wStart || b.start >= wEnd));
        invertBusyToFree(wStart, wEnd, dayBusy, duration).forEach((slot) =>
          items.push({ start: slot.start, end: slot.end })
        );
      }
      setFreeList(items);
      setFreebusyLog("");
    } catch (e: any) {
      setFreebusyLog(`Error: ${e?.message || e}`);
    }
  };

  /** ===== 未ログイン ===== */
  if (!uid) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center text-sm">
          <p className="mb-3 text-gray-600">ログインが必要です。</p>
          <a href="/login" className="inline-block rounded-lg bg-black px-4 py-2 text-white">
            Googleでログイン
          </a>
        </div>
      </main>
    );
  }

  /** ===== 画面 ===== */
  return (
    <main className="mx-auto max-w-2xl px-3 py-6 space-y-6 text-sm bg-gray-50 min-h-screen">
      {/* ヘッダー */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold">MEETMATE</h1>
            <p className="text-gray-600">人・面談の管理と、空き時間のサポート</p>
            <p className="text-xs text-gray-500 mt-1">{displayName} / {email}</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ログアウト
          </button>
        </div>
      </section>

      {/* 会った人 / 面談ログ */}
      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">会った人</div>
          <div className="mt-1 text-base font-semibold">一覧・検索・編集</div>
          <Link href="/people" className="mt-3 inline-block rounded-md bg-black px-3 py-1.5 text-white text-sm">
            開く
          </Link>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">面談ログ</div>
          <div className="mt-1 text-base font-semibold">記録・振り返り</div>
          <Link href="/meetings" className="mt-3 inline-block rounded-md bg-black px-3 py-1.5 text-white text-sm">
            開く
          </Link>
        </div>
      </section>

      {/* 新規（人／面談） */}
      <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <Link href="/people/new" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
            新規（人）
          </Link>
          <Link href="/meetings/new" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
            新規（面談）
          </Link>
        </div>
      </section>

      {/* 検索 */}
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">最近会った人を忘れず、すぐ検索。</h2>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="検索：名前 / 会社 / 属性 / 話した内容…"
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/15"
        />
        {keyword && (
          <div className="mt-3">
            {filteredPeople.length === 0 ? (
              <p className="text-xs text-gray-500">該当なし。</p>
            ) : (
              <ul className="divide-y rounded-md border border-gray-200 bg-gray-50">
                {filteredPeople.slice(0, 10).map((p) => (
                  <li key={p.id} className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-gray-900 text-xs text-white">
                        {initials(p.name)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-[11px] text-gray-500">{p.company}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Link href={`/people/${p.id}`} className="text-blue-600 underline">
                        詳細
                      </Link>
                      <Link href={`/meetings/new?person=${p.id}`} className="text-gray-700 underline">
                        面談を記録
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* 最近の面談 */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">最近あった人</h3>
          <Link href="/meetings/new" className="text-blue-600 hover:underline text-xs">
            すぐ登録する
          </Link>
        </div>

        {loading ? (
          <p className="text-xs text-gray-500">読み込み中…</p>
        ) : meetings.length === 0 ? (
          <p className="text-xs text-gray-500">最近の面談ログはまだありません。</p>
        ) : (
          <div className="space-y-2">
            {meetings.map((m) => {
              const p = peopleMap.get(m.personId);
              return (
                <article key={m.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-gray-900 text-xs text-white">
                      {initials(p?.name)}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">
                        {p?.name || "（削除済み）"}
                      </div>
                      <div className="text-[11px] text-gray-600">{p?.company}</div>
                      <div className="mt-1 text-[10px] text-gray-500">
                        {fmtDT.format(new Date(m.metAt))}
                        {m.place ? ` / ${m.place}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      {p?.id && (
                        <Link href={`/people/${p.id}`} className="text-blue-600 underline">
                          人の詳細
                        </Link>
                      )}
                      {m.id && (
                        <Link href={`/meetings/${m.id}`} className="text-gray-700 underline">
                          面談を開く
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 空き時間抽出（折りたたみ） */}
      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <details>
          <summary className="list-none cursor-pointer px-4 py-2 text-sm">
            ▶ 空き時間を抽出（オプション）
          </summary>
          <div className="px-4 pb-4 text-xs">
            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex items-center gap-2">
                <span className="w-20">開始日</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-20">終了日</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-20">開始時刻</span>
                <input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-20">終了時刻</span>
                <input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="w-full rounded border border-gray-300 px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="w-20">所要</span>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                  className="w-full rounded border border-gray-300 px-2 py-1"
                >
                  <option value={30}>30分</option>
                  <option value={45}>45分</option>
                  <option value={60}>60分</option>
                  <option value={90}>90分</option>
                </select>
              </label>
            </div>

            <button
              onClick={fetchFreebusy}
              className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-white"
            >
              抽出
            </button>

            <ul className="mt-2 list-disc pl-5">
              {freeList.map((f, i) => (
                <li key={i}>
                  {fmtDate.format(f.start)} {fmtTime.format(f.start)}〜{fmtTime.format(f.end)}
                </li>
              ))}
            </ul>
            {freebusyLog && (
              <pre className="mt-2 whitespace-pre-wrap text-red-600">{freebusyLog}</pre>
            )}
          </div>
        </details>
      </section>
    </main>
  );
}
