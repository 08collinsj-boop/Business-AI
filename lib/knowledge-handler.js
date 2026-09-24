import { requireBusinessMember, sendAuthError } from './auth.js';
import { recordAuditEvent } from './audit.js';
import {
  KNOWLEDGE_BUCKET,
  KNOWLEDGE_MAX_SOURCES,
  KNOWLEDGE_MAX_TOTAL_BYTES,
  KNOWLEDGE_ITEM_TYPES,
  knowledgeError,
  knowledgeStorage,
  createKnowledgeSignedUpload,
  createKnowledgeSourceIdentity,
  validateKnowledgeUpload,
  downloadKnowledgeObject,
  removeKnowledgeObject,
  extractKnowledgeFromFile,
  sha256
} from './knowledge.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseBody(value) {
  try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { throw knowledgeError(400, 'Invalid business knowledge request'); }
}

function sourceId(value) {
  const id = String(value || '');
  if (!UUID.test(id)) throw knowledgeError(400, 'Invalid knowledge source');
  return id;
}

function publicSource(row, itemCounts = null) {
  const result = {
    id: row.id,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: Number(row.size_bytes) || 0,
    status: row.status,
    extracted_summary: row.extracted_summary || '',
    error_message: row.error_message || '',
    replaces_source_id: row.replaces_source_id || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    activated_at: row.activated_at || null
  };
  if (itemCounts) result.item_counts = itemCounts;
  return result;
}

async function getSource(businessId, id, select = 'id,business_id,file_name,storage_path,mime_type,size_bytes,sha256,status,extracted_summary,error_message,replaces_source_id,created_at,updated_at,activated_at') {
  const rows = await knowledgeStorage(`business_knowledge_sources?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(id)}&select=${select}&limit=1`);
  if (!rows?.[0]) throw knowledgeError(404, 'Knowledge source not found');
  return rows[0];
}

async function sourceDetail(businessId, id) {
  const source = await getSource(businessId, id);
  const items = await knowledgeStorage(`business_knowledge_items?business_id=eq.${encodeURIComponent(businessId)}&source_id=eq.${encodeURIComponent(id)}&select=id,item_type,title,content,keywords,status,created_at,updated_at&order=created_at.asc&limit=100`);
  return { source: publicSource(source), items: Array.isArray(items) ? items : [] };
}

