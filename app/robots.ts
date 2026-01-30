import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://geekstalk.org';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // API routes
          '/admin/',         // Admin pages
          '/profile/',       // User profile (requires auth)
          '/settings/',      // User settings (requires auth)
          '/notifications/', // User notifications (requires auth)
          '/live/',          // Live chat internal routes
          '/text/',          // Live subdomain text chat
          '/voice/',         // Live subdomain voice chat
          '/video/',         // Live subdomain video chat
          '/reset/',         // Password reset
          '/user/',          // User profile pages (dynamic)
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/profile/',
          '/settings/',
          '/notifications/',
          '/live/',
          '/text/',
          '/voice/',
          '/video/',
          '/reset/',
          '/user/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
