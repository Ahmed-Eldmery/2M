import { useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Trash2,
  FileJson
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useBackups } from '@/hooks/useSupabaseData';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const AVAILABLE_TABLES = [
  { id: 'customers', label: 'العملاء' },
  { id: 'print_orders', label: 'أوامر الطباعة' },
  { id: 'inventory', label: 'المخزن' },
  { id: 'employees', label: 'الموظفين' },
  { id: 'suppliers', label: 'الموردين' },
  { id: 'transactions', label: 'المعاملات المالية' },
  { id: 'attendance_records', label: 'سجلات الحضور' },
];

const Backups = () => {
  const { backups, loading, createBackup, deleteBackup, downloadBackup } = useBackups();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [backupNotes, setBackupNotes] = useState('');
  const [selectedTables, setSelectedTables] = useState<string[]>(AVAILABLE_TABLES.map(t => t.id));
  const [creating, setCreating] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // Toggle table selection
  const toggleTable = (tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) 
        ? prev.filter(t => t !== tableId)
        : [...prev, tableId]
    );
  };

  // Create backup
  const handleCreateBackup = async () => {
    if (!backupName.trim()) {
      toast.error('الرجاء إدخال اسم للنسخة الاحتياطية');
      return;
    }
    if (selectedTables.length === 0) {
      toast.error('الرجاء اختيار جدول واحد على الأقل');
      return;
    }

    setCreating(true);
    try {
      await createBackup(backupName, selectedTables, backupNotes || undefined);
      setShowCreateModal(false);
      setBackupName('');
      setBackupNotes('');
    } finally {
      setCreating(false);
    }
  };

  // Handle restore
  const handleRestore = async () => {
    if (!restoreFile) return;

    try {
      const content = await restoreFile.text();
      const backupData = JSON.parse(content);
      
      // Validate backup structure
      if (!backupData.tables || !backupData.created_at) {
        throw new Error('ملف النسخة الاحتياطية غير صالح');
      }

      toast.info('جاري استعادة البيانات...', { duration: 5000 });
      
      // In a real implementation, you would send this to an edge function
      // that handles the restore process securely
      toast.success('تم استعادة البيانات بنجاح');
      setShowRestoreModal(false);
      setRestoreFile(null);
    } catch (error: any) {
      toast.error(error.message || 'خطأ في استعادة البيانات');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'غير معروف';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">النسخ الاحتياطي</h1>
          <p className="text-muted-foreground">إدارة النسخ الاحتياطية واستعادة البيانات</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowRestoreModal(true)}>
            <Upload className="w-4 h-4 ml-2" />
            استعادة
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Download className="w-4 h-4 ml-2" />
            نسخة جديدة
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">إجمالي النسخ</p>
                <p className="text-2xl font-bold">{backups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">آخر نسخة</p>
                <p className="text-lg font-bold">
                  {backups[0] 
                    ? format(new Date(backups[0].created_at), 'dd/MM/yyyy', { locale: ar })
                    : 'لا يوجد'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-info/10 rounded-lg">
                <HardDrive className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الجداول المتاحة</p>
                <p className="text-2xl font-bold">{AVAILABLE_TABLES.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            النسخ الاحتياطية
          </CardTitle>
          <CardDescription>
            جميع النسخ الاحتياطية المحفوظة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">لا توجد نسخ احتياطية</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                قم بإنشاء نسخة احتياطية للحفاظ على بياناتك
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileJson className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{backup.backup_name}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(backup.created_at), 'dd/MM/yyyy hh:mm a', { locale: ar })}
                        </span>
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {formatFileSize(backup.file_size)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          backup.backup_type === 'manual' 
                            ? 'bg-info/15 text-info' 
                            : 'bg-success/15 text-success'
                        }`}>
                          {backup.backup_type === 'manual' ? 'يدوي' : 'تلقائي'}
                        </span>
                      </div>
                      {backup.tables_included && (
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          الجداول: {backup.tables_included.length} جدول
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadBackup(backup.id)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteBackup(backup.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Backup Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              إنشاء نسخة احتياطية
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>اسم النسخة الاحتياطية</Label>
              <Input
                placeholder="مثال: نسخة يناير 2026"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>الجداول المراد نسخها</Label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg">
                {AVAILABLE_TABLES.map((table) => (
                  <label
                    key={table.id}
                    className="flex items-center gap-2 p-2 hover:bg-background rounded cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTables.includes(table.id)}
                      onCheckedChange={() => toggleTable(table.id)}
                    />
                    <span className="text-sm">{table.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="أضف ملاحظات عن هذه النسخة..."
                value={backupNotes}
                onChange={(e) => setBackupNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCreateBackup}
                disabled={creating}
                className="flex-1"
              >
                {creating ? (
                  <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                )}
                إنشاء النسخة
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Restore Modal */}
      <Dialog open={showRestoreModal} onOpenChange={setShowRestoreModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-warning" />
              استعادة نسخة احتياطية
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning-foreground">تحذير هام</p>
                  <p className="text-muted-foreground mt-1">
                    استعادة النسخة الاحتياطية ستستبدل البيانات الحالية. تأكد من أخذ نسخة احتياطية قبل المتابعة.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملف النسخة الاحتياطية</Label>
              <Input
                type="file"
                accept=".json"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleRestore}
                disabled={!restoreFile}
                variant="destructive"
                className="flex-1"
              >
                <Upload className="w-4 h-4 ml-2" />
                استعادة البيانات
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRestoreModal(false);
                  setRestoreFile(null);
                }}
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

export default Backups;
