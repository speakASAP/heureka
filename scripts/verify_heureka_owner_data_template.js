#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const CONTRACT_VERSION = 'heureka-owner-data-template.v1';
const SOURCE_DOCUMENT = 'docs/orchestrator/TASK-010-data-owner-handoff.md';

const root = path.resolve(__dirname, '..');
const handoffPath = path.join(root, SOURCE_DOCUMENT);
const handoff = fs.readFileSync(handoffPath, 'utf8');

function section(title) {
  const marker = `## ${title}`;
  const start = handoff.indexOf(marker);
  assert.notEqual(start, -1, `${SOURCE_DOCUMENT}: missing section ${marker}`);
  const next = handoff.indexOf('\n## ', start + marker.length);
  return handoff.slice(start, next === -1 ? handoff.length : next);
}

function cleanCell(value) {
  return String(value || '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitTableRow(line) {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cleanCell);
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function parseMarkdownTable(sectionText, label) {
  const tableLines = sectionText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'));

  assert.ok(tableLines.length >= 2, `${SOURCE_DOCUMENT}: ${label} table is missing`);

  const headers = splitTableRow(tableLines[0]);
  const rows = [];

  for (const line of tableLines.slice(1)) {
    const cells = splitTableRow(line);
    if (isSeparatorRow(cells)) continue;
    if (!cells.some(Boolean)) continue;

    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

function extractBlockers(sectionText) {
  const blockers = [];
  for (const line of sectionText.split(/\r?\n/)) {
    const match = line.trim().match(/^- `(\[(?:MISSING|UNKNOWN): [^`]+\])`$/);
    if (match) blockers.push(match[1]);
  }
  return blockers;
}

function stockDecisionTemplate(row) {
  return {
    productId: row['Product ID'],
    skuOrSource: row['SKU / source'],
    requiredOwnerDecision: row['Required owner decision'],
    decision: '[MISSING: set_stock or exclude]',
    quantity: '[MISSING: non-negative integer when decision is set_stock]',
    warehouseId: '[MISSING: Warehouse warehouse id when stock mutation is approved]',
    sourceReference: '[MISSING: authoritative current-stock source reference]',
    approvedBy: '[MISSING: owner approval identity]',
    reasonCode: '[MISSING: stock correction or exclusion reason code]',
    allegroEvidence: '[REQUIRED WHEN Allegro API is used: /me seller identity plus Warehouse product readback]',
  };
}

function mediaBackfillTemplate(row) {
  return {
    productId: row['Product ID'],
    skuOrSource: row['SKU / source'],
    name: row.Name,
    requiredOwnerInput: row['Required owner input'],
    publicImageUrl: '[MISSING: approved public HTTPS image URL or approved file reference]',
    licenseOrSourceReference: '[MISSING: image source/license evidence]',
    approvedBy: '[MISSING: owner approval identity]',
    applyOnlyIfProductSellable: true,
  };
}

function catalogContentTemplate(row) {
  return {
    productId: row['Product ID'],
    skuOrSource: row['SKU / source'],
    requiredOwnerInput: row['Required owner input'],
    categoryText: '[MISSING: public Heureka category text]',
    priceVat: '[MISSING: public VAT-inclusive price]',
    currency: 'CZK',
    primaryImageUrl: '[MISSING: approved public HTTPS image URL or approved file reference]',
    stockDecision: '[MISSING: set_stock or exclude]',
    approvedBy: '[MISSING: owner approval identity]',
  };
}

function externalEvidenceTemplate(blockers) {
  return {
    blockers,
    shopApprovalEvidenceRef: '[UNKNOWN: shop approval]',
    currentImportValidityEvidenceRef: '[UNKNOWN: current external Heureka import/feed-validity result]',
    legalCompanyFieldsEvidenceRef: '[MISSING: owner-supplied e-shop registration legal/company fields]',
    merchantApiKeySecretRef: '[MISSING: Heureka merchant/API key approval evidence]',
    ownerOperatedApprovalOrImportEvidenceRef: '[MISSING: owner/browser-operated external Heureka approval/import evidence]',
  };
}

const stockRows = parseMarkdownTable(section('Stock Authority Lane'), 'stock authority');
const mediaRows = parseMarkdownTable(section('Media Backfill Lane'), 'media backfill');
const catalogRows = parseMarkdownTable(section('Catalog Content And Pricing Lane'), 'catalog content');
const externalBlockers = extractBlockers(section('External Heureka Onboarding Lane'));

assert.equal(stockRows.length, 25, 'expected 25 stock owner decisions');
assert.equal(mediaRows.length, 12, 'expected 12 media owner inputs');
assert.equal(catalogRows.length, 1, 'expected 1 catalog content owner input');
assert.deepEqual(externalBlockers, [
  '[UNKNOWN: shop approval]',
  '[UNKNOWN: current external Heureka import/feed-validity result]',
  '[MISSING: owner-supplied e-shop registration legal/company fields]',
  '[MISSING: Heureka merchant/API key approval evidence]',
  '[MISSING: owner/browser-operated external Heureka approval/import evidence]',
]);

const catalogProductId = '8edc51f2-bed2-433f-8a3c-5738b49a02e1';
assert.ok(stockRows.some((row) => row['Product ID'] === catalogProductId), 'catalog blocker missing from stock decisions');
assert.ok(mediaRows.some((row) => row['Product ID'] === catalogProductId), 'catalog blocker missing from media backfill');
assert.ok(catalogRows.some((row) => row['Product ID'] === catalogProductId), 'catalog blocker missing from catalog content lane');

const report = {
  contractVersion: CONTRACT_VERSION,
  readOnly: true,
  mutations: [],
  sourceDocument: SOURCE_DOCUMENT,
  status: 'blocked_by_owner_data',
  counts: {
    stockDecisions: stockRows.length,
    mediaBackfill: mediaRows.length,
    catalogContent: catalogRows.length,
    externalHeurekaEvidence: externalBlockers.length,
  },
  ownerDataTemplate: {
    stockDecisions: stockRows.map(stockDecisionTemplate),
    mediaBackfill: mediaRows.map(mediaBackfillTemplate),
    catalogContent: catalogRows.map(catalogContentTemplate),
    externalHeureka: externalEvidenceTemplate(externalBlockers),
  },
  validationCommands: [
    'npm run verify:heureka-owner-data-template',
    'kubectl -n statex-apps exec deploy/heureka-service -- npm run verify:heureka-blocked-product-lanes',
    'npm run verify:heureka-external-readiness',
    'npm run verify:task-010-completion-audit',
  ],
};

console.log(JSON.stringify(report, null, 2));
