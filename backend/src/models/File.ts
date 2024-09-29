import mongoose from "mongoose";
import { randomUUID } from "crypto";

const fileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },

    content: {
        type: Object,
        require: true,
    }
});

const FileModel = mongoose.model("file", fileSchema)

export default mongoose.model("file", fileSchema);