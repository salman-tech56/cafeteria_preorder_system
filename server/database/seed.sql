-- ====================================================================
-- CaféFlow PS62 — Sample Seed Data for MySQL
-- ====================================================================

USE `cafeflow`;

-- 1. Seed Users (Staff & Customer)
-- Staff Password: Staff@123
-- Customer Password: Customer@123
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `phone`) VALUES
(1, 'CaféFlow Manager', 'staff@cafeflow.com', '$2b$10$2fZd1cnYvgAh.t6VU0uMj.edUYxTBHYQqc2egR6r7yoPqQTMg8Xlm', 'staff', '+91 98765 43210'),
(2, 'Alex Johnson', 'customer@cafeflow.com', '$2b$10$CwC6aZG.bBj14/mvjj5IIOJDc3YcalLtkz5bp4ozdzyISjliTyTqG', 'customer', '+91 98765 00003')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `role`=VALUES(`role`);

-- 2. Seed Menu Items
INSERT INTO `menu_items` (`id`, `name`, `description`, `category`, `base_price`, `gst_rate`, `stock`, `available`, `image`) VALUES
(1, 'Paneer Butter Masala Bowl', 'Slow-simmered cottage cheese in rich makhani gravy served with fragrant jeera basmati rice.', 'Main Course', 160.00, 5.00, 25, 1, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80'),
(2, 'Crispy Masala Dosa', 'Golden fermented crepe filled with spiced potato masala, served with coconut chutney & piping sambar.', 'Breakfast', 90.00, 5.00, 30, 1, 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80'),
(3, 'Classic Club Veggie Burger', 'Grilled spiced veggie patty topped with farm tomatoes, lettuce, and melted cheese slice in toasted sesame bun.', 'Quick Bites', 120.00, 5.00, 20, 1, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'),
(4, 'Steamed Idli Sambar Platter', 'Pillowy steamed rice cakes served with aromatic lentil stew and freshly grated coconut chutney.', 'Breakfast', 60.00, 5.00, 35, 1, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80'),
(5, 'South Indian Filter Coffee', 'Freshly brewed chicory-infused decoction frothed with whole boiled milk.', 'Beverages', 40.00, 5.00, 50, 1, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80'),
(6, 'Masala Chai Flask', 'Slow-boiled Assam black tea infused with crushed cardamom, ginger, and cinnamon.', 'Beverages', 30.00, 5.00, 60, 1, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80'),
(7, 'Chole Bhature Platter', 'Two puffed golden bhaturas served with spicy Amritsari chickpea curry, pickled onions, and green chili.', 'Main Course', 140.00, 5.00, 22, 1, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80'),
(8, 'Gulab Jamun Duo', 'Warm reduced-milk dumplings soaked in green cardamom and saffron scented sugar syrup.', 'Desserts', 50.00, 5.00, 40, 1, 'https://images.unsplash.com/photo-1593701461250-d7b22dfd3a77?auto=format&fit=crop&w=600&q=80'),
(9, 'Veg Schezwan Fried Rice', 'Wok-tossed long-grain rice with crisp scallions, carrots, and house-made fiery red chili Schezwan paste.', 'Main Course', 130.00, 5.00, 18, 1, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80'),
(10, 'Executive Express Combo', 'Complete meal: Paneer dish + Dal Makhani + 2 Butter Rotis + Jeera Rice + Gulab Jamun.', 'Combos', 220.00, 5.00, 15, 1, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `stock`=VALUES(`stock`);

-- 3. Seed Pickup Slots for Today
INSERT INTO `pickup_slots` (`id`, `slot_start`, `slot_end`, `slot_label`, `capacity`, `booked_count`, `date`, `available`) VALUES
(1, '11:30', '11:45', '11:30 AM - 11:45 AM', 20, 0, CURDATE(), 1),
(2, '11:45', '12:00', '11:45 AM - 12:00 PM', 20, 0, CURDATE(), 1),
(3, '12:00', '12:15', '12:00 PM - 12:15 PM', 25, 1, CURDATE(), 1),
(4, '12:15', '12:30', '12:15 PM - 12:30 PM', 25, 0, CURDATE(), 1),
(5, '12:30', '12:45', '12:30 PM - 12:45 PM', 30, 0, CURDATE(), 1),
(6, '12:45', '13:00', '12:45 PM - 01:00 PM', 30, 0, CURDATE(), 1),
(7, '13:00', '13:15', '01:00 PM - 01:15 PM', 25, 0, CURDATE(), 1),
(8, '13:15', '13:30', '01:15 PM - 01:30 PM', 25, 0, CURDATE(), 1),
(9, '13:30', '13:45', '01:30 PM - 01:45 PM', 20, 0, CURDATE(), 1),
(10, '13:45', '14:00', '01:45 PM - 02:00 PM', 20, 0, CURDATE(), 1)
ON DUPLICATE KEY UPDATE `slot_label`=VALUES(`slot_label`), `capacity`=VALUES(`capacity`);

-- 4. Seed Initial Sample Order for Demo Customer (Customer: Alex Johnson)
INSERT INTO `orders` (`id`, `order_number`, `user_id`, `pickup_slot_id`, `customer_name`, `customer_email`, `customer_phone`, `slot_label`, `pickup_date`, `subtotal`, `gst_amount`, `total_amount`, `status`, `placed_at`, `preparing_at`) VALUES
(1, 'CF-260923-1001', 2, 3, 'Alex Johnson', 'customer@cafeflow.com', '+91 98765 00003', '12:00 PM - 12:15 PM', CURDATE(), 160.00, 8.00, 168.00, 'Preparing', NOW() - INTERVAL 10 MINUTE, NOW() - INTERVAL 4 MINUTE)
ON DUPLICATE KEY UPDATE `status`=VALUES(`status`);

-- 5. Seed Order Items for Order 1
INSERT INTO `order_items` (`id`, `order_id`, `menu_item_id`, `item_name`, `quantity`, `unit_price`, `gst_rate`, `gst_amount`, `total_price`) VALUES
(1, 1, 1, 'Paneer Butter Masala Bowl', 1, 160.00, 5.00, 8.00, 168.00)
ON DUPLICATE KEY UPDATE `quantity`=VALUES(`quantity`);

-- 6. Seed Order Status History for Order 1
INSERT INTO `order_status_history` (`id`, `order_id`, `status`, `timestamp`, `note`, `updated_by`, `updated_by_name`) VALUES
(1, 1, 'Placed', NOW() - INTERVAL 10 MINUTE, 'Order placed via CaféFlow pre-order.', 2, 'Alex Johnson (Customer)'),
(2, 1, 'Preparing', NOW() - INTERVAL 4 MINUTE, 'Kitchen staff began preparation.', 1, 'CaféFlow Manager (Staff)')
ON DUPLICATE KEY UPDATE `status`=VALUES(`status`);
