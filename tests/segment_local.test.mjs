import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSegmentSdk} from '../packages/segment-designer-sdk/dist/index.js';
import {prepare, sha256, validateCatalog, baselineHash, verifyBaseline, completedCount} from '../skills/segment-designer/scripts/run_sdk.mjs';
const outputSchema = JSON.parse(await readFile(new URL('../skills/segment-designer/references/schema/segment-output.schema.json', import.meta.url)));
const operators = (...pairs) => pairs.map(([name, type]) => ({name, type, isSupported:true}));
const definitions = [
  {columnId:'EMAIL', type:'EMAIL', conditionType:'FIELDS', categoryType:'FIELDS', operators:operators(['CONTAINS','STRING'])},
  {columnId:'AGE', type:'INTEGER', conditionType:'FIELDS', categoryType:'FIELDS', operators:operators(['GREATER_THAN','INTEGER'])},
  {columnId:'EVENT_TYPE_ID', type:'SELECT', conditionType:'AGGREGATED_CUSTOM_EVENTS', groupType:'CUSTOM_EVENTS', operators:operators(['EQUALS','STRING']), options:[{id:42,name:'Checkout'}]},
  {columnId:'EVENT_DATE', type:'DATETIME', conditionType:'AGGREGATED_CUSTOM_EVENTS', groupType:'CUSTOM_EVENTS', operators:operators(['LAST_DAYS','INTEGER'])},
  {columnId:'EVENT_COUNT', type:'INTEGER', conditionType:'AGGREGATED_CUSTOM_EVENTS', groupType:'CUSTOM_EVENTS', operators:operators(['GREATER_THAN','INTEGER'],['EQUALS','INTEGER'])},
  {columnId:'ACTIVITY_EVENT_ID', type:'SELECT', conditionType:'AGGREGATED_ACTIVITY', groupType:'ACTIVITY', operators:operators(['EQUALS','SELECT']), options:[{value:'COUNT_OPENED'}]},
  {columnId:'ACTIVITY_DATE', type:'DATETIME', conditionType:'AGGREGATED_ACTIVITY', groupType:'ACTIVITY', operators:operators(['LAST_DAYS','INTEGER'])},
  {columnId:'ACTIVITY_MEDIA_TYPE', type:'SELECT', conditionType:'AGGREGATED_ACTIVITY', groupType:'ACTIVITY', operators:operators(['EQUALS','SELECT']), options:[{value:'EMAIL'}]},
];
const uiContext = {groupType:'DYNAMIC',timeZone:'Europe/London',requireResolvedFeatures:true,scEventDateValidPeriodDays:365,
 enabledFeatures:Object.fromEntries(['GEOMARKETING_UI','SC_SEGMENTATION','SEGMENT_BY_EVENTS_PARAMETERS','DATA_SOURCE_PG_USAGE','TMP_SHOW_CUSTOMER_LIFECYCLE_IN_CONTACTS_ANALYTICS','PRODUCT_EVENTS_VISIBILITY'].map(x=>[x,true]))};
