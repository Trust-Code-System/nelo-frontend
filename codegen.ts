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
    './src/lib/vendure/generated/graphql.ts': {
      // typed-document-node rather than the client preset: operations live in .graphql
      // files and are executed by one server-side fetch transport, not React hooks.
      //
      // The `typescript` plugin is deliberately NOT included. typescript-operations is
      // self-contained — adding both emits every input type and enum twice, which does
      // not fail codegen but does fail tsc with duplicate-identifier errors.
      plugins: ['typescript-operations', 'typed-document-node'],
      config: {
        useTypeImports: true,
        // IDs are opaque strings. Money is integer minor units. Dates stay ISO strings
        // at the transport boundary.
        scalars: {
          ID: 'string',
          Money: 'number',
          DateTime: 'string',
          JSON: 'unknown',
          DecimalMillimetres: 'string',
        },
        skipTypename: false,
      },
    },
  },
};

export default config;
