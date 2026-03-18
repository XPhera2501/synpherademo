// Synphera - Supabase Data Store (replaces localStorage)
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate, Database, Json } from '@/integrations/supabase/types';

export type DepartmentEnum = Database['public']['Enums']['department'];
export type AssetStatusEnum = Database['public']['Enums']['asset_status'];
export type AppRoleEnum = Database['public']['Enums']['app_role'];

export type DbPromptAsset = Tables<'prompt_assets'>;
export type DbVersionSnapshot = Tables<'version_snapshots'>;
export type DbLineageEntry = Tables<'lineage_entries'>;
export type DbROIFact = Tables<'roi_facts'>;
export type DbComment = Tables<'prompt_comments'>;
export type DbProfile = Tables<'profiles'>;
export type DbAuditLog = Tables<'audit_logs'>;

export interface PromptAssetMetadata {
  taskType?: string;
  determinismScore?: number;
  scores?: Record<string, number>;
  flags?: Record<string, boolean>;
  routing?: Json;
  profileSummary?: Json;
}

// ==================== Prompt Assets ====================

export async function getAssets(): Promise<DbPromptAsset[]> {
  const { data, error } = await supabase
    .from('prompt_assets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAssets error:', error); return []; }
  return data || [];
}

export interface AssetFilters {
  search?: string;
  department?: DepartmentEnum;
  status?: AssetStatusEnum;
  category?: string;
  tags?: string[];
  createdBy?: string;
}

export async function getAssetsFiltered(filters: AssetFilters): Promise<DbPromptAsset[]> {
  let query = supabase.from('prompt_assets').select('*').order('created_at', { ascending: false });

  if (filters.department) query = query.eq('department', filters.department);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.createdBy) query = query.eq('created_by', filters.createdBy);
  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }
  if (filters.search) {
    query = query.textSearch('fts', filters.search, { type: 'websearch' });
  }

  const { data, error } = await query;
  if (error) { console.error('getAssetsFiltered error:', error); return []; }
  return data || [];
}

export async function getAssetById(id: string): Promise<DbPromptAsset | null> {
  const { data } = await supabase.from('prompt_assets').select('*').eq('id', id).single();
  return data;
}

export async function createAsset(asset: TablesInsert<'prompt_assets'>): Promise<DbPromptAsset | null> {
  const { data, error } = await supabase.from('prompt_assets').insert(asset).select().single();
  if (error) { console.error('createAsset error:', error); return null; }

  if (data) {
    await addLineageEntry({
      asset_id: data.id,
      parent_id: asset.parent_id ?? null,
      action: 'created',
      user_id: asset.created_by,
    });
    await addVersionSnapshot({
      asset_id: data.id,
      version: asset.version ?? 1.0,
      content: asset.content ?? '',
      title: asset.title,
      commit_message: asset.commit_message || 'Initial creation',
      user_id: asset.created_by,
    });
  }
  return data;
}

export async function updateAsset(id: string, updates: TablesUpdate<'prompt_assets'>): Promise<DbPromptAsset | null> {
  // Never allow created_by to be overwritten via code (DB trigger also enforces this)
  const { created_by: _createdBy, ...safeUpdates } = updates;
  const { data, error } = await supabase.from('prompt_assets').update(safeUpdates).eq('id', id).select().single();
  if (error) { console.error('updateAsset error:', error); return null; }
  return data;
}

/**
 * Update an asset with automatic version bump, snapshot, lineage, and audit logging.
 * This is the preferred method for all user-facing edits.
 */
export async function updateAssetWithVersioning(
  id: string,
  updates: TablesUpdate<'prompt_assets'>,
  userId: string,
  commitMessage: string,
  auditAction: string = 'update',
): Promise<DbPromptAsset | null> {
  const asset = await getAssetById(id);
  if (!asset) return null;

  const newVersion = parseFloat((asset.version + 0.1).toFixed(1));
  const merged = {
    ...updates,
    version: newVersion,
    commit_message: commitMessage,
  };

  const updated = await updateAsset(id, merged);
  if (!updated) return null;

  // Create version snapshot
  await addVersionSnapshot({
    asset_id: id,
    version: newVersion,
    content: updated.content,
    title: updated.title,
    commit_message: commitMessage,
    user_id: userId,
  });

  // Lineage entry
  await addLineageEntry({
    asset_id: id,
    parent_id: asset.parent_id,
    action: auditAction === 'approve_release' ? 'approved' : 'updated',
    user_id: userId,
  });

  // Audit log
  await addAuditLog({
    user_id: userId,
    action: auditAction,
    target_type: 'prompt_asset',
    target_id: id,
    details: {
      version: newVersion,
      commit: commitMessage,
      previous_version: asset.version,
      original_author: asset.created_by,
    },
  });

  return updated;
}

export async function deleteAsset(id: string): Promise<boolean> {
  const { error } = await supabase.from('prompt_assets').delete().eq('id', id);
  return !error;
}

// ==================== Version Snapshots ====================

export async function getVersionSnapshots(assetId?: string): Promise<DbVersionSnapshot[]> {
  let query = supabase.from('version_snapshots').select('*').order('created_at', { ascending: false });
  if (assetId) query = query.eq('asset_id', assetId);
  const { data } = await query;
  return data || [];
}

export async function addVersionSnapshot(snapshot: TablesInsert<'version_snapshots'>): Promise<void> {
  await supabase.from('version_snapshots').insert(snapshot);
}

