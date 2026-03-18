-- Create system_settings table to track setup state
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read (to check if owner setup is complete)
CREATE POLICY "Allow public read of system settings" 
ON public.system_settings
FOR SELECT 
USING (true);

-- No insert/update/delete from client - only server (edge functions with service role)