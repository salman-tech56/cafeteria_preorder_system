import React from 'react';
import { CheckCircle2, Clock, MapPin, Receipt, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const OrderConfirmationModal = ({ order, onClose }) => {
  const navigate = useNavigate();

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-4 ring-8 ring-emerald-500/10">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h3 className="text-2xl font-black font-display text-white">
            Pre-Order Confirmed!
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Your items are reserved and the kitchen has received your order.
          </p>

          {/* Order Details Card */}
          <div className="mt-6 p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Order Number
                </span>
                <span className="text-base font-extrabold text-brand-400 font-mono">
                  {order.orderNumber}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {order.status || 'Placed'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Pickup Window:
                </span>
                <span className="font-bold text-white mt-0.5 block">{order.slotLabel}</span>
              </div>

              <div>
                <span className="text-slate-400 flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-brand-400" />
                  Total Amount:
                </span>
                <span className="font-bold text-white mt-0.5 block">₹{order.grandTotal}</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Cafeteria Express Pickup Counter #2
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                onClose();
                navigate('/my-orders');
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Track in My Orders</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
