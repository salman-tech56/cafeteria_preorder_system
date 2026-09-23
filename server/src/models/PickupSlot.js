const mongoose = require('mongoose');

const pickupSlotSchema = new mongoose.Schema(
  {
    slotLabel: {
      type: String,
      required: [true, 'Slot label is required'],
      trim: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      trim: true, // e.g. "12:00"
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      trim: true, // e.g. "12:15"
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      default: () => new Date().toISOString().split('T')[0],
      index: true,
    },
    maxCapacity: {
      type: Number,
      required: [true, 'Max capacity is required'],
      default: 25,
      min: [1, 'Capacity must be at least 1'],
    },
    currentOrders: {
      type: Number,
      default: 0,
      min: [0, 'Current orders cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for remaining capacity
pickupSlotSchema.virtual('remainingCapacity').get(function () {
  return Math.max(0, this.maxCapacity - (this.currentOrders || 0));
});

pickupSlotSchema.virtual('isFull').get(function () {
  return (this.currentOrders || 0) >= this.maxCapacity;
});

pickupSlotSchema.set('toJSON', { virtuals: true });
pickupSlotSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PickupSlot', pickupSlotSchema);
