const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("==================================================");
    console.log("🚀 Deploying DonationTracking Smart Contract...");
    console.log("==================================================");

    const [deployerNGO, verifier, donor1, donor2] = await ethers.getSigners();

    console.log(`📍 Deployer (NGO) Address: ${deployerNGO.address}`);
    console.log(`🛡️ Verifier Address:       ${verifier.address}`);
    console.log(`👤 Donor 1 Address:        ${donor1.address}`);
    console.log(`👤 Donor 2 Address:        ${donor2.address}`);

    // 1. Deploy Contract
    const DonationTracking = await ethers.getContractFactory("DonationTracking");
    const donationTracking = await DonationTracking.deploy();
    await donationTracking.waitForDeployment();

    const contractAddress = await donationTracking.getAddress();
    console.log(`\n✅ Contract successfully deployed at: ${contractAddress}`);

    // 2. Create Initial Sample Campaign
    console.log("\n📦 Seeding initial sample campaign for live demo...");
    const milestoneDescriptions = [
        "Phase 1: Procure 500 Emergency Medical Aid & Hygiene Kits",
        "Phase 2: Install Solar-Powered Clean Water Filtration Units"
    ];
    const milestoneAmounts = [
        ethers.parseEther("2.0"), // 2 ETH
        ethers.parseEther("3.0")  // 3 ETH
    ];

    const tx = await donationTracking.connect(deployerNGO).createCampaign(
        "Clean Water & Healthcare Relief Initiative 2026",
        "Providing immediate medical supplies and sustainable solar-powered clean drinking water facilities to flood-affected communities.",
        verifier.address,
        milestoneDescriptions,
        milestoneAmounts
    );
    await tx.wait();
    console.log("✅ Sample Campaign Created (ID: 1, Goal: 5.0 ETH)");

    // 3. Make a Sample Initial Donation from Donor 1
    const donateTx = await donationTracking.connect(donor1).donate(1, { value: ethers.parseEther("2.5") });
    await donateTx.wait();
    console.log("✅ Seeded initial donation of 2.5 ETH from Donor 1 into Escrow");

    // 4. Export Contract Address & ABI to Frontend
    const frontendContractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");
    if (!fs.existsSync(frontendContractsDir)) {
        fs.mkdirSync(frontendContractsDir, { recursive: true });
    }

    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "DonationTracking.sol", "DonationTracking.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    const frontendData = {
        address: contractAddress,
        abi: artifact.abi,
        accounts: {
            ngo: deployerNGO.address,
            verifier: verifier.address,
            donor1: donor1.address,
            donor2: donor2.address
        }
    };

    fs.writeFileSync(
        path.join(frontendContractsDir, "deployedContract.json"),
        JSON.stringify(frontendData, null, 2)
    );

    console.log(`\n💾 Saved contract metadata and ABI to: frontend/src/contracts/deployedContract.json`);
    console.log("==================================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
