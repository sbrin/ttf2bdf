import {loadFont, extractAndRasterizeGlyphs, normalizePixelHeight, FontPack, FontMeta} from './core/glyphRasterizer';
import {createBDFFont} from './adapters/createBDFFont';
import {DEFAULT_PIXEL_HEIGHT, DEFAULT_RESOLUTION, ASCII_START, ASCII_END} from './const';

/**
 * Converts a font File into a BDF font.
 *
 * @param inputFile - The input font File (TTF, OTF, WOFF).
 * @param pixelHeight - Desired font height in pixels. Values below 1 pixel, or values
 * that are not a finite number, fall back to a usable height. Defaults to 12.
 * @param format - Output format: 'file' for File object, 'string' for raw content, or undefined for FontPack object.
 */
export async function truetype2bdf(
    inputFile: File,
    pixelHeight: number = DEFAULT_PIXEL_HEIGHT,
    format?: 'file' | 'string',
): Promise<FontPack | File | string> {
    const height = normalizePixelHeight(pixelHeight);
    const font = await loadFont(inputFile);

    const names = font.names as any;
    const get = (field: Record<string, string> | undefined): string => {
        if (!field) return '';
        return field['en'] || Object.values(field)[0] || '';
    };

    const meta: FontMeta = {
        name: get(names.fontFamily) || get(names.fullName) || 'Unknown',
        subfamily: get(names.fontSubfamily) || 'Regular',
        copyright: get(names.copyright) || '',
        postscriptName: get(names.postScriptName) || '',
        pointSize: height,
        resolution: DEFAULT_RESOLUTION,
        ascent: Math.round((font.ascender * height) / font.unitsPerEm),
        descent: Math.abs(Math.round((font.descender * height) / font.unitsPerEm)),
        unitsPerEm: font.unitsPerEm,
    };

    const glyphs = extractAndRasterizeGlyphs(font, height, DEFAULT_RESOLUTION, ASCII_START, ASCII_END);

    // Space and friends are legitimately blank, but a font where nothing at all
    // rasterized would silently yield a valid BDF that draws nothing on the device.
    if (glyphs.size === 0 || ![...glyphs.values()].some((glyph) => glyph.bitmap.length > 0)) {
        throw new Error(`Font conversion produced no visible glyphs at ${height}px.`);
    }

    const fontPack: FontPack = {meta, glyphs};

    switch (format) {
        case 'string':
            return createBDFFont(fontPack).content;
        case 'file': {
            const bdfFont = createBDFFont(fontPack);
            return new File([bdfFont.content], bdfFont.name + '.bdf', {type: 'text/plain'});
        }
        default:
            return fontPack;
    }
}

export {createBDFFont};
export type {FontPack, FontMeta};
