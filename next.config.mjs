/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Nodemailer roda em runtime Node (não Edge). As rotas que enviam e-mail
  // declaram `export const runtime = 'nodejs'` individualmente.
  serverExternalPackages: ['nodemailer'],
};
export default nextConfig;
