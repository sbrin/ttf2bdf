import {defineConfig} from 'vitest/config';

export default defineConfig({
    test: {
        globals: false,
        environment: 'jsdom',
        environmentOptions: {
            jsdom: {
                resources: 'usable',
            },
        },
        include: ['src/**/*.test.ts'],
    },
});
