import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Clock,
  TrendingUp,
  Plus,
  Minus,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  Search,
  Filter,
  Trash2,
  Edit,
  RotateCw,
  AlertCircle,
  X,
  Sparkles,
  Flame,
  AlertTriangle,
  Zap,
  Timer,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { StaffAnalytics } from './StaffAnalytics';

export const StaffDashboard = ({ onShowToast }) => {
  const { isStaff, user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'queue' | 'menu' | 'slots' | 'analytics'

  // --- Orders State ---
  const [orders, setOrders] = useState([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // --- Menu State ---
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    category: 'Main Course',
    basePrice: '',
    gstRate: 5,
    stock: '',
    image: '',
  });

  // --- Slots State ---
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isAddSlotModalOpen, setIsAddSlotModalOpen] = useState(false);
  const [newSlot, setNewSlot] = useState({
    slotLabel: '',
    startTime: '',
    endTime: '',
    maxCapacity: 25,
  });

  // Fetch data on tab change
  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'queue') fetchOrders();
    if (activeTab === 'menu') fetchMenu();
    if (activeTab === 'slots') fetchSlots();
  }, [activeTab]);

  // Live polling for orders and queue
  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'queue') {
      const interval = setInterval(() => {
        fetchOrders(false);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchOrders = (showLoader = true) => {
    if (showLoader) setLoadingOrders(true);
    api.get('/orders')
      .then((res) => setOrders(res.data.orders || []))
      .catch((err) => console.error(err))
      .finally(() => setLoadingOrders(false));
  };

  const fetchMenu = () => {
    setLoadingMenu(true);
    api.get('/menu')
      .then((res) => setMenuItems(res.data.items || []))
      .catch((err) => console.error(err))
      .finally(() => setLoadingMenu(false));
  };

  const fetchSlots = () => {
    setLoadingSlots(true);
    api.get('/slots')
      .then((res) => setSlots(res.data.slots || []))
      .catch((err) => console.error(err))
      .finally(() => setLoadingSlots(false));
  };

  // --- Order Status Advancement Action ---
  const handleAdvanceStatus = async (order, nextStatus) => {
    setUpdatingOrderId(order._id);
    try {
      const noteMap = {
        Preparing: 'Kitchen staff began meal preparation.',
        Ready: 'Order packaged and ready at Express Pickup Counter.',
        Collected: 'Order handed over to student/faculty customer.',
      };

      await api.patch(`/orders/${order._id}/status`, {
        status: nextStatus,
        note: noteMap[nextStatus] || `Status updated to ${nextStatus}`,
      });

      if (onShowToast) {
        onShowToast({
          type: 'success',
          message: `Order ${order.orderNumber} advanced to "${nextStatus}"!`,
        });
      }
      fetchOrders(false);
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // --- Quick Restock Action (INNOVATION 6: SMART RESTOCK) ---
  const handleQuickRestock = async (itemId, amount = 20) => {
    try {
      await api.patch(`/menu/${itemId}/stock`, { delta: amount });
      fetchMenu();
      if (onShowToast) {
        onShowToast({
          type: 'success',
          message: `Restocked +${amount} portions successfully!`,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Menu CRUD Actions ---
  const handleCreateMenuItem = async (e) => {
    e.preventDefault();
    try {
      await api.post('/menu', {
        ...newItem,
        basePrice: Number(newItem.basePrice),
        gstRate: Number(newItem.gstRate),
        stock: Number(newItem.stock),
      });
      setIsAddItemModalOpen(false);
      setNewItem({
        name: '',
        description: '',
        category: 'Main Course',
        basePrice: '',
        gstRate: 5,
        stock: '',
        image: '',
      });
      fetchMenu();
      if (onShowToast) {
        onShowToast({ type: 'success', message: 'Menu item created successfully!' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      await api.delete(`/menu/${itemId}`);
      fetchMenu();
      if (onShowToast) {
        onShowToast({ type: 'info', message: 'Menu item removed.' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Slots CRUD Actions ---
  const handleCreateSlot = async (e) => {
    e.preventDefault();
    try {
      await api.post('/slots', newSlot);
      setIsAddSlotModalOpen(false);
      setNewSlot({ slotLabel: '', startTime: '', endTime: '', maxCapacity: 25 });
      fetchSlots();
      if (onShowToast) {
        onShowToast({ type: 'success', message: 'Pickup slot created!' });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Kitchen queue: active orders that are Placed or Preparing
  const kitchenQueueOrders = orders.filter((o) => o.status === 'Placed' || o.status === 'Preparing');

  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      selectedStatusFilter === 'All' || o.status === selectedStatusFilter;
    const matchesSearch =
      orderSearchQuery === '' ||
      o.orderNumber?.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(orderSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const lowStockItems = menuItems.filter((i) => i.stock <= 15);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Dashboard Top Header */}
      <div className="bg-slate-900/60 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Staff Command Center
                </span>
                <span className="text-xs text-slate-400">
                  Chef/Manager: <strong>{user?.name}</strong>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white mt-1">
                Cafeteria Kitchen & Slot Operations
              </h1>
            </div>

            {/* Quick Refresh */}
            <button
              onClick={() => {
                if (activeTab === 'orders' || activeTab === 'queue') fetchOrders();
                if (activeTab === 'menu') fetchMenu();
                if (activeTab === 'slots') fetchSlots();
              }}
              className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center gap-2 border border-slate-700"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Refresh Board</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              All Orders
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                {orders.length}
              </span>
            </button>

            {/* INNOVATION 4: Live Kitchen Queue Tab */}
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'queue'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25'
                  : 'bg-slate-800/80 text-amber-300 hover:text-white'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              Live Kitchen Queue
              {kitchenQueueOrders.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                  {kitchenQueueOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'menu'
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              Menu Management
              {lowStockItems.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-[10px]">
                  {lowStockItems.length} alert
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('slots')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'slots'
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              Pickup Slots
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'analytics'
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Analytics & Telemetry
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* ================= TAB 1: ALL ORDERS ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {['All', 'Placed', 'Preparing', 'Ready', 'Collected'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStatusFilter(st)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedStatusFilter === st
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Search order # or customer..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Orders Grid */}
            {loadingOrders ? (
              <div className="py-20 text-center text-xs text-slate-500">
                Loading cafeteria orders...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                No orders match your filter criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredOrders.map((order) => {
                  const isUpdating = updatingOrderId === order._id;

                  return (
                    <div
                      key={order._id}
                      className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div>
                            <span className="text-sm font-black font-mono text-brand-400">
                              {order.orderNumber}
                            </span>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {order.customerName}
                            </p>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
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

                        {/* Slot & Time */}
                        <div className="py-2.5 text-xs text-slate-300 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            Slot: <strong>{order.slotLabel}</strong>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(order.serverExactTimestamp || order.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Items list */}
                        <div className="mt-2 space-y-1.5 bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
                          <span className="text-[10px] uppercase font-bold text-slate-500">
                            Dishes to prepare
                          </span>
                          {order.items.map((i, idx) => (
                            <div
                              key={idx}
                              className="text-xs flex items-center justify-between text-slate-200"
                            >
                              <span>{i.name}</span>
                              <span className="font-bold text-brand-400">x{i.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status Action Buttons */}
                      <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-400">
                          Total: ₹{order.grandTotal}
                        </span>

                        <div>
                          {order.status === 'Placed' && (
                            <button
                              onClick={() => handleAdvanceStatus(order, 'Preparing')}
                              disabled={isUpdating}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <ChefHat className="w-3.5 h-3.5" />
                              Start Prep
                            </button>
                          )}

                          {order.status === 'Preparing' && (
                            <button
                              onClick={() => handleAdvanceStatus(order, 'Ready')}
                              disabled={isUpdating}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              Mark Ready
                            </button>
                          )}

                          {order.status === 'Ready' && (
                            <button
                              onClick={() => handleAdvanceStatus(order, 'Collected')}
                              disabled={isUpdating}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Hand Over
                            </button>
                          )}

                          {order.status === 'Collected' && (
                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" /> Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: LIVE KITCHEN QUEUE ================= */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-amber-400" />
                  Kitchen Real-Time Production Queue
                </h2>
                <p className="text-xs text-slate-400">
                  Orders actively placed or currently on the burner needing kitchen assembly.
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                {kitchenQueueOrders.length} orders in queue
              </span>
            </div>

            {kitchenQueueOrders.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">Kitchen Queue is Clear!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  All active pre-orders have been assembled and dispatched to pickup counter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {kitchenQueueOrders.map((order) => {
                  const orderDate = new Date(order.serverExactTimestamp || order.createdAt);
                  const minutesAgo = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60));
                  const isUrgent = minutesAgo >= 10;

                  return (
                    <div
                      key={order._id}
                      className={`p-5 rounded-3xl bg-slate-900/90 border transition-all ${
                        isUrgent
                          ? 'border-rose-500/60 shadow-xl shadow-rose-500/10'
                          : 'border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div>
                          <span className="text-base font-black font-mono text-white">
                            {order.orderNumber}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {order.customerName}
                          </span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isUrgent
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            <Timer className="w-3 h-3" />
                            {minutesAgo}m in queue
                          </span>
                        </div>
                      </div>

                      <div className="my-3 text-xs text-amber-300 font-medium">
                        Pickup: <strong>{order.slotLabel}</strong>
                      </div>

                      {/* Items to cook */}
                      <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                        {order.items.map((i, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs text-slate-200"
                          >
                            <span className="font-semibold">{i.name}</span>
                            <span className="text-base font-black text-brand-400">x{i.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
                        {order.status === 'Placed' ? (
                          <button
                            onClick={() => handleAdvanceStatus(order, 'Preparing')}
                            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                          >
                            <ChefHat className="w-4 h-4" />
                            Start Cooking
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAdvanceStatus(order, 'Ready')}
                            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                          >
                            <PackageCheck className="w-4 h-4" />
                            Ready for Pickup
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: MENU MANAGEMENT ================= */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-display text-white">Cafeteria Menu Inventory</h2>
                <p className="text-xs text-slate-400">
                  Update stock on the fly or add new dishes to today's menu.
                </p>
              </div>

              <button
                onClick={() => setIsAddItemModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add New Dish
              </button>
            </div>

            {/* Smart Low Stock Alerts Bar */}
            {lowStockItems.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-300">
                      {lowStockItems.length} dishes running low on inventory
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Restock recommended before next peak lunch slot.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {lowStockItems.slice(0, 2).map((item) => (
                    <button
                      key={item._id}
                      onClick={() => handleQuickRestock(item._id, 20)}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/40 text-[11px] font-bold text-amber-300 transition-all"
                    >
                      +20 {item.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingMenu ? (
              <div className="py-20 text-center text-xs text-slate-500">Loading menu...</div>
            ) : (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/60 uppercase font-semibold text-[10px] tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Dish</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Base Price</th>
                        <th className="py-3 px-4">GST</th>
                        <th className="py-3 px-4">Live Stock</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {menuItems.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-700"
                              />
                              <div>
                                <span className="font-bold text-white block">{item.name}</span>
                                <span className="text-[10px] text-slate-500 line-clamp-1">
                                  {item.description}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-300">
                            {item.category}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-white">₹{item.basePrice}</td>

                          <td className="py-3.5 px-4 text-slate-400">{item.gstRate || 5}%</td>

                          {/* Quick Stock Stepper & Restock Button */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-1">
                                <button
                                  onClick={() => handleQuickRestock(item._id, -1)}
                                  disabled={item.stock <= 0}
                                  className="p-1 hover:bg-slate-800 text-slate-300 rounded disabled:opacity-20"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center font-bold text-white">
                                  {item.stock}
                                </span>
                                <button
                                  onClick={() => handleQuickRestock(item._id, 1)}
                                  className="p-1 hover:bg-slate-800 text-slate-300 rounded"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                onClick={() => handleQuickRestock(item._id, 15)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-brand-500 text-[10px] font-bold text-slate-300 hover:text-white transition-colors"
                              >
                                +15
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteMenuItem(item._id)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: PICKUP SLOTS ================= */}
        {activeTab === 'slots' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold font-display text-white">
                  Today's Cafeteria Pickup Slots
                </h2>
                <p className="text-xs text-slate-400">
                  Control crowd flow by adjusting slot capacities or adding express windows.
                </p>
              </div>

              <button
                onClick={() => setIsAddSlotModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Pickup Window
              </button>
            </div>

            {loadingSlots ? (
              <div className="py-20 text-center text-xs text-slate-500">Loading slots...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map((slot) => {
                  const percent = Math.round((slot.currentOrders / slot.maxCapacity) * 100);

                  return (
                    <div
                      key={slot._id}
                      className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-white">{slot.slotLabel}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            slot.isActive
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {slot.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Capacity Booked</span>
                          <span>
                            <strong>{slot.currentOrders}</strong> / {slot.maxCapacity} ({percent}%)
                          </span>
                        </div>

                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent >= 90
                                ? 'bg-rose-500'
                                : percent >= 60
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 text-[11px] text-slate-400 flex justify-between">
                        <span>Remaining: {slot.remainingCapacity} portions</span>
                        <span>Date: {slot.date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 5: ANALYTICS ================= */}
        {activeTab === 'analytics' && <StaffAnalytics />}
      </div>

      {/* Add Menu Item Modal */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setIsAddItemModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold font-display">Add Dish to Menu</h3>
            <p className="text-xs text-slate-400 mt-1">Configure dish pricing, category and stock</p>

            <form onSubmit={handleCreateMenuItem} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Masala Dosa"
                  className="w-full px-3.5 py-2.5 bg-slate-800 rounded-xl text-xs text-white border border-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Short description of ingredients"
                  className="w-full px-3.5 py-2.5 bg-slate-800 rounded-xl text-xs text-white border border-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800 rounded-xl text-xs text-white border border-slate-700 focus:outline-none focus:border-brand-500"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Quick Bites">Quick Bites</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Base Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newItem.basePrice}
                    onChange={(e) => setNewItem({ ...newItem, basePrice: e.target.value })}
                    placeholder="120"
                    className="w-full px-3.5 py-2.5 bg-slate-800 rounded-xl text-xs text-white border border-slate-700 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Available Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItem.stock}
                    onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })}
                    placeholder="30"
                    className="w-full px-3.5 py-2.5 bg-slate-800 rounded-xl text-xs text-white border border-slate-700 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    value={newItem.gstRate}
                    onChange={(e) => setNewItem({ ...newItem, gstRate: e.target.value })}
                    placeholder="5"
                    className="w-full px-3.5 py-2.5 bg-slate-800 rounded-xl text-xs text-white border border-slate-700 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  value={newItem.image}
                  onChange={(e) => setNewItem({ ...newItem, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 bg-slate-800 rounded-xl text-xs text-white border border-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-white text-xs shadow-md transition-all"
              >
                Create Menu Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Slot Modal */}
      {isAddSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl relative">
            <button
              onClick={() => setIsAddSlotModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold font-display">New Pickup Window</h3>
            <p className="text-xs text-slate-400 mt-1">Define time window and maximum capacity</p>

            <form onSubmit={handleCreateSlot} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Slot Label</label>
                <input
                  type="text"
                  required
                  value={newSlot.slotLabel}
                  onChange={(e) => setNewSlot({ ...newSlot, slotLabel: e.target.value })}
                  placeholder="e.g. 02:00 PM - 02:15 PM"
                  className="w-full px-3.5 py-2.5 bg-slate-800 rounded-xl text-xs text-white border border-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newSlot.startTime}
                    onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800 rounded-xl text-xs text-white border border-slate-700 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={newSlot.endTime}
                    onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800 rounded-xl text-xs text-white border border-slate-700 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Max Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={newSlot.maxCapacity}
                  onChange={(e) => setNewSlot({ ...newSlot, maxCapacity: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-800 rounded-xl text-xs text-white border border-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-white text-xs shadow-md transition-all"
              >
                Create Pickup Slot
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
