import { forwardRef } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PDFInvoiceProps {
  order: {
    order_number: string;
    customer_name: string;
    work_type: string;
    dimensions?: string;
    quantity: number;
    price: number;
    paid: number;
    remaining: number;
    notes?: string;
    created_at: string;
  };
  companySettings?: {
    company_name: string;
    address?: string;
    phone?: string;
    email?: string;
    tax_number?: string;
    invoice_footer?: string;
  };
  items?: InvoiceItem[];
}

const PDFInvoice = forwardRef<HTMLDivElement, PDFInvoiceProps>(
  ({ order, companySettings, items }, ref) => {
    const defaultCompany = {
      company_name: '2M للدعاية والإعلان',
      address: 'مصر',
      phone: '01000000000',
      email: '',
      tax_number: '',
      invoice_footer: 'شكراً لتعاملكم معنا'
    };

    const company = companySettings || defaultCompany;

    // Generate items from order if not provided
    const invoiceItems: InvoiceItem[] = items || [
      {
        description: `${order.work_type}${order.dimensions ? ` - ${order.dimensions}` : ''}`,
        quantity: order.quantity,
        unitPrice: order.price / order.quantity,
        total: order.price
      }
    ];

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 min-h-[297mm] w-[210mm] mx-auto"
        style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}
      >
        {/* Header */}
        <div className="flex justify-between items-start border-b-4 border-amber-500 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{company.company_name}</h1>
            {company.address && (
              <p className="text-gray-600 mt-1">{company.address}</p>
            )}
            {company.phone && (
              <p className="text-gray-600">هاتف: {company.phone}</p>
            )}
            {company.email && (
              <p className="text-gray-600">البريد: {company.email}</p>
            )}
            {company.tax_number && (
              <p className="text-gray-600 text-sm mt-2">الرقم الضريبي: {company.tax_number}</p>
            )}
          </div>
          <div className="text-left">
            <div className="bg-amber-500 text-white px-6 py-3 rounded-lg">
              <p className="text-lg font-bold">فاتورة</p>
              <p className="text-sm">INVOICE</p>
            </div>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold text-gray-700 mb-2">معلومات الفاتورة</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-500">رقم الفاتورة:</span> {order.order_number}</p>
              <p><span className="text-gray-500">التاريخ:</span> {format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ar })}</p>
              <p><span className="text-gray-500">الوقت:</span> {format(new Date(order.created_at), 'hh:mm a', { locale: ar })}</p>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-bold text-gray-700 mb-2">معلومات العميل</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-500">الاسم:</span> {order.customer_name}</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="text-right py-3 px-4 font-semibold">#</th>
                <th className="text-right py-3 px-4 font-semibold">الوصف</th>
                <th className="text-center py-3 px-4 font-semibold">الكمية</th>
                <th className="text-center py-3 px-4 font-semibold">سعر الوحدة</th>
                <th className="text-left py-3 px-4 font-semibold">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {invoiceItems.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 px-4 text-gray-600">{index + 1}</td>
                  <td className="py-3 px-4">{item.description}</td>
                  <td className="py-3 px-4 text-center">{item.quantity}</td>
                  <td className="py-3 px-4 text-center">{item.unitPrice.toFixed(2)} ج.م</td>
                  <td className="py-3 px-4 text-left font-medium">{item.total.toFixed(2)} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-72">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">الإجمالي:</span>
              <span className="font-medium">{order.price.toFixed(2)} ج.م</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">المدفوع:</span>
              <span className="font-medium text-green-600">{order.paid.toFixed(2)} ج.م</span>
            </div>
            <div className="flex justify-between py-3 bg-amber-50 px-3 rounded-lg mt-2">
              <span className="font-bold">المتبقي:</span>
              <span className="font-bold text-amber-600 text-lg">{order.remaining.toFixed(2)} ج.م</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-gray-700 mb-2">ملاحظات</h3>
            <p className="text-gray-600 text-sm">{order.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-gray-200 pt-6 mt-auto">
          <div className="text-center">
            {company.invoice_footer && (
              <p className="text-lg font-semibold text-amber-600 mb-2">
                {company.invoice_footer}
              </p>
            )}
            <p className="text-sm text-gray-500">
              تم إنشاء هذه الفاتورة إلكترونياً بواسطة نظام {company.company_name}
            </p>
          </div>
        </div>

        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
          <span className="text-[120px] font-bold transform -rotate-45">
            {company.company_name}
          </span>
        </div>
      </div>
    );
  }
);

PDFInvoice.displayName = 'PDFInvoice';

export default PDFInvoice;
