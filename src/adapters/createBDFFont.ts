import {FontPack} from '../core/glyphRasterizer';

function makeXLFDName(
    name: string,
    subfamily: string,
    pointSize: number,
    resolution: number,
    avgWidth: number,
): string {
    const sub = subfamily.toLowerCase();
    const weight = sub.includes('bold') ? 'Bold' : 'Medium';
    const slant = sub.includes('italic') || sub.includes('oblique') ? 'I' : 'R';
    const safeName = name.replace(/-/g, ' ');
    const pixelSize = pointSize;
    const pointSizeDeci = pointSize * 10;
    return `-FreeType-${safeName}-${weight}-${slant}-Normal--${pixelSize}-${pointSizeDeci}-${resolution}-${resolution}-P-${avgWidth}-ISO10646-1`;
}

export function createBDFFont(fontPack: FontPack): {name: string; content: string} {
    const {meta, glyphs} = fontPack;
    const glyphList = Array.from(glyphs.values());

    let totalWidth = 0;
    for (const g of glyphList) totalWidth += g.xAdvance;
    // BDF average width is in 1/10 pixel units
    const avgWidth = glyphList.length > 0 ? Math.round((totalWidth / glyphList.length) * 10) : 0;

    // Compute font bounding box across all glyphs
    let minLB = 0,
        maxRB = 0,
        maxAS = 0,
        maxDS = 0;
    for (const g of glyphList) {
        if (g.width === 0) continue;
        if (g.xOffset < minLB) minLB = g.xOffset;
        if (g.xOffset + g.width > maxRB) maxRB = g.xOffset + g.width;
        // yOffset is bottom of glyph; top = yOffset + height
        if (g.yOffset + g.height > maxAS) maxAS = g.yOffset + g.height;
        // descent: how far below baseline the bottom goes (positive value)
        if (-g.yOffset > maxDS) maxDS = -g.yOffset;
    }

    const xlfd = makeXLFDName(meta.name, meta.subfamily, meta.pointSize, meta.resolution, avgWidth);
    const lines: string[] = [];

    lines.push('STARTFONT 2.1');
    lines.push('COMMENT');
    lines.push(`COMMENT Converted from TrueType font "${meta.name}" by truetype2bdf.`);
    lines.push('COMMENT');
    lines.push(`FONT ${xlfd}`);
    lines.push(`SIZE ${meta.pointSize} ${meta.resolution} ${meta.resolution}`);
    lines.push(`FONTBOUNDINGBOX ${maxRB - minLB} ${maxAS + maxDS} ${minLB} ${-maxDS}`);

    const sub = meta.subfamily.toLowerCase();
    const weight = sub.includes('bold') ? 'Bold' : 'Medium';
    const slant = sub.includes('italic') || sub.includes('oblique') ? 'I' : 'R';

    lines.push('STARTPROPERTIES 19');
    lines.push('FOUNDRY "FreeType"');
    lines.push(`FAMILY_NAME "${meta.name}"`);
    lines.push(`WEIGHT_NAME "${weight}"`);
    lines.push(`SLANT "${slant}"`);
    lines.push('SETWIDTH_NAME "Normal"');
    lines.push('ADD_STYLE_NAME ""');
    lines.push(`PIXEL_SIZE ${meta.pointSize}`);
    lines.push(`POINT_SIZE ${meta.pointSize * 10}`);
    lines.push(`RESOLUTION_X ${meta.resolution}`);
    lines.push(`RESOLUTION_Y ${meta.resolution}`);
    lines.push('SPACING "P"');
    lines.push(`AVERAGE_WIDTH ${avgWidth}`);
    lines.push('CHARSET_REGISTRY "ISO10646"');
    lines.push('CHARSET_ENCODING "1"');
    lines.push(`FONT_ASCENT ${meta.ascent}`);
    lines.push(`FONT_DESCENT ${meta.descent}`);
    lines.push(`COPYRIGHT "${meta.copyright}"`);
    lines.push(`_OTF_FONTFILE "${meta.name}"`);
    lines.push(`_OTF_PSNAME "${meta.postscriptName}"`);
    lines.push('ENDPROPERTIES');

    lines.push(`CHARS ${glyphList.length}`);

    for (const glyph of glyphList) {
        const charName = glyph.name || `U+${glyph.code.toString(16).toUpperCase().padStart(4, '0')}`;
        lines.push(`STARTCHAR ${charName}`);
        lines.push(`ENCODING ${glyph.code}`);
        lines.push(`SWIDTH ${glyph.sWidth} 0`);
        lines.push(`DWIDTH ${glyph.xAdvance} 0`);
        lines.push(`BBX ${glyph.width} ${glyph.height} ${glyph.xOffset} ${glyph.yOffset}`);
        lines.push('BITMAP');

        if (glyph.bitmap.length > 0) {
            const bytesPerRow = Math.ceil(glyph.width / 8);
            for (let row = 0; row < glyph.height; row++) {
                let hex = '';
                for (let b = 0; b < bytesPerRow; b++) {
                    hex += glyph.bitmap[row * bytesPerRow + b].toString(16).padStart(2, '0').toUpperCase();
                }
                lines.push(hex);
            }
        }

        lines.push('ENDCHAR');
    }

    lines.push('ENDFONT');

    const safeName = meta.name.replace(/\s+/g, '_') + '_' + meta.pointSize;
    return {name: safeName, content: lines.join('\n') + '\n'};
}
