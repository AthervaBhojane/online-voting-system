# Student Voting System (C++ + Web UI)

Simple student election system with:

- **C++ console app** (`main.cpp`)
- **Web UI** (`index.html`, `style.css`, `app.js`)
- **Node.js backend** (`server.js`)

All three share the same text files:

- `voters.txt` – `name | number | hasVoted(0/1)`
- `candidates.txt` – `name | code`
- `admin_pass.txt` – admin password (`admin` by default)
- `<code>.txt` – one file per candidate, each line is one vote (voter number)

---

## 1. Requirements

- **C++ compiler** (e.g. `g++` from MinGW/MSYS2)
- **Node.js** (LTS version, from nodejs.org)
- Optional: **VS Code** with:
  - C/C++ extension
  - Live Server (for serving `index.html`)

Project folder:  
`d:\Academic_Projects\online_student_voting system`

---

## 2. Setup Node.js backend

Open a terminal in the project folder and run:

```bash
cd "d:\Academic_Projects\online_student_voting system"
npm init -y
npm install express cors
```

Start the backend:

```bash
node server.js
```

You should see:

```text
Student Voting backend listening on http://localhost:3000
```

Keep this terminal running while using the web UI.

---

## 3. Run the C++ console app

From the same project folder:

```bash
g++ main.cpp -o voting_system
.\voting_system.exe
```

Main menu:

1. Apply as a Voter  
2. Apply as a Candidate  
3. Admin  
4. Search Candidate by Name  
5. End Election Process  

Admin password (default): **`admin`**  
Data is stored in the text files listed above.

---

## 4. Run the Web UI

Open `index.html` in a browser (or use Live Server in VS Code).

Main sections:

- **Apply as Voter**
  - Register with name + unique number
  - Vote for a candidate using their code
- **Apply as Candidate**
  - Register as candidate
  - Code generated from initials (e.g. "Rahul Sharma" → `RS`, with numeric suffix if needed)
- **Admin**
  - Login (password: `admin` or changed value)
  - View voters list
  - View candidates list with live vote counts
  - View quick election summary
  - Change admin password
- **End Election / Results**
  - Shows final votes and winner(s) based on current data

The web UI talks to the Node backend (`http://localhost:3000/api`) and uses the same text files as the C++ app, so both interfaces see the same election data.

---

## 5. Typical workflow

1. Start **Node backend**: `node server.js`
2. Open **web UI** (`index.html`) and/or run **C++ app** (`voting_system.exe`).
3. Register candidates.
4. Register voters and cast votes.
5. Use Admin panel or End Election/Results to see winners.

