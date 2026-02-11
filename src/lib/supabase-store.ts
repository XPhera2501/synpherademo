// Synphera - Supabase Data Store (replaces localStorage)
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate, Database } from '@/integrations/supabase/types';

export type DepartmentEnum = Database['public']['Enums']['department'];
export type AssetStatusEnum = Database['public']['Enums']['asset_status'];
export type AppRoleEnum = Database['public']['Enums']['app_role'];

export type DbPromptAsset = Tables<'prompt_assets'>;
export type DbVersionSnapshot = Tables<'version_snapshots'>;
export type DbLineageEntry = Tables<'lineage_entries'>;
export type DbROIFact = Tables<'roi_facts'>;
export type DbComment = Tables<'prompt_comments'>;
export type DbProfile = Tables<'profiles'>;

// ==================== Prompt Assets ====================

export async function getAssets(): Promise<DbPromptAsset[]> {
  const { data, error } = await supabase
    .from('prompt_assets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getAssets error:', error); return []; }
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
      action: asset.parent_id ? 'forked' : 'created',
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
  const { data, error } = await supabase.from('prompt_assets').update(updates).eq('id', id).select().single();
  if (error) { console.error('updateAsset error:', error); return null; }
  return data;
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

export async function getAuditLogs(): Promise<Tables<'audit_logs'>[]> {
  const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
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

// ==================== Rollback ====================

export async function rollbackAsset(assetId: string, toVersion: number, userId: string): Promise<DbPromptAsset | null> {
  const snapshots = await getVersionSnapshots(assetId);
  const target = snapshots.find(s => s.version === toVersion);
  if (!target) return null;

  const asset = await getAssetById(assetId);
  if (!asset || asset.is_locked) return null;

  const newVersion = parseFloat((asset.version + 0.1).toFixed(1));
  const updated = await updateAsset(assetId, {
    content: target.content,
    title: target.title,
    version: newVersion,
    commit_message: `Rollback to v${toVersion}`,
  });

  if (updated) {
    await addVersionSnapshot({
      asset_id: assetId,
      version: newVersion,
      content: target.content,
      title: target.title,
      commit_message: `Rollback to v${toVersion}`,
      user_id: userId,
    });
  }
  return updated;
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
const ROI_CATEGORIES = ['Time Savings', 'Risk Mitigation', 'Efficiency', 'Cost Savings', 'New Value'];

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
