# 🚀 Step-by-Step Setup & Execution Guide

This document contains exact terminal commands to install, test, deploy, and run the **Blockchain-Based Donation Tracking System** from scratch.

---

## 📋 Prerequisites
Ensure you have **Node.js (v18+)** installed:
```powershell
node -v
npm -v
```

---

## 🛠️ Step 1: Install Dependencies

### 1. Root Blockchain Dependencies
Open PowerShell in the root project folder:
```powershell
npm install
```

### 2. Frontend Web Dependencies
Navigate to `frontend` and install packages:
```powershell
cd frontend
npm install
cd ..
```

---

## 🧪 Step 2: Run Automated Smart Contract Tests

Verify that all smart contract escrow and security access controls are working:
```powershell
npx hardhat test
```

**Expected Output:**
```text
  DonationTracking Smart Contract
    ✔ 1. Should allow an NGO to create a campaign with milestones (53ms)
    ✔ 2. Should receive donations and hold them in escrow (48ms)
    ✔ 3. Should reject milestone approval by anyone except the designated verifier (60ms)
    ✔ 4. Should complete the full cycle: Donate -> Submit Proof -> Approve -> Release Funds (65ms)

  4 passing (2s)
```

---

## 🌐 Step 3: Run Local Blockchain & Web Application

Running the live application requires **two terminal windows**.

### 🖥️ Terminal 1: Start Local Ethereum Blockchain Node
In your root project folder, run:
```powershell
npx hardhat node
```
> ⚠️ **Important:** Leave this terminal open. It runs your local blockchain network at `http://127.0.0.1:8545`.

---

### 🖥️ Terminal 2: Deploy Contract & Start Frontend

Open a **second terminal window** in the root project folder:

#### 1. Deploy Smart Contract to Local Node:
```powershell
npx hardhat run scripts/deploy.cjs --network localhost
```
*This deploys `DonationTracking.sol`, seeds the initial 5.0 ETH campaign, and writes the contract ABI to the frontend.*

#### 2. Start the Frontend Dev Server:
```powershell
cd frontend
npm run dev
```

#### 3. Open in Browser:
Click or navigate to:
```text
http://localhost:5173
```

---

## 🎯 Step 4: Step-by-Step Live Demo Walkthrough

Once the web page opens at `http://localhost:5173`:

### 1. Donor Flow (Contribute to Escrow)
1. In the top-right **"Simulate Wallet"** dropdown, select **"Donor 1 (Alice)"**.
2. Click on the **"Donor Dashboard"** tab.
3. Select an amount (e.g., `0.5 ETH`) and click **"Donate 0.5 ETH to Escrow"**.
4. Observe **TOTAL RAISED** and **LOCKED IN ESCROW** update in real time.

### 2. NGO Flow (Submit Proof of Work)
1. Change **"Simulate Wallet"** to **"NGO Owner (Red Cross)"**.
2. Click on the **"NGO Manager"** tab.
3. Under Milestone #1, enter a sample proof hash: `QmMedicalSuppliesReceipt2026`.
4. Click **"Submit Proof of Work on Ledger"**.
5. Milestone status changes to `SUBMITTED`. Funds remain safely locked in escrow.

### 3. Verifier / Auditor Flow (Audit & Approve)
1. Change **"Simulate Wallet"** to **"Auditor / Verifier"**.
2. Click on the **"Verifier / Auditor"** tab.
3. Inspect the submitted proof hash and click **"Approve & Authorize Fund Release"**.
4. Milestone status changes to `APPROVED`.

### 4. Fund Release (Disburse Escrow to NGO)
1. Switch back to **"NGO Owner (Red Cross)"**.
2. Go to **"NGO Manager"** tab.
3. Click the green button **"Release 2.0 ETH to NGO Wallet"**.
4. Escrow funds transfer directly into the NGO wallet, and milestone status changes to `DISBURSED`.

### 5. Public Audit Trail (Zero-Login Transparency)
1. Click on the **"Public Audit Trail"** tab.
2. View the full, timestamped on-chain transaction history.

---

## 🔍 Step 5: Inspect Blockchain Blocks on CLI

To view all mined blocks, parent hash links, and transaction hashes directly on the terminal:
```powershell
npx hardhat run scripts/inspectBlocks.cjs --network localhost
```
