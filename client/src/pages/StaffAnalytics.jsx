import React, { useState, useEffect } from 'react';
import {
  Users,
  ShoppingBag,
  IndianRupee,
  UtensilsCrossed,
  TrendingUp,
  Clock,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Zap,
  BarChart3,
  CalendarDays,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import api from '../api/axios';

export const StaffAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = () => {
    setRefreshing(true);
    api.get('/analytics')
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error('Failed to load analytics:', err);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        Loading real-time cafeteria analytics...
      </div>
    );
  }

  const {
    summary = {},
    last7DaysOrders = [],
    revenueChart = [],
    mostOrderedFood = [],
    popularPickupSlots = [],
    lowStockItems = [],
  } = data || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Bar with Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Live Operations & Business Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time telemetry aggregated directly from database orders, inventory, and slots.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={refreshing}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2"
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 6 Primary KPI Cards (Including Peak Time & Avg Orders/Day) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Today's Customers */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Today's Customers
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {summary.todayCustomers || 0}
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">Unique users</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Orders */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Today's Orders
            </span>
            <div className="text-2xl font-black text-white mt-1">{summary.todayOrders || 0}</div>
            <span className="text-[10px] text-brand-400 font-medium">Pre-orders booked</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Today's Revenue */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Today's Revenue
            </span>
            <div className="text-2xl font-black text-white mt-1">
              ₹{summary.todayRevenue || 0}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              GST: ₹{summary.todayGst || 0}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>

        {/* Items Sold */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Items Sold
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {summary.todayItemsSold || 0}
            </div>
            <span className="text-[10px] text-amber-400 font-medium">Portions prepared</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
        </div>

        {/* Peak Ordering Window */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Peak Rush Time
            </span>
            <div className="text-sm font-black text-white mt-1 leading-snug">
              {summary.peakOrderingTime || '12:30 PM'}
            </div>
            <span className="text-[10px] text-rose-400 font-bold">Highest kitchen traffic</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Average Orders Per Day */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Avg Orders/Day
            </span>
            <div className="text-2xl font-black text-white mt-1">
              {summary.averageOrdersPerDay || 8.5}
            </div>
            <span className="text-[10px] text-purple-400 font-medium">Last 7-day average</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Grid: Last 7 Days Orders & Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Last 7 Days Orders Trend */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                Last 7 Days Orders Trend
              </h3>
              <p className="text-[11px] text-slate-400">Daily order volume trajectory</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7DaysOrders} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#orderGrad)"
                  name="Orders"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Distribution Chart */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                Today's Revenue by Pickup Window
              </h3>
              <p className="text-[11px] text-slate-400">Hourly sales throughput (₹)</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [`₹${value}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Most Ordered Food & Popular Pickup Slots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Ordered Food Items */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
            <UtensilsCrossed className="w-4 h-4 text-amber-400" />
            Most Ordered Food Items
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">Top culinary favorites ordered today</p>

          <div className="space-y-3">
            {mostOrderedFood.map((dish, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-900 font-bold text-xs flex items-center justify-center text-brand-400">
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white">{dish.name}</h4>
                    <span className="text-[10px] text-slate-400">
                      Revenue: ₹{dish.revenue || 0}
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-brand-500/20 text-brand-300 text-xs font-bold">
                  {dish.quantity} sold
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Pickup Slots */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            Popular Pickup Slots
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">Slot occupancy & crowd pacing</p>

          <div className="space-y-3">
            {popularPickupSlots.slice(0, 5).map((slot, idx) => (
              <div
                key={slot.id || idx}
                className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50"
              >
                <div className="flex items-center justify-between text-xs font-bold text-white mb-1.5">
                  <span>{slot.slotLabel}</span>
                  <span className="text-slate-400 font-normal">
                    {slot.ordersCount} / {slot.capacity} booked ({slot.occupancyPercent}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      slot.occupancyPercent >= 90
                        ? 'bg-rose-500'
                        : slot.occupancyPercent >= 60
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, slot.occupancyPercent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Low-Stock Items Alert with Urgency & Restock Batch */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Smart Low-Stock Inventory Alerts
            </h3>
            <p className="text-[11px] text-slate-400">
              Dishes with low inventory prioritizing kitchen restocking
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
            {lowStockItems.length} items flagged
          </span>
        </div>

        {lowStockItems.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">
            All cafeteria items have healthy stock levels.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lowStockItems.map((item) => (
              <div
                key={item._id}
                className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-white truncate max-w-[130px]">
                      {item.name}
                    </h4>
                    {item.urgency === 'Critical' && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Rec: +{item.recommendedBatch || 20} batch
                  </span>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                      item.stock === 0
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : item.stock <= 5
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {item.stock === 0 ? 'OUT' : `${item.stock} left`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
