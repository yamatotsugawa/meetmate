"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from "firebase/firestore";

type Person = {
  id?: string;
  name: string;
  company?: string;
};

type Meeting = {
  id?: string;
  ownerId: string;
  personId: string;
  metAt: number;           // epoch millis
  mode: "real" | "online";
  place?: string;          // 実地の場合の場所 or オンラインURL
  duration?: number;       // 分
  memo?: string;
  createdAt: number;
  updatedAt: number;
};

// datetime-local 入出力ヘルパ
const toLocalInput = (ms?: number) => {
  const d = ms ? new Date(ms) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};
const fromLocalInput = (s: string) => new Date(s).getTime();

export default function MeetingEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [uid, setUid] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState<string>("");

  // フォーム状態
  const [personId, setPersonId] = useState("");
  const [metAt, setMetAt] = useState(toLocalInput());
  const [mode, setMode] = useState<"real" | "online">("real");
  const [place, setPlace] = useState("");
  const [duration, setDuration] = useState<number>(60);
  const [memo, setMemo] = useState("");

  // ログイン＆データ取得
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setError("");
      if (!u) {
        setUid("");
        setLoading(false);
        return;
      }
      setUid(u.uid);

      try {
        // 人リスト（単一 orderBy なので複合インデックス不要）
        const pCol = collection(db, "users", u.uid, "people");
        const pSnap = await getDocs(query(pCol, orderBy("name")));
        setPeople(pSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Person) })));

        // 面談本体
        const ref = doc(db, "users", u.uid, "meetings", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setError("面談ログが見つかりませんでした。");
        } else {
          const m = snap.data() as Meeting;
          setPersonId(m.personId || "");
          setMetAt(toLocalInput(m.metAt));
          setMode((m.mode as any) || "real");
          setPlace(m.place || "");
          setDuration(m.duration ?? 60);
          setMemo(m.memo || "");
        }
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    });
  }, [id]);

  const handleSave = async () => {
    if (!uid) return;
    setError("");
    try {
      const now = Date.now();
      const payload: Partial<Meeting> = {
        ownerId: uid,
        personId,
        metAt: fromLocalInput(metAt),
        mode,
        place,
        duration,
        memo,
        updatedAt: now,
      };
      // merge:true で更新（既存 createdAt は維持）
      await setDoc(doc(db, "users", uid, "meetings", id), payload as any, { merge: true });
      alert("保存しました。");
      router.push("/meetings");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "保存に失敗しました。");
    }
  };

  const handleDelete = async () => {
    if (!uid) return;
    if (!confirm("この面談ログを削除します。よろしいですか？")) return;
    try {
      await deleteDoc(doc(db, "users", uid, "meetings", id));
      router.push("/meetings");
    } catch (e: any) {
      console.error(e);
      alert(`削除に失敗しました: ${e?.message || e}`);
    }
  };

  if (!uid) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border bg-white p-6 shadow-sm text-center">
          <p className="text-gray-600 mb-3">ログインが必要です。</p>
          <a href="/login" className="inline-block px-4 py-2 rounded-lg bg-black text-white">Googleでログイン</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-start justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">面談ログの編集</h1>
          <a href="/meetings" className="px-3 py-2 rounded border">一覧へ</a>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">読み込み中…</p>
        ) : (
          <>
            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col">
                <span className="text-sm text-gray-700">相手 *</span>
                <select
                  className="border rounded-lg px-3 py-2"
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                >
                  <option value="">（選択してください）</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.company ? `（${p.company}）` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col">
                <span className="text-sm text-gray-700">日時 *</span>
                <input
                  type="datetime-local"
                  className="border rounded-lg px-3 py-2"
                  value={metAt}
                  onChange={(e) => setMetAt(e.target.value)}
                />
              </label>

              <label className="flex flex-col">
                <span className="text-sm text-gray-700">形式 *</span>
                <select
                  className="border rounded-lg px-3 py-2"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as "real" | "online")}
                >
                  <option value="real">リアル</option>
                  <option value="online">オンライン</option>
                </select>
              </label>

              <label className="flex flex-col">
                <span className="text-sm text-gray-700">
                  {mode === "real" ? "場所" : "URL"}
                </span>
                <input
                  className="border rounded-lg px-3 py-2"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder={mode === "real" ? "例：渋谷◯◯カフェ" : "Zoom/Meet のURL など"}
                />
              </label>

              <label className="flex flex-col">
                <span className="text-sm text-gray-700">所要時間（分）</span>
                <input
                  type="number"
                  className="border rounded-lg px-3 py-2"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value || "0", 10))}
                  min={0}
                />
              </label>

              <label className="flex flex-col md:col-span-2">
                <span className="text-sm text-gray-700">メモ</span>
                <textarea
                  rows={4}
                  className="border rounded-lg px-3 py-2"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-black text-white"
              >
                保存
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white"
              >
                削除
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
