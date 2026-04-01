-- Add optional lead email field for outreach workflows
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add website filter metadata to searches
ALTER TABLE public.searches
ADD COLUMN IF NOT EXISTS website_filter TEXT DEFAULT 'all'
CHECK (website_filter IN ('all', 'has-website', 'no-website'));

ALTER TABLE public.searches
ADD COLUMN IF NOT EXISTS email_enrichment_enabled BOOLEAN DEFAULT false;

-- User-owned email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign-level email send records
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  search_id UUID REFERENCES public.searches(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'queued'
  CHECK (status IN ('queued', 'sending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Per-recipient send status logs
CREATE TABLE IF NOT EXISTS public.email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  status TEXT DEFAULT 'skipped'
  CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;

-- Policies: templates
DROP POLICY IF EXISTS "email_templates_select_own" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_insert_own" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_update_own" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_delete_own" ON public.email_templates;

CREATE POLICY "email_templates_select_own" ON public.email_templates
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "email_templates_insert_own" ON public.email_templates
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "email_templates_update_own" ON public.email_templates
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "email_templates_delete_own" ON public.email_templates
FOR DELETE USING (auth.uid() = user_id);

-- Policies: campaigns
DROP POLICY IF EXISTS "email_campaigns_select_own" ON public.email_campaigns;
DROP POLICY IF EXISTS "email_campaigns_insert_own" ON public.email_campaigns;
DROP POLICY IF EXISTS "email_campaigns_update_own" ON public.email_campaigns;
DROP POLICY IF EXISTS "email_campaigns_delete_own" ON public.email_campaigns;

CREATE POLICY "email_campaigns_select_own" ON public.email_campaigns
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "email_campaigns_insert_own" ON public.email_campaigns
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "email_campaigns_update_own" ON public.email_campaigns
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "email_campaigns_delete_own" ON public.email_campaigns
FOR DELETE USING (auth.uid() = user_id);

-- Policies: sends
DROP POLICY IF EXISTS "email_sends_select_own" ON public.email_sends;
DROP POLICY IF EXISTS "email_sends_insert_own" ON public.email_sends;
DROP POLICY IF EXISTS "email_sends_update_own" ON public.email_sends;
DROP POLICY IF EXISTS "email_sends_delete_own" ON public.email_sends;

CREATE POLICY "email_sends_select_own" ON public.email_sends
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "email_sends_insert_own" ON public.email_sends
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "email_sends_update_own" ON public.email_sends
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "email_sends_delete_own" ON public.email_sends
FOR DELETE USING (auth.uid() = user_id);
