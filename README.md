# truetype2bdf

`truetype2bdf` is a TypeScript library that converts standard font files (TTF, OTF, WOFF) into BDF bitmap font format. This package is ideal for developers integrating custom fonts into embedded systems using libraries like U8g2.

Works with [opentype.js](https://github.com/opentypejs/opentype.js)

## Features

- **Font Parsing**: Supports TrueType Fonts (TTF), OpenType Fonts (OTF), and Web Open Font Format (WOFF).
- **Glyph Selection**: Automatically extracts basic ASCII glyphs (character codes 32 to 126).
- **Font Conversion**: Rasterizes vector glyphs into monochrome bitmaps suitable for BDF consumers.
- **Customization**: Allows specification of desired pixel height for font scaling.
- **Output Formats**: Generates output as a `FontPack`, BDF file (`.bdf`), or as a string.
- **Browser Compatibility**: Designed for use as an ES module in browsers.

## Installation

```bash
npm install truetype2bdf
```

## Usage

```js
import {truetype2bdf} from 'truetype2bdf';

async function convertFont(file, pixelHeight) {
    try {
        const output = await truetype2bdf(file, pixelHeight, 'string');
        console.log('Conversion successful:', output);
    } catch (error) {
        console.error('Conversion failed:', error);
    }
}
```

## API

### `truetype2bdf(inputFile, pixelHeight?, format?)`

Converts a font file into a BDF bitmap font.

#### Parameters

- `inputFile` (File): The input font file (TTF, OTF, or WOFF format)
- `pixelHeight` (number, optional): Desired font height in pixels. Defaults to 12.
- `format` ('file' | 'string' | undefined, optional): Output format
    - `'file'`: Returns a File object containing the BDF file
    - `'string'`: Returns the raw BDF content as a string
    - `undefined`: Returns a FontPack object (default)

#### Returns

Promise that resolves to one of:

- `FontPack`: Internal font representation (when format is undefined)
- `string`: BDF file content (when format is 'string')
- `File`: BDF file object (when format is 'file')

## Supported Font Formats

Only fixed width fonts (no proper variable fonts support yet).

- TrueType (.ttf)
- OpenType (.otf)
- WOFF (.woff)

## Compatibility

The generated BDF files are compatible with:

- U8g2
- Many other libraries that accept BDF fonts

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
