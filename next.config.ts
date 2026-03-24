import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "mongoose", "nodemailer"],
};

export default nextConfig;
