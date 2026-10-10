import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { navy: '#0B1F3A', primary: '#0A58CA', accent: '#FFB800' }, fontFamily: { sans: ['var(--font-vietnam)', 'sans-serif'] } } }, plugins: [] };
export default config;
