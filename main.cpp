#include <iostream>
#include <fstream>
#include <string>
#include <sstream>
#include <vector>
#include <algorithm>

using namespace std;


// file names (stored in project directory)
const string VOTERS_FILE      = "voters.txt";
const string CANDIDATES_FILE  = "candidates.txt";
const string ADMIN_PASS_FILE  = "admin_pass.txt";


// utility helpers
string trim(const string &s) {
    size_t start = s.find_first_not_of(" \t\r\n");
    if (start == string::npos) return "";
    size_t end = s.find_last_not_of(" \t\r\n");
    return s.substr(start, end - start + 1);
}

string toLower(string s) {
    transform(s.begin(), s.end(), s.begin(),
              [](unsigned char c) { return static_cast<char>(tolower(c)); });
    return s;
}

// admin password
string getAdminPassword() {
    ifstream in(ADMIN_PASS_FILE);
    if (!in) {
        ofstream out(ADMIN_PASS_FILE);
        out << "admin";
        return "admin";
    }
    string pass;
    getline(in, pass);
    return trim(pass);
}

void setAdminPassword(const string &newPass) {
    ofstream out(ADMIN_PASS_FILE, ios::trunc);
    if (out) {
        out << newPass;
    }
}


// Voter management
struct VoterRecord {
    string name;
    string number;
    bool   hasVoted{};
};

VoterRecord parseVoterLine(const string &line) {
    VoterRecord v{};
    string t = trim(line);
    if (t.empty()) return v;
    
    stringstream ss(t);
    string part;
    vector<string> parts;
    while (getline(ss, part, '|')) {
        parts.push_back(trim(part));
    }
    if (parts.size() >= 2) {
        v.name = parts[0];
        v.number = parts[1];
    }
    if (parts.size() >= 3) {
        v.hasVoted = (parts[2] == "1");
    } else {
        v.hasVoted = true;
    }
    return v;
}

string voterToLine(const VoterRecord &v) {
    return v.name + " | " + v.number + " | " + (v.hasVoted ? string("1") : string("0"));
}

vector<VoterRecord> loadAllVoters() {
    vector<VoterRecord> voters;
    ifstream in(VOTERS_FILE);
    if (!in) return voters;

    string line;
    while (getline(in, line)) {
        line = trim(line);
        if (line.empty()) continue;
        voters.push_back(parseVoterLine(line));
    }
    return voters;
}

void saveAllVoters(const vector<VoterRecord> &voters) {
    ofstream out(VOTERS_FILE, ios::trunc);
    if (!out) {
        cout << "Error: cannot write voters file.\n";
        return;
    }
    for (const auto &v : voters) {
        out << voterToLine(v) << "\n";
    }
}

VoterRecord *findVoterByNumber(vector<VoterRecord> &voters, const string &number) {
    for (auto &v : voters) {
        if (v.number == number) return &v;
    }
    return nullptr;
}


// Candidate management
struct Candidate {
    string name;
    string code;
};

Candidate parseCandidateLine(const string &line) {
    Candidate c{};
    string t = trim(line);
    if (t.empty()) return c;
    size_t pos = t.rfind('|');
    if (pos == string::npos) return c;
    c.name = trim(t.substr(0, pos));
    c.code = trim(t.substr(pos + 1));
    return c;
}

string candidateToLine(const Candidate &c) {
    return c.name + " | " + c.code;
}

vector<Candidate> loadAllCandidates() {
    vector<Candidate> list;
    ifstream in(CANDIDATES_FILE);
    if (!in) return list;
    string line;
    while (getline(in, line)) {
        line = trim(line);
        if (line.empty()) continue;
        Candidate c = parseCandidateLine(line);
        if (!c.name.empty() && !c.code.empty()) {
            list.push_back(c);
        }
    }
    return list;
}

bool candidateCodeExists(const string &code) {
    auto list = loadAllCandidates();
    for (const auto &c : list) {
        if (toLower(c.code) == toLower(code)) return true;
    }
    return false;
}

// generate candidate code
string generateCandidateCode(const string &name) {
    string trimmed = trim(name);
    if (trimmed.empty()) return "XX";

    stringstream ss(trimmed);
    vector<string> parts;
    string part;
    while (ss >> part) {
        parts.push_back(part);
    }

    char first = static_cast<char>(toupper(parts.front()[0]));
    char last  = static_cast<char>(toupper(parts.back()[0]));
    string code;
    code.push_back(first);
    code.push_back(last);
    return code;
}

// count votes
int countVotesForCode(const string &code) {
    string filename = code + ".txt";
    ifstream in(filename);
    if (!in) return 0;
    int count = 0;
    string line;
    while (getline(in, line)) {
        if (!trim(line).empty()) count++;
    }
    return count;
}



