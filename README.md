# truetype2bdf

`truetype2bdf` is a TypeScript library that converts standard font files (TTF, OTF, WOFF) into BDF bitmap font format. This package is ideal for developers integrating custom fonts into embedded systems using libraries like U8g2.

Works with [opentype.js](https://github.com/opentypejs/opentype.js)

## Features

- **Font Parsing**: Supports TrueType Fonts (TTF), OpenType Fonts (OTF), and Web Open Font Format (WOFF).
- **Glyph Selection**: Automatically extracts basic ASCII glyphs (character codes 32 to 126).
- **Font Conversion**: Rasterizes vector glyphs into monochrome bitmaps suitable for BDF consumers.
- **Customization**: Allows specification of desired pixel height for font scaling.
- **Output Formats**: Generates output as a `FontPack`, BDF file (`.bdf`), or as a string.
- **Adafruit GFX Conversion**: Converts an Adafruit_GFX font header (`.h`) to a BDF font (`gfxToBdf`).
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

### `gfxToBdf(gfxText, name?)`

Converts an Adafruit_GFX font header (the `.h` file that `fontconvert` makes) to a BDF font.

```js
import {gfxToBdf} from 'truetype2bdf';

const {name, content} = gfxToBdf(headerText);
// content: the text of a BDF file, for example for U8g2 bdfconv.
```

#### Parameters

- `gfxText` (string): The text of the header file.
- `name` (string, optional): The font name in the BDF file. The default is the C name of the `GFXfont`.

#### Returns

An object with these fields:

- `name` (string): The font name.
- `content` (string): The text of the BDF file.

#### Rules

- Each glyph keeps its position. The BBX x offset is the GFX `xOffset`. The BBX y offset is the bottom of the glyph
  box: `-(yOffset + height)`.
- An entry without pixels and without an advance is a code without a glyph. The BDF file does not include it.
- `FONT_DESCENT` is the lowest pixel of the glyphs. `FONT_ASCENT` + `FONT_DESCENT` is the `yAdvance` of the
  GFX font (its line height). If a glyph is higher than that, `FONT_ASCENT` is the highest pixel of the glyphs.
- The function throws an error if the text does not have a bitmap array, a `GFXglyph` table and a `GFXfont`.

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
