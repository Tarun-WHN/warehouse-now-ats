import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdf-parse', 'mammoth', '@anthropic-ai/sdk'],
};

export default nextConfig;
