import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';

export default {
    input: 'src/index.ts',
    output: {
        file: 'dist/truetype2bdf.min.js',
        format: 'esm',
        sourcemap: true,
    },
    plugins: [resolve(), typescript({declarationDir: './dist/types', declaration: true}), json(), terser()],
};
