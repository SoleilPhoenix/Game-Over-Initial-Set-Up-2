/**
 * Crisp Identity Verification Edge Function
 * Generates HMAC-SHA256 signature for Crisp user identity verification.
 *
 * This prevents users from impersonating others in Crisp chat.
 * The signature is generated server-side using the Crisp Secret Key
 * and the user's email address.
 *
 * Requires CRISP_SECRET_KEY as a Supabase secret.
 * Get it from: Crisp → Settings → Website Settings → Setup instructions → Identity Verification
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateHmacSignature(secret: string, email: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(email);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const crispSecret = Deno.env.get('CRISP_SECRET_KEY');

    if (!crispSecret) {
      // Gracefully skip if not configured (pre-launch)
      return new Response(
        JSON.stringify({ signature: null, configured: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Verify the user is authenticated
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.email) {
      throw new Error('Unauthorized');
    }

    const signature = await generateHmacSignature(crispSecret, user.email);

    return new Response(
      JSON.stringify({ signature, configured: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Crisp identity error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ signature: null, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: errorMessage === 'Unauthorized' ? 401 : 500 }
    );
  }
});