void applyAsVoter() {
    string name;
    string uniqueNumber;

    while (true) {
        cout << "\n--- Apply as a Voter ---\n";
        cout << "1. Enter Name\n";
        cout << "2. Enter Unique Number\n";
        cout << "3. Vote for Candidate\n";
        cout << "4. Back to Main Menu\n";
        cout << "Enter your choice: ";

        int choice;
        if (!(cin >> choice)) {
            cin.clear();
            cin.ignore(10000, '\n');
            cout << "Invalid input.\n";
            continue;
        }
        cin.ignore(10000, '\n');

        if (choice == 1) {
            cout << "Enter your name: ";
            getline(cin, name);
            name = trim(name);
        } else if (choice == 2) {
            cout << "Enter your unique number: ";
            getline(cin, uniqueNumber);
            uniqueNumber = trim(uniqueNumber);
        } else if (choice == 3) {
            if (name.empty() || uniqueNumber.empty()) {
                cout << "Please enter your name and unique number first.\n";
                continue;
            }

            
            auto voters = loadAllVoters();
            VoterRecord *existing = findVoterByNumber(voters, uniqueNumber);

            if (existing && existing->hasVoted) {
                cout << "You have already voted. Second vote is not allowed.\n";
                continue;
            }

            if (!existing) {
                VoterRecord v{name, uniqueNumber, false};
                voters.push_back(v);
                existing = &voters.back();
            } else {
                existing->name = name; // update name if changed
            }

            // show candidates
            auto candidates = loadAllCandidates();
            if (candidates.empty()) {
                cout << "No candidates available to vote for.\n";
                continue;
            }

            cout << "\nList of Candidates:\n";
            cout << "Code\tName\t(Current votes)\n";
            for (const auto &c : candidates) {
                int currentVotes = countVotesForCode(c.code);
                cout << c.code << "\t" << c.name << "\t(" << currentVotes << ")\n";
            }

            cout << "\nEnter the unique identity code of the candidate you want to vote for: ";
            string voteCode;
            getline(cin, voteCode);
            voteCode = trim(voteCode);

            bool valid = false;
            string canonicalCode;
            for (const auto &c : candidates) {
                if (toLower(c.code) == toLower(voteCode)) {
                    valid = true;
                    canonicalCode = c.code; // preserve exact code used in files
                    break;
                }
            }

            if (!valid) {
                cout << "Invalid candidate code. Vote not recorded.\n";
                continue;
            }


            {
                string filename = canonicalCode + ".txt";
                ofstream out(filename, ios::app);
                if (!out) {
                    cout << "Error opening candidate vote file.\n";
                    continue;
                }
                out << uniqueNumber << "\n";
            }

            existing->hasVoted = true;
            saveAllVoters(voters);

            cout << "Your vote has been recorded successfully.\n";
            // Clear local data if you want the next voter to start fresh
            name.clear();
            uniqueNumber.clear();
        } else if (choice == 4) {
            return;
        } else {
            cout << "Invalid choice.\n";
        }
    }
}

void applyAsCandidate() {
    cout << "\n--- Apply as a Candidate ---\n";
    cout << "Enter your name: ";
    string name;
    getline(cin, name);
    name = trim(name);

    if (name.empty()) {
        cout << "Name cannot be empty.\n";
        return;
    }

    string code = generateCandidateCode(name);

    // unique code
    if (candidateCodeExists(code)) {
        int suffix = 1;
        string base = code;
        while (candidateCodeExists(code)) {
            code = base + to_string(suffix);
            ++suffix;
        }
    }

    ofstream out(CANDIDATES_FILE, ios::app);
    if (!out) {
        cout << "Error opening candidates file.\n";
        return;
    }
    out << candidateToLine({name, code}) << "\n";

    cout << "You have been registered as a candidate.\n";
    cout << "Your unique identity code is: " << code << "\n";
}


void searchCandidateByName() {
    auto candidates = loadAllCandidates();
    if (candidates.empty()) {
        cout << "No candidates to search.\n";
        return;
    }
    cout << "Enter part of the candidate name to search: ";
    string query;
    getline(cin, query);
    query = toLower(trim(query));
    if (query.empty()) {
        cout << "Search query is empty.\n";
        return;
    }

    cout << "\nMatches:\n";
    bool found = false;
    for (const auto &c : candidates) {
        if (toLower(c.name).find(query) != string::npos) {
            cout << c.code << "\t" << c.name << "\n";
            found = true;
        }
    }
    if (!found) {
        cout << "No candidates matched your search.\n";
    }
}


