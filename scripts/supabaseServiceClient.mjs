import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

/** Service-role Supabase client for Node scripts (CI + local). */
export function createServiceClient(url, serviceKey) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { WebSocket: ws },
  })
}
