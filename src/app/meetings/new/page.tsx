"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, getDocs } from "firebase/firestore";
import type { Meeting, Person } from "@/types";
import { useRouter } from "next/navigation";

export default function MeetingNewPage() {
  const [uid, setUid] = useState<string>("");
  const [people, setPeople] = useState<Person[]>([]);
  const router = useRouter();

  const { register, handleSubmit, watch } = useForm<any>({
    defaultValues: {
      personId: "",
      date: new Date().toISOString().slice(0, 10),
      time: "13:00",
      mode: "Real",
      place: "",
      note: "",
    },
  });

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUid(u?.uid || "");
    if (!u) return;
    const snap = await getDocs(collection(db, "users", u.uid, "people"));
    setPeople(snap.docs.map(d => ({ id: d.id, ...(d.data() as Person) })));
  }), []);

  const toEpoch = (date: string, time: string) => {
    const [y,m,d] = date.split("-").map(n => parseInt(n,10));
    const [hh,mm] = time.split(":").map(n => parseInt(n,10));
    return new Date(y, m-1, d, hh, mm, 0, 0).getTime();
    // ローカルタイムで保存（表示は常にJSTにしているため）
  };

  const onSubmit = async (v: any) => {
    if (!uid) return;
    const payload: Meeting = {
      ownerId: uid,
      personId: v.personId || undefined,
      metAt: toEpoch(v.date, v.time),
      mode: v.mode,
      place: v.mode === "Real" ? v.place : "",
      note: v.note || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await addDoc(collection(db, "users", uid, "meetings"), payload as any);
    router.push("/meetings"); // 後で一覧ページを作る
  };

  const mode = watch("mode");

  if (!uid) return <main className="p-6">ログインしてください。</main>;

  return (
    <main className="p-6 max-w-xl space-y-4">
      <h1 className="text-xl font-bold">会ったときログを登録</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <label className="flex flex-col">
          <span>相手（任意）</span>
          <select className="border rounded px-2 py-1" {...register("personId")}>
            <option value="">未選択</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}（{p.company}）</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col">
            <span>日付</span>
            <input type="date" className="border rounded px-2 py-1" {...register("date")} />
          </label>
          <label className="flex flex-col">
            <span>時刻</span>
            <input type="time" className="border rounded px-2 py-1" {...register("time")} />
          </label>
        </div>

        <label className="flex items-center gap-3">
          <span>形式</span>
          <select className="border rounded px-2 py-1" {...register("mode")}>
            <option value="Real">リアル</option>
            <option value="Online">オンライン</option>
          </select>
        </label>

        {mode === "Real" && (
          <label className="flex flex-col">
            <span>場所</span>
            <input className="border rounded px-2 py-1" {...register("place")} placeholder="店名・住所など" />
          </label>
        )}

        <label className="flex flex-col">
          <span>メモ</span>
          <textarea className="border rounded px-2 py-1" rows={3} {...register("note")} />
        </label>

        <div className="flex gap-3">
          <button type="submit" className="px-3 py-2 rounded bg-black text-white">保存</button>
          <a href="/" className="px-3 py-2 rounded border">ホームへ</a>
        </div>
      </form>
    </main>
  );
}
