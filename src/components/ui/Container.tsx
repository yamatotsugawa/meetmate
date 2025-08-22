import { PropsWithChildren } from "react";

export default function Container({ children }: PropsWithChildren) {
  return (
    <main className="mx-auto max-w-2xl px-3 py-6 space-y-6">
      {children}
    </main>
  );
}
