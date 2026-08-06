import {describe, it, expect, vi, beforeAll} from 'vitest';
import {readFileSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
import {truetype2bdf} from './index';
import type {FontPack} from './core/glyphRasterizer';

// jsdom canvas stub: getContext('2d') returns transparent ImageData so all
// glyphs are treated as empty (advance-width preserved, bitmap zeroed).
// This lets us test the full pipeline without browser rendering.
const mockCtx = {
    clearRect: vi.fn(),
    get fillStyle() {
        return '';
    },
    set fillStyle(_: string) {},
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4), // all transparent
    }),
};

beforeAll(() => {
    // jsdom 26 does not implement Blob.prototype.arrayBuffer / text; polyfill via FileReader
    if (!Blob.prototype.arrayBuffer) {
        Blob.prototype.arrayBuffer = function (this: Blob): Promise<ArrayBuffer> {
            return new Promise<ArrayBuffer>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as ArrayBuffer);
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(this);
            });
        };
    }
    if (!Blob.prototype.text) {
        Blob.prototype.text = function (this: Blob): Promise<string> {
            return this.arrayBuffer().then((buf) => new TextDecoder().decode(buf));
        };
    }

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: (type: string) => (type === '2d' ? mockCtx : null),
        writable: true,
        configurable: true,
    });
});

function makeRobotoFile(): File {
    const fontPath = join(__dirname, 'fixtures/Roboto.ttf');
    const buf = readFileSync(fontPath);
    return new File([buf], 'Roboto.ttf', {type: 'font/ttf'});
}

describe('truetype2bdf with Roboto.ttf', () => {
    it('returns a FontPack with meta and glyphs by default', async () => {
        const result = await truetype2bdf(makeRobotoFile(), 12);
        expect(result).toHaveProperty('meta');
        expect(result).toHaveProperty('glyphs');
    });

    it('extracts Roboto as the font family name', async () => {
        const result = (await truetype2bdf(makeRobotoFile(), 12)) as FontPack;
        expect(result.meta.name).toMatch(/Roboto/i);
    });

    it('sets correct pointSize in meta', async () => {
        const result = (await truetype2bdf(makeRobotoFile(), 16)) as FontPack;
        expect(result.meta.pointSize).toBe(16);
    });

    it('has positive ascent and descent', async () => {
        const result = (await truetype2bdf(makeRobotoFile(), 12)) as FontPack;
        expect(result.meta.ascent).toBeGreaterThan(0);
        expect(result.meta.descent).toBeGreaterThan(0);
    });

    it('includes glyphs for printable ASCII range (32–126)', async () => {
        const result = (await truetype2bdf(makeRobotoFile(), 12)) as FontPack;
        // At minimum, letter 'A' (65) must be present
        expect(result.glyphs.has(65)).toBe(true);
        expect(result.glyphs.size).toBeGreaterThan(0);
    });

    it('returns valid BDF string via "string" format', async () => {
        const content = (await truetype2bdf(makeRobotoFile(), 12, 'string')) as string;
        expect(content).toMatch(/^STARTFONT 2\.1/);
        expect(content).toContain('FONT_ASCENT');
        expect(content).toContain('FONT_DESCENT');
        expect(content).toContain('CHARS ');
        expect(content.trimEnd()).toMatch(/ENDFONT$/);
    });

    it('BDF string contains Roboto in FAMILY_NAME property', async () => {
        const content = (await truetype2bdf(makeRobotoFile(), 12, 'string')) as string;
        expect(content).toMatch(/FAMILY_NAME "Roboto/i);
    });

    it('BDF string has correct PIXEL_SIZE when using pixelHeight=16', async () => {
        const content = (await truetype2bdf(makeRobotoFile(), 16, 'string')) as string;
        expect(content).toContain('PIXEL_SIZE 16');
        expect(content).toContain('POINT_SIZE 160');
    });

    it('returns a File object with .bdf extension via "file" format', async () => {
        const result = (await truetype2bdf(makeRobotoFile(), 12, 'file')) as File;
        expect(result).toBeInstanceOf(File);
        expect(result.name).toMatch(/Roboto.*\.bdf$/i);
    });

    it('BDF file contains readable text content', async () => {
        const file = (await truetype2bdf(makeRobotoFile(), 12, 'file')) as File;
        const text = await file.text();
        expect(text).toMatch(/^STARTFONT 2\.1/);
        expect(text.trimEnd()).toMatch(/ENDFONT$/);
    });
});
