// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LintエラーでVercelのビルドを止めない
  eslint: { ignoreDuringBuilds: true },
  // 型エラーでビルドを止めない（必要なら付ける）
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
