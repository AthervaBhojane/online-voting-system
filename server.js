// Simple Node.js backend that shares the same text files as the C++ app.
// It exposes a small JSON API used by the web UI in `app.js`.

const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

const ROOT = __dirname;
const VOTERS_FILE = path.join(ROOT, "voters.txt");       // name | number | hasVoted(0/1)
const CANDIDATES_FILE = path.join(ROOT, "candidates.txt"); // name | code
const ADMIN_PASS_FILE = path.join(ROOT, "admin_pass.txt"); // password

app.use(cors());
app.use(express.json());

function trim(s) {
    return (s || "").trim();
}

function ensureAdminPass() {
    if (!fs.existsSync(ADMIN_PASS_FILE)) {
        fs.writeFileSync(ADMIN_PASS_FILE, "admin", "utf8");
    }
}

function getAdminPassword() {
    ensureAdminPass();
    return trim(fs.readFileSync(ADMIN_PASS_FILE, "utf8"));
}

function setAdminPassword(pass) {
    fs.writeFileSync(ADMIN_PASS_FILE, pass, "utf8");
}

function readLinesIfExists(file) {
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, "utf8").split(/\r?\n/);
}

// Voter helpers
function parseVoterLine(line) {
    const t = trim(line);
    if (!t) return null;
    const parts = t.split("|").map(p => trim(p));
    if (parts.length < 2) return null;
    const rec = {
        name: parts[0],
        number: parts[1],
        hasVoted: parts[2] === "1"
    };
    if (parts.length < 3) {
        rec.hasVoted = true;
    }
    return rec;
}

function voterToLine(v) {
    return `${v.name} | ${v.number} | ${v.hasVoted ? "1" : "0"}`;
}

function loadAllVoters() {
    const lines = readLinesIfExists(VOTERS_FILE);
    const out = [];
    for (const line of lines) {
        const v = parseVoterLine(line);
        if (v) out.push(v);
    }
    return out;
}

function saveAllVoters(voters) {
    const data = voters.map(voterToLine).join("\n");
    fs.writeFileSync(VOTERS_FILE, data + (data ? "\n" : ""), "utf8");
}

// Candidate helpers
function parseCandidateLine(line) {
    const t = trim(line);
    if (!t) return null;
    const idx = t.lastIndexOf("|");
    if (idx === -1) return null;
    const name = trim(t.slice(0, idx));
    const code = trim(t.slice(idx + 1));
    if (!name || !code) return null;
    return { name, code };
}

function candidateToLine(c) {
    return `${c.name} | ${c.code}`;
}

function loadAllCandidates() {
    const lines = readLinesIfExists(CANDIDATES_FILE);
    const out = [];
    for (const line of lines) {
        const c = parseCandidateLine(line);
        if (c) out.push(c);
    }
    return out;
}

function saveAllCandidates(candidates) {
    const data = candidates.map(candidateToLine).join("\n");
    fs.writeFileSync(CANDIDATES_FILE, data + (data ? "\n" : ""), "utf8");
}

function countVotesForCode(code) {
    const filename = path.join(ROOT, `${code}.txt`);
    const lines = readLinesIfExists(filename);
    let count = 0;
    for (const line of lines) {
        if (trim(line)) count++;
    }
    return count;
}

function appendVote(code, voterNumber) {
    const filename = path.join(ROOT, `${code}.txt`);
    fs.appendFileSync(filename, `${voterNumber}\n`, "utf8");
}

// Candidate code generation (same as web/C++)
function generateCandidateCode(name) {
    const trimmed = trim(name);
    if (!trimmed) return "XX";
    const parts = trimmed.split(/\s+/);
    const first = parts[0][0].toUpperCase();
    const last = parts[parts.length - 1][0].toUpperCase();
    return first + last;
}

function candidateCodeExists(code, list) {
    return list.some(c => c.code.toLowerCase() === code.toLowerCase());
}

// Routes

