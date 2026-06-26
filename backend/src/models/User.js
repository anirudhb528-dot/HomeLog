'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/** Embedded details about the user's home. All fields optional. */
const homeSchema = new mongoose.Schema(
  {
    nickname: { type: String, trim: true },
    type: { type: String, trim: true }, // e.g. house, condo, townhouse
    sizeSqFt: { type: Number, min: 0 },
    yearBuilt: { type: Number },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Never selected by default so password hashes don't leak into normal reads.
    passwordHash: { type: String, required: true, select: false },
    // Optional profile photo stored in Supabase Storage.
    avatarUrl: { type: String, trim: true },
    avatarPath: { type: String, trim: true },
    home: { type: homeSchema, default: () => ({}) },
  },
  { timestamps: true }
);

/** Hash and set the password. Caller must `save()` afterwards. */
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, SALT_ROUNDS);
};

/** Compare a plaintext password against the stored hash. */
userSchema.methods.comparePassword = async function comparePassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plain, this.passwordHash);
};

// Defense in depth: never serialize the hash even if it was explicitly selected.
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.id;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
