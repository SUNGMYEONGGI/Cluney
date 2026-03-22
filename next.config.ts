import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import { dirname } from "path";

const rootDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: rootDir,
  },
};

export default nextConfig;
