const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DATA_FILE = "./data.json";
const USERS_FILE = "./users.json";

function readData() {
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Authentication middleware
function authenticateToken(req, res, next) {
  console.log("authenticating token");
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user; // { username, role }
    next();
  });
}

// Authorization middleware
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

function isAdmin(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => 
    {
      console.log("verifying token", user);
    if (err) return res.status(403).json({ error: "Invalid token" });
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.user = user; // { username, role }
    next();
  }
  );
}

// --- Public routes ---
app.post("/api/signup", async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const users = readUsers();
  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ error: "User already exists" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  users.push({ username, passwordHash, role });
  writeUsers(users);
  res.status(201).json({ message: "User registered successfully" });
});

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();
  const user = users.find((u) => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign(
    { username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  res.json({ token, username: user.username, role: user.role });
});

app.get("/api/time", (req, res) => {
  const now = new Date().toISOString().split(".")[0] + "Z";
  res.json({ dateTime: now });
});

// --- Protected routes ---
app.get(
  "/api/records",
  authenticateToken,
  authorizeRoles("admin"),
  (req, res) => {
    res.json(readData());
  }
);

app.get("/api/records/:username", authenticateToken, (req, res) => {
  const { username } = req.params;
  // משתמש רגיל רשאי רק על הנתונים שלו
  if (req.user.role !== "admin" && req.user.username !== username) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const data = readData().filter((r) => r.username === username);
  res.json(data);
});

app.get(
  "/api/records/:username/month/:month/:year",
  authenticateToken,
  (req, res) => {
    const { username, month, year } = req.params;
    // משתמש רגיל רשאי רק על הנתונים שלו
    if (req.user.role !== "admin" && req.user.username !== username) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const data = readData().filter((r) => {
      const date = new Date(r.dateTime);
      return (
        r.username === username &&
        date.getMonth() + 1 === parseInt(month) &&
        date.getFullYear() === parseInt(year)
      );
    });
    res.json(data);
  });


app.get(
  "/api/records/:username/latest",
  authenticateToken,
  (req, res) => {
    const { username } = req.params;
    if (req.user.role !== "admin" && req.user.username !== username) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const data = readData().filter((r) => r.username === username);
    if (!data.length) return res.status(404).json({ error: "Not found" });
    const lastRecord = data[data.length - 1];
    res.json(lastRecord);
  }
);

app.get(
  "/api/records/month/:month/:year",
  authenticateToken,
  authorizeRoles("admin"),
  (req, res) => {
    const { month, year } = req.params;
    const data = readData().filter((r) => {
      const date = new Date(r.dateTime);
      return (
        date.getMonth() + 1 === parseInt(month) &&
        date.getFullYear() === parseInt(year)
      );
    });
    res.json(data);
  }
);
app.post(
  "/api/records",
  authenticateToken,
  authorizeRoles("admin", "user"),
  (req, res) => {
    const { type } = req.body;
    const username = req.user.username;
    const now = new Date().toISOString().split(".")[0] + "Z";
    const data = readData();
    const userRecords = data.filter((r) => r.username === username);

    // בדיקת יציאה/כניסה כפולה
    if (userRecords.length) {
      const last = userRecords[userRecords.length - 1];
      if (last.type === type)
        return res
          .status(400)
          .json({ error: `Already clocked ${type}` });
      if (
        (type === "out" && now < last.dateTime) ||
        (type === "in" && now < last.dateTime)
      ) {
        return res
          .status(400)
          .json({ error: "Invalid timestamp order" });
      }
    }

    const record = { id: uuidv4(), username, type, dateTime: now };
    data.push(record);
    writeData(data);
    res.json(record);
  }
);

app.put(
  "/api/records/:id",
  isAdmin,
  (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const data = readData();
    const idx = data.findIndex((r) => r.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    data[idx] = { ...data[idx], ...updates };
    writeData(data);
    res.json(data[idx]);
  }
);

app.delete(
  "/api/records/:id",
  isAdmin,
  
  (req, res) => {
    const { id } = req.params;
    const data = readData();
    const idx = data.findIndex((r) => r.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    data.splice(idx, 1);
    writeData(data);
    res.json({ success: true });
  }
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
