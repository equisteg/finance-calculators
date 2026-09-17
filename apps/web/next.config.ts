import path from "node:path";
import type { NextConfig } from "next";

// This app has its own package-lock.json, but the repository root has another.
// Without an explicit root, Next.js guesses the repo root and resolves and
// traces files from the wrong dependency tree.
const appRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  turbopack: { root: appRoot },
  outputFileTracingRoot: appRoot,
};

export default nextConfig;
