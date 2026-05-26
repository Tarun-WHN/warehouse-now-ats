import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', 'pdf-parse', 'mammoth', '@anthropic-ai/sdk', 'nodemailer'],
};

export default nextConfig;
