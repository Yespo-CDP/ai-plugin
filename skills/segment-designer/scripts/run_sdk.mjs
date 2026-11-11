#!/usr/bin/env node
// Local preparation only. The host owns every authenticated MCP operation.
import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {createSegmentSdk, hydrateBackendSegmentModel} from '../../../packages/segment-designer-sdk/dist/index.js';

const features = ['GEOMARKETING_UI', 'SC_SEGMENTATION', 'SEGMENT_BY_EVENTS_PARAMETERS',
  'DATA_SOURCE_PG_USAGE', 'TMP_SHOW_CUSTOMER_LIFECYCLE_IN_CONTACTS_ANALYTICS', 'PRODUCT_EVENTS_VISIBILITY'];
const required = (ok, message) => { if (!ok) throw new Error(message); };
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const baselineHash = model => sha256(JSON.stringify(canonical(model)));
export function verifyBaseline(expectedHash, currentSchema) {
  required(expectedHash === baselineHash(currentSchema), 'Segment changed since preparation; reload and prepare again.');
  return true;
}
export function validateCatalog(bytes, response, {organizationId, segmentId = null}, now = Date.now()) {
  const ref = response?.catalogRef ?? response;
  required(ref && /^[a-f0-9]{64}$/.test(ref.sha256), 'Missing authoritative catalogRef checksum.');
  required(bytes.length > 0 && bytes.length <= 32 * 1024 * 1024 && bytes.length === ref.bytes, 'Catalog byte count mismatch.');
  required(sha256(bytes) === ref.sha256, 'Catalog checksum mismatch.');
  required(Date.parse(ref.expiresAt) > now, 'Catalog expired; obtain a fresh catalogRef.');
  const catalog = JSON.parse(bytes.toString('utf8'));
  required(catalog.catalogVersion === 2 && catalog.catalogId === ref.catalogId && catalog.expiresAt === ref.expiresAt,
    'Catalog identity/version mismatch.');
  required(organizationId != null && String(organizationId).trim() !== '' && String(catalog.organizationId) === String(organizationId), 'Catalog belongs to a different organization.');
  required((catalog.segmentId == null ? null : String(catalog.segmentId)) === (segmentId == null ? null : String(segmentId)), 'Catalog segment mismatch.');
  required(Array.isArray(catalog.definitions) && catalog.definitions.length > 0, 'Catalog definitions missing.');
  const ui = catalog.uiContext;
  required(ui?.groupType === 'DYNAMIC' && typeof ui.timeZone === 'string' && ui.timeZone.trim()
    && ui.requireResolvedFeatures === true && features.every(name => typeof ui.enabledFeatures?.[name] === 'boolean')
    && Number.isSafeInteger(ui.scEventDateValidPeriodDays) && ui.scEventDateValidPeriodDays >= 0,
    'Authoritative UI context and resolved feature gates required.');
  required(ui.mobilePushApplicationIds === undefined || (Array.isArray(ui.mobilePushApplicationIds)
    && ui.mobilePushApplicationIds.every(id => ['string', 'number'].includes(typeof id))), 'Invalid application context.');
  return catalog;
}
export function completedCount(result) {
  // The pinned MCP returns totalCount only after completion, omitting status.
  required(result && result.error == null && result.isError !== true
    && (result.status === undefined || result.status === 'COMPLETED')
    && Number.isSafeInteger(result.totalCount) && result.totalCount >= 0,
    'Count unavailable: require COMPLETED and a non-negative integer totalCount. Pending/failed is not zero.');
  return {status: 'COMPLETED', totalCount: result.totalCount, mediaChannels: result.mediaChannels};
}
export async function prepare({mode, catalogBytes, catalogReference, organizationId, segmentId,
  sourceSchema, name, description = '', tags, mutate, outputSchema}) {
  required(['create', 'update', 'count'].includes(mode), 'Mode must be create, update, or count.');
  required(mode === 'update' ? segmentId != null && String(segmentId).trim() !== '' && sourceSchema && typeof sourceSchema === 'object'
    : segmentId == null && sourceSchema === undefined, 'Only update accepts and requires segmentId and sourceSchema.');
  required(mode !== 'create' || typeof name === 'string' && name.trim(), 'Create requires a name.');
  if (mode === 'create') {
    required(typeof description === 'string', 'Create description must be a string.');
    required(tags == null || (Array.isArray(tags) && Array.from(tags).every(tag =>
      tag && typeof tag === 'object' && !Array.isArray(tag)
      && typeof tag.name === 'string' && tag.name.trim().length > 0)),
    'Create tags must be null or an array of objects with non-empty string names.');
  }
  const catalog = validateCatalog(catalogBytes, catalogReference, {organizationId, segmentId});
  const inputModel = mode === 'update' ? hydrateBackendSegmentModel(sourceSchema, catalog.definitions, catalog.uiContext) : undefined;
  const sdk = createSegmentSdk({model: inputModel, definitions: catalog.definitions, uiContext: catalog.uiContext, outputSchema});
  let validated;
  let finished = false;
  const api = Object.freeze({...sdk, finish: async () => {
    required(!finished, 'finish() must be called once.');
    finished = true;
    validated = await sdk.finish();
    return structuredClone(validated);
  }});
  required(typeof mutate === 'function', 'Mutation module must export a function.');
  await mutate(api);
  required(validated && validated.diagnostics.validation === 'passed', 'Mutation must return segment.finish().');
  const tool = {create: 'create_dynamic_segment', update: 'update_dynamic_segment', count: 'count_segment_contacts'}[mode];
  const arguments_ = mode === 'create' ? {name: name.trim(), description, ...(tags === undefined ? {} : {tags}), schema: validated.model}
    : mode === 'update' ? {segment_id: String(segmentId), schema: validated.model} : {schema: validated.model};
  return {status: 'prepared', persisted: false, organizationId: String(organizationId), mode,
    ...(mode === 'update' ? {baselineSha256: baselineHash(sourceSchema)} : {}),
    catalogSha256: sha256(catalogBytes), formula: validated.formula, diagnostics: validated.diagnostics,
    hostCall: {tool, arguments: arguments_}};
}
async function main() {
  const [command, requestPath, outputPath] = process.argv.slice(2);
  required(command === 'prepare' && requestPath && outputPath && process.argv.length === 5,
    'Usage: node run_sdk.mjs prepare request.json prepared.json');
  const request = JSON.parse(await readFile(requestPath, 'utf8'));
  const [catalogBytes, catalogReference, outputSchema, mutation, sourceSchema] = await Promise.all([
    readFile(request.catalogPath), readFile(request.catalogReferencePath, 'utf8').then(JSON.parse),
    readFile(new URL('../references/schema/segment-output.schema.json', import.meta.url), 'utf8').then(JSON.parse),
    import(pathToFileURL(resolve(request.mutationPath)).href),
    request.sourceSchemaPath ? readFile(request.sourceSchemaPath, 'utf8').then(JSON.parse) : undefined,
  ]);
  const result = await prepare({...request, catalogBytes, catalogReference, outputSchema, sourceSchema, mutate: mutation.default});
  await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', {mode: 0o600});
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`Segment preparation failed: ${error.message}\n`); process.exitCode = 1; });
}
