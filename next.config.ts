import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static HTML export
  output: "export",

  // Optional: if you’re using images or client-side routes, add basePath
  images: {
    unoptimized: true, // required when using 'next export'
  },
};

export default nextConfig;

