/**
 * Asset URL handling.
 *
 * Vendure returns absolute preview URLs pointing at its asset server. On Windows, the local
 * asset storage strategy builds those identifiers with the OS path separator, so previews
 * come back as:
 *
 *   http://localhost:3000/assets/preview\71\derick-david__preview.jpg
 *
 * A backslash is not a path separator in a URL, so the request 404s. This is a development
 * artifact — production Vendure runs on Linux and returns forward slashes — but a malformed
 * URL is worth normalising rather than rendering a broken image either way.
 *
 * Nothing else about the URL is rewritten: the host stays whatever Vendure reports, so
 * pointing at a different asset server needs no frontend change.
 */
export function assetUrl(preview: string): string {
  return preview.split('\\').join('/');
}

/** Vendure's asset server accepts preset and dimension hints as query parameters. */
export function assetPreview(
  preview: string,
  options: { width?: number; height?: number } = {},
): string {
  const url = new URL(assetUrl(preview));
  if (options.width) url.searchParams.set('w', String(options.width));
  if (options.height) url.searchParams.set('h', String(options.height));
  url.searchParams.set('mode', 'crop');
  return url.toString();
}
