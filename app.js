// Web UI talks to a Node.js backend (`server.js`) which reads/writes
// the same text files as the C++ console application.

const API_BASE = "http://localhost:3000/api";

async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text || "Request failed"}`);
    }
    return res.json();
}

async function apiPost(path, bodyObj) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj || {})
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text || "Request failed"}`);
    }
    return res.json();
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.classList.add("hidden"), 200);
    }, 2500);
}

// Candidate code generation (first and last initials; ensure uniqueness with suffix)
function generateCandidateCode(name) {
    const trimmed = name.trim();
    if (!trimmed) return "XX";
    const parts = trimmed.split(/\s+/);
    const first = parts[0][0].toUpperCase();
    const last = parts[parts.length - 1][0].toUpperCase();
    return first + last;
}

function candidateCodeExists(code, candidates) {
    return candidates.some(c => c.code.toLowerCase() === code.toLowerCase());
}

function countVotesForCode(code, votesObj) {
    const arr = votesObj[code] || [];
    return Array.isArray(arr) ? arr.length : 0;
}

// Navigation between main views
function setupNavigation() {
    const buttons = document.querySelectorAll(".menu-btn");
    const views = document.querySelectorAll(".view");
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetId = btn.getAttribute("data-view");
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            views.forEach(v => {
                v.classList.toggle("active", v.id === targetId);
            });
        });
    });
}

// Voter registration and voting (via backend)
function setupVoterPanel() {
    const voterForm = document.getElementById("voter-form");
    const voterNameInput = document.getElementById("voter-name");
    const voterIdInput = document.getElementById("voter-id");

    voterForm.addEventListener("submit", async e => {
        e.preventDefault();
        const name = voterNameInput.value.trim();
        const id = voterIdInput.value.trim();
        if (!name || !id) {
            showToast("Please enter both name and unique number.");
            return;
        }
        try {
            await apiPost("/voter/register", { name, number: id });
            showToast("Voter details saved.");
        } catch {
            showToast("Failed to save voter details (is server running?).");
        }
    });

    const loadCandidatesBtn = document.getElementById("load-candidates-btn");
    const candidatesListDiv = document.getElementById("candidates-list");

    loadCandidatesBtn.addEventListener("click", async () => {
        let data;
        try {
            // Voter should see only candidate code + name
            data = await apiGet("/candidates");
        } catch {
            candidatesListDiv.innerHTML = "<p class='hint'>Error loading candidates. Is server running?</p>";
            return;
        }
        const candidates = data.candidates || [];
        if (!candidates.length) {
            candidatesListDiv.innerHTML = "<p class='hint'>No candidates registered yet.</p>";
            return;
        }

        let html = "";
        html += "<div class='candidate-row candidate-row-header'><span>Code</span><span>Name</span></div>";
        candidates.forEach(c => {
            html += `<div class="candidate-row"><span>${c.code}</span><span>${c.name}</span></div>`;
        });
        candidatesListDiv.innerHTML = html;
    });

    const submitVoteBtn = document.getElementById("submit-vote-btn");
    const voteVoterIdInput = document.getElementById("vote-voter-id");
    const candidateCodeInput = document.getElementById("candidate-code-input");

    submitVoteBtn.addEventListener("click", async () => {
        const voterId = voteVoterIdInput.value.trim();
        const codeInput = candidateCodeInput.value.trim();
        if (!voterId || !codeInput) {
            showToast("Enter your unique number and candidate code.");
            return;
        }
        try {
            await apiPost("/vote", { voterNumber: voterId, candidateCode: codeInput });
            showToast("Your vote has been recorded.");
        } catch (e) {
            const msg = e.message || "";
            if (msg.toLowerCase().includes("already voted")) {
                showToast("You have already voted. Second vote is not allowed.");
            } else {
                showToast("Failed to record vote (check ID/code or server).");
            }
        }
    });
}

// Candidate registration
function setupCandidatePanel() {
    const candidateForm = document.getElementById("candidate-form");
    const candidateNameInput = document.getElementById("candidate-name");
    const candidateCodeDisplay = document.getElementById("candidate-code-display");

    candidateForm.addEventListener("submit", async e => {
        e.preventDefault();
        const name = candidateNameInput.value.trim();
        if (!name) {
            showToast("Candidate name cannot be empty.");
            return;
        }
        try {
            const res = await apiPost("/candidate/register", { name });
            const code = res.code;
            candidateCodeDisplay.textContent =
                `You have been registered as a candidate. Your unique code is: ${code}`;
            showToast("Candidate registered.");
        } catch (e) {
            showToast(`Failed to register candidate: ${e.message || "unknown error"}`);
        }
    });
}

