import {describe, expect, it} from 'vitest';
import {gfxToBdf} from './gfxToBdf';

// A header in the style of Adafruit fontconvert: 'A' (3×4, 2 pixels below the baseline),
// no glyph for 'B' and a blank 'C' with an advance.
const HEADER = `
/* Tiny font */
const uint8_t TinyBitmaps[] PROGMEM = {
  0xF7, 0xC0 };

const GFXglyph TinyGlyphs[] PROGMEM = {
  {     0,   3,   4,   6,    1,   -2 },   // 0x41 'A'
  {     2,   0,   0,   0,    0,    0 },   // 0x42 'B'
  {     2,   0,   0,   4,    0,    1 } }; // 0x43 'C'

const GFXfont Tiny PROGMEM = {
  (uint8_t  *)TinyBitmaps,
  (GFXglyph *)TinyGlyphs,
  0x41, 0x43, 12 };
`;

/** The lines of a glyph from STARTCHAR to ENDCHAR. */
function glyphLines(bdf: string, code: number): string[] {
    const lines = bdf.split('\n');
    const encoding = lines.indexOf(`ENCODING ${code}`);
    if (encoding < 0) return [];
    return lines.slice(encoding, lines.indexOf('ENDCHAR', encoding));
}

describe('gfxToBdf', () => {
    it('keeps the position and the pixels of every glyph', () => {
        const {content} = gfxToBdf(HEADER);
        expect(glyphLines(content, 0x41)).toEqual([
            'ENCODING 65',
            'SWIDTH 1500 0',
            'DWIDTH 6 0',
            // The box top is 2 pixels above the baseline, so its bottom is 2 pixels below it.
            'BBX 3 4 1 -2',
            'BITMAP',
            'E0',
            'A0',
            'E0',
            '80',
        ]);
    });

    it('skips codes without a glyph and keeps blank glyphs with their advance', () => {
        const {content} = gfxToBdf(HEADER);
        expect(glyphLines(content, 0x42)).toEqual([]);
        expect(glyphLines(content, 0x43)).toEqual([
            'ENCODING 67',
            'SWIDTH 1000 0',
            'DWIDTH 4 0',
            'BBX 0 0 0 0',
            'BITMAP',
        ]);
        expect(content).toContain('CHARS 2');
    });

    it('measures the ascent and the descent from the glyphs', () => {
        const {content} = gfxToBdf(HEADER);
        expect(content).toContain('FONT_ASCENT 2');
        expect(content).toContain('FONT_DESCENT 2');
        expect(content).toContain('SIZE 4 72 72');
    });

    it('names the font after the GFXfont or the given name', () => {
        expect(gfxToBdf(HEADER).name).toBe('Tiny');
        const {name, content} = gfxToBdf(HEADER, 'clock');
        expect(name).toBe('clock');
        expect(content).toContain('FONT -Misc-clock-Medium-R-Normal--4-40-72-72-P-');
        expect(content).toContain('COMMENT Converted from Adafruit GFX font "clock" by truetype2bdf.');
        expect(content).not.toContain('_OTF_');
        expect(content).toContain('STARTPROPERTIES 17');
    });

    it('reads tables with static, decimal bytes and PROGMEM before the name', () => {
        const header = HEADER.replace(
            'const uint8_t TinyBitmaps[] PROGMEM',
            'static const uint8_t PROGMEM TinyBitmaps[]',
        ).replace('0xF7, 0xC0', '247, 192');
        expect(gfxToBdf(header).content).toEqual(gfxToBdf(HEADER).content);
    });

    it('rejects text that is not a GFX font', () => {
        expect(() => gfxToBdf('STARTFONT 2.1')).toThrow(/not an Adafruit GFX font/);
    });
});
