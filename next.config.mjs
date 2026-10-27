/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // mysql2 and nodemailer are Node-only; keep them out of the bundle.
    serverComponentsExternalPackages: ['mysql2', 'nodemailer'],
  },
};

export default nextConfig;
