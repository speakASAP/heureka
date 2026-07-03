#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertIncludes(text, expected, label) {
  assert.ok(text.includes(expected), `${label}: missing ${expected}`);
}

const policy = read('services/heureka-service/src/heureka/feed/bundle-publication-policy.ts');
const doc = read('docs/orchestrator/GOAL-24-heureka-bundle-publication-policy.md');
const packageJson = JSON.parse(read('package.json'));

for (const expected of [
  'heureka.bundle.publication.policy.v1',
  'catalog.bundle.v1',
  'BUNDLE_PUBLICATION_UNSUPPORTED',
  'BUNDLE_NOT_SELLABLE_PRODUCT',
  'BUNDLE_COMPONENT_POLICY_REQUIRED',
  'canPublishAsFeedItem: false',
  'willPublishFeed: false',
  'willMutateExternalMarketplace: false',
]) {
  assertIncludes(policy, expected, 'source policy');
}

for (const expected of [
  'Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation -> State Update',
  'Heureka must not publish a Catalog `catalog.bundle.v1` aggregate as one XML feed item',
  '[MISSING: approved Heureka bundle-as-one-SHOPITEM policy]',
  'Do not add `catalog.bundle.v1` IDs to `heureka_products`',
  'Parallel Execution',
]) {
  assertIncludes(doc, expected, 'policy document');
}

assert.equal(packageJson.scripts['verify:heureka-bundle-publication-policy'], 'node scripts/verify_heureka_bundle_publication_policy.js');

const result = {
  contractVersion: 'heureka.bundle.publication.policy.verifier.v1',
  readOnly: true,
  mutations: [],
  status: 'passed',
  policy: {
    catalogBundleContractVersion: 'catalog.bundle.v1',
    heurekaPolicyVersion: 'heureka.bundle.publication.policy.v1',
    canPublishBundleAsFeedItem: false,
    canPublishComponentsIndividually: true,
    willPublishFeed: false,
    willMutateExternalMarketplace: false,
    blockers: [
      '[MISSING: approved Heureka bundle-as-one-SHOPITEM policy]',
      '[MISSING: external Heureka evidence that bundle aggregates may be imported as one marketplace item without product SKU/stock identity]',
      '[MISSING: approved source for bundle price/category/delivery/free-shipping copy in Heureka XML]',
      '[MISSING: approved Heureka runtime verifier proving bundle publication is non-mutating and externally safe]',
    ],
  },
};

console.log(JSON.stringify(result, null, 2));