const must = result => {assert.equal(result.ok,true,JSON.stringify(result));return result.value;};
const email = {kind:'field',definition:{columnId:'EMAIL'},operator:'CONTAINS',value:'@example.com'};
function catalog(segmentId=null) {
 const data = {catalogVersion:2,catalogId:'segdefs_fixture',organizationId:123,segmentId,expiresAt:new Date(Date.now()+60000).toISOString(),definitions,uiContext};
 const catalogBytes = Buffer.from(JSON.stringify(data));
 return {catalogBytes,catalogReference:{catalogId:data.catalogId,expiresAt:data.expiresAt,bytes:catalogBytes.length,sha256:sha256(catalogBytes)},organizationId:'123'};
}
const base = {outputSchema,mode:'count',mutate:async sdk=>{must(sdk.addCard('include',{firstCondition:email}));return sdk.finish();}};
test('real SDK builds Boolean exclusion, event rolling 90 days, and email channel',async()=>{
 const result=await prepare({...base,...catalog(),mutate:async sdk=>{
  const {card}=must(sdk.addCard('include',{conditionRelation:'OR',firstCondition:email}));
  must(sdk.addCondition(card,{kind:'field',definition:{columnId:'AGE'},operator:'GREATER_THAN',value:18}));
  const second=must(sdk.addCard('include',{relation:'AND'}));
  must(sdk.addCondition(second.card,{kind:'aggregate',family:'AGGREGATED_CUSTOM_EVENTS',event:42,period:{kind:'relative',operator:'LAST_DAYS',value:90},occurrence:{kind:'exists'}}));
  const excluded=must(sdk.addCard('exclude',{}));
  must(sdk.addCondition(excluded.card,{kind:'aggregate',family:'AGGREGATED_ACTIVITY',event:'COUNT_OPENED',period:{kind:'relative',operator:'LAST_DAYS',value:90},criteria:[{definition:{columnId:'ACTIVITY_MEDIA_TYPE'},operator:'EQUALS',value:'EMAIL'}]}));
  return sdk.finish();
 }});
 assert.equal(result.persisted,false);assert.equal(result.hostCall.tool,'count_segment_contacts');
 assert.deepEqual(Object.keys(result.hostCall.arguments),['schema']);
 assert.match(JSON.stringify(result.hostCall.arguments.schema),/LAST_DAYS/);
 assert.match(JSON.stringify(result.hostCall.arguments.schema),/90/);
 assert.ok(result.formula.include && result.formula.exclude); assert.equal(result.diagnostics.validation,'passed');
});
test('local update preserves untouched exclusion and rejects stale baseline',async()=>{
 const sdk=createSegmentSdk({definitions,outputSchema,uiContext});
 must(sdk.addCard('include',{firstCondition:email}));must(sdk.addCard('exclude',{firstCondition:{...email,value:'blocked'}}));
 const sourceSchema=(await sdk.finish()).model;
 const result=await prepare({...base,...catalog('7'),mode:'update',segmentId:'7',sourceSchema,mutate:async segment=>{
  const [found]=segment.find({branch:'include',columnId:'EMAIL'});
  must(segment.updateCondition(found.ref,{value:'new'}));return segment.finish();
 }});
 assert.deepEqual(result.hostCall.arguments.schema.exclude,sourceSchema.exclude);
 assert.equal(result.baselineSha256,baselineHash(sourceSchema));assert.equal(verifyBaseline(result.baselineSha256,sourceSchema),true);
 assert.throws(()=>verifyBaseline(result.baselineSha256,{...sourceSchema,parameters:['changed']}),/changed/);
});
test('catalog checksum, expiry, account, segment and resolved gates fail closed',()=>{
 const c=catalog(); assert.equal(validateCatalog(c.catalogBytes,c.catalogReference,{organizationId:123}).organizationId,123);
 assert.throws(()=>validateCatalog(Buffer.from('{}'),c.catalogReference,{organizationId:123}));
 assert.throws(()=>validateCatalog(c.catalogBytes,c.catalogReference,{organizationId:999}),/organization/);
 assert.throws(()=>validateCatalog(c.catalogBytes,c.catalogReference,{organizationId:123,segmentId:'7'}),/segment/);
 assert.throws(()=>validateCatalog(c.catalogBytes,c.catalogReference,{organizationId:123},Date.now()+120000),/expired/);
 const payload=JSON.parse(c.catalogBytes);delete payload.uiContext.enabledFeatures.SC_SEGMENTATION;
 const bytes=Buffer.from(JSON.stringify(payload));
 assert.throws(()=>validateCatalog(bytes,{...c.catalogReference,bytes:bytes.length,sha256:sha256(bytes)},{organizationId:123}),/feature/);
});
test('count never coerces missing, pending, failed, negative or fractional results to zero',()=>{
 for(const result of [{},{isError:true,totalCount:0},{error:'failed',totalCount:0},{status:'PENDING',totalCount:0},{status:'FAILED',totalCount:0},{status:'COMPLETED',totalCount:-1},{status:'COMPLETED',totalCount:1.5},{status:'COMPLETED',totalCount:'0'}])assert.throws(()=>completedCount(result));
 assert.equal(completedCount({status:'COMPLETED',totalCount:0}).totalCount,0);
 assert.equal(completedCount({totalCount:0,mediaChannels:null}).status,'COMPLETED');
});
test('invalid operator cannot export; forged mutation return cannot bypass finish',async()=>{
 await assert.rejects(()=>prepare({...base,...catalog(),mutate:async sdk=>{
   must(sdk.addCard('include',{firstCondition:{...email,operator:'FAKE'}}));return sdk.finish();
 }}));
 await assert.rejects(()=>prepare({...base,...catalog(),mutate:async()=>({model:{},diagnostics:{validation:'passed'}})}),/finish/);
 const result=await prepare({...base,...catalog(),mutate:async sdk=>{
  must(sdk.addCard('include',{firstCondition:email}));const finished=await sdk.finish();finished.model={forged:true};return finished;
 }});
 assert.equal(result.hostCall.arguments.schema.forged,undefined);
});
test('vendored runtime and references match immutable provenance hashes',async()=>{
 const provenance=JSON.parse(await readFile(new URL('../packages/segment-designer-sdk/provenance.json',import.meta.url)));
 for(const file of provenance.files) assert.equal(sha256(await readFile(new URL('../'+file.path,import.meta.url))),file.sha256,file.path);
});