// Admin panel
function setupAdminPanel() {
    const loginCard = document.getElementById("admin-login-card");
    const adminMenuCard = document.getElementById("admin-menu-card");
    const adminLoginForm = document.getElementById("admin-login-form");
    const adminPassInput = document.getElementById("admin-password");
    const adminOutput = document.getElementById("admin-output");

    adminLoginForm.addEventListener("submit", async e => {
        e.preventDefault();
        const pass = adminPassInput.value;
        try {
            await apiPost("/admin/login", { password: pass });
            loginCard.classList.add("hidden");
            adminMenuCard.classList.remove("hidden");
            showToast("Admin login successful.");
        } catch {
            showToast("Incorrect admin password or server not running.");
        }
    });

    const showVotersBtn = document.getElementById("show-voters-btn");
    const showCandidatesBtn = document.getElementById("show-candidates-btn");
    const showSummaryBtn = document.getElementById("show-summary-btn");
    const newAdminPassInput = document.getElementById("new-admin-password");
    const changeAdminPassBtn = document.getElementById("change-admin-pass-btn");

    showVotersBtn.addEventListener("click", async () => {
        let data;
        try {
            data = await apiGet("/voters");
        } catch {
            adminOutput.innerHTML = "<pre>Error loading voters (server down?).</pre>";
            return;
        }
        const voters = data.voters || [];
        if (!voters.length) {
            adminOutput.innerHTML = "<pre>No voters recorded.</pre>";
            return;
        }
        let text = "Voters List:\nName | Number | Has Voted\n";
        voters.forEach(v => {
            text += `${v.name} | ${v.number} | ${v.hasVoted ? "Yes" : "No"}\n`;
        });
        adminOutput.innerHTML = `<pre>${text}</pre>`;
    });

    showCandidatesBtn.addEventListener("click", async () => {
        let data;
        try {
            data = await apiGet("/candidates/withVotes");
        } catch {
            adminOutput.innerHTML = "<pre>Error loading candidates (server down?).</pre>";
            return;
        }
        const candidates = data.candidates || [];
        if (!candidates.length) {
            adminOutput.innerHTML = "<pre>No candidates recorded.</pre>";
            return;
        }
        let text = "Candidates List:\nName | Code | Current Votes\n";
        candidates.forEach(c => {
            const v = c.votes ?? 0;
            text += `${c.name} | ${c.code} | ${v}\n`;
        });
        adminOutput.innerHTML = `<pre>${text}</pre>`;
    });

    showSummaryBtn.addEventListener("click", async () => {
        let data;
        try {
            data = await apiGet("/summary");
        } catch {
            adminOutput.innerHTML = "<pre>Error loading summary (server down?).</pre>";
            return;
        }
        const { totalVoters, totalVoted, candidates } = data;

        let text = "Live Election Summary:\n";
        text += `Total registered voters: ${totalVoters}\n`;
        text += `Total who have voted: ${totalVoted}\n\n`;

        if (candidates && candidates.length) {
            text += "Per-candidate votes:\n";
            candidates.forEach(c => {
                text += `${c.name} (${c.code}): ${c.votes}\n`;
            });
        } else {
            text += "No candidates registered.\n";
        }
        adminOutput.innerHTML = `<pre>${text}</pre>`;
    });

    changeAdminPassBtn.addEventListener("click", async () => {
        const newPass = newAdminPassInput.value.trim();
        if (!newPass) {
            showToast("New password cannot be empty.");
            return;
        }
        try {
            await apiPost("/admin/password", { newPassword: newPass });
            newAdminPassInput.value = "";
            showToast("Admin password changed.");
        } catch {
            showToast("Failed to change password (server down?).");
        }
    });
}

// Results view
function setupResultsView() {
    const refreshBtn = document.getElementById("refresh-results-btn");
    const resultsOutput = document.getElementById("results-output");

    async function renderResults() {
        let data;
        try {
            data = await apiGet("/results");
        } catch {
            resultsOutput.innerHTML = "<pre>Error loading results (server down?).</pre>";
            return;
        }
        const { results, maxVotes } = data;
        if (!results || !results.length) {
            resultsOutput.innerHTML = "<pre>No candidates found. Election cannot be finalized.</pre>";
            return;
        }
        // Build aligned columns using fixed-width spacing (avoid \t tab-stop misalignment)
        const nameHeader = "Name";
        const codeHeader = "(Code)";
        const votesHeader = "Votes";

        const nameWidth = Math.max(
            nameHeader.length,
            ...results.map(r => String(r.name).length)
        );
        const codeWidth = Math.max(
            codeHeader.length,
            ...results.map(r => `(${r.code})`.length)
        );
        const votesWidth = Math.max(
            votesHeader.length,
            ...results.map(r => String(r.votes).length),
            String(maxVotes).length
        );

        let text = "Final Election Results (current data):\n";
        text += `${nameHeader.padEnd(nameWidth)}  ${codeHeader.padEnd(codeWidth)}  ${votesHeader.padStart(votesWidth)}\n`;

        results.forEach(r => {
            const name = String(r.name).padEnd(nameWidth);
            const code = `(${r.code})`.padEnd(codeWidth);
            const votes = String(r.votes).padStart(votesWidth);
            text += `${name}  ${code}  ${votes}\n`;
        });
        text += `\nHighest votes: ${maxVotes}\n`;
        text += "Winner(s):\n";
        results.forEach(r => {
            if (r.votes === maxVotes) {
                text += `${r.name} (${r.code})\n`;
            }
        });
        resultsOutput.innerHTML = `<pre>${text}</pre>`;
    }

    refreshBtn.addEventListener("click", () => {
        renderResults();
        showToast("Results refreshed.");
    });

    // Initial render
    renderResults();
}

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupVoterPanel();
    setupCandidatePanel();
    setupAdminPanel();
    setupResultsView();
});

