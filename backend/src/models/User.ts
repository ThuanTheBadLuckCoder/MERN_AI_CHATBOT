import mongoose from "mongoose";
import { randomUUID } from "crypto";

// Schema for individual messages
const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => randomUUID(),
  },
  role: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true, 
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Schema for chat conversations
const conversationSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => randomUUID(),
  },
  title: {
    type: String,
    default: "New Chat",
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// User schema with multiple conversations
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  conversations: [conversationSchema],
});

// Pre-save middleware to update the 'updatedAt' timestamp for conversations
conversationSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.updatedAt = new Date(); // Use new Date() instead of Date.now()
  }
  next();
});

export default mongoose.model("User", userSchema);