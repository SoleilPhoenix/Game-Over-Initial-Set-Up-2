-- Store the email provider's (Resend) message id per send, so a later delivery
-- check can poll each email's status and flip bounced ones to 'bounced'.
-- Applied to production via Supabase MCP and recorded as version 20260723050510.

ALTER TABLE public.guest_invitations
  ADD COLUMN IF NOT EXISTS provider_message_id text;
