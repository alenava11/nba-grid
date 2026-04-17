import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ijlcbakuxnvkhncwuvde.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqbGNiYWt1eG52a2huY3d1dmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTUwNjEsImV4cCI6MjA5MjAzMTA2MX0.OVilCJjWXkmXwAAIPbMuojIZuYiWx7VX9y-5ixbSvBI'
)