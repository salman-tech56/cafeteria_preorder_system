import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Utensils,
  Plus,
  Minus,
  Check,
  Clock,
  Flame,
  AlertCircle,
  Filter,
  Activity,
  Users,
  Timer,
  Zap,
} from 'lucide-react';
import api from '../api/axios';
import { useCart } from '../context/CartContext';

export const CustomerMenu = ({ onShowToast }) => {
  const { items: cartItems, addItem, updateQuantity } = useCart();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [cafeteriaLoad, setCafeteriaLoad] = useState(null);

  // Fetch categories and items
  useEffect(() => {
    fetchMenu();
    fetchLoad();
    api.get('/menu/categories')
      .then((res) => {
        if (res.data.categories) setCategories(res.data.categories);
      })
      .catch((e) => console.error(e));

    // Real-time stock & load synchronization (every 8 seconds)
    const syncInterval = setInterval(() => {
      fetchMenu(selectedCategory, searchQuery, false);
      fetchLoad();
    }, 8000);

    return () => clearInterval(syncInterval);
  }, []);

  const fetchLoad = () => {
    api.get('/slots')
      .then((res) => {
        if (res.data.cafeteriaLoad) {
          setCafeteriaLoad(res.data.cafeteriaLoad);
        }
      })
      .catch((err) => console.error(err));
  };

  const fetchMenu = (category = selectedCategory, search = searchQuery, showLoader = true) => {
    if (showLoader) setLoading(true);
    let url = '/menu?';
    if (category && category !== 'All') url += `category=${encodeURIComponent(category)}&`;
    if (search && search.trim() !== '') url += `search=${encodeURIComponent(search.trim())}&`;

    api.get(url)
      .then((res) => {
        setMenuItems(res.data.items || []);
      })
      .catch((err) => {
        console.error('Failed to load menu items:', err);
      })
      .finally(() => {
        if (showLoader) setLoading(false);
      });
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    fetchMenu(category, searchQuery);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchMenu(selectedCategory, val, false);
  };

  const getCartQuantity = (menuItemId) => {
    const found = cartItems.find((i) => i.menuItemId === menuItemId);
    return found ? found.quantity : 0;
  };

  const handleAdd = (item) => {
    addItem(item, 1);
    if (onShowToast) {
      onShowToast({
        type: 'success',
        message: `Added "${item.name}" to your tray!`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 border-b border-slate-900 bg-gradient-to-b from-slate-900/60 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_50%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-bold mb-4">
                <Flame className="w-3.5 h-3.5 text-brand-400" />
                Live Pre-Orders Open for Today
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-tight">
                Pre-Order Your Meals.{' '}
                <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
                  Skip The Rush.
                </span>
              </h1>

              <p className="mt-3 text-sm sm:text-base text-slate-400 font-medium">
                Reserve delicious food ahead of time, select your time-slotted pickup window, and
                collect at the express counter without waiting in rush queues.
              </p>

              {/* Live Search Bar */}
              <div className="mt-6 relative max-w-xl">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search crispy dosa, biryani, cold brew, burger..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 shadow-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      fetchMenu(selectedCategory, '');
                    }}
                    className="absolute right-4 top-3 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* INNOVATION 3: Live Cafeteria Crowd Load Indicator Card */}
            {cafeteriaLoad && (
              <div className="w-full lg:w-80 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-brand-400" />
                    Cafeteria Crowd Load
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                </div>

                <div className="my-4 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Queue Status</span>
                    <span
                      className={`text-2xl font-black font-display ${
                        cafeteriaLoad.level === 'High'
                          ? 'text-rose-400'
                          : cafeteriaLoad.level === 'Moderate'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {cafeteriaLoad.level} Load
                    </span>
                  </div>

                  <div
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                      cafeteriaLoad.level === 'High'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        : cafeteriaLoad.level === 'Moderate'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    ~{cafeteriaLoad.estimatedWaitMinutes}m prep
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" /> Active Orders
                    </span>
                    <span className="font-semibold text-slate-200">
                      {cafeteriaLoad.activeOrdersInKitchen} in queue
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5 text-slate-500" /> Capacity Utilized
                    </span>
                    <span className="font-semibold text-slate-200">
                      {cafeteriaLoad.occupancyRatio}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shrink-0 ${
                selectedCategory === cat
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25 scale-105'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Items Grid with Real-Time Stock Synchronization */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="h-80 rounded-3xl bg-slate-900/50 border border-slate-800/80 animate-pulse p-4 flex flex-col justify-between"
              >
                <div className="w-full h-40 bg-slate-800/60 rounded-2xl" />
                <div className="space-y-2 mt-4">
                  <div className="w-3/4 h-4 bg-slate-800/60 rounded" />
                  <div className="w-1/2 h-3 bg-slate-800/40 rounded" />
                </div>
                <div className="w-full h-10 bg-slate-800/60 rounded-xl mt-4" />
              </div>
            ))}
          </div>
        ) : menuItems.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-600">
              <Utensils className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No dishes found</h3>
            <p className="text-xs text-slate-400 mt-1">
              No menu items match your search or selected category right now.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
                fetchMenu('All', '');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
            {menuItems.map((item) => {
              const qtyInCart = getCartQuantity(item._id);
              const isOutOfStock = item.stock <= 0 || !item.availability;
              const isLowStock = item.stock > 0 && item.stock <= 10;

              return (
                <div
                  key={item._id}
                  className="group bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Image & Badges */}
                  <div className="relative h-48 w-full overflow-hidden bg-slate-800">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Category Tag */}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-bold text-slate-200">
                      {item.category}
                    </span>

                    {/* Stock Status Badge */}
                    <div className="absolute top-3 right-3">
                      {isOutOfStock ? (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-500/50 text-[11px] font-extrabold text-rose-300 uppercase">
                          Sold Out
                        </span>
                      ) : isLowStock ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-500/50 text-[11px] font-bold text-amber-300 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-amber-400" />
                          Only {item.stock} left
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-bold text-emerald-300">
                          {item.stock} portions
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-brand-400 transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {item.description || 'Freshly prepared daily in the campus kitchen.'}
                      </p>
                    </div>

                    {/* Pricing & Add To Cart Button */}
                    <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-lg font-black text-white">₹{item.basePrice}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          +5% GST (₹{((item.basePrice * (item.gstRate || 5)) / 100).toFixed(1)})
                        </div>
                      </div>

                      {/* Action Button / Stepper */}
                      {isOutOfStock ? (
                        <button
                          disabled
                          className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700/50 text-slate-500 text-xs font-bold cursor-not-allowed"
                        >
                          Unavailable
                        </button>
                      ) : qtyInCart > 0 ? (
                        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1">
                          <button
                            onClick={() => updateQuantity(item._id, qtyInCart - 1)}
                            className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold text-white">
                            {qtyInCart}
                          </span>
                          <button
                            onClick={() => updateQuantity(item._id, qtyInCart + 1)}
                            disabled={qtyInCart >= item.stock}
                            className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAdd(item)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add to Tray
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
