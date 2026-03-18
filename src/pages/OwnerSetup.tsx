import { useState } from 'react';
import { Shield, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';

const emailSchema = z.string().email('البريد الإلكتروني غير صحيح');
const passwordSchema = z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
const nameSchema = z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل');

interface OwnerSetupProps {
  onComplete: () => void;
}

const OwnerSetup = ({ onComplete }: OwnerSetupProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});

  const { signIn, checkOwnerExists } = useAuth();

  const validate = () => {
    const newErrors: typeof errors = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    const nameResult = nameSchema.safeParse(name);
    if (!nameResult.success) {
      newErrors.name = nameResult.error.errors[0].message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('setup-owner', {
        body: { email, password, name }
      });

      if (error) {
        console.error('Setup error:', error);
        toast.error(error.message || 'حدث خطأ أثناء إنشاء الحساب');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('تم إنشاء حساب المالك بنجاح! جاري تسجيل الدخول...');
      
      // Automatic sign-in after successful setup
      const { error: signInError } = await signIn(email, password);
      
      if (signInError) {
        console.error('Auto sign-in error:', signInError);
        toast.error('فشل تسجيل الدخول التلقائي. يرجى تسجيل الدخول يدوياً.');
        // Still mark as complete so they can go to login page
        setIsComplete(true);
        setTimeout(() => {
          onComplete();
        }, 3000);
      } else {
        setIsComplete(true);
        // Re-check owner status to update the App state
        await checkOwnerExists();
        
        setTimeout(() => {
          onComplete();
        }, 1500);
      }

    } catch (error: any) {
      console.error('Unexpected error:', error);
      toast.error('حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-24 h-24 rounded-full bg-success/20 mx-auto flex items-center justify-center mb-6 animate-scale-in">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">تم إنشاء حساب المالك بنجاح!</h1>
          <p className="text-muted-foreground mb-4">جاري توجيهك للوحة التحكم...</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-4 shadow-lg">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">إعداد حساب المالك</h1>
          <p className="text-muted-foreground mt-2">مرحباً! قم بإنشاء حساب المالك الرئيسي للنظام</p>
        </div>

        {/* Setup Card */}
        <div className="glass-card p-8">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
            <p className="text-sm text-warning-foreground">
              ⚠️ هذه الشاشة تظهر مرة واحدة فقط. تأكد من حفظ بيانات الدخول.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">الاسم</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`input-field pr-10 ${errors.name ? 'border-destructive' : ''}`}
                  placeholder="اسم المالك"
                />
              </div>
              {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`input-field pr-10 ${errors.email ? 'border-destructive' : ''}`}
                  placeholder="owner@example.com"
                  dir="ltr"
                />
              </div>
              {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`input-field pr-10 pl-10 ${errors.password ? 'border-destructive' : ''}`}
                  placeholder="••••••••"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 mt-6"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  إنشاء حساب المالك
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-muted-foreground text-sm mt-6">
          © 2024 2M للدعاية والإعلان. جميع الحقوق محفوظة.
        </p>
      </div>
    </div>
  );
};

export default OwnerSetup;
