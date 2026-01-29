/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Enable server actions for Mastra
    experimental: {
        serverActions: {
            allowedOrigins: ['localhost:3000'],
        },
    },
};

export default nextConfig;
