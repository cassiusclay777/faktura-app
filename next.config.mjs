/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  transpilePackages: ["invoice-assistant"],
  /** Vyhnout se špatnému workspace rootu, když existuje jiný lockfile výš ve stromu. */
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
