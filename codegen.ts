import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * Generates types from the Vendure SHOP API schema — never the Admin API, and never
 * hand-written equivalents of backend entities.
 *
 * Point VENDURE_SCHEMA at a reachable /shop-api endpoint or an exported SDL file.
 * `npm run codegen:check` is the CI drift gate.
 */
const schema = process.env.VENDURE_SCHEMA ?? './schema/shop-api.graphql';

const config: CodegenConfig = {
  schema,
  documents: ['src/**/*.graphql'],
  ignoreNoDocuments: true,
  generates: {
    './src/lib/vendure/generated/': {
      preset: 'client',
      config: {
        useTypeImports: true,
        // IDs are opaque strings. Money is integer minor units. Dates stay ISO strings
        // at the transport boundary.
        scalars: {
          ID: 'string',
          Money: 'number',
          DateTime: 'string',
          JSON: 'unknown',
        },
        avoidOptionals: { field: true },
      },
    },
  },
};

export default config;
