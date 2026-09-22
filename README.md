# 🛡️ Blockchain-Based Donation Tracking & Milestone Escrow System

**Course:** EC8204 — Blockchain and Cyber Security  
**Institution:** University of Ruhuna — Department of Electrical & Information Engineering  
**Project Title:** Blockchain-Based Donation Tracking System (Transparent Milestone-Based Escrow)

---

## 📌 1. Project Overview & Problem Statement

### The Problem (The Trust Gap in Charitable Giving)
Traditional charitable donations suffer from a persistent trust deficit:
- Donors have no direct way to verify if their funds reached the intended cause or were diverted to administrative overheads.
- Existing auditing systems rely on retrospective financial statements published by NGOs themselves, which cannot be independently verified in real time.

### The Solution
This decentralized application (DApp) replaces blind trust with **cryptographic smart contract guarantees**:
1. **Smart Contract Escrow:** Donations are locked inside a Solidity smart contract and **not** directly deposited into an NGO's personal account.
2. **Milestone-Based Release:** Funds are released in tranches only when predefined milestones (e.g., *"Procure Medical Kits"*) are completed.
3. **Independent Verification:** An authorized Verifier/Auditor reviews cryptographic proof of work (receipt/IPFS hashes) before funds are unlocked.
4. **Public Audit Ledger:** Every single donation, proof hash, and disbursement is permanently recorded on-chain with zero login required.

---

## 👥 2. Main System Actors

| Actor | Role | Key Actions |
| :--- | :--- | :--- |
| 💚 **Donor (Alice / Bob)** | Fund Contributor | Sends ETH donations to the smart contract escrow; inspects live funding progress. |
| 🏢 **NGO / Campaign Owner** | Fund Recipient & Project Executor | Creates campaign with milestones, submits proof-of-work hash, releases unlocked funds to wallet. |
| 🛡️ **Verifier / Auditor** | Independent Oversight | Audits submitted proof-of-work hashes; approves or flags milestones. |
| 🌐 **Public / Beneficiary** | Transparency Stakeholder | Inspects the immutable on-chain transaction history without any login. |

---

## 🏗️ 3. Technology Stack

- **Smart Contract:** Solidity `^0.8.20`
- **Blockchain Environment & Node:** Hardhat 2 (Ethereum-compatible local node)
- **Automated Testing Suite:** Mocha & Chai Matchers with Ethers.js
- **Frontend Framework:** React 19 + Vite
- **Web3 Interaction:** Ethers.js `v6`
- **Icons & Styling:** Lucide React & Glassmorphic Vanilla CSS

---

## 📁 4. Project Folder Structure

```text
Blockchain-Based Donation Tracking System/
├── contracts/
│   └── DonationTracking.sol       # Core Solidity Smart Contract (escrow, access control)
├── scripts/
│   ├── deploy.cjs                 # Deployment & seed data script
│   └── inspectBlocks.cjs          # Script to inspect on-chain blocks and transactions
├── test/
│   └── DonationTracking.test.cjs  # Automated unit test suite (100% pass rate)
├── hardhat.config.cjs             # Hardhat network & compiler configuration
├── package.json                   # Root blockchain dependencies
├── SETUP_AND_RUN_GUIDE.md         # Step-by-step setup and demo execution guide
└── frontend/                      # React Web Interface (Vite)
    ├── index.html                 # Main HTML entry point
    ├── vite.config.js             # Vite configuration
    ├── package.json               # Frontend dependencies
    └── src/
        ├── App.jsx                # Main 4-role interactive dashboard
        ├── index.css              # Custom styling tokens & theme
        └── contracts/
            └── deployedContract.json  # Auto-generated contract address & ABI
```

---

## 🚀 5. Quick Start & Setup Guide

### Prerequisites
- Install **[Node.js](https://nodejs.org/)** (Version 18 or higher recommended).
- Verify installation: `node -v` and `npm -v`

### Installation Steps
1. **Install root dependencies:**
   ```powershell
   npm install
   ```
2. **Install frontend dependencies:**
   ```powershell
   cd frontend
   npm install
   cd ..
   ```

---

## 🧪 6. Running Automated Tests

```powershell
npx hardhat test
```
**Expected Result:** `4 passing (2s)`

---

## 💻 7. Running the Full Application

### Terminal 1: Start Local Blockchain Node
```powershell
npx hardhat node
```

### Terminal 2: Deploy Contract & Launch Web UI
```powershell
npx hardhat run scripts/deploy.cjs --network localhost
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔍 8. Inspecting Blocks on CLI

```powershell
npx hardhat run scripts/inspectBlocks.cjs --network localhost
```

---

## 📄 Detailed Guide
For a comprehensive step-by-step walkthrough of each role (Donor, NGO, Verifier, Public Auditor), see [SETUP_AND_RUN_GUIDE.md](file:///e:/8th%20Sem/EC8204%20-%20Blockchain%20and%20Cybersecurity/Take%20Home%20Assignment/Blockchain-Based%20Donation%20Tracking%20System/SETUP_AND_RUN_GUIDE.md).
