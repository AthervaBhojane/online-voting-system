# Student Voting System (C++ + Web UI)

A simple Student Election voting system where students can apply as **voters** and **candidates**, students can cast **one vote per unique voter number**, and an **admin (teacher)** can review records and finalize the election.

## Features

### Voter Registration
- Students enter:
  - `name`
  - `unique identity number`
- Stored in `voters.txt` as:
  - `name | uniqueNumber | hasVoted(0/1)`

### Candidate Registration
- Students enter:
  - `candidate name`
- The system auto-generates a **unique candidate code** using:
  - first initial of first word + first initial of last word
  - Example: `Rahul Sharma` → `RS`
- If code already exists, it automatically adds a numeric suffix:
  - `RS`, `RS1`, `RS2`, ...
- Stored in `candidates.txt` as:
  - `name | code`

### Voting (One Vote Only)
- Voters provide:
  - `unique voter number`
  - `candidate code`
- The system prevents double voting using the `hasVoted` flag.
- Each candidate has their own vote file:
  - `<candidateCode>.txt`
- Votes are stored as voter numbers (one line per vote).

### Admin (Teacher) Capabilities
- Admin password is stored in `admin_pass.txt` (default: `admin`)
- Admin can:
  - check voters list
  - check candidates list with live vote counts
  - view a live election summary

### End Election / Results
- Reads all candidates and counts votes from their files
- Displays final vote counts and **winner(s)** (supports ties)

## Tech Used

- **C++**: `main.cpp` (console voting system)
- **Web Frontend**:
  - `index.html`, `style.css`, `app.js`
- **Backend API**:
  - **Node.js + Express** (`server.js`)
  - **CORS** enabled for frontend API calls
- **Data Storage** (shared with C++ and backend):
  - `voters.txt`
  - `candidates.txt`
  - `admin_pass.txt`
  - `<candidateCode>.txt` (per-candidate vote files)

## How the Web UI Works
The web UI communicates with the backend using:
- `http://localhost:3000/api`

Key endpoints used:
- `POST /api/voter/register`
- `GET /api/voters`
- `POST /api/candidate/register`
- `GET /api/candidates`
- `GET /api/candidates/withVotes`
- `POST /api/vote`
- `POST /api/admin/login`
- `POST /api/admin/password`
- `GET /api/summary`
- `GET /api/results`

## Setup & Run

### 1) Backend (Node.js)
In the project folder:
```bash
npm init -y
npm install express cors
node server.js
