import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export const CartDrawer = ({ onOpenAuthModal, onOrderSuccess }) => {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    totalGst,
    grandTotal,
    totalCount,
    selectedSlot,
    setSelectedSlot,
  } = useCart();
  const { isAuthenticated } = useAuth();

  const [slots, setSlots] = useState([]);
  const [bestSuggestedSlot, setBestSuggestedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestedAlternative, setSuggestedAlternative] = useState(null);

  // Fetch slots whenever cart is opened
  useEffect(() => {
    if (isCartOpen) {
      setLoadingSlots(true);
      api.get('/slots')
        .then((res) => {
          const fetchedSlots = res.data.slots || [];
          setSlots(fetchedSlots);
          setBestSuggestedSlot(res.data.bestSuggestedSlot || null);

          // Auto-select first available slot if none selected
          if (!selectedSlot && fetchedSlots.length > 0) {
            const firstAvailable = fetchedSlots.find((s) => s.remainingCapacity > 0);
            if (firstAvailable) setSelectedSlot(firstAvailable);
          }
        })
        .catch((err) => {
          console.error('Failed to load slots:', err);
        })
        .finally(() => setLoadingSlots(false));
    }
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const handleSlotSelect = (slot) => {
    if (slot.remainingCapacity <= 0) {
      // Slot is full! Trigger alternative suggestion
      if (slot.suggestedAlternative || bestSuggestedSlot) {
        const alt = slot.suggestedAlternative || bestSuggestedSlot;
        setSuggestedAlternative(alt);
      }
      return;
    }
    setSuggestedAlternative(null);
    setSelectedSlot(slot);
  };

  const handleCheckout = async () => {
    setErrorMessage('');

    if (!isAuthenticated) {
      onOpenAuthModal();
      return;
    }

    if (!selectedSlot) {
      setErrorMessage('Please select an active pickup time slot.');
      return;
    }

    if (selectedSlot.remainingCapacity <= 0) {
      setErrorMessage('The chosen pickup slot is fully booked. Please select an available slot.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Your tray is empty.');
      return;
    }

    setSubmittingOrder(true);
    try {
      const orderPayload = {
        pickupSlotId: selectedSlot._id,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
        })),
      };

      const res = await api.post('/orders', orderPayload);
      clearCart();
      setIsCartOpen(false);
      if (onOrderSuccess) {
        onOrderSuccess(res.data.order);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Order checkout failed. Please check item stock or choose an alternative slot.';
      setErrorMessage(errMsg);
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 text-white flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-white">Your Pre-Order Tray</h3>
                <p className="text-xs text-slate-400">{totalCount} item(s) selected</p>
              </div>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Error banner if any */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Checkout Warning</p>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Items List */}
            {items.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mb-4 text-slate-600">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-slate-300">Your tray is empty</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                  Browse the cafeteria menu and add your favorite dishes.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span>Selected Food Items</span>
                  <button
                    onClick={clearCart}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    Clear Tray
                  </button>
                </div>

                {items.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3.5 hover:border-slate-600 transition-all"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-700"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{item.name}</h4>
                      <p className="text-xs text-brand-400 font-semibold mt-0.5">
                        ₹{item.basePrice} <span className="text-[10px] text-slate-400">+5% GST</span>
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1">
                        <button
                          onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                          disabled={item.quantity >= (item.maxStock || 999)}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.menuItemId)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Time-Slotted Pickup Selector (PHASE 4 + INNOVATION 8: ALTERNATIVE SUGGESTIONS) */}
            {items.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Select Pickup Window
                  </label>
                  <span className="text-[11px] text-slate-400">Strict Capacity Control</span>
                </div>

                {/* Alternative Slot Suggestion Alert Banner */}
                {suggestedAlternative && (
                  <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Alternative Window Recommended:
                    </div>
                    <p className="mt-1 text-slate-300">
                      The selected slot is full.{' '}
                      <strong>{suggestedAlternative.slotLabel}</strong> has plenty of availability (
                      {suggestedAlternative.remainingCapacity} slots).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const target = slots.find((s) => s._id === (suggestedAlternative.id || suggestedAlternative._id));
                        if (target) {
                          setSelectedSlot(target);
                          setSuggestedAlternative(null);
                        }
                      }}
                      className="mt-2 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      Switch to {suggestedAlternative.slotLabel}
                    </button>
                  </div>
                )}

                {loadingSlots ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Loading today's cafeteria pickup slots...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {slots.map((slot) => {
                      const isFull = slot.remainingCapacity <= 0;
                      const isSelected = selectedSlot?._id === slot._id;

                      return (
                        <button
                          key={slot._id}
                          type="button"
                          onClick={() => handleSlotSelect(slot)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-brand-500/20 border-brand-500 text-white shadow-md shadow-brand-500/10'
                              : isFull
                              ? 'bg-slate-800/30 border-rose-500/20 text-slate-500'
                              : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:border-slate-600 hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-bold flex items-center justify-between">
                            <span>{slot.slotLabel}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-brand-400" />}
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px]">
                            {isFull ? (
                              <span className="text-rose-400 font-bold uppercase">FULL</span>
                            ) : (
                              <span
                                className={
                                  slot.remainingCapacity <= 5
                                    ? 'text-amber-400 font-semibold'
                                    : 'text-emerald-400 font-semibold'
                                }
                              >
                                {slot.remainingCapacity} left
                              </span>
                            )}
                            <span className="text-slate-500">{slot.maxCapacity} cap</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="p-6 border-t border-slate-800 bg-slate-950/60 backdrop-blur-md space-y-4">
              {/* Billing Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-200">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated GST (5%)</span>
                  <span className="font-semibold text-slate-200">₹{totalGst.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-extrabold text-white">
                  <span>Grand Total</span>
                  <span className="text-brand-400">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={submittingOrder || !selectedSlot || selectedSlot?.remainingCapacity <= 0}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 via-orange-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-xl shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingOrder ? (
                  <span>Securing your slot & food...</span>
                ) : !isAuthenticated ? (
                  <>
                    <span>Sign In to Place Pre-Order</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : selectedSlot?.remainingCapacity <= 0 ? (
                  <span>Slot Full — Choose Another Window</span>
                ) : (
                  <>
                    <span>Confirm & Pre-Order (₹{grandTotal.toFixed(2)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
