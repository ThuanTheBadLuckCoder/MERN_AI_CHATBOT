import File from "../models/File.js";
export const saveToDatabase = async (req, res, next) => {
    try {
        const { name, content, index } = req.body;
        // const file = req.file;
        console.log("file: ", name);
        console.log("index: ", content);
        // const name = "name 01";
        // const content = {"texts": ["This is a sentence.", "This is another sentence."]}
        // const filePush = new File({ file, index });
        // await filePush.save();
        // return res
        // .status(201)
        // .json({ message: "OK", name: file.name, content: file.content });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ message: "ERROR", cause: error.message });
    }
};
export const getAllFile = async (req, res, next) => {
    try {
        const file = await File.find();
        return res.status(200).json({ message: "OK", file });
    }
    catch (error) {
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};
//# sourceMappingURL=multifilesloader-controller.js.map