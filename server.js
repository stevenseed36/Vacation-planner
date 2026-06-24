require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// mongodb connection
const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectDB() {
  await client.connect();
  db = client.db('vacationplanner');
  console.log('Connected to MongoDB');
}
connectDB().catch(console.error);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in first' });
  next();
}

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/app');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/app', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// signup
app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields are required' });
  try {
    const users = db.collection('users');
    const existing = await users.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ error: 'Username or email already taken' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await users.insertOne({ username, email, password: hashedPassword, created_at: new Date() });
    req.session.userId = result.insertedId.toString();
    req.session.username = username;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'All fields are required' });
  try {
    const user = await db.collection('users').findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid email or password' });
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });
app.get('/api/me', requireAuth, (req, res) => res.json({ username: req.session.username, userId: req.session.userId }));

// generate trip
app.post('/api/plan', requireAuth, async (req, res) => {
  const { destination, dates, budget, interests } = req.body;
  if (!destination) return res.status(400).json({ error: 'Destination is required' });

  const prompt = `You are a travel expert. Create a detailed vacation itinerary for:
Destination: ${destination}
Dates/Duration: ${dates || 'flexible'}
Budget: ${budget || 'moderate'}
Interests: ${interests || 'general sightseeing'}

Provide a day-by-day itinerary, top places to visit, food recommendations, travel tips, and estimated costs.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const json = await response.json();
    
    let itinerary;
    if (!response.ok || !json.candidates) {
      // fallback itinerary if API fails
      itinerary = `# ${destination} Travel Itinerary\n\nHere is a sample itinerary for your trip to ${destination}.\n\n## Day 1\n- Arrive and check in to your hotel\n- Explore the local area\n- Try local cuisine for dinner\n\n## Day 2\n- Visit top attractions\n- Lunch at a local restaurant\n- Evening city tour\n\n## Day 3\n- Day trip to nearby highlights\n- Shopping and souvenirs\n- Farewell dinner\n\n## Travel Tips\n- Book accommodation in advance\n- Check local weather before packing\n- Exchange currency at the airport\n\n## Estimated Costs (${budget || 'moderate'} budget)\n- Accommodation: $100-200/night\n- Food: $30-60/day\n- Activities: $50-100/day`;
    } else {
      itinerary = json.candidates[0].content.parts[0].text;
    }

    const result = await db.collection('trips').insertOne({
      user_id: req.session.userId,
      destination,
      dates: dates || '',
      budget: budget || '',
      itinerary,
      created_at: new Date()
    });

    res.json({ success: true, itinerary, tripId: result.insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate itinerary' });
  }
});

// get trips
app.get('/api/trips', requireAuth, async (req, res) => {
  const trips = await db.collection('trips').find({ user_id: req.session.userId }).sort({ created_at: -1 }).toArray();
  res.json(trips);
});

// delete trip
app.delete('/api/trips/:id', requireAuth, async (req, res) => {
  await db.collection('trips').deleteOne({ _id: new ObjectId(req.params.id), user_id: req.session.userId });
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
