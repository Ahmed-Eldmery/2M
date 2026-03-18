-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('owner', 'accountant', 'designer', 'printer', 'warehouse');

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Create payment_methods enum
CREATE TYPE public.payment_method AS ENUM ('cash', 'instapay_alaa', 'instapay_amr', 'vodafone_alaa', 'vodafone_amr');

-- Create inventory table
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('meter', 'sqm', 'piece')),
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    alert_threshold DECIMAL(10,2) NOT NULL DEFAULT 0,
    purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suppliers table
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    total_owed DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supplier_items table
CREATE TABLE public.supplier_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    item_name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT
);

-- Create customers table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    total_orders INTEGER NOT NULL DEFAULT 0,
    total_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order_status enum
CREATE TYPE public.order_status AS ENUM ('new', 'design', 'printing', 'printed', 'waiting_outside', 'delivered');

-- Create print_orders table
CREATE TABLE public.print_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    work_type TEXT NOT NULL,
    dimensions TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid DECIMAL(10,2) NOT NULL DEFAULT 0,
    remaining DECIMAL(10,2) GENERATED ALWAYS AS (price - paid) STORED,
    status order_status NOT NULL DEFAULT 'new',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    order_id UUID REFERENCES public.print_orders(id) ON DELETE SET NULL,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    recipient TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create employees table
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    phone TEXT,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create salary_records table
CREATE TABLE public.salary_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('salary', 'advance', 'deduction')),
    amount DECIMAL(10,2) NOT NULL,
    month TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    entity_type TEXT,
    entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Create is_owner_or_accountant function
CREATE OR REPLACE FUNCTION public.is_owner_or_accountant(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role IN ('owner', 'accountant')
    )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Owners can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'owner'));

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- Inventory policies
CREATE POLICY "Authenticated users can view inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners and warehouse can manage inventory" ON public.inventory FOR ALL USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'warehouse')
);

-- Suppliers policies
CREATE POLICY "Owners and accountants can view suppliers" ON public.suppliers FOR SELECT USING (public.is_owner_or_accountant(auth.uid()));
CREATE POLICY "Owners can manage suppliers" ON public.suppliers FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- Supplier items policies
CREATE POLICY "Owners and accountants can view supplier items" ON public.supplier_items FOR SELECT USING (public.is_owner_or_accountant(auth.uid()));
CREATE POLICY "Owners can manage supplier items" ON public.supplier_items FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- Customers policies
CREATE POLICY "Authenticated users can view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners and accountants can manage customers" ON public.customers FOR ALL USING (public.is_owner_or_accountant(auth.uid()));

-- Print orders policies
CREATE POLICY "Authenticated users can view orders" ON public.print_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can manage all orders" ON public.print_orders FOR ALL USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Designers can update design orders" ON public.print_orders FOR UPDATE USING (
    public.has_role(auth.uid(), 'designer') AND status IN ('new', 'design')
);
CREATE POLICY "Printers can update printing orders" ON public.print_orders FOR UPDATE USING (
    public.has_role(auth.uid(), 'printer') AND status IN ('design', 'printing', 'printed', 'waiting_outside')
);

-- Transactions policies
CREATE POLICY "Owners and accountants can view transactions" ON public.transactions FOR SELECT USING (public.is_owner_or_accountant(auth.uid()));
CREATE POLICY "Owners and accountants can manage transactions" ON public.transactions FOR ALL USING (public.is_owner_or_accountant(auth.uid()));

-- Employees policies
CREATE POLICY "Owners and accountants can view employees" ON public.employees FOR SELECT USING (public.is_owner_or_accountant(auth.uid()));
CREATE POLICY "Owners can manage employees" ON public.employees FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- Salary records policies
CREATE POLICY "Owners and accountants can view salary records" ON public.salary_records FOR SELECT USING (public.is_owner_or_accountant(auth.uid()));
CREATE POLICY "Owners can manage salary records" ON public.salary_records FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- Activity logs policies
CREATE POLICY "Owners can view all logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Users can create logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email), NEW.email);
    RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_print_orders_updated_at BEFORE UPDATE ON public.print_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications and print_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_orders;