test('packaged date normalization loads timezone chunks without external dependencies',async()=>{
 const dateDefinitions=[...definitions,{columnId:'LAST_VISIT',type:'DATETIME',conditionType:'FIELDS',categoryType:'FIELDS',operators:operators(['EQUALS','DATETIME'])}];
 const sdk=createSegmentSdk({definitions:dateDefinitions,outputSchema,uiContext});
 must(sdk.addCard('include',{firstCondition:{kind:'field',definition:{columnId:'LAST_VISIT'},operator:'EQUALS',value:'20/08/2026 10:00'}}));
 const result=await sdk.finish();
 assert.equal(result.model.include.segments[0].filter.conditions[0].value,'20/08/2026 09:00');
});

test('create exports exact MCP arguments and preserves valid metadata',async()=>{
 const tags=[{name:'VIP',id:4},{name:' Retention '}];
 const result=await prepare({...base,...catalog(),mode:'create',name:'  Audience  ',description:'Requested audience',tags});
 assert.equal(result.status,'prepared');assert.equal(result.persisted,false);
 assert.equal(result.hostCall.tool,'create_dynamic_segment');
 assert.deepEqual(Object.keys(result.hostCall.arguments).sort(),['description','name','schema','tags']);
 assert.equal(result.hostCall.arguments.name,'Audience');
 assert.equal(result.hostCall.arguments.description,'Requested audience');
 assert.deepEqual(result.hostCall.arguments.tags,tags);
 const defaults=await prepare({...base,...catalog(),mode:'create',name:'Default'});
 assert.equal(defaults.hostCall.arguments.description,'');
 assert.equal(Object.hasOwn(defaults.hostCall.arguments,'tags'),false);
 const nullable=await prepare({...base,...catalog(),mode:'create',name:'Nullable',tags:null});
 assert.equal(nullable.hostCall.arguments.tags,null);
});
test('create rejects invalid description and tag metadata before executing the SDK mutation',async()=>{
 const invalid=[{description:null},{description:42},{description:{}},{description:[]},
  {tags:'VIP'},{tags:{}},{tags:[null]},{tags:['VIP']},{tags:[{}]},
  {tags:[{name:42}]},{tags:[{name:''}]},{tags:[{name:'  '}]},{tags:[[]]},{tags:new Array(1)}];
 for(const metadata of invalid) {
  let called=false;
  await assert.rejects(()=>prepare({...base,...catalog(),mode:'create',name:'Audience',...metadata,
   mutate:async()=>{called=true;}}),/Create (description|tags)/);
  assert.equal(called,false);
 }
});
