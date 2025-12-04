require('reflect-metadata');
require("dotenv").config();

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const sql = require('mssql');
const { AppDataSource } = require('./src/data-source');
const { createConnectionToAzureDb } = require('./src/db/connection');
const usersRepository = require('./src/repository');


const app = express();

app.use(express.json());
app.use(cookieParser());

// === CONFIG (for demo only - move to env vars) ===
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret-example';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-example';
const ACCESS_TOKEN_EXPIRY = '15m'; // short-lived access token
const REFRESH_TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 days
const PORT = process.env.PORT || 4000;

// === In-memory "DB" ===
const users = []; // { id, username, passwordHash }
const refreshTokens = new Map(); // refreshToken -> { userId, expiresAt }

try {
  createConnectionToAzureDb();
} catch (error) {
  console.error("Failed to connect to database, ", error);
}

const usersRepo = usersRepository()
// === Helpers ===
function createAccessToken(user) {
  return jwt.sign({ sub: user.id, username: user.username }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function createRefreshToken(user) {
  const token = uuidv4(); // use opaque token (safer to store server-side)
  const expiresAt = Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000;
  refreshTokens.set(token, { userId: user.id, expiresAt });
  return token;
}

function revokeRefreshToken(token) {
  refreshTokens.delete(token);
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (err) {
    return null;
  }
}

// === Auth routes ===

// Register
app.post('/auth/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  // if (users.find(u => u.username === username)) return res.status(409).json({ error: 'username already exists' });
  const existingUser = await usersRepo.existsBy({ username});
  if(existingUser) return res.status(409).json({ error: 'username already exists' });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const user = usersRepo.save({ username,email,password:passwordHash });
  
  //users.push(user);
  res.status(201).json({ message: 'user created', user: { id: user.id, username: user.username } });
});

// Login -> returns access token and sets refresh token cookie for auto sign-in
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  const user = await usersRepo.findOneBy({ username });
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'invalid credentials' });

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  // Set refresh token as HttpOnly cookie for auto sign-in
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
    secure: false // set true if using HTTPS
  });

  res.json({ accessToken, expiresIn: ACCESS_TOKEN_EXPIRY });
});

// Refresh -> use refresh token cookie to issue a new access token (auto sign-in)
app.get('/auth/refresh', (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: 'no refresh token' });

  const record = refreshTokens.get(token);
  if (!record) return res.status(401).json({ error: 'invalid refresh token' });
  if (record.expiresAt < Date.now()) {
    refreshTokens.delete(token);
    return res.status(401).json({ error: 'refresh token expired' });
  }

  // const user = users.find(u => u.id === record.userId);
  const user = usersRepo.findOneBy({id:record.userId});
  if (!user) return res.status(401).json({ error: 'user not found' });

  const accessToken = createAccessToken(user);
  res.json({ accessToken, expiresIn: ACCESS_TOKEN_EXPIRY });
});

// Logout -> revoke refresh token and clear cookie
app.post('/auth/logout', (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) revokeRefreshToken(token);
  res.clearCookie('refreshToken');
  res.json({ message: 'logged out' });
});

// === Middleware for protected routes ===
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'missing authorization header' });
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return res.status(401).json({ error: 'invalid authorization format' });

  const payload = verifyAccessToken(token);
  if (!payload) return res.status(401).json({ error: 'invalid or expired token' });

  req.user = { id: payload.sub, username: payload.username };
  next();
}

// === Example resource routes ===
let items = [
  { id: '1', text: 'first item', ownerId: null },
  { id: '2', text: 'second item', ownerId: null }
];

// Public GET
app.get('/items', (req, res) => {
  res.json(items);
});

// Protected GET single
app.get('/items/:id', authMiddleware, (req, res) => {
  const item = items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  res.json(item);
});

// Protected POST create
app.post('/items', authMiddleware, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const item = { id: uuidv4(), text, ownerId: req.user.id };
  items.push(item);
  res.status(201).json(item);
});

// Protected PUT update
app.put('/items/:id', authMiddleware, (req, res) => {
  const item = items.find(i => i.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  if (item.ownerId !== req.user.id) return res.status(403).json({ error: 'not owner' });
  const { text } = req.body;
  if (text) item.text = text;
  res.json(item);
});

// Protected DELETE
app.delete('/items/:id', authMiddleware, (req, res) => {
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  const item = items[idx];
  if (item.ownerId !== req.user.id) return res.status(403).json({ error: 'not owner' });
  items.splice(idx, 1);
  res.json({ message: 'deleted' });
});



app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'home.html'));
});



app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

