-- Add customer type field
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'regular' CHECK (customer_type IN ('regular', 'open_account', 'vip'));

-- Create order items table for multiple items per order with delivery tracking
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.print_orders(id) ON DELETE CASCADE,
    item_name text NOT NULL,
    description text,
    quantity integer NOT NULL DEFAULT 1,
    is_delivered boolean NOT NULL DEFAULT false,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_items
CREATE POLICY "Authenticated users can view order items"
    ON public.order_items FOR SELECT
    USING (true);

CREATE POLICY "Owners can manage order items"
    ON public.order_items FOR ALL
    USING (has_role(auth.uid(), 'owner'));

CREATE POLICY "Designers can update order items"
    ON public.order_items FOR UPDATE
    USING (has_role(auth.uid(), 'designer'));

CREATE POLICY "Printers can update order items"
    ON public.order_items FOR UPDATE
    USING (has_role(auth.uid(), 'printer'));

-- Enable realtime for order_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;