-- Weekly scheduled searches
CREATE TABLE IF NOT EXISTS public.scheduled_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  location TEXT NOT NULL,
  max_results INTEGER NOT NULL DEFAULT 20,
  website_filter TEXT NOT NULL DEFAULT 'all'
  CHECK (website_filter IN ('all', 'has-website', 'no-website')),
  find_emails BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_run_at TIMESTAMP WITH TIME ZONE,
  last_total_results INTEGER NOT NULL DEFAULT 0,
  last_new_results INTEGER NOT NULL DEFAULT 0,
  latest_search_id UUID REFERENCES public.searches(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scheduled_search_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_search_id UUID NOT NULL REFERENCES public.scheduled_searches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  search_id UUID REFERENCES public.searches(id) ON DELETE SET NULL,
  run_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  run_finished_at TIMESTAMP WITH TIME ZONE,
  total_results INTEGER NOT NULL DEFAULT 0,
  new_results INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success'
  CHECK (status IN ('success', 'failed')),
  error_message TEXT
);

ALTER TABLE public.searches
ADD COLUMN IF NOT EXISTS scheduled_search_id UUID REFERENCES public.scheduled_searches(id) ON DELETE SET NULL;

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS scheduled_search_id UUID REFERENCES public.scheduled_searches(id) ON DELETE SET NULL;

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS is_new_in_run BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_scheduled_searches_next_run_at
ON public.scheduled_searches (enabled, next_run_at);

CREATE INDEX IF NOT EXISTS idx_leads_scheduled_search_place
ON public.leads (user_id, scheduled_search_id, place_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_search_runs_schedule_started
ON public.scheduled_search_runs (scheduled_search_id, run_started_at DESC);

-- SMS campaign logging
CREATE TABLE IF NOT EXISTS public.sms_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  search_id UUID REFERENCES public.searches(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued'
  CHECK (status IN ('queued', 'sending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.sms_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.sms_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'skipped'
  CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.scheduled_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_search_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_sends ENABLE ROW LEVEL SECURITY;

-- Policies: scheduled_searches
DROP POLICY IF EXISTS "scheduled_searches_select_own" ON public.scheduled_searches;
DROP POLICY IF EXISTS "scheduled_searches_insert_own" ON public.scheduled_searches;
DROP POLICY IF EXISTS "scheduled_searches_update_own" ON public.scheduled_searches;
DROP POLICY IF EXISTS "scheduled_searches_delete_own" ON public.scheduled_searches;

CREATE POLICY "scheduled_searches_select_own" ON public.scheduled_searches
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "scheduled_searches_insert_own" ON public.scheduled_searches
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scheduled_searches_update_own" ON public.scheduled_searches
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "scheduled_searches_delete_own" ON public.scheduled_searches
FOR DELETE USING (auth.uid() = user_id);

-- Policies: scheduled_search_runs
DROP POLICY IF EXISTS "scheduled_search_runs_select_own" ON public.scheduled_search_runs;
DROP POLICY IF EXISTS "scheduled_search_runs_insert_own" ON public.scheduled_search_runs;
DROP POLICY IF EXISTS "scheduled_search_runs_update_own" ON public.scheduled_search_runs;
DROP POLICY IF EXISTS "scheduled_search_runs_delete_own" ON public.scheduled_search_runs;

CREATE POLICY "scheduled_search_runs_select_own" ON public.scheduled_search_runs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "scheduled_search_runs_insert_own" ON public.scheduled_search_runs
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "scheduled_search_runs_update_own" ON public.scheduled_search_runs
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "scheduled_search_runs_delete_own" ON public.scheduled_search_runs
FOR DELETE USING (auth.uid() = user_id);

-- Policies: sms_campaigns
DROP POLICY IF EXISTS "sms_campaigns_select_own" ON public.sms_campaigns;
DROP POLICY IF EXISTS "sms_campaigns_insert_own" ON public.sms_campaigns;
DROP POLICY IF EXISTS "sms_campaigns_update_own" ON public.sms_campaigns;
DROP POLICY IF EXISTS "sms_campaigns_delete_own" ON public.sms_campaigns;

CREATE POLICY "sms_campaigns_select_own" ON public.sms_campaigns
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sms_campaigns_insert_own" ON public.sms_campaigns
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sms_campaigns_update_own" ON public.sms_campaigns
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sms_campaigns_delete_own" ON public.sms_campaigns
FOR DELETE USING (auth.uid() = user_id);

-- Policies: sms_sends
DROP POLICY IF EXISTS "sms_sends_select_own" ON public.sms_sends;
DROP POLICY IF EXISTS "sms_sends_insert_own" ON public.sms_sends;
DROP POLICY IF EXISTS "sms_sends_update_own" ON public.sms_sends;
DROP POLICY IF EXISTS "sms_sends_delete_own" ON public.sms_sends;

CREATE POLICY "sms_sends_select_own" ON public.sms_sends
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sms_sends_insert_own" ON public.sms_sends
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sms_sends_update_own" ON public.sms_sends
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sms_sends_delete_own" ON public.sms_sends
FOR DELETE USING (auth.uid() = user_id);