void adminMenu() {
    cout << "\n--- Admin Login ---\n";
    string storedPass = getAdminPassword();
    cout << "Enter admin password: ";
    string inputPass;
    getline(cin, inputPass);

    if (inputPass != storedPass) {
        cout << "Incorrect password.\n";
        return;
    }

    while (true) {
        cout << "\n--- Admin Menu ---\n";
        cout << "1. Check Voters List\n";
        cout << "2. Check Candidates List\n";
        cout << "3. Change Admin Password\n";
        cout << "4. Quick Election Summary (Live)\n";
        cout << "5. Back to Main Menu\n";
        cout << "Enter your choice: ";

        int choice;
        if (!(cin >> choice)) {
            cin.clear();
            cin.ignore(10000, '\n');
            cout << "Invalid input.\n";
            continue;
        }
        cin.ignore(10000, '\n');

        if (choice == 1) {
            auto voters = loadAllVoters();
            if (voters.empty()) {
                cout << "No voters recorded.\n";
            } else {
                cout << "\n--- Voters List ---\n";
                cout << "Name | Number | Has Voted\n";
                for (const auto &v : voters) {
                    cout << v.name << " | " << v.number
                         << " | " << (v.hasVoted ? "Yes" : "No") << "\n";
                }
            }
        } else if (choice == 2) {
            auto candidates = loadAllCandidates();
            if (candidates.empty()) {
                cout << "No candidates recorded.\n";
            } else {
                cout << "\n--- Candidates List ---\n";
                cout << "Name | Code | Current Votes\n";
                for (const auto &c : candidates) {
                    int votes = countVotesForCode(c.code);
                    cout << c.name << " | " << c.code << " | " << votes << "\n";
                }
            }
        } else if (choice == 3) {
            cout << "Enter new admin password: ";
            string newPass;
            getline(cin, newPass);
            newPass = trim(newPass);
            if (newPass.empty()) {
                cout << "Password cannot be empty.\n";
            } else {
                setAdminPassword(newPass);
                cout << "Admin password changed successfully.\n";
            }
        } else if (choice == 4) {
            auto candidates = loadAllCandidates();
            auto voters    = loadAllVoters();
            cout << "\n--- Live Election Summary ---\n";
            cout << "Total registered voters: " << voters.size() << "\n";
            int votedCount = 0;
            for (const auto &v : voters) if (v.hasVoted) ++votedCount;
            cout << "Total who have voted: " << votedCount << "\n";

            if (!candidates.empty()) {
                cout << "\nPer-candidate votes:\n";
                for (const auto &c : candidates) {
                    int votes = countVotesForCode(c.code);
                    cout << c.name << " (" << c.code << "): " << votes << "\n";
                }
            } else {
                cout << "No candidates registered.\n";
            }
        } else if (choice == 5) {
            return;
        } else {
            cout << "Invalid choice.\n";
        }
    }
}

// final result
void endElectionProcess() {
    cout << "\n--- End Election Process ---\n";

    auto candidates = loadAllCandidates();
    if (candidates.empty()) {
        cout << "No candidates found. Election cannot be finalized.\n";
        return;
    }

    struct Result {
        string name;
        string code;
        int    votes{};
    };

    vector<Result> results;
    for (const auto &c : candidates) {
        int v = countVotesForCode(c.code);
        results.push_back({c.name, c.code, v});
    }

    cout << "\n--- Final Election Results ---\n";
    cout << "Name\t(Code)\tVotes\n";
    for (const auto &r : results) {
        cout << r.name << "\t(" << r.code << ")\t" << r.votes << "\n";
    }

    int maxVotes = 0;
    for (const auto &r : results) {
        if (r.votes > maxVotes) maxVotes = r.votes;
    }

    cout << "\nHighest votes: " << maxVotes << "\n";
    cout << "Winner(s):\n";
    for (const auto &r : results) {
        if (r.votes == maxVotes) {
            cout << r.name << " (" << r.code << ")\n";
        }
    }

    cout << "\nElection process has ended. Program will now exit.\n";
}



int main() {
    while (true) {
        cout << "\n=== Student Voting System ===\n";
        cout << "1. Apply as a Voter\n";
        cout << "2. Apply as a Candidate\n";
        cout << "3. Admin\n";
        cout << "4. Search Candidate by Name\n";
        cout << "5. End Election Process\n";
        cout << "Enter your choice: ";

        int choice;
        if (!(cin >> choice)) {
            cin.clear();
            cin.ignore(10000, '\n');
            cout << "Invalid input.\n";
            continue;
        }
        cin.ignore(10000, '\n');

        switch (choice) {
            case 1:
                applyAsVoter();
                break;
            case 2:
                applyAsCandidate();
                break;
            case 3:
                adminMenu();
                break;
            case 4:
                searchCandidateByName();
                break;
            case 5:
                endElectionProcess();
                return 0;
            default:
                cout << "Invalid choice. Please try again.\n";
        }
    }
}

