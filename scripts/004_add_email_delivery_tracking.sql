-- Add provider + delivery tracking metadata to email sends
ALTER TABLE public.email_sends
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'unknown'
CHECK (provider IN ('gmail', 'resend', 'unknown'));

ALTER TABLE public.email_sends
ADD COLUMN IF NOT EXISTS provider_message_id TEXT;

ALTER TABLE public.email_sends
ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'accepted'
CHECK (
  delivery_status IN (
    'accepted',
    'delivered',
    'bounced',
    'failed',
    'complained',
    'opened',
    'clicked',
    'delivery_delayed'
  )
);

ALTER TABLE public.email_sends
ADD COLUMN IF NOT EXISTS delivery_event_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.email_sends
ADD COLUMN IF NOT EXISTS delivery_error TEXT;

CREATE INDEX IF NOT EXISTS idx_email_sends_provider_message_id
ON public.email_sends (provider_message_id);

CREATE INDEX IF NOT EXISTS idx_email_sends_delivery_status
ON public.email_sends (delivery_status);

CREATE INDEX IF NOT EXISTS idx_email_sends_lead_id_sent_at
ON public.email_sends (lead_id, sent_at DESC);
