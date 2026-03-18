-- جدول المهام للموظفين
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمهام
CREATE POLICY "Authenticated users can view tasks"
ON public.tasks FOR SELECT
USING (true);

CREATE POLICY "Owners and accountants can manage tasks"
ON public.tasks FOR ALL
USING (is_owner_or_accountant(auth.uid()));

-- تحديث التاريخ تلقائياً
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- تفعيل Realtime للمهام
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;