/**
 * Charset detection (spec, section 6).
 *
 * feedsmith takes a string and does not sniff encodings, so the bytes have to
 * be decoded before they reach it. A latin-1 feed decoded as UTF-8 turns every
 * accent into U+FFFD, which is the single most common way a Brazilian feed
 * arrives looking broken.
 *
 * Order: the HTTP `Content-Type` header, then the XML prologue, then UTF-8.
 */

export const DEFAULT_CHARSET = 'utf-8'

/** `text/xml; charset=ISO-8859-1` → `iso-8859-1`. */
export function charsetFromContentType(contentType: string | null | undefined): string | null {
  if (!contentType) return null
  const match = /charset\s*=\s*"?([\w-]+)"?/i.exec(contentType)
  return match?.[1]?.toLowerCase() ?? null
}

/**
 * `<?xml version="1.0" encoding="ISO-8859-1"?>` → `iso-8859-1`.
 *
 * Only the first bytes are inspected, and as latin-1, because the prologue is
 * ASCII in every encoding this matters for.
 */
export function charsetFromXmlProlog(bytes: Uint8Array): string | null {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 200))
  const match = /<\?xml[^>]*encoding\s*=\s*["']([\w-]+)["']/i.exec(head)
  return match?.[1]?.toLowerCase() ?? null
}

/** The charset to decode with, and where the answer came from. */
export interface DetectedCharset {
  charset: string
  source: 'header' | 'prolog' | 'default'
}

export function detectCharset(bytes: Uint8Array, contentType?: string | null): DetectedCharset {
  const fromHeader = charsetFromContentType(contentType)
  if (fromHeader && isSupportedCharset(fromHeader)) return { charset: fromHeader, source: 'header' }

  const fromProlog = charsetFromXmlProlog(bytes)
  if (fromProlog && isSupportedCharset(fromProlog)) return { charset: fromProlog, source: 'prolog' }

  return { charset: DEFAULT_CHARSET, source: 'default' }
}

/** Whether this Node build has a decoder for the label. */
export function isSupportedCharset(charset: string): boolean {
  try {
    new TextDecoder(charset)
    return true
  } catch {
    return false
  }
}

/**
 * Decodes feed bytes into text, using the declared charset and falling back to
 * UTF-8 rather than throwing on a label Node does not know.
 */
export function decodeFeedBytes(bytes: Uint8Array, contentType?: string | null): string {
  const { charset } = detectCharset(bytes, contentType)
  try {
    return new TextDecoder(charset).decode(bytes)
  } catch {
    return new TextDecoder(DEFAULT_CHARSET).decode(bytes)
  }
}
