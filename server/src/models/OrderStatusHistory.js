const mongoose = require('mongoose');

const orderStatusHistorySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Placed', 'Preparing', 'Ready', 'Collected', 'Cancelled'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedByName: {
      type: String,
      default: 'System',
    },
    note: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('OrderStatusHistory', orderStatusHistorySchema);
