import { forwardRef } from 'react';
import { DbPrintOrder } from '@/hooks/useSupabaseData';
import { formatCurrency } from '@/data/mockData';

interface OrderReceiptProps {
  order: DbPrintOrder;
  companyName?: string;
  companyPhone?: string;
}

const OrderReceipt = forwardRef<HTMLDivElement, OrderReceiptProps>(
  ({ order, companyName = '2M للدعاية والإعلان', companyPhone = '01000000000' }, ref) => {
    return (
      <div 
        ref={ref}
        className="bg-white p-8 text-black"
        style={{ width: '210mm', minHeight: '148mm', fontFamily: 'Arial, sans-serif' }}
        dir="rtl"
      >
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold mb-1">{companyName}</h1>
          <p className="text-sm">للدعاية والإعلان وجميع أعمال الطباعة</p>
          <p className="text-sm">ت: {companyPhone}</p>
        </div>

        {/* Order Info */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-lg font-bold">إذن طباعة</p>
            <p className="text-xl font-bold text-primary">{order.order_number}</p>
          </div>
          <div className="text-left">
            <p className="text-sm">التاريخ: {new Date(order.created_at).toLocaleDateString('ar-EG')}</p>
            <p className="text-sm">الوقت: {new Date(order.created_at).toLocaleTimeString('ar-EG')}</p>
          </div>
        </div>

        {/* Customer */}
        <div className="border border-black p-4 mb-6">
          <p className="font-bold mb-2">بيانات العميل</p>
          <p className="text-lg">{order.customer_name}</p>
        </div>

        {/* Order Details */}
        <table className="w-full border-collapse border border-black mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-right">البيان</th>
              <th className="border border-black p-2 text-center">التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2">نوع العمل</td>
              <td className="border border-black p-2 text-center">{order.work_type}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">المقاسات</td>
              <td className="border border-black p-2 text-center">{order.dimensions || '-'}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">الكمية</td>
              <td className="border border-black p-2 text-center">{order.quantity} قطعة</td>
            </tr>
            {order.notes && (
              <tr>
                <td className="border border-black p-2">ملاحظات</td>
                <td className="border border-black p-2 text-center">{order.notes}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pricing */}
        <div className="border-2 border-black p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">الإجمالي</p>
              <p className="text-xl font-bold">{formatCurrency(order.price)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">المدفوع</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(order.paid)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">المتبقي</p>
              <p className={`text-xl font-bold ${order.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(order.remaining)}
              </p>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12">
          <div className="text-center">
            <div className="border-t border-black pt-2">
              <p className="text-sm">توقيع العميل</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2">
              <p className="text-sm">توقيع المسؤول</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-300">
          <p>شكراً لتعاملكم معنا - نتمنى لكم التوفيق</p>
        </div>
      </div>
    );
  }
);

OrderReceipt.displayName = 'OrderReceipt';

export default OrderReceipt;
