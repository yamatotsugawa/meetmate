"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";

import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Label, Input, Select, Textarea } from "@/components/ui/Field";

type Person = {
  name: string;
  nameKana?: string;
  yobikata?: string;
  company?: string;
  phone?: string;
  email?: string;
  contactTool?: "LINE" | "Messenger" | "Email";
  facebook?: string;
  category?: string;
  business?: string;
  memo?: string;
  wantIntro?: string;
  ownerId?: string;
  createdAt?: any;
  updatedAt?: any;
};

export default function PersonNewPage() {
  const router = useRouter();

  const [uid, setUid] = useState("");
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<Person>({
    name: "",
    nameKana: "",
    yobikata: "",
    company: "",
    phone: "",
    email: "",
    contactTool: "LINE",
    facebook: "",
    category: "ビジネス関係",
    business: "",
    memo: "",
    wantIntro: "",
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUid(u?.uid ?? ""));
  }, []);

  const save = async () => {
    if (!uid) return;
    if (!p.name?.trim()) {
      alert("名前は必須です。");
      return;
    }
    setSaving(true);
    try {
      const ref = doc(collection(db, "users", uid, "people"));
      await setDoc(ref, {
        ...p,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      alert("登録しました。");
      router.push("/people");
    } catch (e) {
      alert(`登録に失敗しました: ${String(e)}`);
    } finally {
      setSaving(false);
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
    <Container>
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold">会った人を登録</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => history.back()}>戻る</Button>
            <Button onClick={save} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>名前（漢字） *</Label>
            <Input
              value={p.name}
              onChange={(e) => setP({ ...p, name: e.target.value })}
              placeholder="山田 太郎"
              required
            />
          </div>
          <div>
            <Label>なまえ（ひらがな）</Label>
            <Input
              value={p.nameKana ?? ""}
              onChange={(e) => setP({ ...p, nameKana: e.target.value })}
              placeholder="やまだ たろう"
            />
          </div>
          <div className="md:col-span-2">
            <Label>呼び方</Label>
            <Input
              value={p.yobikata ?? ""}
              onChange={(e) => setP({ ...p, yobikata: e.target.value })}
              placeholder="たろうさん / たろう / たろうくん など"
            />
          </div>

          <div>
            <Label>会社名 / 屋号</Label>
            <Input
              value={p.company ?? ""}
              onChange={(e) => setP({ ...p, company: e.target.value })}
              placeholder="○○株式会社"
            />
          </div>
          <div>
            <Label>電話番号</Label>
            <Input
              value={p.phone ?? ""}
              onChange={(e) => setP({ ...p, phone: e.target.value })}
              placeholder="090-xxxx-xxxx"
            />
          </div>

          <div>
            <Label>メールアドレス</Label>
            <Input
              type="email"
              value={p.email ?? ""}
              onChange={(e) => setP({ ...p, email: e.target.value })}
              placeholder="example@example.com"
            />
          </div>
          <div>
            <Label>Facebook（URL）</Label>
            <Input
              value={p.facebook ?? ""}
              onChange={(e) => setP({ ...p, facebook: e.target.value })}
              placeholder="https://facebook.com/..."
            />
          </div>

          <div>
            <Label>連絡ツール</Label>
            <Select
              value={p.contactTool ?? "LINE"}
              onChange={(e) => setP({ ...p, contactTool: e.target.value as Person["contactTool"] })}
            >
              <option value="LINE">LINE</option>
              <option value="Messenger">メッセンジャー</option>
              <option value="Email">メール</option>
            </Select>
          </div>
          <div>
            <Label>繋がりカテゴリー</Label>
            <Select
              value={p.category ?? "ビジネス関係"}
              onChange={(e) => setP({ ...p, category: e.target.value })}
            >
              <option>ビジネス関係</option>
              <option>友達</option>
              <option>ファン</option>
              <option>顧客</option>
              <option>その他</option>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>ビジネス内容</Label>
            <Textarea
              rows={3}
              value={p.business ?? ""}
              onChange={(e) => setP({ ...p, business: e.target.value })}
              placeholder="取り扱い/得意領域/提供価値など"
            />
          </div>

          <div className="md:col-span-2">
            <Label>相手が欲しい紹介</Label>
            <Textarea
              rows={3}
              value={p.wantIntro ?? ""}
              onChange={(e) => setP({ ...p, wantIntro: e.target.value })}
              placeholder="どんな人を紹介すると喜ばれるか"
            />
          </div>

          <div className="md:col-span-2">
            <Label>メモ</Label>
            <Textarea
              rows={4}
              value={p.memo ?? ""}
              onChange={(e) => setP({ ...p, memo: e.target.value })}
              placeholder="雑談・覚えておきたいこと、次アクションなど"
            />
          </div>
        </div>
      </Card>
    </Container>
  );
}
