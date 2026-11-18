import {createBDFFont} from './createBDFFont';
import {BDFGlyph, FontPack} from '../core/glyphRasterizer';
import {DEFAULT_RESOLUTION} from '../const';

const BITMAP_REGEX = /(?:uint8_t|unsigned\s+char)\s+(?:PROGMEM\s+)?\w+\s*\[\s*\]\s*(?:PROGMEM\s*)?=\s*\{([^}]*)\}/;
const GLYPHS_REGEX = /GFXglyph\s+(?:PROGMEM\s+)?\w+\s*\[\s*\]\s*(?:PROGMEM\s*)?=\s*\{([\s\S]*?)\}\s*;/;
const FONT_REGEX = /GFXfont\s+(?:PROGMEM\s+)?(\w+)\s*(?:PROGMEM\s*)?=\s*\{([^}]*)\}/;

function toNumber(value: string): number {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : 0;
}

/** The pixels of a GFX glyph (one after another, MSB first) as BDF rows padded to whole bytes. */
function toBdfRows(bitmap: number[], offset: number, width: number, height: number): number[] {
    const bytesPerRow = Math.ceil(width / 8);
    const rows = new Array<number>(bytesPerRow * height).fill(0);
    for (let n = 0; n < width * height; n++) {
        const bit = ((bitmap[offset + (n >> 3)] ?? 0) >> (7 - (n & 7))) & 1;
        if (!bit) continue;
        const x = n % width;
        const y = Math.floor(n / width);
        rows[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
    }
    return rows;
}

/**
 * Converts an Adafruit_GFX font header (the `.h` file of fontconvert) to a BDF font.
 *
 * Every glyph keeps its position: the BBX x offset is the GFX `xOffset` and the BBX y offset is
 * the bottom of the glyph box, `-(yOffset + height)`. Empty entries (no pixels and no advance)
 * are codes without a glyph and are not written. FONT_ASCENT and FONT_DESCENT are the highest
 * and the lowest pixel of the glyphs.
 *
 * @param gfxText - The text of the header file.
 * @param name - The font name in the BDF file. Defaults to the C name of the `GFXfont`.
 */
export function gfxToBdf(gfxText: string, name?: string): {name: string; content: string} {
    const source = gfxText.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    const bitmapMatch = BITMAP_REGEX.exec(source);
    const glyphsMatch = GLYPHS_REGEX.exec(source);
    const fontMatch = FONT_REGEX.exec(source);
    if (!bitmapMatch || !glyphsMatch || !fontMatch) {
        throw new Error(
            'The file is not an Adafruit GFX font: it needs a bitmap array, a GFXglyph table and a GFXfont.',
        );
    }
    const bitmap = bitmapMatch[1]
        .split(',')
        .filter((value) => value.trim())
        .map(toNumber);
    const entries = [...glyphsMatch[1].matchAll(/\{([^{}]*)\}/g)].map((match) => match[1].split(',').map(toNumber));
    const fontFields = fontMatch[2].split(',');
    const first = toNumber(fontFields[2] ?? '0');
    const last = toNumber(fontFields[3] ?? String(first + entries.length - 1));
    const yAdvance = toNumber(fontFields[4] ?? '0');

    const glyphs = new Map<number, BDFGlyph>();
    entries
        .slice(0, last - first + 1)
        .forEach(([offset = 0, width = 0, height = 0, advance = 0, xOffset = 0, yOffset = 0], index) => {
            const code = first + index;
            if (!width && !height && !advance) return;
            const inked = width > 0 && height > 0;
            glyphs.set(code, {
                code,
                char: String.fromCodePoint(code),
                name: '',
                bitmap: inked ? toBdfRows(bitmap, offset, width, height) : [],
                width: inked ? width : 0,
                height: inked ? height : 0,
                xOffset: inked ? xOffset : 0,
                // GFX measures yOffset from the baseline to the top of the box, y down; BDF the bottom, y up.
                yOffset: inked ? -(yOffset + height) : 0,
                xAdvance: advance,
                sWidth: 0,
            });
        });
    if (!glyphs.size) {
        throw new Error('The Adafruit GFX font has no glyphs.');
    }

    const inked = [...glyphs.values()].filter((glyph) => glyph.height > 0);
    const inkAscent = Math.max(0, ...inked.map((glyph) => glyph.yOffset + glyph.height));
    const descent = Math.max(0, ...inked.map((glyph) => -glyph.yOffset));
    // The line height of the font is its yAdvance; the space above the highest glyph is part of it.
    const ascent = Math.max(inkAscent, yAdvance - descent);
    const pixelSize = Math.max(1, ascent + descent);
    for (const glyph of glyphs.values()) glyph.sWidth = Math.round((glyph.xAdvance * 1000) / pixelSize);

    const fontName = name?.trim() || fontMatch[1];
    const fontPack: FontPack = {
        meta: {
            name: fontName,
            subfamily: 'Regular',
            copyright: '',
            postscriptName: '',
            pointSize: pixelSize,
            resolution: DEFAULT_RESOLUTION,
            ascent,
            descent,
            unitsPerEm: 0,
            sourceFormat: 'Adafruit GFX',
            foundry: 'Misc',
        },
        glyphs,
    };
    return {name: fontName, content: createBDFFont(fontPack).content};
}
