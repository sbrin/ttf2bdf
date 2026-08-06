import {describe, it, expect} from 'vitest';
import {createBDFFont} from './createBDFFont';
import type {FontPack} from '../core/glyphRasterizer';

function makeMeta(overrides?: Partial<FontPack['meta']>): FontPack['meta'] {
    return {
        name: 'Test Font',
        subfamily: 'Regular',
        copyright: 'Copyright 2024',
        postscriptName: 'TestFont-Regular',
        pointSize: 12,
        resolution: 72,
        ascent: 10,
        descent: 2,
        unitsPerEm: 1000,
        ...overrides,
    };
}

function makeGlyph(code: number, overrides?: Partial<FontPack['glyphs'] extends Map<number, infer V> ? V : never>) {
    return {
        code,
        char: String.fromCharCode(code),
        name: String.fromCharCode(code),
        bitmap: [],
        width: 0,
        height: 0,
        xOffset: 0,
        yOffset: 0,
        xAdvance: 7,
        sWidth: 875,
        ...overrides,
    };
}

describe('createBDFFont', () => {
    describe('file naming', () => {
        it('replaces spaces with underscores and appends point size', () => {
            const {name} = createBDFFont({meta: makeMeta({name: 'My Font', pointSize: 16}), glyphs: new Map()});
            expect(name).toBe('My_Font_16');
        });

        it('uses font name without spaces when no spaces present', () => {
            const {name} = createBDFFont({meta: makeMeta({name: 'Roboto', pointSize: 12}), glyphs: new Map()});
            expect(name).toBe('Roboto_12');
        });
    });

    describe('BDF structure', () => {
        it('starts with STARTFONT 2.1', () => {
            const {content} = createBDFFont({meta: makeMeta(), glyphs: new Map()});
            expect(content).toMatch(/^STARTFONT 2\.1/);
        });

        it('ends with ENDFONT', () => {
            const {content} = createBDFFont({meta: makeMeta(), glyphs: new Map()});
            expect(content.trimEnd()).toMatch(/ENDFONT$/);
        });

        it('has exactly 19 properties in STARTPROPERTIES block', () => {
            const {content} = createBDFFont({meta: makeMeta(), glyphs: new Map()});
            expect(content).toContain('STARTPROPERTIES 19');
            const lines = content.split('\n');
            const start = lines.indexOf('STARTPROPERTIES 19');
            const end = lines.indexOf('ENDPROPERTIES');
            expect(end - start - 1).toBe(19);
        });

        it('outputs SIZE with pointSize and resolution', () => {
            const {content} = createBDFFont({meta: makeMeta({pointSize: 12, resolution: 72}), glyphs: new Map()});
            expect(content).toContain('SIZE 12 72 72');
        });
    });

    describe('XLFD name generation', () => {
        it('generates Regular → Medium-R', () => {
            const {content} = createBDFFont({
                meta: makeMeta({name: 'My Font', subfamily: 'Regular', pointSize: 12, resolution: 72}),
                glyphs: new Map(),
            });
            const fontLine = content.split('\n').find((l) => l.startsWith('FONT '))!;
            expect(fontLine).toContain('-FreeType-My Font-Medium-R-Normal--12-120-72-72-P-0-ISO10646-1');
        });

        it('generates Bold → Bold weight', () => {
            const {content} = createBDFFont({meta: makeMeta({subfamily: 'Bold'}), glyphs: new Map()});
            const fontLine = content.split('\n').find((l) => l.startsWith('FONT '))!;
            expect(fontLine).toContain('-Bold-R-');
        });

        it('generates Italic → I slant', () => {
            const {content} = createBDFFont({meta: makeMeta({subfamily: 'Italic'}), glyphs: new Map()});
            const fontLine = content.split('\n').find((l) => l.startsWith('FONT '))!;
            expect(fontLine).toContain('-Medium-I-');
        });

        it('generates Bold Italic → Bold-I', () => {
            const {content} = createBDFFont({meta: makeMeta({subfamily: 'Bold Italic'}), glyphs: new Map()});
            const fontLine = content.split('\n').find((l) => l.startsWith('FONT '))!;
            expect(fontLine).toContain('-Bold-I-');
        });

        it('replaces dashes in font name with spaces in XLFD', () => {
            const {content} = createBDFFont({meta: makeMeta({name: 'Inter-Display'}), glyphs: new Map()});
            const fontLine = content.split('\n').find((l) => l.startsWith('FONT '))!;
            expect(fontLine).toContain('-FreeType-Inter Display-');
        });
    });

    describe('font properties', () => {
        it('outputs FONT_ASCENT and FONT_DESCENT from meta', () => {
            const {content} = createBDFFont({meta: makeMeta({ascent: 10, descent: 2}), glyphs: new Map()});
            expect(content).toContain('FONT_ASCENT 10');
            expect(content).toContain('FONT_DESCENT 2');
        });

        it('outputs WEIGHT_NAME and SLANT properties', () => {
            const {content} = createBDFFont({meta: makeMeta({subfamily: 'Bold Italic'}), glyphs: new Map()});
            expect(content).toContain('WEIGHT_NAME "Bold"');
            expect(content).toContain('SLANT "I"');
        });

        it('outputs PIXEL_SIZE and POINT_SIZE (×10)', () => {
            const {content} = createBDFFont({meta: makeMeta({pointSize: 14}), glyphs: new Map()});
            expect(content).toContain('PIXEL_SIZE 14');
            expect(content).toContain('POINT_SIZE 140');
        });

        it('outputs RESOLUTION_X and RESOLUTION_Y', () => {
            const {content} = createBDFFont({meta: makeMeta({resolution: 96}), glyphs: new Map()});
            expect(content).toContain('RESOLUTION_X 96');
            expect(content).toContain('RESOLUTION_Y 96');
        });

        it('outputs FAMILY_NAME quoted', () => {
            const {content} = createBDFFont({meta: makeMeta({name: 'Roboto'}), glyphs: new Map()});
            expect(content).toContain('FAMILY_NAME "Roboto"');
        });
    });

    describe('CHARS and glyph count', () => {
        it('outputs CHARS 0 for empty font', () => {
            const {content} = createBDFFont({meta: makeMeta(), glyphs: new Map()});
            expect(content).toContain('CHARS 0');
        });

        it('outputs correct CHARS count for multiple glyphs', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            for (let i = 32; i <= 36; i++) glyphs.set(i, makeGlyph(i));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            expect(content).toContain('CHARS 5');
        });
    });

    describe('average width', () => {
        it('is 0 for empty font', () => {
            const {content} = createBDFFont({meta: makeMeta(), glyphs: new Map()});
            expect(content).toContain('AVERAGE_WIDTH 0');
        });

        it('is in 1/10 pixel units (advance × 10)', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65, {xAdvance: 10}));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            expect(content).toContain('AVERAGE_WIDTH 100');
        });

        it('averages across multiple glyphs', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65, {xAdvance: 8}));
            glyphs.set(66, makeGlyph(66, {xAdvance: 12}));
            // avg = (8 + 12) / 2 * 10 = 100
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            expect(content).toContain('AVERAGE_WIDTH 100');
        });
    });

    describe('font bounding box', () => {
        it('is 0 0 0 0 for empty font', () => {
            const {content} = createBDFFont({meta: makeMeta(), glyphs: new Map()});
            expect(content).toContain('FONTBOUNDINGBOX 0 0 0 0');
        });

        it('is 0 0 0 0 when all glyphs have zero width', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(32, makeGlyph(32, {width: 0, height: 0}));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            expect(content).toContain('FONTBOUNDINGBOX 0 0 0 0');
        });

        it('computes correctly across multiple glyphs', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            // Glyph A: xOffset=0, width=8, yOffset=1, height=2 → right=8, top=3, bottom=0
            glyphs.set(65, makeGlyph(65, {width: 8, height: 2, xOffset: 0, yOffset: 1}));
            // Glyph B: xOffset=-1, width=6, yOffset=-2, height=5 → right=5, top=3, bottom=2
            glyphs.set(66, makeGlyph(66, {width: 6, height: 5, xOffset: -1, yOffset: -2}));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            // minLB=-1, maxRB=8, maxAS=3, maxDS=2 → 9 5 -1 -2
            expect(content).toContain('FONTBOUNDINGBOX 9 5 -1 -2');
        });
    });

    describe('per-glyph fields', () => {
        it('outputs STARTCHAR with glyph name', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65, {name: 'A'}));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            expect(content).toContain('STARTCHAR A');
        });

        it('falls back to U+ name when glyph name is empty', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65, {name: ''}));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            expect(content).toContain('STARTCHAR U+0041');
        });

        it('outputs ENCODING with character code', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            expect(content).toContain('ENCODING 65');
        });

        it('outputs SWIDTH', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65, {sWidth: 875}));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            expect(content).toContain('SWIDTH 875 0');
        });

        it('outputs DWIDTH with advance width', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65, {xAdvance: 7}));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            expect(content).toContain('DWIDTH 7 0');
        });

        it('outputs BBX with width height xOffset yOffset', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65, {width: 5, height: 3, xOffset: 1, yOffset: -1}));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            expect(content).toContain('BBX 5 3 1 -1');
        });

        it('outputs ENDCHAR after each glyph', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            expect(content).toContain('ENDCHAR');
        });
    });

    describe('bitmap encoding', () => {
        it('outputs empty BITMAP block for zero-dimension glyph', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65, {bitmap: [], width: 0, height: 0}));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            const lines = content.split('\n');
            const bitmapIdx = lines.indexOf('BITMAP');
            expect(lines[bitmapIdx + 1]).toBe('ENDCHAR');
        });

        it('encodes 5-pixel-wide 3-row bitmap as MSB-first hex', () => {
            // Row 0: 11111 → 0b11111000 = 0xF8 (5 bits MSB-first in 1 byte)
            // Row 1: 10000 → 0b10000000 = 0x80
            // Row 2: 11111 → 0b11111000 = 0xF8
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65, {bitmap: [0xf8, 0x80, 0xf8], width: 5, height: 3, xOffset: 0, yOffset: 0}));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            const lines = content.split('\n');
            const bitmapIdx = lines.indexOf('BITMAP');
            expect(lines[bitmapIdx + 1]).toBe('F8');
            expect(lines[bitmapIdx + 2]).toBe('80');
            expect(lines[bitmapIdx + 3]).toBe('F8');
        });

        it('encodes 9-pixel-wide glyph as 2 bytes per row', () => {
            // Width=9 → 2 bytes per row (ceil(9/8)=2)
            // Row: 111111111 → 0xFF 0x80
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65, {bitmap: [0xff, 0x80], width: 9, height: 1, xOffset: 0, yOffset: 0}));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            const lines = content.split('\n');
            const bitmapIdx = lines.indexOf('BITMAP');
            expect(lines[bitmapIdx + 1]).toBe('FF80');
        });

        it('outputs hex in uppercase', () => {
            const glyphs: FontPack['glyphs'] = new Map();
            glyphs.set(65, makeGlyph(65, {bitmap: [0xab], width: 8, height: 1, xOffset: 0, yOffset: 0}));
            const {content} = createBDFFont({meta: makeMeta(), glyphs});
            const lines = content.split('\n');
            const bitmapIdx = lines.indexOf('BITMAP');
            expect(lines[bitmapIdx + 1]).toBe('AB');
        });
    });
});
