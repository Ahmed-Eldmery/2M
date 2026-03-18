import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import InventoryReceipts from "./pages/InventoryReceipts";
import Customers from "./pages/Customers";
import CustomerOrders from "./pages/CustomerOrders";
import Orders from "./pages/Orders";
import Accounting from "./pages/Accounting";
import Employees from "./pages/Employees";
import Suppliers from "./pages/Suppliers";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import OwnerSetup from "./pages/OwnerSetup";
import NotFound from "./pages/NotFound";
import Attendance from "./pages/Attendance";
import Backups from "./pages/Backups";
import Reports from "./pages/Reports";
import Tasks from "./pages/Tasks";
import OrdersCalendar from "./pages/OrdersCalendar";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { ownerExists, loading, checkOwnerExists } = useAuth();

  // Show loading while checking owner status
  if (loading || ownerExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no owner exists, show setup screen
  if (ownerExists === false) {
    return (
      <Routes>
        <Route 
          path="*" 
          element={
            <OwnerSetup 
              onComplete={() => {
                checkOwnerExists();
              }} 
            />
          } 
        />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/inventory/receipts" element={<InventoryReceipts />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:customerId/orders" element={<CustomerOrders />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/calendar" element={<OrdersCalendar />} />
                <Route path="/accounting" element={<Accounting />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/backups" element={<Backups />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
