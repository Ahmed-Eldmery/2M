-- Secure workflow: status transitions are validated server-side.
DROP POLICY IF EXISTS "Designers can update design orders" ON public.print_orders;
DROP POLICY IF EXISTS "Printers can update printing orders" ON public.print_orders;

CREATE OR REPLACE FUNCTION public.transition_print_order(
  p_order_id uuid,
  p_expected_status public.order_status,
  p_new_status public.order_status
) RETURNS public.print_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_order public.print_orders; allowed boolean := false;
BEGIN
  SELECT * INTO current_order FROM public.print_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF current_order.status <> p_expected_status THEN RAISE EXCEPTION 'ORDER_STATUS_CHANGED'; END IF;
  allowed := public.has_role(auth.uid(), 'owner') OR
    (public.has_role(auth.uid(), 'designer') AND
      (p_expected_status, p_new_status) IN (('new', 'design'), ('design', 'new'), ('design', 'printing'))) OR
    (public.has_role(auth.uid(), 'printer') AND
      (p_expected_status, p_new_status) IN (
        ('printing', 'printed'), ('printed', 'printing'),
        ('printed', 'waiting_outside'), ('waiting_outside', 'printed'),
        ('waiting_outside', 'delivered')
      ));
  IF NOT allowed THEN RAISE EXCEPTION 'ORDER_TRANSITION_FORBIDDEN'; END IF;
  UPDATE public.print_orders SET status = p_new_status WHERE id = p_order_id RETURNING * INTO current_order;
  RETURN current_order;
END; $$;
REVOKE ALL ON FUNCTION public.transition_print_order(uuid, public.order_status, public.order_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_print_order(uuid, public.order_status, public.order_status) TO authenticated;

-- Atomic, locked inventory deduction; prevents partial and negative stock updates.
CREATE OR REPLACE FUNCTION public.deduct_order_inventory(p_order_id uuid, p_items jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item jsonb; stock public.inventory;
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN RAISE EXCEPTION 'INVENTORY_DEDUCTION_FORBIDDEN'; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
    SELECT * INTO stock FROM public.inventory WHERE id = (item->>'inventory_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_ITEM_NOT_FOUND'; END IF;
    IF (item->>'quantity_used')::numeric <= 0 OR stock.quantity < (item->>'quantity_used')::numeric THEN
      RAISE EXCEPTION 'INSUFFICIENT_INVENTORY: %', stock.name;
    END IF;
    UPDATE public.inventory SET quantity = quantity - (item->>'quantity_used')::numeric WHERE id = stock.id;
    INSERT INTO public.order_inventory_items(order_id, inventory_id, quantity_used)
    VALUES (p_order_id, stock.id, (item->>'quantity_used')::numeric);
  END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.deduct_order_inventory(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_order_inventory(uuid, jsonb) TO authenticated;
