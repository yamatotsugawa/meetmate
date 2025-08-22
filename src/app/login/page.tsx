"use client";

import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export default function LoginPage() {
  const login = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const cred = GoogleAuthProvider.credentialFromResult(res);
      if (cred?.accessToken) {
        window.location.href = "/";
      }
    } catch (e: any) {
      console.error("Login error:", e?.code, e?.message);
      alert(`Error: ${e?.code}\n${e?.message}`);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <button
        onClick={login}
        className="px-4 py-2 rounded bg-black text-white"
      >
        Googleでログイン
      </button>
    </main>
  );
}
