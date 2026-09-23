const MenuItem = require('../models/MenuItem');

// @desc    Get all menu items with search and category filtering
// @route   GET /api/menu
const getMenuItems = async (req, res) => {
  try {
    const { search, category, availability, date } = req.query;
    const query = {};

    // Filter by date if specified (otherwise shows all items or today's items)
    if (date) {
      query.menuDate = date;
    }

    // Filter by availability (if customer, defaults to available items unless explicitly queried)
    if (availability !== undefined) {
      query.availability = availability === 'true';
    }

    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Search query on name and description
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    const items = await MenuItem.find(query).sort({ category: 1, name: 1 });
    res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    console.error('[Menu getMenuItems Error]:', error);
    res.status(500).json({ error: 'Failed to fetch menu items.' });
  }
};

// @desc    Get single menu item by ID
// @route   GET /api/menu/:id
const getMenuItemById = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }
    res.status(200).json({ item });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menu item.' });
  }
};

// @desc    Get distinct menu categories
// @route   GET /api/menu/categories
const getCategories = async (req, res) => {
  try {
    const categories = ['All', 'Breakfast', 'Main Course', 'Quick Bites', 'Beverages', 'Desserts', 'Combos'];
    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
};

// @desc    Validate cart items live stock (CRITICAL: prevent overselling)
// @route   POST /api/menu/validate-stock
const validateStock = async (req, res) => {
  try {
    const { items } = req.body; // Array of { menuItemId, quantity }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Please provide items array to validate.' });
    }

    const errors = [];
    const validatedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId || item._id);
      if (!menuItem) {
        errors.push({
          menuItemId: item.menuItemId || item._id,
          name: item.name || 'Unknown Item',
          message: 'Item no longer exists in menu.',
        });
        continue;
      }

      if (!menuItem.availability) {
        errors.push({
          menuItemId: menuItem._id,
          name: menuItem.name,
          message: `"${menuItem.name}" is currently marked unavailable.`,
        });
        continue;
      }

      const requestedQty = Number(item.quantity) || 1;
      if (requestedQty > menuItem.stock) {
        errors.push({
          menuItemId: menuItem._id,
          name: menuItem.name,
          currentStock: menuItem.stock,
          requestedQty,
          message: `Only ${menuItem.stock} portion(s) available for "${menuItem.name}".`,
        });
      } else {
        validatedItems.push({
          menuItemId: menuItem._id,
          name: menuItem.name,
          basePrice: menuItem.basePrice,
          gstRate: menuItem.gstRate,
          stock: menuItem.stock,
          quantity: requestedQty,
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        valid: false,
        message: 'Stock validation failed.',
        errors,
      });
    }

    res.status(200).json({
      valid: true,
      message: 'All items are in stock and available.',
      items: validatedItems,
    });
  } catch (error) {
    console.error('[Menu validateStock Error]:', error);
    res.status(500).json({ error: 'Failed to validate stock.' });
  }
};

// @desc    Create menu item (Staff only)
// @route   POST /api/menu
const createMenuItem = async (req, res) => {
  try {
    const { name, description, category, image, basePrice, gstRate, stock, availability, menuDate } = req.body;

    if (!name || basePrice === undefined || !category) {
      return res.status(400).json({ error: 'Name, category, and base price are required.' });
    }

    const parsedPrice = Number(basePrice);
    const parsedStock = stock !== undefined ? Number(stock) : 0;
    const parsedGst = gstRate !== undefined ? Number(gstRate) : 5;

    if (parsedPrice < 0) {
      return res.status(400).json({ error: 'Base price cannot be negative.' });
    }
    if (parsedStock < 0) {
      return res.status(400).json({ error: 'Stock cannot be negative.' });
    }

    const newItem = await MenuItem.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      category,
      image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      basePrice: parsedPrice,
      gstRate: parsedGst,
      stock: parsedStock,
      availability: availability !== undefined ? Boolean(availability) : true,
      menuDate: menuDate || new Date().toISOString().split('T')[0],
    });

    res.status(201).json({
      message: 'Menu item created successfully.',
      item: newItem,
    });
  } catch (error) {
    console.error('[Menu createMenuItem Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to create menu item.' });
  }
};

// @desc    Update menu item (Staff only)
// @route   PUT /api/menu/:id
const updateMenuItem = async (req, res) => {
  try {
    const { name, description, category, image, basePrice, gstRate, stock, availability, menuDate } = req.body;

    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    if (name !== undefined) item.name = name.trim();
    if (description !== undefined) item.description = description.trim();
    if (category !== undefined) item.category = category;
    if (image !== undefined) item.image = image;
    if (basePrice !== undefined) {
      if (Number(basePrice) < 0) return res.status(400).json({ error: 'Price cannot be negative.' });
      item.basePrice = Number(basePrice);
    }
    if (gstRate !== undefined) {
      if (Number(gstRate) < 0) return res.status(400).json({ error: 'GST rate cannot be negative.' });
      item.gstRate = Number(gstRate);
    }
    if (stock !== undefined) {
      if (Number(stock) < 0) return res.status(400).json({ error: 'Stock cannot be negative.' });
      item.stock = Number(stock);
    }
    if (availability !== undefined) item.availability = Boolean(availability);
    if (menuDate !== undefined) item.menuDate = menuDate;

    await item.save();

    res.status(200).json({
      message: 'Menu item updated successfully.',
      item,
    });
  } catch (error) {
    console.error('[Menu updateMenuItem Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to update menu item.' });
  }
};

// @desc    Update stock only (Staff quick action)
// @route   PATCH /api/menu/:id/stock
const updateStock = async (req, res) => {
  try {
    const { stock, delta } = req.body;
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    let newStock = item.stock;
    if (stock !== undefined) {
      newStock = Number(stock);
    } else if (delta !== undefined) {
      newStock = item.stock + Number(delta);
    }

    if (newStock < 0) {
      return res.status(400).json({ error: 'Stock cannot be negative.' });
    }

    item.stock = newStock;
    // Auto-update availability if stock is 0 or restored
    if (newStock === 0) {
      // Keep availability or staff choice
    }
    await item.save();

    res.status(200).json({
      message: 'Stock updated successfully.',
      item,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock.' });
  }
};

// @desc    Delete menu item (Staff only)
// @route   DELETE /api/menu/:id
const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }

    res.status(200).json({
      message: 'Menu item deleted successfully.',
      deletedId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete menu item.' });
  }
};

module.exports = {
  getMenuItems,
  getMenuItemById,
  getCategories,
  validateStock,
  createMenuItem,
  updateMenuItem,
  updateStock,
  deleteMenuItem,
};
