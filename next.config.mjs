/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * S.2 — Cabeceras de seguridad aplicadas a todas las rutas.
   *
   * CSP nota: `'unsafe-inline'` y `'unsafe-eval'` son necesarios para
   * Next 14 en dev (HMR / webpack) y para los estilos inline de
   * Tailwind. Si se aprietan a futuro habría que adoptar nonces.
   *
   * connect-src: Supabase es el único origen externo del que se
   * descarga datos (vía el adapter pg, no cliente JS, pero igualmente
   * permitido por si en el futuro se añade subscripción realtime).
   */
  async headers() {
    return [
      {
        source: '/(.*)?',
        headers: [
          { key: 'X-Frame-Options',        value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
