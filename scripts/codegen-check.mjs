#!/usr/bin/env node
/**
 * Codegen drift gate.
 *
 * Regenerates types from the Shop API schema and fails if the result differs from what is
 * committed. That is what makes the schema a real contract: a backend change that breaks the
 * storefront fails CI here rather than in production.
 *
 * The schema does not exist yet. Rather than pass silently forever — which would let this
 * gate rot unnoticed — an absent schema is reported loudly as PENDING, with a GitHub warning
 * annotation on every run, and the job still succeeds so the rest of CI is usable.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';

const GENERATED = 'src/lib/vendure/generated';
const source = process.env.VENDURE_SCHEMA ?? './schema/shop-api.graphql';
const isRemote = /^https?:\/\//.test(source);
const onGitHub = Boolean(process.env.GITHUB_ACTIONS);

function notice(message) {
  console.log(onGitHub ? `::warning title=Codegen gate pending::${message}` : `! ${message}`);
}

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
}

if (!isRemote && !existsSync(source)) {
  notice(
    `No Shop API schema at ${source}. The codegen drift gate is NOT running. ` +
      `Add the exported SDL to schema/shop-api.graphql, or set VENDURE_SCHEMA to a reachable ` +
      `/shop-api endpoint, and this gate becomes enforcing with no further change.`,
  );
  console.log('\ncodegen drift: PENDING (no schema available)');
  process.exit(0);
}

console.log(`Generating from ${source} …`);
run('npx', ['graphql-codegen', '--config', 'codegen.ts']);

try {
  // --intent-to-add is required: plain `git diff` ignores untracked files, so a schema
  // change that ADDS a generated file would otherwise slip through the gate unnoticed.
  run('git', ['add', '-A', '--intent-to-add', '--', GENERATED]);
  run('git', ['diff', '--exit-code', '--', GENERATED]);
  console.log('\ncodegen drift: none');
} catch {
  console.error(
    `\ncodegen drift: FAILED\n\n` +
      `${GENERATED} is out of date with the schema.\n` +
      `Run \`npm run codegen\` and commit the result.\n\n` +
      `If you did not expect this, the backend schema changed under you — check with them ` +
      `before regenerating, because a removed field is a breaking change, not a formality.`,
  );
  process.exit(1);
}
