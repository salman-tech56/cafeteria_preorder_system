import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  ShoppingBag,
  RotateCw,
  QrCode,
  MapPin,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export const MyOrders = () => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?._id || user?.id;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTokenOrder, setSelectedTokenOrder] = useState(null);

  const fetchOrders = () => {
    setRefreshing(true);
    api.get('/orders/my-orders')
      .then((res) => {
        setOrders(res.data.orders || []);
      })
      .catch((err) => {
        console.error('Failed to load orders:', err);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    if (isAuthenticated && userId) {
      setOrders([]); // Immediately clear previous customer orders
      setLoading(true);
      fetchOrders();
      // Auto-poll every 12 seconds for status updates
      const interval = setInterval(fetchOrders, 12000);
      return () => clearInterval(interval);
    } else {
      setOrders([]);
      setLoading(false);
    }
  }, [isAuthenticated, userId]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-500">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-display">Sign In to View Your Orders</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Please sign in with your customer account to track your cafeteria pre-orders and pickup
          time slots.
        </p>
      </div>
    );
  }

  const steps = [
    { key: 'Placed', label: 'Order Placed', icon: Clock },
    { key: 'Preparing', label: 'In Kitchen', icon: ChefHat },
    { key: 'Ready', label: 'Ready for Pickup', icon: PackageCheck },
    { key: 'Collected', label: 'Collected', icon: CheckCircle2 },
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case 'Placed':
        return 0;
      case 'Preparing':
        return 1;
      case 'Ready':
        return 2;
      case 'Collected':
        return 3;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Live Tracker
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Live Status Updates
              </span>
            </div>
            <h1 className="text-3xl font-black font-display tracking-tight text-white mt-1">
              My Pre-Orders
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Track real-time kitchen preparation and express pickup slots
            </p>
          </div>

          <button
            onClick={fetchOrders}
            disabled={refreshing}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Authenticated Customer Profile Badge */}
        {user && (
          <div className="mt-6 mb-8 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-black/20">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center font-bold text-white uppercase text-lg shadow-md shadow-brand-500/20">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white tracking-tight">{user.name}</h2>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    Active Account
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-xs text-slate-400 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
              {user.phone && (
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Contact</span>
                  <span className="font-mono text-slate-300">{user.phone}</span>
                </div>
              )}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">Account Orders</span>
                <span className="font-bold text-brand-400 text-sm">{orders.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            Loading your pre-orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-600">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No active orders yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You haven't placed any pre-orders today. Browse our menu and choose a pickup window!
            </p>
          </div>
        ) : (
          <div className="space-y-6 mt-8">
            {orders.map((order) => {
              const currentStepIdx = getStepIndex(order.status);
              const isReady = order.status === 'Ready';

              return (
                <div
                  key={order._id}
                  className={`p-6 rounded-3xl border bg-slate-900/80 transition-all ${
                    isReady
                      ? 'border-emerald-500/50 shadow-xl shadow-emerald-500/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Top */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-extrabold font-mono text-brand-400">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            order.status === 'Ready'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                              : order.status === 'Preparing'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : order.status === 'Collected'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                        <span className="flex items-center gap-1.5 font-medium text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Pickup Slot: <strong className="text-white">{order.slotLabel}</strong>
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3.5 h-3.5" />
                          {order.pickupDate}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedTokenOrder(order)}
                      className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center gap-2 shadow-sm"
                    >
                      <QrCode className="w-4 h-4 text-brand-400" />
                      <span>Pickup Pass</span>
                    </button>
                  </div>

                  {/* 4-Stage Visual Status Stepper */}
                  <div className="py-6 border-b border-slate-800/80">
                    <div className="relative flex items-center justify-between">
                      {/* Connecting Line */}
                      <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-800 -z-0">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-amber-400 transition-all duration-500"
                          style={{
                            width: `${(currentStepIdx / (steps.length - 1)) * 100}%`,
                          }}
                        />
                      </div>

                      {/* Step Nodes */}
                      {steps.map((step, idx) => {
                        const Icon = step.icon;
                        const isCompleted = idx <= currentStepIdx;
                        const isCurrent = idx === currentStepIdx;

                        // Find matching timestamp in history
                        const historyItem = order.history?.find((h) => h.status === step.key);

                        return (
                          <div
                            key={step.key}
                            className="relative z-10 flex flex-col items-center group"
                          >
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                                isCurrent
                                  ? 'bg-gradient-to-tr from-brand-500 to-amber-400 text-white shadow-lg shadow-brand-500/40 ring-4 ring-brand-500/20 scale-110'
                                  : isCompleted
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                  : 'bg-slate-800 text-slate-500 border border-slate-700'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>

                            <span
                              className={`text-[11px] font-bold mt-2.5 whitespace-nowrap ${
                                isCurrent
                                  ? 'text-white'
                                  : isCompleted
                                  ? 'text-slate-300'
                                  : 'text-slate-600'
                              }`}
                            >
                              {step.label}
                            </span>

                            {/* Exact Server Timestamp */}
                            {historyItem && (
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {new Date(historyItem.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Items & Total */}
                  <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                        Ordered Items
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {order.items.map((i, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-slate-300"
                          >
                            <span className="text-brand-400 font-bold">{i.quantity}x</span>
                            <span>{i.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-slate-400">Total Paid (incl. GST)</span>
                      <div className="text-xl font-black text-white">₹{order.grandTotal}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pickup Pass Modal */}
        {selectedTokenOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-white shadow-2xl relative">
              <button
                onClick={() => setSelectedTokenOrder(null)}
                className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>

              <div className="w-12 h-12 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-3">
                <QrCode className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold font-display">Cafeteria Pickup Pass</h3>
              <p className="text-xs text-slate-400 mt-0.5">Show this at the express pickup counter</p>

              <div className="my-6 p-4 rounded-2xl bg-white text-slate-950 flex flex-col items-center justify-center shadow-inner">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500">
                  Express Token
                </span>
                <span className="text-3xl font-black font-mono tracking-wider mt-1 text-slate-900">
                  {selectedTokenOrder.orderNumber}
                </span>
                <span className="text-xs font-bold text-brand-600 mt-2">
                  Window: {selectedTokenOrder.slotLabel}
                </span>
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <p className="flex items-center justify-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Express Counter #2
                </p>
                <p>Status: <strong className="text-white">{selectedTokenOrder.status}</strong></p>
              </div>

              <button
                onClick={() => setSelectedTokenOrder(null)}
                className="w-full mt-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
              >
                Close Pass
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
