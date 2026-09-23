const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [100, 'Item name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Breakfast', 'Main Course', 'Quick Bites', 'Beverages', 'Desserts', 'Combos'],
      index: true,
    },
    image: {
      type: String,
      default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
    },
    gstRate: {
      type: Number,
      default: 5, // 5% GST standard for cafeteria / food
      min: [0, 'GST rate cannot be negative'],
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    availability: {
      type: Boolean,
      default: true,
    },
    menuDate: {
      type: String, // Stored as YYYY-MM-DD for easy daily pre-order indexing
      default: () => new Date().toISOString().split('T')[0],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for calculated total with GST
menuItemSchema.virtual('priceWithGst').get(function () {
  const gst = (this.basePrice * (this.gstRate || 0)) / 100;
  return Number((this.basePrice + gst).toFixed(2));
});

menuItemSchema.set('toJSON', { virtuals: true });
menuItemSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
