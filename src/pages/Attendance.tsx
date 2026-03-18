import { useState, useRef } from 'react';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  Calendar, 
  User, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Search,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees, useAttendance } from '@/hooks/useSupabaseData';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const Attendance = () => {
  const { employees } = useEmployees();
  const { records, loading, checkIn, checkOut, fetchRecords, getEmployeeAttendance } = useAttendance();
  
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  // Get today's attendance
  const todayRecords = records.filter(r => 
    format(new Date(r.check_in), 'yyyy-MM-dd') === selectedDate
  );

  // Filter records
  const filteredRecords = todayRecords.filter(record => {
    const employee = employees.find(e => e.id === record.employee_id);
    const matchesSearch = employee?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Get employee name
  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.name || 'غير معروف';
  };

  // Calculate work hours
  const calculateWorkHours = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return 'جاري العمل...';
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    return `${hours} ساعة ${minutes} دقيقة`;
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const styles = {
      present: 'bg-success/15 text-success',
      late: 'bg-warning/15 text-warning-foreground',
      early_leave: 'bg-info/15 text-info',
      absent: 'bg-destructive/15 text-destructive'
    };
    const labels = {
      present: 'حاضر',
      late: 'متأخر',
      early_leave: 'انصراف مبكر',
      absent: 'غائب'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  // Handle check-in
  const handleCheckIn = async () => {
    if (!selectedEmployee) return;
    setCheckingIn(true);
    try {
      await checkIn(selectedEmployee, checkInNotes || undefined);
      setShowCheckInModal(false);
      setSelectedEmployee('');
      setCheckInNotes('');
    } finally {
      setCheckingIn(false);
    }
  };

  // Handle check-out
  const handleCheckOut = async (recordId: string) => {
    await checkOut(recordId);
  };

  // Stats
  const stats = {
    total: employees.length,
    present: todayRecords.filter(r => r.status === 'present' && !r.check_out).length,
    late: todayRecords.filter(r => r.status === 'late').length,
    absent: employees.length - new Set(todayRecords.map(r => r.employee_id)).size
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الحضور والانصراف</h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE dd MMMM yyyy', { locale: ar })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => fetchRecords()}>
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث
          </Button>
          <Button onClick={() => setShowCheckInModal(true)}>
            <LogIn className="w-4 h-4 ml-2" />
            تسجيل حضور
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-r-4 border-r-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الموظفين</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <User className="w-10 h-10 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">حاضرون الآن</p>
                <p className="text-2xl font-bold text-success">{stats.present}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-success/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">متأخرون</p>
                <p className="text-2xl font-bold text-warning-foreground">{stats.late}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-warning/20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-destructive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">غائبون</p>
                <p className="text-2xl font-bold text-destructive">{stats.absent}</p>
              </div>
              <XCircle className="w-10 h-10 text-destructive/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="present">حاضر</SelectItem>
                <SelectItem value="late">متأخر</SelectItem>
                <SelectItem value="early_leave">انصراف مبكر</SelectItem>
                <SelectItem value="absent">غائب</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            سجل الحضور - {format(new Date(selectedDate), 'dd/MM/yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">لا توجد سجلات حضور لهذا اليوم</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">الموظف</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">وقت الحضور</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">وقت الانصراف</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">ساعات العمل</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">الحالة</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">ملاحظات</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-medium">{getEmployeeName(record.employee_id)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-success">
                          <LogIn className="w-4 h-4" />
                          {format(new Date(record.check_in), 'hh:mm a', { locale: ar })}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {record.check_out ? (
                          <div className="flex items-center gap-2 text-destructive">
                            <LogOut className="w-4 h-4" />
                            {format(new Date(record.check_out), 'hh:mm a', { locale: ar })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground">
                          {calculateWorkHours(record.check_in, record.check_out)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">
                          {record.notes || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {!record.check_out && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCheckOut(record.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <LogOut className="w-4 h-4 ml-1" />
                            تسجيل انصراف
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Modal */}
      <Dialog open={showCheckInModal} onOpenChange={setShowCheckInModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-success" />
              تسجيل حضور جديد
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الموظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} - {emp.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الوقت الحالي</Label>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-3xl font-bold text-primary">
                  {format(new Date(), 'hh:mm:ss a', { locale: ar })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(), 'EEEE dd MMMM yyyy', { locale: ar })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="أضف ملاحظات..."
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCheckIn}
                disabled={!selectedEmployee || checkingIn}
                className="flex-1"
              >
                {checkingIn ? (
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                )}
                تسجيل الحضور
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCheckInModal(false)}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Attendance;
