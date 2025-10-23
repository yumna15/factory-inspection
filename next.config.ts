//** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Keep images unoptimized (safe for static assets)
  images: {
    unoptimized: true,
  },

  // ⚠️ Do NOT include `output: "export"` since you use server-side features (PDF, Google APIs)
  // Vercel will deploy this as a full Next.js app with API routes
};

module.exports = nextConfig;
