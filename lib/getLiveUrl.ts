export function getLiveUrl(path: string = '/text'): string {
  const { protocol, host, hostname } = window.location;

  if (host.startsWith('live.')) {
    return `${protocol}//${host}${path}`;
  }

  const port = host.split(':')[1];
  const isLocalDev =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.localhost') ||
    port === '3000' ||
    port === '3001';

  if (isLocalDev) {
    return `${protocol}//live.localhost:${port || '3000'}${path}`;
  }

  return `${protocol}//live.${host}${path}`;
}
