import mongoose from "mongoose";
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
const FileModel = mongoose.model("file", fileSchema);
export default mongoose.model("file", fileSchema);
//# sourceMappingURL=File.js.map