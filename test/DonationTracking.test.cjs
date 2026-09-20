const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DonationTracking Smart Contract", function () {
    let donationTracking;
    let ownerNGO, verifier, donor1, donor2, stranger;

    // Milestone test setup: 2 Milestones (1 ETH and 2 ETH)
    const milestoneDescriptions = [
        "Phase 1: Purchase medical kits and emergency supplies",
        "Phase 2: Distribution logistics and field hospital setup"
    ];
    const milestone1Amount = ethers.parseEther("1.0"); // 1 ETH
    const milestone2Amount = ethers.parseEther("2.0"); // 2 ETH
    const milestoneAmounts = [milestone1Amount, milestone2Amount];

    beforeEach(async function () {
        // Get simulated blockchain test wallets provided by Hardhat
        [ownerNGO, verifier, donor1, donor2, stranger] = await ethers.getSigners();

        // Deploy fresh contract instance for each test
        const DonationTracking = await ethers.getContractFactory("DonationTracking");
        donationTracking = await DonationTracking.deploy();
        await donationTracking.waitForDeployment();
    });

    it("1. Should allow an NGO to create a campaign with milestones", async function () {
        const tx = await donationTracking.connect(ownerNGO).createCampaign(
            "Medical Relief 2026",
            "Emergency medical aid campaign for flood-affected areas",
            verifier.address,
            milestoneDescriptions,
            milestoneAmounts
        );
        await tx.wait();

        const campaign = await donationTracking.campaigns(1);
        expect(campaign.id).to.equal(1n);
        expect(campaign.campaignOwner).to.equal(ownerNGO.address);
        expect(campaign.verifier).to.equal(verifier.address);
        expect(campaign.fundingGoal).to.equal(ethers.parseEther("3.0")); // 1 + 2 = 3 ETH
        expect(campaign.escrowBalance).to.equal(0n);
        expect(campaign.milestoneCount).to.equal(2n);
    });

    it("2. Should receive donations and hold them in escrow", async function () {
        // Create campaign
        await donationTracking.connect(ownerNGO).createCampaign(
            "Medical Relief 2026",
            "Emergency relief",
            verifier.address,
            milestoneDescriptions,
            milestoneAmounts
        );

        // Donor 1 donates 1.5 ETH
        await donationTracking.connect(donor1).donate(1, { value: ethers.parseEther("1.5") });
        // Donor 2 donates 1.5 ETH
        await donationTracking.connect(donor2).donate(1, { value: ethers.parseEther("1.5") });

        const campaign = await donationTracking.campaigns(1);
        expect(campaign.totalDonated).to.equal(ethers.parseEther("3.0"));
        expect(campaign.escrowBalance).to.equal(ethers.parseEther("3.0"));

        // Verify donation audit history
        const donations = await donationTracking.getDonations(1);
        expect(donations.length).to.equal(2);
        expect(donations[0].donor).to.equal(donor1.address);
        expect(donations[1].donor).to.equal(donor2.address);
    });

    it("3. Should reject milestone approval by anyone except the designated verifier", async function () {
        await donationTracking.connect(ownerNGO).createCampaign(
            "Medical Relief 2026",
            "Emergency relief",
            verifier.address,
            milestoneDescriptions,
            milestoneAmounts
        );

        // NGO submits proof
        const proofHash = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"; // Example IPFS Hash
        await donationTracking.connect(ownerNGO).submitMilestoneProof(1, 1, proofHash);

        // Unauthorized stranger tries to approve -> MUST REVERT
        await expect(
            donationTracking.connect(stranger).approveMilestone(1, 1)
        ).to.be.revertedWith("Only designated verifier can perform this");
    });

    it("4. Should complete the full cycle: Donate -> Submit Proof -> Approve -> Release Funds", async function () {
        await donationTracking.connect(ownerNGO).createCampaign(
            "Medical Relief 2026",
            "Emergency relief",
            verifier.address,
            milestoneDescriptions,
            milestoneAmounts
        );

        // 1. Donors donate 3 ETH
        await donationTracking.connect(donor1).donate(1, { value: ethers.parseEther("3.0") });

        // 2. NGO submits proof for Milestone 1
        const proofHash = "ipfs://bafybeic5678receipts";
        await donationTracking.connect(ownerNGO).submitMilestoneProof(1, 1, proofHash);

        // Check milestone status is Submitted (1)
        let m1 = await donationTracking.getMilestone(1, 1);
        expect(m1.status).to.equal(1); // 1 = Submitted

        // 3. Verifier approves Milestone 1
        await donationTracking.connect(verifier).approveMilestone(1, 1);
        m1 = await donationTracking.getMilestone(1, 1);
        expect(m1.status).to.equal(2); // 2 = Approved

        // 4. Release funds for Milestone 1 (1 ETH)
        const ngoBalanceBefore = await ethers.provider.getBalance(ownerNGO.address);

        const releaseTx = await donationTracking.releaseFunds(1, 1);
        await releaseTx.wait();

        // Check milestone status is Disbursed (3)
        m1 = await donationTracking.getMilestone(1, 1);
        expect(m1.status).to.equal(3); // 3 = Disbursed

        // Check contract escrow decreased by 1 ETH
        const campaign = await donationTracking.campaigns(1);
        expect(campaign.escrowBalance).to.equal(ethers.parseEther("2.0"));
        expect(campaign.totalDisbursed).to.equal(ethers.parseEther("1.0"));

        // NGO wallet received the 1 ETH
        const ngoBalanceAfter = await ethers.provider.getBalance(ownerNGO.address);
        expect(ngoBalanceAfter).to.be.greaterThan(ngoBalanceBefore);
    });
});
