import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function getImageDimensions(buffer: Buffer): Promise<{width: number, height: number} | null> {
  try {
    // Try to use sharp if available
    const sharp = await import('sharp').catch(() => null);
    if (sharp) {
      const metadata = await sharp.default(buffer).metadata();
      if (metadata.width && metadata.height) {
        return { width: metadata.width, height: metadata.height };
      }
    }
    
    // Fallback: basic image header parsing for common formats
    return getImageDimensionsFromBuffer(buffer);
  } catch (error) {
    console.warn('Could not extract image dimensions:', error);
    return null;
  }
}

function getImageDimensionsFromBuffer(buffer: Buffer): {width: number, height: number} | null {
  // PNG format
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }
  
  // JPEG format
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] === 0xFF) {
        const marker = buffer[offset + 1];
        if (marker >= 0xC0 && marker <= 0xC3) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        offset += 2 + buffer.readUInt16BE(offset + 2);
      } else {
        offset++;
      }
    }
  }
  
  // WebP format
  if (buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
      const width = buffer.readUInt16LE(26) & 0x3FFF;
      const height = buffer.readUInt16LE(28) & 0x3FFF;
      return { width, height };
    }
  }
  
  return null;
}
