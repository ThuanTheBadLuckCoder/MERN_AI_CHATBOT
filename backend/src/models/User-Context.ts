// import mongoose from "mongoose";
// import { randomUUID } from "crypto";
// // If you're using TypeScript, update your types as well:

// interface IStructuredContent {
//   originalCode: string;
//   explanation: string;
//   chainOfThought?: string;
// }

// interface IMessage {
//   content: string;
//   role: 'user' | 'assistant' | 'system';
//   createdAt: Date;
//   structuredContent?: IStructuredContent;
// }

// interface IConversation {
//   id: string;
//   title: string;
//   messages: IMessage[];
//   createdAt: Date;
//   updatedAt: Date;
// }

// interface IUser {
//   // Other user fields...
//   conversations: IConversation[];
// }


// // Updated message schema
// const messageSchema = new mongoose.Schema({
//   content: {
//     type: String,
//     required: true
//   },
//   role: {
//     type: String,
//     enum: ['user', 'assistant', 'system'],
//     required: true
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   // New field to store structured content
//   structuredContent: {
//     type: Object,
//     default: null
//   }
// });

// // Add this method to your message schema
// messageSchema.methods.getStructuredContent = function() {
//   // If structured content is available, return that
//   if (this.structuredContent && this.structuredContent.originalCode) {
//     return this.structuredContent;
//   }
  
//   // Otherwise, return null
//   return null;
// };

// // Schema for chat conversations
// const conversationSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true
//   },
//   messages: [messageSchema],
//   createdAt: {
//     type: Date,
//     default: Date.now
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// // User schema with multiple conversations
// const userSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//   },
//   role: {
//     type: String,
//     required: true,
//   },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//   },
//   password: {
//     type: String,
//     required: true,
//   },
//   conversations: [conversationSchema]
// });

// // Pre-save middleware to update the 'updatedAt' timestamp for conversations
// conversationSchema.pre('save', function(next) {
//   if (this.isModified('messages')) {
//     this.updatedAt = new Date(); // Use new Date() instead of Date.now()
//   }
//   next();
// });

// export default mongoose.model("User", userSchema);