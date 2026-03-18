-- Add code column to inventory table
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS code TEXT;

-- Create unique index on code
CREATE UNIQUE INDEX IF NOT EXISTS inventory_code_unique ON public.inventory(code) WHERE code IS NOT NULL;

-- Create incoming receipts table for inventory additions
CREATE TABLE public.inventory_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT,
  notes TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create receipt items table
CREATE TABLE public.inventory_receipt_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID NOT NULL REFERENCES public.inventory_receipts(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.inventory(id),
  item_name TEXT NOT NULL,
  item_code TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0
);

-- Create order inventory items table (for linking orders to inventory deduction)
CREATE TABLE public.order_inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.print_orders(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id),
  quantity_used NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.inventory_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_inventory_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_receipts
CREATE POLICY "Authenticated users can view receipts"
ON public.inventory_receipts FOR SELECT
USING (true);

CREATE POLICY "Owners and warehouse can manage receipts"
ON public.inventory_receipts FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'warehouse'::app_role));

-- RLS policies for inventory_receipt_items
CREATE POLICY "Authenticated users can view receipt items"
ON public.inventory_receipt_items FOR SELECT
USING (true);

CREATE POLICY "Owners and warehouse can manage receipt items"
ON public.inventory_receipt_items FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'warehouse'::app_role));

-- RLS policies for order_inventory_items
CREATE POLICY "Authenticated users can view order inventory"
ON public.order_inventory_items FOR SELECT
USING (true);

CREATE POLICY "Owners can manage order inventory"
ON public.order_inventory_items FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));