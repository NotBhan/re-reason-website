import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Reads the intrinsic pixel size of a published figure.
 *
 * Used to put width and height attributes on the <img>, so the browser reserves
 * the right box before the image arrives and the page does not shift as figures
 * load. Reading the PNG header is exact and costs nothing at runtime; guessing a
 * size would reintroduce the shift it is meant to prevent.
 *
 * PNG layout: 8-byte signature, then the IHDR chunk — 4-byte length, 4-byte
 * type, then width and height as big-endian uint32 at byte offsets 16 and 20.
 */
export function pngSize(file: string): { width: number; height: number } {
  const path = join(process.cwd(), 'public', 'figures', file);
  const header = readFileSync(path).subarray(0, 24);

  const signature = header.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`${file} is not a PNG — figures must not be re-encoded`);
  }

  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}
