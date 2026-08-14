const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    // Whether this user is currently sharing their location (has an open tab/socket)
    isSharing: {
      type: Boolean,
      default: false
    },
    // Last known location, updated on every location ping from the client
    lastLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      updatedAt: { type: Date, default: null }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
