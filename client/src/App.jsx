import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { CartDrawer } from './components/CartDrawer';
import { LoginModal } from './components/LoginModal';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { Toast } from './components/Toast';
import { CustomerMenu } from './pages/CustomerMenu';
import { MyOrders } from './pages/MyOrders';
import { StaffDashboard } from './pages/StaffDashboard';

// Staff Protected Route Wrapper
const StaffRoute = ({ children, onOpenAuth }) => {
  const { isStaff, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!isAuthenticated || !isStaff) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-300 max-w-md">
          <h2 className="text-xl font-bold font-display">Staff Access Required</h2>
          <p className="text-xs text-slate-400 mt-2">
            This operational dashboard is restricted to cafeteria kitchen and manager accounts.
          </p>
          <button
            onClick={onOpenAuth}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
          >
            Switch to Staff Account
          </button>
        </div>
      </div>
    );
  }

  return children;
};

function MainLayout() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (toastData) => {
    setToast(toastData);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleOrderSuccess = (order) => {
    setConfirmedOrder(order);
    showToast({
      type: 'success',
      message: `Pre-order ${order.orderNumber} successfully confirmed!`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Navbar with brand identity & role switch */}
      <Navbar onOpenAuthModal={() => setIsAuthModalOpen(true)} />

      {/* Main Pages */}
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<CustomerMenu onShowToast={showToast} />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route
            path="/staff/*"
            element={
              <StaffRoute onOpenAuth={() => setIsAuthModalOpen(true)}>
                <StaffDashboard onShowToast={showToast} />
              </StaffRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Login & Registration Modal */}
      <LoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          showToast({ type: 'success', message: 'Signed in successfully!' });
        }}
      />

      {/* Order Confirmation Modal */}
      <OrderConfirmationModal
        order={confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
      />

      {/* Floating Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <MainLayout />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
