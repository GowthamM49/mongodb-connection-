const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require('path');
const { Worker } = require('worker_threads');

const app = express();
const PORT = 4242;

app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname)));

mongoose.connect("mongodb://localhost:27017/biodataDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

const biodataSchema = new mongoose.Schema({
    name: String,
    dob: String,
    eid: String,
    pid: String,
    phone: Number,  
    github: String,
    linkedin: String,
    leetcode: String,
    leetcodeProblems: String,
    languagesKnown: String,
  });

const Biodata = mongoose.model("Biodata", biodataSchema);

function processInThread(data) {
    return new Promise((resolve, reject) => {
        const worker = new Worker('./worker.js', { workerData: data });
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

app.post("/submit", async (req, res) => {
  try {
    const processedData = await processInThread(req.body);
    const biodata = new Biodata(processedData);
    await biodata.save();
    res.status(200).json({ message: "Data saved successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
app.get("/getAll", async (req, res) => {
  try {
      const data = await Biodata.find();
      res.json(data);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.put("/update/:id", async (req, res) => {
  try {
      const updatedData = await Biodata.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(updatedData);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.delete("/delete/:id", async (req, res) => {
  try {
      await Biodata.findByIdAndDelete(req.params.id);
      res.json({ message: "Data deleted successfully!" });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.get("/get/:id", async (req, res) => {
  try {
    const data = await Biodata.findById(req.params.id);
    if (!data) {
      return res.status(404).json({ error: "Record not found" });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/getByName", async (req, res) => {
  try {
    const name = req.query.name; // Get the name from the query parameter
    const data = await Biodata.find({ name: new RegExp(name, "i") }); // Case-insensitive search
    res.json(data); // Send the filtered data as a JSON response
  } catch (error) {
    res.status(500).json({ error: error.message }); // Handle errors
  }
});