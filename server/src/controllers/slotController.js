const PickupSlot = require('../models/PickupSlot');
const Order = require('../models/Order');

// @desc    Get pickup slots with live capacity, crowd load indicator, and alternative slot suggestions
// @route   GET /api/slots
const getPickupSlots = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const date = req.query.date || todayStr;

    let slots = await PickupSlot.find({ date }).sort({ startTime: 1 });

    // Auto-generate standard cafeteria slots if none exist for today
    if (slots.length === 0 && date === todayStr) {
      const defaultSlots = [
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
      slots = await PickupSlot.insertMany(
        defaultSlots.map((s) => ({ ...s, date: todayStr, currentOrders: 0, isActive: true }))
      );
    }

    // 1. Calculate Cafeteria Load Indicator (Low / Moderate / High)
    const activeOrdersCount = await Order.countDocuments({
      pickupDate: todayStr,
      status: { $in: ['Placed', 'Preparing'] },
    });

    const totalCapacity = slots.reduce((acc, s) => acc + s.maxCapacity, 0);
    const totalBooked = slots.reduce((acc, s) => acc + s.currentOrders, 0);
    const occupancyRatio = totalCapacity > 0 ? (totalBooked / totalCapacity) * 100 : 0;

    let loadLevel = 'Low';
    let loadColor = 'emerald';
    let estimatedWaitMinutes = 5;

    if (activeOrdersCount > 15 || occupancyRatio > 70) {
      loadLevel = 'High';
      loadColor = 'rose';
      estimatedWaitMinutes = 18;
    } else if (activeOrdersCount > 6 || occupancyRatio > 35) {
      loadLevel = 'Moderate';
      loadColor = 'amber';
      estimatedWaitMinutes = 10;
    }

    // 2. Identify Best Alternative Slot (Smart Suggestion)
    // Find the slot with highest remaining capacity
    const availableSlots = slots.filter((s) => s.isActive && s.remainingCapacity > 0);
    const bestAlternativeSlot = availableSlots.length > 0
      ? [...availableSlots].sort((a, b) => b.remainingCapacity - a.remainingCapacity)[0]
      : null;

    // Enhance each slot with alternative suggestion if full
    const enhancedSlots = slots.map((s) => {
      const slotObj = s.toObject ? s.toObject() : s;
      const isFull = (slotObj.currentOrders || 0) >= slotObj.maxCapacity;

      return {
        ...slotObj,
        remainingCapacity: Math.max(0, slotObj.maxCapacity - (slotObj.currentOrders || 0)),
        isFull,
        suggestedAlternative: isFull && bestAlternativeSlot ? {
          id: bestAlternativeSlot._id,
          slotLabel: bestAlternativeSlot.slotLabel,
          remainingCapacity: bestAlternativeSlot.remainingCapacity,
        } : null,
      };
    });

    res.status(200).json({
      date,
      count: enhancedSlots.length,
      cafeteriaLoad: {
        level: loadLevel,
        color: loadColor,
        activeOrdersInKitchen: activeOrdersCount,
        occupancyRatio: Math.round(occupancyRatio),
        estimatedWaitMinutes,
      },
      bestSuggestedSlot: bestAlternativeSlot,
      slots: enhancedSlots,
    });
  } catch (error) {
    console.error('[Slot getPickupSlots Error]:', error);
    res.status(500).json({ error: 'Failed to fetch pickup slots.' });
  }
};

// @desc    Create pickup slot (Staff only)
// @route   POST /api/slots
const createPickupSlot = async (req, res) => {
  try {
    const { slotLabel, startTime, endTime, date, maxCapacity, isActive } = req.body;

    if (!slotLabel || !startTime || !endTime) {
      return res.status(400).json({ error: 'slotLabel, startTime, and endTime are required.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const slot = await PickupSlot.create({
      slotLabel: slotLabel.trim(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      date: date || todayStr,
      maxCapacity: Number(maxCapacity) || 25,
      currentOrders: 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    res.status(201).json({
      message: 'Pickup slot created successfully.',
      slot,
    });
  } catch (error) {
    console.error('[Slot createPickupSlot Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to create pickup slot.' });
  }
};

// @desc    Update pickup slot (Staff only)
// @route   PUT /api/slots/:id
const updatePickupSlot = async (req, res) => {
  try {
    const { slotLabel, startTime, endTime, maxCapacity, isActive } = req.body;

    const slot = await PickupSlot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ error: 'Pickup slot not found.' });
    }

    if (slotLabel !== undefined) slot.slotLabel = slotLabel.trim();
    if (startTime !== undefined) slot.startTime = startTime.trim();
    if (endTime !== undefined) slot.endTime = endTime.trim();
    if (maxCapacity !== undefined) {
      if (Number(maxCapacity) < slot.currentOrders) {
        return res.status(400).json({
          error: `Capacity cannot be lower than existing orders (${slot.currentOrders}).`,
        });
      }
      slot.maxCapacity = Number(maxCapacity);
    }
    if (isActive !== undefined) slot.isActive = Boolean(isActive);

    await slot.save();

    res.status(200).json({
      message: 'Pickup slot updated successfully.',
      slot,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update pickup slot.' });
  }
};

// @desc    Delete pickup slot (Staff only)
// @route   DELETE /api/slots/:id
const deletePickupSlot = async (req, res) => {
  try {
    const slot = await PickupSlot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ error: 'Pickup slot not found.' });
    }

    if (slot.currentOrders > 0) {
      return res.status(400).json({
        error: `Cannot delete slot with ${slot.currentOrders} active orders. Deactivate it instead.`,
      });
    }

    await slot.deleteOne();

    res.status(200).json({
      message: 'Pickup slot deleted successfully.',
      deletedId: req.params.id,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete pickup slot.' });
  }
};

module.exports = {
  getPickupSlots,
  createPickupSlot,
  updatePickupSlot,
  deletePickupSlot,
};