async function updateSource(businessId, id, patch) {
  await knowledgeStorage(`business_knowledge_sources?business_id=eq.${encodeURIComponent(businessId)}&id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
  });
}

async function listSources(businessId) {
  const [sources, items] = await Promise.all([
    knowledgeStorage(`business_knowledge_sources?business_id=eq.${encodeURIComponent(businessId)}&select=id,file_name,mime_type,size_bytes,status,extracted_summary,error_message,replaces_source_id,created_at,updated_at,activated_at&order=created_at.desc&limit=100`),
    knowledgeStorage(`business_knowledge_items?business_id=eq.${encodeURIComponent(businessId)}&select=source_id,status&limit=1000`)
  ]);
  const counts = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const row = counts.get(item.source_id) || { total: 0, active: 0, needs_review: 0, rejected: 0 };
    row.total += 1;
    if (Object.hasOwn(row, item.status)) row[item.status] += 1;
    counts.set(item.source_id, row);
  }
  return (Array.isArray(sources) ? sources : []).map(row => publicSource(row, counts.get(row.id) || { total: 0, active: 0, needs_review: 0, rejected: 0 }));
}

async function createUpload(auth, body) {
  const input = validateKnowledgeUpload(body);
  const existing = await knowledgeStorage(`business_knowledge_sources?business_id=eq.${encodeURIComponent(auth.businessId)}&select=id,size_bytes,status&limit=100`);
  const replacement = input.replaceSourceId
    ? (existing || []).find(row => row.id === input.replaceSourceId && row.status !== 'superseded')
    : null;
  if (input.replaceSourceId && !replacement) throw knowledgeError(404, 'The source being replaced is unavailable');

  const current = (existing || []).filter(row => row.status !== 'superseded' && row.id !== input.replaceSourceId);
  const currentBytes = current.reduce((sum, row) => sum + Math.max(0, Number(row.size_bytes) || 0), 0);
  if (current.length >= KNOWLEDGE_MAX_SOURCES) throw knowledgeError(409, `You can keep up to ${KNOWLEDGE_MAX_SOURCES} current knowledge files during the Pilot`);
  if (currentBytes + input.sizeBytes > KNOWLEDGE_MAX_TOTAL_BYTES) throw knowledgeError(409, 'Your current knowledge files would exceed the 100 MB Pilot limit');

  const identity = createKnowledgeSourceIdentity(input.fileName);
  const rows = await knowledgeStorage('business_knowledge_sources', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      id: identity.id,
      business_id: auth.businessId,
      created_by: auth.userId,
      replaces_source_id: input.replaceSourceId,
      file_name: input.fileName,
      storage_path: identity.storagePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      status: 'pending_upload'
    })
  });
  try {
    const signed = await createKnowledgeSignedUpload(identity.storagePath);
    await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'knowledge.upload_prepared', resourceType: 'knowledge_source', resourceId: identity.id, metadata: { mime_type: input.mimeType, size_bytes: input.sizeBytes } });
    return { source: publicSource(rows?.[0] || { id: identity.id, ...input, file_name: input.fileName, mime_type: input.mimeType, size_bytes: input.sizeBytes, status: 'pending_upload', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }), bucket: KNOWLEDGE_BUCKET, path: signed.path, token: signed.token };
  } catch (error) {
    try { await knowledgeStorage(`business_knowledge_sources?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(identity.id)}`, { method: 'DELETE' }); } catch { /* best effort orphan cleanup */ }
    throw error;
  }
}

async function finalizeUpload(auth, body) {
  const parsed = parseBody(body);
  if (!parsed || parsed.action !== 'finalize' || Object.keys(parsed).some(key => !['action', 'source_id'].includes(key))) throw knowledgeError(400, 'Invalid finalize request');
  const id = sourceId(parsed.source_id);
  const source = await getSource(auth.businessId, id);
  if (!['pending_upload', 'failed'].includes(source.status)) throw knowledgeError(409, 'This file is not waiting for extraction');

  let buffer;
  try {
    buffer = await downloadKnowledgeObject(source.storage_path);
    if (Number(source.size_bytes) !== buffer.length) throw knowledgeError(400, 'Uploaded file size does not match the prepared upload');
    const hash = sha256(buffer);
    const duplicates = await knowledgeStorage(`business_knowledge_sources?business_id=eq.${encodeURIComponent(auth.businessId)}&sha256=eq.${hash}&status=in.(needs_review,active)&id=neq.${encodeURIComponent(id)}&select=id&limit=1`);
    if (duplicates?.length) {
      await removeKnowledgeObject(source.storage_path);
      await knowledgeStorage(`business_knowledge_sources?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      throw knowledgeError(409, 'That file has already been uploaded');
    }
    await updateSource(auth.businessId, id, { status: 'processing', sha256: hash, error_message: '' });
    const extraction = await extractKnowledgeFromFile({ buffer, fileName: source.file_name, mimeType: source.mime_type });
    await knowledgeStorage(`business_knowledge_items?business_id=eq.${encodeURIComponent(auth.businessId)}&source_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    await knowledgeStorage('business_knowledge_items', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(extraction.items.map(item => ({
        source_id: id,
        business_id: auth.businessId,
        item_type: item.item_type,
        title: item.title,
        content: item.content,
        keywords: item.keywords,
        status: 'needs_review'
      })))
    });
    await updateSource(auth.businessId, id, { status: 'needs_review', extracted_summary: extraction.summary, error_message: '', extracted_at: new Date().toISOString() });
    await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'knowledge.extracted', resourceType: 'knowledge_source', resourceId: id, metadata: { item_count: extraction.items.length, mime_type: source.mime_type } });
    return sourceDetail(auth.businessId, id);
  } catch (error) {
    if (error?.status === 409) throw error;
    try { await updateSource(auth.businessId, id, { status: 'failed', error_message: error?.status === 422 ? error.message : 'Extraction failed. You can retry or remove this file.' }); } catch { /* keep original error */ }
    throw error;
  }
}

function validateReviewItems(value, existing) {
  if (!Array.isArray(value) || value.length !== existing.length || value.length > 80) throw knowledgeError(400, 'Review every extracted item before approving this source');
  const byId = new Map(existing.map(item => [item.id, item]));
  const seen = new Set();
  const rows = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Object.keys(raw).some(key => !['id', 'item_type', 'title', 'content', 'include'].includes(key))) throw knowledgeError(400, 'Invalid knowledge review');
    const original = byId.get(String(raw.id || ''));
    if (!original || seen.has(original.id)) throw knowledgeError(400, 'Invalid knowledge review');
    seen.add(original.id);
    if (!KNOWLEDGE_ITEM_TYPES.includes(raw.item_type)) throw knowledgeError(400, 'Invalid knowledge type');
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    const content = typeof raw.content === 'string' ? raw.content.trim() : '';
    if (!title || title.length > 300 || !content || content.length > 3000 || typeof raw.include !== 'boolean') throw knowledgeError(400, 'Review item text is invalid');
    rows.push({
      id: original.id,
      source_id: original.source_id,
      business_id: original.business_id,
      item_type: raw.item_type,
      title,
      content,
      keywords: original.keywords || [],
      status: raw.include ? 'active' : 'rejected',
      updated_at: new Date().toISOString()
    });
  }
  if (!rows.some(row => row.status === 'active')) throw knowledgeError(400, 'Approve at least one useful fact or remove the source');
  return rows;
}

async function approveSource(auth, body) {
  const parsed = parseBody(body);
  if (!parsed || parsed.action !== 'approve' || Object.keys(parsed).some(key => !['action', 'source_id', 'items'].includes(key))) throw knowledgeError(400, 'Invalid knowledge review');
  const id = sourceId(parsed.source_id);
  const source = await getSource(auth.businessId, id);
  if (!['needs_review', 'active'].includes(source.status)) throw knowledgeError(409, 'This source is not ready for review');
  const existing = await knowledgeStorage(`business_knowledge_items?business_id=eq.${encodeURIComponent(auth.businessId)}&source_id=eq.${encodeURIComponent(id)}&select=id,source_id,business_id,item_type,title,content,keywords,status&order=created_at.asc&limit=100`);
  const reviewed = validateReviewItems(parsed.items, existing || []);
  await knowledgeStorage('business_knowledge_items?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(reviewed)
  });
  await updateSource(auth.businessId, id, { status: 'active', error_message: '', activated_at: source.activated_at || new Date().toISOString() });

  if (source.replaces_source_id && source.replaces_source_id !== id) {
    try {
      const previous = await getSource(auth.businessId, source.replaces_source_id);
      if (previous.status !== 'superseded') {
        await updateSource(auth.businessId, previous.id, { status: 'superseded' });
        await knowledgeStorage(`business_knowledge_items?business_id=eq.${encodeURIComponent(auth.businessId)}&source_id=eq.${encodeURIComponent(previous.id)}&status=eq.active`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'superseded', updated_at: new Date().toISOString() })
        });
      }
    } catch { /* Replacement approval must not be lost because old cleanup failed. */ }
  }

  await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'knowledge.approved', resourceType: 'knowledge_source', resourceId: id, metadata: { active_items: reviewed.filter(row => row.status === 'active').length } });
  return sourceDetail(auth.businessId, id);
}

async function removeSource(auth, body) {
  const parsed = parseBody(body);
  if (!parsed || parsed.action !== 'remove' || Object.keys(parsed).some(key => !['action', 'source_id'].includes(key))) throw knowledgeError(400, 'Invalid remove request');
  const id = sourceId(parsed.source_id);
  const source = await getSource(auth.businessId, id);
  await removeKnowledgeObject(source.storage_path);
  await knowledgeStorage(`business_knowledge_sources?business_id=eq.${encodeURIComponent(auth.businessId)}&id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  await recordAuditEvent({ businessId: auth.businessId, actorUserId: auth.userId, action: 'knowledge.removed', resourceType: 'knowledge_source', resourceId: id, metadata: { previous_status: source.status } });
  return { removed: true };
}

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  let auth;
  try {
    auth = await requireBusinessMember(req, req.method === 'GET' ? null : ['owner', 'admin']);
  } catch (error) { return sendAuthError(res, error); }
  if (!auth.enforced) return res.status(503).json({ error: 'Authenticated business access is required' });
  if (Object.keys(req.query || {}).some(key => !['operation', 'source_id'].includes(key))) return res.status(400).json({ error: 'Invalid business knowledge query' });
  try {
    if (req.method === 'GET') {
      if (req.query?.source_id) return res.status(200).json(await sourceDetail(auth.businessId, sourceId(req.query.source_id)));
      return res.status(200).json({ sources: await listSources(auth.businessId), can_manage: ['owner', 'admin'].includes(auth.role), limits: { max_sources: KNOWLEDGE_MAX_SOURCES, max_file_bytes: 10 * 1024 * 1024, max_total_bytes: KNOWLEDGE_MAX_TOTAL_BYTES } });
    }
    if (req.method === 'POST') {
      const body = parseBody(req.body);
      if (body?.action === 'create_upload') return res.status(201).json(await createUpload(auth, body));
      if (body?.action === 'finalize') return res.status(200).json(await finalizeUpload(auth, body));
      if (body?.action === 'remove') return res.status(200).json(await removeSource(auth, body));
      throw knowledgeError(400, 'Invalid business knowledge request');
    }
    if (req.method === 'PATCH') return res.status(200).json(await approveSource(auth, req.body));
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const status = [400, 404, 409, 422, 502, 503].includes(error?.status) ? error.status : 503;
    const safe = status === 503 ? 'Business knowledge is temporarily unavailable' : status === 502 ? 'Knowledge extraction is temporarily unavailable' : error.message;
    return res.status(status).json({ error: safe });
  }
}
