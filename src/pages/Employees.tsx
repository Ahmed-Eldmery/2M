import { useState } from 'react';
import { Plus, User, Phone, DollarSign, Calendar, Edit, FileText, X, Loader2, Check } from 'lucide-react';
import { useEmployees, DbEmployee } from '@/hooks/useSupabaseData';
import { formatCurrency } from '@/data/mockData';
import ExcelImportExport from '@/components/ExcelImportExport';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SalaryRecord {
  id: string;
  employee_id: string;
  amount: number;
  type: string;
  month: string;
  notes: string | null;
  created_at: string;
}

const Employees = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState<DbEmployee | null>(null);
  const [showSalaryRecordsModal, setShowSalaryRecordsModal] = useState<DbEmployee | null>(null);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<DbEmployee | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { employees, loading, addEmployee, updateEmployee, fetchEmployees } = useEmployees();

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    salary: 0,
    phone: '',
    hire_date: new Date().toISOString().split('T')[0],
  });

  const [salaryFormData, setSalaryFormData] = useState({
    amount: 0,
    type: 'salary',
    month: new Date().toISOString().slice(0, 7),
    notes: '',
  });

  const totalSalaries = employees.reduce((sum, emp) => sum + emp.salary, 0);

  const resetForm = () => {
    setFormData({ 
      name: '', 
      position: '', 
      salary: 0, 
      phone: '',
      hire_date: new Date().toISOString().split('T')[0],
    });
  };

  const handleAddEmployee = async () => {
    if (!formData.name || !formData.position || formData.salary <= 0) return;

    setIsSubmitting(true);
    try {
      await addEmployee({
        name: formData.name,
        position: formData.position,
        salary: formData.salary,
        phone: formData.phone || null,
        hire_date: formData.hire_date,
      });
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editingEmployee) return;

    setIsSubmitting(true);
    try {
      await updateEmployee(editingEmployee.id, {
        name: formData.name,
        position: formData.position,
        salary: formData.salary,
        phone: formData.phone || null,
        hire_date: formData.hire_date,
      });
      setShowEditModal(false);
      setEditingEmployee(null);
      resetForm();
    } catch (error) {
      // Error handled in hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (employee: DbEmployee) => {
    setFormData({
      name: employee.name,
      position: employee.position,
      salary: employee.salary,
      phone: employee.phone || '',
      hire_date: employee.hire_date,
    });
    setEditingEmployee(employee);
    setShowEditModal(true);
  };

  const openSalaryModal = (employee: DbEmployee) => {
    setSalaryFormData({
      amount: employee.salary,
      type: 'salary',
      month: new Date().toISOString().slice(0, 7),
      notes: '',
    });
    setShowSalaryModal(employee);
  };

  const handlePaySalary = async () => {
    if (!showSalaryModal || salaryFormData.amount <= 0) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('salary_records')
        .insert({
          employee_id: showSalaryModal.id,
          amount: salaryFormData.amount,
          type: salaryFormData.type,
          month: salaryFormData.month,
          notes: salaryFormData.notes || null,
        });

      if (error) throw error;

      toast.success('تم تسجيل صرف الراتب بنجاح');
      setShowSalaryModal(null);
    } catch (error) {
      console.error('Error paying salary:', error);
      toast.error('فشل في تسجيل الراتب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchSalaryRecords = async (employeeId: string) => {
    setLoadingRecords(true);
    try {
      const { data, error } = await supabase
        .from('salary_records')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSalaryRecords(data || []);
    } catch (error) {
      console.error('Error fetching salary records:', error);
      toast.error('فشل في تحميل سجل الرواتب');
    } finally {
      setLoadingRecords(false);
    }
  };

  const openSalaryRecordsModal = async (employee: DbEmployee) => {
    setShowSalaryRecordsModal(employee);
    await fetchSalaryRecords(employee.id);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إدارة الموظفين</h1>
          <p className="text-muted-foreground">إدارة بيانات الموظفين والرواتب</p>
        </div>
        <div className="flex gap-2">
          <ExcelImportExport tableName="employees" onImportComplete={fetchEmployees} />
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            إضافة موظف
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">عدد الموظفين</p>
              <p className="text-2xl font-bold text-foreground">{employees.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الرواتب</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalSalaries)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الشهر الحالي</p>
              <p className="text-2xl font-bold text-foreground">
                {new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Employees List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((employee) => (
          <div key={employee.id} className="glass-card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{employee.name}</h3>
                  <p className="text-sm text-primary">{employee.position}</p>
                </div>
              </div>
              <button 
                onClick={() => openEditModal(employee)}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            {employee.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Phone className="w-4 h-4" />
                {employee.phone}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground">الراتب</p>
                <p className="text-xl font-bold text-success">{formatCurrency(employee.salary)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تاريخ التعيين</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(employee.hire_date).toLocaleDateString('ar-EG')}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button 
                onClick={() => openSalaryModal(employee)}
                className="flex-1 py-2 text-center text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                صرف راتب
              </button>
              <button 
                onClick={() => openSalaryRecordsModal(employee)}
                className="flex-1 py-2 text-center text-sm text-secondary hover:bg-secondary/10 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                سجل الرواتب
              </button>
            </div>
          </div>
        ))}
      </div>

      {employees.length === 0 && (
        <div className="glass-card p-12 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">لا يوجد موظفين حالياً</p>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">إضافة موظف جديد</h2>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">اسم الموظف</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="الاسم الكامل"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">الوظيفة</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="input-field"
                  placeholder="مثال: مصمم جرافيك"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">الراتب (ج.م)</label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">رقم الهاتف (اختياري)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder="01xxxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">تاريخ التعيين</label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddEmployee}
                  className="btn-primary flex-1"
                  disabled={!formData.name || !formData.position || formData.salary <= 0 || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'إضافة الموظف'}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="btn-outline flex-1"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">تعديل بيانات الموظف</h2>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEmployee(null);
                  resetForm();
                }}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">اسم الموظف</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="الاسم الكامل"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">الوظيفة</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="input-field"
                  placeholder="مثال: مصمم جرافيك"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">الراتب (ج.م)</label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">رقم الهاتف (اختياري)</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder="01xxxxxxxxx"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">تاريخ التعيين</label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateEmployee}
                  className="btn-primary flex-1"
                  disabled={!formData.name || !formData.position || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ التغييرات'}
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEmployee(null);
                    resetForm();
                  }}
                  className="btn-outline flex-1"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Salary Modal */}
      {showSalaryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">صرف راتب - {showSalaryModal.name}</h2>
              <button 
                onClick={() => setShowSalaryModal(null)}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">نوع الصرف</label>
                <select
                  value={salaryFormData.type}
                  onChange={(e) => setSalaryFormData({ ...salaryFormData, type: e.target.value })}
                  className="input-field"
                >
                  <option value="salary">راتب شهري</option>
                  <option value="bonus">مكافأة</option>
                  <option value="advance">سلفة</option>
                  <option value="deduction">خصم</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">المبلغ (ج.م)</label>
                <input
                  type="number"
                  value={salaryFormData.amount}
                  onChange={(e) => setSalaryFormData({ ...salaryFormData, amount: Number(e.target.value) })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">الشهر</label>
                <input
                  type="month"
                  value={salaryFormData.month}
                  onChange={(e) => setSalaryFormData({ ...salaryFormData, month: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">ملاحظات (اختياري)</label>
                <textarea
                  value={salaryFormData.notes}
                  onChange={(e) => setSalaryFormData({ ...salaryFormData, notes: e.target.value })}
                  className="input-field min-h-[80px]"
                  placeholder="أي ملاحظات..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handlePaySalary}
                  className="btn-primary flex-1"
                  disabled={salaryFormData.amount <= 0 || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Check className="w-4 h-4" />
                      تأكيد الصرف
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowSalaryModal(null)}
                  className="btn-outline flex-1"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Salary Records Modal */}
      {showSalaryRecordsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-lg animate-scale-in max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">سجل الرواتب - {showSalaryRecordsModal.name}</h2>
              <button 
                onClick={() => {
                  setShowSalaryRecordsModal(null);
                  setSalaryRecords([]);
                }}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingRecords ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : salaryRecords.length > 0 ? (
                <div className="space-y-3">
                  {salaryRecords.map((record) => (
                    <div key={record.id} className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          record.type === 'salary' ? 'bg-success/15 text-success' :
                          record.type === 'bonus' ? 'bg-primary/15 text-primary' :
                          record.type === 'advance' ? 'bg-warning/15 text-warning' :
                          'bg-destructive/15 text-destructive'
                        }`}>
                          {record.type === 'salary' ? 'راتب' :
                           record.type === 'bonus' ? 'مكافأة' :
                           record.type === 'advance' ? 'سلفة' : 'خصم'}
                        </span>
                        <span className="text-lg font-bold text-foreground">{formatCurrency(record.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>الشهر: {record.month}</span>
                        <span>{new Date(record.created_at).toLocaleDateString('ar-EG')}</span>
                      </div>
                      {record.notes && (
                        <p className="text-sm text-muted-foreground mt-2 bg-background p-2 rounded">
                          {record.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">لا يوجد سجلات رواتب</p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-border">
              <button
                onClick={() => {
                  setShowSalaryRecordsModal(null);
                  setSalaryRecords([]);
                }}
                className="btn-outline w-full"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;