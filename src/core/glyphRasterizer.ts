import * as opentype from 'opentype.js';

export type BDFGlyph = {
    code: number;
    char: string;
    name: string;
    bitmap: number[];
    width: number;
    height: number;
    xOffset: number;
    yOffset: number;
    xAdvance: number;
    sWidth: number;
};

export type FontMeta = {
    name: string;
    subfamily: string;
    copyright: string;
    postscriptName: string;
    pointSize: number;
    resolution: number;
    ascent: number;
    descent: number;
    unitsPerEm: number;
};

export type FontPack = {
    meta: FontMeta;
    glyphs: Map<number, BDFGlyph>;
};

function getLocalizedName(name: Record<string, string> | undefined): string {
    if (!name) return '';
    return name['en'] || Object.values(name)[0] || '';
}

export async function loadFont(file: File): Promise<opentype.Font> {
    const arrayBuffer = await file.arrayBuffer();
    return opentype.parse(arrayBuffer);
}

export function extractAndRasterizeGlyphs(
    font: opentype.Font,
    pixelHeight: number,
    resolution: number,
    start: number,
    end: number,
): Map<number, BDFGlyph> {
    const result = new Map<number, BDFGlyph>();
    const scale = pixelHeight / font.unitsPerEm;
    const fontAscender = font.ascender;
    const fontDescender = font.descender;
    const renderHeight = Math.ceil((fontAscender - fontDescender) * scale);
    const baselineY = Math.round(fontAscender * scale);

    for (let code = start; code <= end; code++) {
        const glyph = font.charToGlyph(String.fromCharCode(code));

        // .notdef means the character is not in the font
        if (!glyph || glyph.index === 0) continue;

        const advanceWidth = Math.max(0, Math.round((glyph.advanceWidth ?? 0) * scale));
        // SWIDTH = deviceWidth * 72000 / (resolution * pointSize), per BDF spec
        const sWidth = advanceWidth > 0 ? Math.round((advanceWidth * 72000) / (resolution * pixelHeight)) : 0;

        if (advanceWidth === 0) {
            result.set(code, emptyGlyph(code, glyph, sWidth));
            continue;
        }

        const canvas = document.createElement('canvas');
        canvas.width = advanceWidth;
        canvas.height = renderHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0, 0, advanceWidth, renderHeight);
        ctx.fillStyle = 'black';
        glyph.getPath(0, baselineY, pixelHeight).draw(ctx);

        const imageData = ctx.getImageData(0, 0, advanceWidth, renderHeight);
        const pixels: boolean[] = new Array(advanceWidth * renderHeight).fill(false);
        for (let i = 0; i < advanceWidth * renderHeight; i++) {
            pixels[i] = imageData.data[i * 4 + 3] > 127;
        }

        let minX = advanceWidth,
            maxX = -1,
            minY = renderHeight,
            maxY = -1;
        for (let y = 0; y < renderHeight; y++) {
            for (let x = 0; x < advanceWidth; x++) {
                if (pixels[y * advanceWidth + x]) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (maxX < 0) {
            // Glyph has no pixels (e.g. space) — emit with advance width but zero bbox
            result.set(code, emptyGlyph(code, glyph, sWidth, advanceWidth));
            continue;
        }

        const trimmedWidth = maxX - minX + 1;
        const trimmedHeight = maxY - minY + 1;
        const bytesPerRow = Math.ceil(trimmedWidth / 8);
        const bitmap: number[] = new Array(bytesPerRow * trimmedHeight).fill(0);

        for (let y = 0; y < trimmedHeight; y++) {
            for (let x = 0; x < trimmedWidth; x++) {
                if (pixels[(y + minY) * advanceWidth + (x + minX)]) {
                    bitmap[y * bytesPerRow + Math.floor(x / 8)] |= 0x80 >> (x % 8);
                }
            }
        }

        // xOffset: horizontal offset from pen origin to left edge of bitmap
        const xOffset = minX;
        // yOffset: vertical offset from baseline to bottom of bitmap (BDF: positive = above baseline)
        const yOffset = baselineY - maxY - 1;

        result.set(code, {
            code,
            char: String.fromCharCode(code),
            name:
                (glyph.name ?? getLocalizedName((font.names as any).postScriptName)) ||
                code.toString(16).padStart(4, '0'),
            bitmap,
            width: trimmedWidth,
            height: trimmedHeight,
            xOffset,
            yOffset,
            xAdvance: advanceWidth,
            sWidth,
        });
    }

    return result;
}

function emptyGlyph(code: number, glyph: opentype.Glyph, sWidth: number, xAdvance = 0): BDFGlyph {
    return {
        code,
        char: String.fromCharCode(code),
        name: glyph.name ?? code.toString(16).padStart(4, '0'),
        bitmap: [],
        width: 0,
        height: 0,
        xOffset: 0,
        yOffset: 0,
        xAdvance,
        sWidth,
    };
}
