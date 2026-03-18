import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, X, Loader2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExcelImportExportProps {
  tableName: 'customers' | 'inventory' | 'employees' | 'suppliers' | 'print_orders';
  onImportComplete?: () => void;
}

const tableConfig = {
  customers: {
    label: 'العملاء',
    columns: ['name', 'phone', 'notes'],
    arabicHeaders: { name: 'الاسم', phone: 'الهاتف', notes: 'ملاحظات' },
    requiredColumns: ['name'],
  },
  inventory: {
    label: 'المخزن',
    columns: ['name', 'category', 'unit', 'quantity', 'alert_threshold', 'purchase_price'],
    arabicHeaders: { 
      name: 'الاسم', 
      category: 'التصنيف', 
      unit: 'الوحدة', 
      quantity: 'الكمية',
      alert_threshold: 'حد_التنبيه',
      purchase_price: 'سعر_الشراء'
    },
    requiredColumns: ['name', 'category', 'unit'],
  },
  employees: {
    label: 'الموظفين',
    columns: ['name', 'position', 'salary', 'phone', 'hire_date'],
    arabicHeaders: { name: 'الاسم', position: 'الوظيفة', salary: 'الراتب', phone: 'الهاتف', hire_date: 'تاريخ_التعيين' },
    requiredColumns: ['name', 'position'],
  },
  suppliers: {
    label: 'الموردين',
    columns: ['name', 'phone', 'notes', 'total_owed'],
    arabicHeaders: { name: 'الاسم', phone: 'الهاتف', notes: 'ملاحظات', total_owed: 'المستحقات' },
    requiredColumns: ['name'],
  },
  print_orders: {
    label: 'الطلبات',
    columns: ['order_number', 'customer_name', 'work_type', 'dimensions', 'quantity', 'price', 'paid', 'status', 'notes'],
    arabicHeaders: { 
      order_number: 'رقم_الإذن',
      customer_name: 'اسم_العميل', 
      work_type: 'نوع_العمل', 
      dimensions: 'المقاسات',
      quantity: 'الكمية',
      price: 'السعر',
      paid: 'المدفوع',
      status: 'الحالة',
      notes: 'ملاحظات'
    },
    requiredColumns: ['customer_name', 'work_type'],
  },
};

const ExcelImportExport = ({ tableName, onImportComplete }: ExcelImportExportProps) => {
  const [showModal, setShowModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = tableConfig[tableName];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Map Arabic headers to English
        const mappedData = jsonData.map((row: any) => {
          const mapped: any = {};
          Object.entries(config.arabicHeaders).forEach(([eng, ar]) => {
            if (row[ar] !== undefined) {
              mapped[eng] = row[ar];
            } else if (row[eng] !== undefined) {
              mapped[eng] = row[eng];
            }
          });
          return mapped;
        });

        // Validate required columns
        const validationErrors: string[] = [];
        mappedData.forEach((row, index) => {
          config.requiredColumns.forEach(col => {
            if (!row[col]) {
              validationErrors.push(`صف ${index + 2}: العمود "${config.arabicHeaders[col as keyof typeof config.arabicHeaders]}" مطلوب`);
            }
          });
        });

        setErrors(validationErrors.slice(0, 5));
        setPreviewData(mappedData);
        setShowModal(true);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      toast.error('خطأ في قراءة الملف');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (errors.length > 0) {
      toast.error('يوجد أخطاء في البيانات');
      return;
    }

    setIsImporting(true);
    try {
      const { error } = await supabase.from(tableName).insert(previewData);
      if (error) throw error;

      toast.success(`تم استيراد ${previewData.length} سجل بنجاح`);
      setShowModal(false);
      setPreviewData([]);
      onImportComplete?.();
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('خطأ في استيراد البيانات: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) throw error;

      // Map to Arabic headers
      const exportData = data?.map(row => {
        const mapped: any = {};
        Object.entries(config.arabicHeaders).forEach(([eng, ar]) => {
          if (row[eng] !== undefined) {
            mapped[ar] = row[eng];
          }
        });
        return mapped;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData || []);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, config.label);
      XLSX.writeFile(workbook, `${config.label}_${new Date().toLocaleDateString('ar-EG')}.xlsx`);

      toast.success('تم تصدير البيانات بنجاح');
    } catch (error: any) {
      toast.error('خطأ في تصدير البيانات');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [config.arabicHeaders];
    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(worksheet, [Object.values(config.arabicHeaders)], { origin: 'A1' });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, config.label);
    XLSX.writeFile(workbook, `قالب_${config.label}.xlsx`);
  };

  return (
    <>
      <div className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-outline text-sm py-2"
          title="استيراد من Excel"
        >
          <Upload className="w-4 h-4" />
          استيراد
        </button>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="btn-outline text-sm py-2"
          title="تصدير إلى Excel"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          تصدير
        </button>
      </div>

      {/* Import Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">استيراد {config.label}</h2>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setPreviewData([]);
                  setErrors([]);
                }}
                className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errors.length > 0 && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="font-medium text-destructive">أخطاء في البيانات</span>
                </div>
                {errors.map((err, i) => (
                  <p key={i} className="text-sm text-destructive">{err}</p>
                ))}
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                سيتم استيراد {previewData.length} سجل
              </p>
              <button
                onClick={downloadTemplate}
                className="text-sm text-primary hover:underline mt-1"
              >
                تحميل قالب فارغ
              </button>
            </div>

            <div className="flex-1 overflow-auto mb-4 border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {config.columns.slice(0, 5).map(col => (
                      <th key={col} className="p-2 text-right">
                        {config.arabicHeaders[col as keyof typeof config.arabicHeaders]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {config.columns.slice(0, 5).map(col => (
                        <td key={col} className="p-2">{row[col] ?? '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 10 && (
                <p className="p-2 text-center text-sm text-muted-foreground">
                  و {previewData.length - 10} سجل آخر...
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={isImporting || errors.length > 0}
                className="btn-primary flex-1"
              >
                {isImporting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'استيراد البيانات'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setPreviewData([]);
                  setErrors([]);
                }}
                className="btn-outline flex-1"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExcelImportExport;
