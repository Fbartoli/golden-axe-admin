/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reduce memory pressure during development
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
}

module.exports = nextConfig
