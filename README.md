Steven's Travel Guide AI Vacation Planner

A full stack web app that uses Google Gemini AI to generate personalized vacation itineraries. Users can sign up, log in, generate trip plans, and save them to their account.

Features

- User signup and login with hashed passwords
- Session-based authentication
- AI-generated vacation itineraries using Google Gemini API
- Save, view, and delete trips from your account
- Clean dark UI with responsive design
- MongoDB Atlas database for data persistence

How to Run the Server

1. Install dependencies:

npm install

2. Create a .env file in the root folder with the following:

MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
SESSION_SECRET=any_random_string
PORT=3000


3. Start the server:

node server.js


4. Open your browser and go to:

http://localhost:3000



API Used

Google Gemini API (`gemini-2.0-flash` model)
Used to generate personalized vacation itineraries based on destination, dates, budget, and interests.
 Documentation: https://ai.google.dev/


Database Schema

users collection
| Field | Type | Description |

 _id | ObjectId | Auto-generated MongoDB ID 
 username | String | Unique username 
 email | String | Unique email address 
 password | String | Bcrypt hashed password 
 created_at | Date | Account creation timestamp 

trips collection
| Field | Type | Description |

 _id | ObjectId | Auto-generated MongoDB ID 
 user_id | String | References users._id 
 destination | String | Trip destination 
 dates | String | Travel dates or duration 
 budget | String | Budget level |
 itinerary | String | AI-generated itinerary text 
 created_at | Date | Trip creation timestamp 


Tech Stack

Frontend: HTML, CSS, JavaScript
Backend: Node.js + Express
Database: MongoDB Atlas
Authentication: bcrypt + express-session
AI: Google Gemini API
Hosting: Render



Test Account

Username: `Professor`
Email: `Professor@qc.com`
Password: `CS355`
