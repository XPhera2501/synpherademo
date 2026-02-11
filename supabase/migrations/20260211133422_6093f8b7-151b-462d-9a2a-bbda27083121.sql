
-- Add suspended column to profiles for user suspension
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false;

-- Add category index for faceted search
CREATE INDEX IF NOT EXISTS idx_prompt_assets_category ON public.prompt_assets(category);
CREATE INDEX IF NOT EXISTS idx_prompt_assets_department ON public.prompt_assets(department);
CREATE INDEX IF NOT EXISTS idx_prompt_assets_status ON public.prompt_assets(status);
CREATE INDEX IF NOT EXISTS idx_prompt_assets_tags ON public.prompt_assets USING GIN(tags);

-- Full-text search index on prompt_assets
ALTER TABLE public.prompt_assets ADD COLUMN IF NOT EXISTS fts tsvector 
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(category, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_prompt_assets_fts ON public.prompt_assets USING GIN(fts);
