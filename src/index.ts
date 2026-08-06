import {loadFont, extractAndRasterizeGlyphs, FontPack, FontMeta} from './core/glyphRasterizer';
import {createBDFFont} from './adapters/createBDFFont';
import {DEFAULT_PIXEL_HEIGHT, DEFAULT_RESOLUTION, ASCII_START, ASCII_END} from './const';

export async function truetype2bdf(
    inputFile: File,
    pixelHeight: number = DEFAULT_PIXEL_HEIGHT,
    format?: 'file' | 'string',
): Promise<FontPack | File | string> {
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
        pointSize: pixelHeight,
        resolution: DEFAULT_RESOLUTION,
        ascent: Math.round((font.ascender * pixelHeight) / font.unitsPerEm),
        descent: Math.abs(Math.round((font.descender * pixelHeight) / font.unitsPerEm)),
        unitsPerEm: font.unitsPerEm,
    };

    const glyphs = extractAndRasterizeGlyphs(font, pixelHeight, DEFAULT_RESOLUTION, ASCII_START, ASCII_END);
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