app.post("/api/voter/register", (req, res) => {
    const { name, number } = req.body || {};
    if (!name || !number) {
        return res.status(400).json({ error: "Name and number required" });
    }
    const voters = loadAllVoters();
    const idx = voters.findIndex(v => v.number === number);
    if (idx >= 0) {
        voters[idx].name = name;
    } else {
        voters.push({ name, number, hasVoted: false });
    }
    saveAllVoters(voters);
    res.json({ ok: true });
});

app.get("/api/voters", (req, res) => {
    const voters = loadAllVoters();
    res.json({ voters });
});

app.post("/api/candidate/register", (req, res) => {
    const { name } = req.body || {};
    if (!name) {
        return res.status(400).json({ error: "Name required" });
    }
    const candidates = loadAllCandidates();
    let base = generateCandidateCode(name);
    let code = base;
    let suffix = 1;
    while (candidateCodeExists(code, candidates)) {
        code = base + String(suffix);
        suffix++;
    }
    candidates.push({ name, code });
    saveAllCandidates(candidates);
    res.json({ ok: true, code });
});

app.get("/api/candidates", (req, res) => {
    const candidates = loadAllCandidates();
    res.json({ candidates });
});

app.get("/api/candidates/withVotes", (req, res) => {
    const candidates = loadAllCandidates();
    const out = candidates.map(c => ({
        name: c.name,
        code: c.code,
        votes: countVotesForCode(c.code)
    }));
    res.json({ candidates: out });
});

app.post("/api/vote", (req, res) => {
    const { voterNumber, candidateCode } = req.body || {};
    if (!voterNumber || !candidateCode) {
        return res.status(400).json({ error: "voterNumber and candidateCode required" });
    }
    const candidates = loadAllCandidates();
    let canonical = null;
    for (const c of candidates) {
        if (c.code.toLowerCase() === String(candidateCode).toLowerCase()) {
            canonical = c.code;
            break;
        }
    }
    if (!canonical) {
        return res.status(400).json({ error: "Invalid candidate code" });
    }

    const voters = loadAllVoters();
    const idx = voters.findIndex(v => v.number === voterNumber);
    if (idx === -1) {
        return res.status(400).json({ error: "Voter not registered" });
    }
    if (voters[idx].hasVoted) {
        return res.status(400).json({ error: "Voter has already voted" });
    }

    appendVote(canonical, voterNumber);
    voters[idx].hasVoted = true;
    saveAllVoters(voters);
    res.json({ ok: true });
});

app.post("/api/admin/login", (req, res) => {
    const { password } = req.body || {};
    const stored = getAdminPassword();
    if (password !== stored) {
        return res.status(401).json({ error: "Invalid password" });
    }
    res.json({ ok: true });
});

app.post("/api/admin/password", (req, res) => {
    const { newPassword } = req.body || {};
    if (!newPassword) {
        return res.status(400).json({ error: "newPassword required" });
    }
    setAdminPassword(newPassword);
    res.json({ ok: true });
});

app.get("/api/summary", (req, res) => {
    const voters = loadAllVoters();
    const candidates = loadAllCandidates();
    const totalVoters = voters.length;
    const totalVoted = voters.filter(v => v.hasVoted).length;
    const candWithVotes = candidates.map(c => ({
        name: c.name,
        code: c.code,
        votes: countVotesForCode(c.code)
    }));
    res.json({
        totalVoters,
        totalVoted,
        candidates: candWithVotes
    });
});

app.get("/api/results", (req, res) => {
    const candidates = loadAllCandidates();
    const results = candidates.map(c => ({
        name: c.name,
        code: c.code,
        votes: countVotesForCode(c.code)
    }));
    let maxVotes = 0;
    for (const r of results) {
        if (r.votes > maxVotes) maxVotes = r.votes;
    }
    res.json({ results, maxVotes });
});

app.listen(PORT, () => {
    console.log(`Student Voting backend listening on http://localhost:${PORT}`);
});

