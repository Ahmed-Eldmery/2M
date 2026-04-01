import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  GripVertical, 
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  Trash2,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useEmployees } from '@/hooks/useSupabaseData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
}

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const { employees } = useEmployees();
  const { isOwnerOrAccountant } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assigned_to: '',
    due_date: ''
  });

  const columns = [
    { id: 'todo', title: 'قيد الانتظار', icon: Clock, color: 'bg-slate-500' },
    { id: 'in_progress', title: 'قيد التنفيذ', icon: AlertCircle, color: 'bg-blue-500' },
    { id: 'review', title: 'للمراجعة', icon: Search, color: 'bg-orange-500' },
    { id: 'done', title: 'مكتمل', icon: CheckCircle2, color: 'bg-green-500' }
  ];

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-500',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500'
  };

  const priorityLabels: Record<string, string> = {
    low: 'منخفض',
    medium: 'متوسط',
    high: 'عالي',
    urgent: 'عاجل'
  };

  useEffect(() => {
    fetchTasks();
    
    // الاستماع للتغييرات في الوقت الفعلي
    const channel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data as Task[] || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال عنوان المهمة', variant: 'destructive' });
      return;
    }

    try {
      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update({
            title: formData.title,
            description: formData.description || null,
            priority: formData.priority,
            assigned_to: formData.assigned_to || null,
            due_date: formData.due_date || null
          })
          .eq('id', editingTask.id);

        if (error) throw error;
        toast({ title: 'تم التحديث', description: 'تم تحديث المهمة بنجاح' });
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert({
            title: formData.title,
            description: formData.description || null,
            priority: formData.priority,
            assigned_to: formData.assigned_to || null,
            due_date: formData.due_date || null,
            status: 'todo'
          });

        if (error) throw error;
        toast({ title: 'تمت الإضافة', description: 'تم إضافة المهمة بنجاح' });
      }

      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving task:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء حفظ المهمة', variant: 'destructive' });
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      toast({ title: 'تم الحذف', description: 'تم حذف المهمة بنجاح' });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء حذف المهمة', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'done') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      assigned_to: '',
      due_date: ''
    });
    setEditingTask(null);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      assigned_to: task.assigned_to || '',
      due_date: task.due_date || ''
    });
    setIsDialogOpen(true);
  };

  // Drag and Drop handlers
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: string) => {
    if (draggedTask && draggedTask.status !== status) {
      handleStatusChange(draggedTask.id, status);
    }
    setDraggedTask(null);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const getTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };

  const getEmployeeName = (employeeId: string | null) => {
    if (!employeeId) return null;
    const employee = employees.find(e => e.id === employeeId);
    return employee?.name || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إدارة المهام</h1>
          <p className="text-muted-foreground">تتبع وإدارة مهام الموظفين</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          {isOwnerOrAccountant() && (
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                مهمة جديدة
              </Button>
            </DialogTrigger>
          )}
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>عنوان المهمة *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="أدخل عنوان المهمة"
                />
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="أدخل وصف المهمة"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الأولوية</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v: any) => setFormData({ ...formData, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفض</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="high">عالي</SelectItem>
                      <SelectItem value="urgent">عاجل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>تاريخ الاستحقاق</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>تعيين لموظف</Label>
                <Select
                  value={formData.assigned_to || 'none'}
                  onValueChange={(v) => setFormData({ ...formData, assigned_to: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر موظف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون تعيين</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingTask ? 'تحديث المهمة' : 'إضافة المهمة'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في المهام..."
            className="pr-10"
          />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="الأولوية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأولويات</SelectItem>
            <SelectItem value="low">منخفض</SelectItem>
            <SelectItem value="medium">متوسط</SelectItem>
            <SelectItem value="high">عالي</SelectItem>
            <SelectItem value="urgent">عاجل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(column => {
          const Icon = column.icon;
          const columnTasks = getTasksByStatus(column.id);

          return (
            <div
              key={column.id}
              className="bg-muted/30 rounded-lg p-4 min-h-[400px]"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-1.5 rounded ${column.color}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold">{column.title}</h3>
                <Badge variant="secondary" className="mr-auto">
                  {columnTasks.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {columnTasks.map(task => (
                  <Card
                    key={task.id}
                    className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={() => handleDragStart(task)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <Badge className={`${priorityColors[task.priority]} text-white text-xs`}>
                            {priorityLabels[task.priority]}
                          </Badge>
                        </div>
                        {isOwnerOrAccountant() && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => openEditDialog(task)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => handleDelete(task.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <h4 className="font-medium text-sm mb-2">{task.title}</h4>
                      
                      {task.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        {task.assigned_to && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{getEmployeeName(task.assigned_to)}</span>
                          </div>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(task.due_date), 'dd MMM', { locale: ar })}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {columnTasks.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    لا توجد مهام
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Tasks;
