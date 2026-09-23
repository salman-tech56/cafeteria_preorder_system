const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const PickupSlot = require('../models/PickupSlot');
const Order = require('../models/Order');
const OrderStatusHistory = require('../models/OrderStatusHistory');

const seedAll = async () => {
  console.log('[Seeder] Starting database seeding with isolated customer & staff accounts...');

  // 1. Seed Users (Staff + Demo Customer)
  await User.deleteMany({});

  const staffUser = await User.create({
    name: 'CaféFlow Manager',
    email: 'staff@cafeflow.com',
    password: 'Staff@123',
    role: 'staff',
    phone: '+91 98765 43210',
  });

  const demoCustomer = await User.create({
    name: 'Alex Johnson',
    email: 'customer@cafeflow.com',
    password: 'Customer@123',
    role: 'customer',
    phone: '+91 98765 00003',
  });

  console.log(
    `[Seeder] Seeded users:\n  - Staff: staff@cafeflow.com\n  - Customer: customer@cafeflow.com`
  );

  // 2. Seed Pickup Slots for Today
  await PickupSlot.deleteMany({});
  const todayStr = new Date().toISOString().split('T')[0];
  const slotDefinitions = [
    { slotLabel: '11:30 AM - 11:45 AM', startTime: '11:30', endTime: '11:45', maxCapacity: 20 },
    { slotLabel: '11:45 AM - 12:00 PM', startTime: '11:45', endTime: '12:00', maxCapacity: 20 },
    { slotLabel: '12:00 PM - 12:15 PM', startTime: '12:00', endTime: '12:15', maxCapacity: 25 },
    { slotLabel: '12:15 PM - 12:30 PM', startTime: '12:15', endTime: '12:30', maxCapacity: 25 },
    { slotLabel: '12:30 PM - 12:45 PM', startTime: '12:30', endTime: '12:45', maxCapacity: 30 },
    { slotLabel: '12:45 PM - 01:00 PM', startTime: '12:45', endTime: '13:00', maxCapacity: 30 },
    { slotLabel: '01:00 PM - 01:15 PM', startTime: '13:00', endTime: '13:15', maxCapacity: 25 },
    { slotLabel: '01:15 PM - 01:30 PM', startTime: '13:15', endTime: '13:30', maxCapacity: 25 },
    { slotLabel: '01:30 PM - 01:45 PM', startTime: '13:30', endTime: '13:45', maxCapacity: 20 },
    { slotLabel: '01:45 PM - 02:00 PM', startTime: '13:45', endTime: '14:00', maxCapacity: 20 },
  ];

  const createdSlots = await PickupSlot.insertMany(
    slotDefinitions.map((s) => ({ ...s, date: todayStr, currentOrders: 0, isActive: true }))
  );
  console.log(`[Seeder] Seeded ${createdSlots.length} pickup slots for date ${todayStr}`);

  // 3. Seed Menu Items
  await MenuItem.deleteMany({});
  const sampleItems = [
    {
      name: 'Paneer Butter Masala Bowl',
      description: 'Slow-simmered cottage cheese in rich makhani gravy served with fragrant jeera basmati rice.',
      category: 'Main Course',
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
      basePrice: 160,
      gstRate: 5,
      stock: 35,
      availability: true,
      menuDate: todayStr,
    },
    {
      name: 'Hyderabadi Chicken Biryani',
      description: 'Aromatic long-grain basmati layered with tender spiced chicken, saffron, and fried onions.',
      category: 'Main Course',
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
      basePrice: 190,
      gstRate: 5,
      stock: 40,
      availability: true,
      menuDate: todayStr,
    },
    {
      name: 'Crispy Masala Dosa',
      description: 'Golden fermented rice-lentil crepe with spiced potato filling, coconut chutney, and sambar.',
      category: 'Breakfast',
      image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80',
      basePrice: 90,
      gstRate: 5,
      stock: 25,
      availability: true,
      menuDate: todayStr,
    },
    {
      name: 'Aloo Paratha with Curd & Pickle',
      description: 'Two whole wheat flatbreads stuffed with spiced mashed potatoes, butter dollop, curd & pickle.',
      category: 'Breakfast',
      image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80',
      basePrice: 110,
      gstRate: 5,
      stock: 30,
      availability: true,
      menuDate: todayStr,
    },
    {
      name: 'Crispy Veggie Crunch Burger',
      description: 'Herb-seasoned crispy vegetable patty, crisp lettuce, tomatoes, and house garlic mayo in toasted bun.',
      category: 'Quick Bites',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
      basePrice: 120,
      gstRate: 5,
      stock: 40,
      availability: true,
      menuDate: todayStr,
    },
    {
      name: 'Smoked Chicken Panini',
      description: 'Pressed ciabatta grilled panini loaded with smoked chicken breast, melted mozzarella, and chipotle aioli.',
      category: 'Quick Bites',
      image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
      basePrice: 150,
      gstRate: 5,
      stock: 20,
      availability: true,
      menuDate: todayStr,
    },
    {
      name: 'Artisan Cold Brew Coffee',
      description: 'Slow-steeped 18-hour single origin cold brew poured over clear ice blocks.',
      category: 'Beverages',
      image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
      basePrice: 80,
      gstRate: 5,
      stock: 50,
      availability: true,
      menuDate: todayStr,
    },
    {
      name: 'Fresh Mint Lime Cooler',
      description: 'Sparkling cooler infused with fresh garden mint, crushed lime, and raw cane sugar.',
      category: 'Beverages',
      image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
      basePrice: 60,
      gstRate: 5,
      stock: 45,
      availability: true,
      menuDate: todayStr,
    },
    {
      name: 'Belgian Chocolate Brownie',
      description: 'Fudgy dark chocolate walnut brownie served warm with a drizzle of hot chocolate fudge.',
      category: 'Desserts',
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
      basePrice: 95,
      gstRate: 5,
      stock: 18,
      availability: true,
      menuDate: todayStr,
    },
    {
      name: 'Kesar Gulab Jamun (2 pcs)',
      description: 'Soft cottage cheese dumplings soaked in warm saffron-cardamom syrup topped with pistachios.',
      category: 'Desserts',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
      basePrice: 70,
      gstRate: 5,
      stock: 22,
      availability: true,
      menuDate: todayStr,
    },
  ];

  const createdItems = await MenuItem.insertMany(sampleItems);
  console.log(`[Seeder] Seeded ${createdItems.length} menu items across categories`);

  // 4. Seed an isolated order belonging ONLY to Customer A
  await Order.deleteMany({});
  await OrderStatusHistory.deleteMany({});

  const sampleOrder = await Order.create({
    orderNumber: `CF-${todayStr.replace(/-/g, '').slice(2)}-1001`,
    user: demoCustomer._id,
    customerName: demoCustomer.name,
    customerEmail: demoCustomer.email,
    customerPhone: demoCustomer.phone,
    items: [
      {
        menuItem: createdItems[0]._id,
        name: createdItems[0].name,
        quantity: 1,
        unitPrice: createdItems[0].basePrice,
        gstRate: createdItems[0].gstRate,
        gstAmount: (createdItems[0].basePrice * createdItems[0].gstRate) / 100,
        itemTotal: createdItems[0].basePrice + (createdItems[0].basePrice * createdItems[0].gstRate) / 100,
      },
    ],
    subtotal: 160,
    totalGst: 8,
    grandTotal: 168,
    pickupSlot: createdSlots[2]._id,
    slotLabel: createdSlots[2].slotLabel,
    pickupDate: todayStr,
    status: 'Preparing',
    serverExactTimestamp: new Date(),
  });

  await PickupSlot.findByIdAndUpdate(createdSlots[2]._id, { $inc: { currentOrders: 1 } });

  await OrderStatusHistory.create([
    {
      order: sampleOrder._id,
      status: 'Placed',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      updatedBy: demoCustomer._id,
      updatedByName: `${demoCustomer.name} (Customer)`,
      note: 'Order placed via CaféFlow pre-order.',
    },
    {
      order: sampleOrder._id,
      status: 'Preparing',
      timestamp: new Date(Date.now() - 1000 * 60 * 4),
      updatedBy: staffUser._id,
      updatedByName: 'CaféFlow Manager (Staff)',
      note: 'Kitchen staff began preparation.',
    },
  ]);

  console.log(`[Seeder] Seeded sample order ${sampleOrder.orderNumber} for Customer (${demoCustomer.email})`);
  console.log('[Seeder] Database seeding finished successfully!');

  return {
    staffEmail: staffUser.email,
    customerEmail: demoCustomer.email,
  };
};

if (require.main === module) {
  require('dotenv').config();
  const { initDB, closeDB } = require('../config/db');

  (async () => {
    try {
      await initDB();
      await seedAll();
      await closeDB();
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })();
}

module.exports = { seedAll };
