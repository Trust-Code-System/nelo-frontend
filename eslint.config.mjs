import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

// Next 16 removed `next lint` and ships flat configs directly — no FlatCompat shim needed.
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'design/**', 'src/lib/vendure/generated/**'] },
  ...coreWebVitals,
  ...typescript,
];

export default config;
