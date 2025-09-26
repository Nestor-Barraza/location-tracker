/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración específica para Vercel
  experimental: {
    // Mejora el rendimiento en serverless functions
    serverComponentsExternalPackages: ['pg', 'bcrypt']
  },
  // Optimizaciones para production
  poweredByHeader: false
}

module.exports = nextConfig