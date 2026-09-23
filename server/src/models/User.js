const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Strict RFC 5322 compatible email regex ensuring valid local part, @, domain name and TLD (min 2 chars)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      validate: {
        validator: function (v) {
          if (!v || typeof v !== 'string') return false;
          const trimmed = v.trim();
          // Reject if contains spaces, consecutive dots, or doesn't match standard email format
          if (trimmed.includes(' ') || trimmed.includes('..')) return false;
          return EMAIL_REGEX.test(trimmed);
        },
        message: 'Please provide a valid email address (e.g. user@domain.com)',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    role: {
      type: String,
      enum: ['customer', 'staff'],
      default: 'customer',
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: normalize email and hash password if modified
userSchema.pre('save', async function (next) {
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }

  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!candidatePassword || !this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Omit password from toJSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
