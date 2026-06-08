/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Support Google profile images and common CDNs
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh4.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh5.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh6.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      // S3 bucket used for blog cover/inline images. The /api/blog/image
      // proxy redirects here after re-signing; Next.js image optimizer
      // follows the 302 and needs the destination host whitelisted.
      { protocol: 'https', hostname: 'geekstalk-uploads-prod.s3.eu-west-1.amazonaws.com' },
      { protocol: 'https', hostname: 'geekstalk-uploads-prod.s3.amazonaws.com' },
      { protocol: 'https', hostname: 's3.eu-west-1.amazonaws.com' },
    ],
  },
  env: {
    NEXT_PUBLIC_MESSAGE_MAX_LENGTH: process.env.MESSAGE_MAX_LENGTH,
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    // Report-only CSP: this never blocks requests, it only reports
    // violations. Safe to ship because it cannot break the app. Allows
    // self, inline styles (Tailwind/Next inject some), the S3 upload hosts
    // used for images, and the Google/GitHub avatar hosts.
    const cspReportOnly = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'" + (isProd ? '' : " 'unsafe-eval'"),
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      [
        "img-src 'self' data: blob:",
        'https://lh3.googleusercontent.com',
        'https://lh4.googleusercontent.com',
        'https://lh5.googleusercontent.com',
        'https://lh6.googleusercontent.com',
        'https://avatars.githubusercontent.com',
        'https://images.unsplash.com',
        'https://geekstalk-uploads-prod.s3.eu-west-1.amazonaws.com',
        'https://geekstalk-uploads-prod.s3.amazonaws.com',
        'https://s3.eu-west-1.amazonaws.com',
      ].join(' '),
      "connect-src 'self'",
    ].join('; ');

    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Content-Security-Policy-Report-Only', value: cspReportOnly },
    ];

    // HSTS only in production — sending it over plain HTTP in dev would pin
    // localhost to HTTPS in the browser.
    if (isProd) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
