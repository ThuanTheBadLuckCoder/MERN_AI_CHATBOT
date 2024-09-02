import express from 'express';
const app = express();
// GET - 
// PUT -
// POST - 
// DELETE -
app.use(express.json());
app.delete("/hello", (req, res, next) => {
    console.log(req.body.name);
    return res.send("hello");
});
app.listen(5000, () => console.log("Server Open"));
//# sourceMappingURL=index.js.map