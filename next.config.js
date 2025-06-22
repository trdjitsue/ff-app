/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // ปิด static optimization สำหรับหน้าที่ใช้ auth
  experimental: {
    esmExternals: false,
  },
  
  // บังคับให้ทุกหน้าใช้ getServerSideProps แทน static generation
  async generateStaticParams() {
    return [];
  },
  
  // หรือกำหนด output เป็น export (ถ้าต้องการ static export)
  // output: 'export',
  // trailingSlash: true,
  
  webpack: (config, { isServer }) => {
    // แก้ปัญหา Firebase กับ webpack
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig