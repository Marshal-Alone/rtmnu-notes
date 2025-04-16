require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const { GridFSBucket } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

let gfs;

// MongoDB Connection
mongoose
	.connect(
		"mongodb+srv://trylaptop2024:R4EzWcdNzD9Xf3OW@notes-app.cmibw.mongodb.net/?retryWrites=true&w=majority&appName=Notes-App"
	)
	.then(() => {
		console.log("Connected to MongoDB");
		gfs = new GridFSBucket(mongoose.connection.db, {
			bucketName: "notes",
		});
	})
	.catch((err) => console.error("MongoDB connection error:", err));

// GridFS Storage
const storage = new GridFsStorage({
	url: "mongodb+srv://trylaptop2024:R4EzWcdNzD9Xf3OW@notes-app.cmibw.mongodb.net/?retryWrites=true&w=majority&appName=Notes-App",
	options: { useNewUrlParser: true, useUnifiedTopology: true },
	file: (req, file) => {
		return {
			bucketName: "notes",
			filename: `${Date.now()}-${file.originalname}`,
		};
	},
});

const upload = multer({ storage });

// Schemas
const noteSchema = new mongoose.Schema({
	title: { type: String, required: true },
	fileType: { type: String, required: true },
	fileSize: { type: Number, required: true },
	uploadDate: { type: Date, default: Date.now },
	filename: { type: String, required: true },
	originalName: { type: String, required: true },
});

const adminSchema = new mongoose.Schema({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	isAdmin: { type: Boolean, default: true },
});

const Note = mongoose.model("Note", noteSchema);
const Admin = mongoose.model("Admin", adminSchema);

// Authentication Middleware
const authenticateAdmin = async (req, res, next) => {
	try {
		const token = req.headers.authorization?.split(" ")[1];
		if (!token) {
			return res.status(401).json({ error: "No token provided" });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const admin = await Admin.findById(decoded.id);

		if (!admin || !admin.isAdmin) {
			return res.status(403).json({ error: "Not authorized" });
		}

		req.admin = admin;
		next();
	} catch (error) {
		res.status(401).json({ error: "Invalid token" });
	}
};

// Routes
app.post("/api/notes", upload.single("file"), async (req, res) => {
	try {
		const { title } = req.body;
		const file = req.file;

		if (!file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		const note = new Note({
			title,
			fileType: file.mimetype,
			fileSize: file.size,
			filename: file.filename,
			originalName: file.originalname,
		});

		await note.save();
		res.status(201).json(note);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

app.get("/api/notes", async (req, res) => {
	try {
		const notes = await Note.find().sort({ uploadDate: -1 });
		res.json(notes);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

app.get("/api/notes/download/:filename", async (req, res) => {
	try {
		const file = await gfs.find({ filename: req.params.filename }).toArray();
		if (!file || file.length === 0) {
			return res.status(404).json({ error: "File not found" });
		}

		const downloadStream = gfs.openDownloadStreamByName(req.params.filename);
		downloadStream.pipe(res);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

app.get("/api/notes/search", async (req, res) => {
	try {
		const { query } = req.query;
		const notes = await Note.find({
			title: { $regex: query, $options: "i" },
		}).sort({ uploadDate: -1 });
		res.json(notes);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Admin Routes
app.post("/api/admin/setup", async (req, res) => {
	try {
		const { setupKey, username, password } = req.body;

		// Verify setup key
		if (setupKey !== process.env.ADMIN_SETUP_KEY) {
			return res.status(403).json({ error: "Invalid setup key" });
		}

		// Check if admin already exists
		const adminExists = await Admin.findOne({ username });
		if (adminExists) {
			return res.status(400).json({ error: "Admin already exists" });
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create admin
		const admin = new Admin({
			username,
			password: hashedPassword,
		});

		await admin.save();
		res.status(201).json({ message: "Admin created successfully" });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

app.post("/api/admin/login", async (req, res) => {
	try {
		const { username, password } = req.body;

		// Find admin
		const admin = await Admin.findOne({ username });
		if (!admin) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		// Verify password
		const isValidPassword = await bcrypt.compare(password, admin.password);
		if (!isValidPassword) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		// Generate token
		const token = jwt.sign({ id: admin._id, username: admin.username }, process.env.JWT_SECRET, {
			expiresIn: "24h",
		});

		res.json({ token });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Protected Admin Routes
app.delete("/api/admin/notes/:id", authenticateAdmin, async (req, res) => {
	try {
		const note = await Note.findById(req.params.id);
		if (!note) {
			return res.status(404).json({ error: "Note not found" });
		}

		// Delete file from GridFS
		const file = await gfs.find({ filename: note.filename }).toArray();
		if (file && file.length > 0) {
			await gfs.delete(file[0]._id);
		}

		// Delete from database
		await note.deleteOne();
		res.json({ message: "Note deleted successfully" });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
	try {
		const totalNotes = await Note.countDocuments();
		const totalSize = await Note.aggregate([
			{
				$group: {
					_id: null,
					total: { $sum: "$fileSize" },
				},
			},
		]);

		res.json({
			totalNotes,
			totalSize: totalSize[0]?.total || 0,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Serve static files and routes
app.get("/admin/login", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/admin", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("*", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
