import mongoose from "mongoose";
import { randomUUID } from "crypto";

// Schema for references used in responses
const referenceSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => randomUUID(),
  },
  type: {
    type: String,
    enum: ['documentation', 'code_example', 'component', 'api_reference', 'style_guide', 'best_practice'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  originalCode: {
    type: String,
    default: null, // Only populated for code-related references
  },
  source: {
    type: String, // Source file or URL
    default: null,
  },
  relevanceScore: {
    type: Number,
    default: 0, // Score indicating how relevant this reference was to the response
  },
  usedAt: {
    type: Date,
    default: Date.now,
  }
});

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
  },
  // References used specifically for this message
  references: [referenceSchema],
  // Structured content for advanced frontends
  structuredContent: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
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
  },
  // Aggregated references for the entire conversation
  allReferences: [referenceSchema],
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
    this.updatedAt = new Date();
  }
  next();
});

// Pre-save middleware to update conversation references when messages are added
conversationSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    // Aggregate all references from messages
    const allRefs = new Map();
    
    this.messages.forEach(message => {
      if (message.references && message.references.length > 0) {
        message.references.forEach(ref => {
          // Use a combination of type and title as key to avoid duplicates
          const key = `${ref.type}:${ref.title}`;
          if (!allRefs.has(key)) {
            allRefs.set(key, ref);
          }
        });
      }
    });
    
    // Update the conversation's aggregated references
    this.allReferences.splice(0, this.allReferences.length, ...Array.from(allRefs.values()));
  }
  next();
});

export default mongoose.model("User", userSchema);