// ==================== Lineage ====================

export async function getLineageEntries(): Promise<DbLineageEntry[]> {
  const { data } = await supabase.from('lineage_entries').select('*').order('created_at', { ascending: false });
  return data || [];
}

export async function addLineageEntry(entry: TablesInsert<'lineage_entries'>): Promise<void> {
  await supabase.from('lineage_entries').insert(entry);
}

// ==================== ROI Facts ====================

export async function getROIFacts(): Promise<DbROIFact[]> {
  const { data } = await supabase.from('roi_facts').select('*');
  return data || [];
}

export async function saveROIFact(fact: TablesInsert<'roi_facts'>): Promise<void> {
  await supabase.from('roi_facts').insert(fact);
}

export async function replaceROIFacts(assetId: string, facts: Array<Pick<TablesInsert<'roi_facts'>, 'category' | 'value' | 'description'>>): Promise<boolean> {
  const { error: deleteError } = await supabase.from('roi_facts').delete().eq('asset_id', assetId);
  if (deleteError) {
    console.error('replaceROIFacts delete error:', deleteError);
    return false;
  }

  if (facts.length === 0) {
    return true;
  }

  const payload: TablesInsert<'roi_facts'>[] = facts.map((fact) => ({
    asset_id: assetId,
    category: fact.category,
    value: fact.value,
    description: fact.description ?? null,
  }));

  const { error: insertError } = await supabase.from('roi_facts').insert(payload);
  if (insertError) {
    console.error('replaceROIFacts insert error:', insertError);
    return false;
  }

  return true;
}

// ==================== Comments ====================

export async function getComments(promptId: string): Promise<DbComment[]> {
  const { data } = await supabase
    .from('prompt_comments')
    .select('*')
    .eq('prompt_id', promptId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function addComment(comment: TablesInsert<'prompt_comments'>): Promise<DbComment | null> {
  const { data } = await supabase.from('prompt_comments').insert(comment).select().single();
  return data;
}

// ==================== Audit Logs ====================

export async function addAuditLog(log: TablesInsert<'audit_logs'>): Promise<void> {
  await supabase.from('audit_logs').insert(log);
}

export async function getAuditLogs(limit = 100): Promise<Tables<'audit_logs'>[]> {
  const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

// ==================== Profiles ====================

export async function getProfiles(): Promise<DbProfile[]> {
  const { data } = await supabase.from('profiles').select('*');
  return data || [];
}

export async function updateProfile(userId: string, updates: TablesUpdate<'profiles'>): Promise<void> {
  await supabase.from('profiles').update(updates).eq('id', userId);
}

export async function suspendUser(userId: string, suspended: boolean): Promise<boolean> {
  const { error } = await supabase.from('profiles').update({ suspended }).eq('id', userId);
  return !error;
}

// ==================== Rollback ====================

export async function rollbackAsset(assetId: string, toVersion: number, userId: string): Promise<DbPromptAsset | null> {
  const snapshots = await getVersionSnapshots(assetId);
  const target = snapshots.find(s => s.version === toVersion);
  if (!target) return null;

  const asset = await getAssetById(assetId);
  if (!asset || asset.is_locked) return null;

  return updateAssetWithVersioning(
    assetId,
    { content: target.content, title: target.title },
    userId,
    `Rollback to v${toVersion}`,
    'rollback',
  );
}

export async function toggleLock(assetId: string): Promise<boolean> {
  const asset = await getAssetById(assetId);
  if (!asset) return false;
  const newLocked = !asset.is_locked;
  await updateAsset(assetId, { is_locked: newLocked });
  return newLocked;
}

// ==================== Analytics Helpers ====================

const DEPARTMENTS: DepartmentEnum[] = ['Operations', 'Legal', 'R&D', 'Marketing', 'Finance', 'HR', 'IT', 'Executive'];
const ROI_CATEGORIES = ['Time', 'Earlier Reaction', 'Waste Reduction', 'Improved Price Negotiation'];

export async function getDepartmentROIMatrix() {
  const assets = await getAssets();
  const facts = await getROIFacts();

  const matrix: Record<string, Record<string, number>> = {};
  DEPARTMENTS.forEach(dept => {
    matrix[dept] = {};
    ROI_CATEGORIES.forEach(cat => { matrix[dept][cat] = 0; });
  });

  facts.forEach(fact => {
    const asset = assets.find(a => a.id === fact.asset_id);
    if (asset && matrix[asset.department]) {
      matrix[asset.department][fact.category] = (matrix[asset.department][fact.category] || 0) + Number(fact.value);
    }
  });

  return matrix;
}

export async function getTotalEnterpriseValue(): Promise<number> {
  const facts = await getROIFacts();
  return facts.reduce((sum, f) => sum + Number(f.value), 0);
}

export async function getSecurityStats(assets: DbPromptAsset[]) {
  return {
    green: assets.filter(a => a.security_status === 'GREEN').length,
    amber: assets.filter(a => a.security_status === 'AMBER').length,
    red: assets.filter(a => a.security_status === 'RED').length,
    pending: assets.filter(a => a.security_status === 'PENDING').length,
  };
}

export async function getAssetCountByDepartment(assets: DbPromptAsset[]) {
  const counts: Record<string, number> = {};
  DEPARTMENTS.forEach(d => counts[d] = 0);
  assets.forEach(a => { if (counts[a.department] !== undefined) counts[a.department]++; });
  return counts;
}
