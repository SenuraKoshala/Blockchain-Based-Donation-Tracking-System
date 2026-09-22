// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Blockchain-Based Donation Tracking & Milestone Escrow System
 * @notice Transparent charity platform where funds are locked in escrow
 *         and released only when verified milestones are completed.
 *         Donors can reclaim their pro-rata share of undisbursed funds
 *         if a campaign is cancelled.
 */
contract DonationTracking {

    // --- STRUCTS ---

    enum MilestoneStatus {
        Pending,        // Milestone created, work in progress
        Submitted,      // NGO submitted proof of work (hash)
        Approved,       // Verifier approved the proof
        Disbursed       // Funds transferred to NGO
    }

    struct Milestone {
        uint256 id;
        string description;
        uint256 targetAmount;   // Amount allocated for this specific milestone
        string proofHash;       // IPFS/document hash or receipt reference
        MilestoneStatus status;
    }

    struct DonationRecord {
        address donor;
        uint256 amount;
        uint256 timestamp;
    }

    struct Campaign {
        uint256 id;
        address payable campaignOwner; // NGO wallet address that receives released funds
        address verifier;              // Independent auditor/verifier address
        string title;
        string description;
        uint256 fundingGoal;           // Total goal in wei (1 ETH = 10^18 wei)
        uint256 totalDonated;          // Cumulative funds donated
        uint256 escrowBalance;         // Current locked balance in contract
        uint256 totalDisbursed;        // Total funds already released to NGO
        uint256 milestoneCount;
        bool isCompleted;
        bool isCancelled;              // True once cancelled; enables refunds
        uint256 escrowAtCancellation;  // Snapshot of escrowBalance when cancelled
    }

    // --- STATE VARIABLES ---

    uint256 public campaignCounter;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(uint256 => Milestone)) public campaignMilestones;
    mapping(uint256 => DonationRecord[]) private campaignDonations;

    // Per-donor cumulative contribution, used for pro-rata refunds
    mapping(uint256 => mapping(address => uint256)) public donorContributions;
    mapping(uint256 => mapping(address => bool)) public refundClaimed;

    // --- EVENTS (for real-time frontend notifications) ---

    event CampaignCreated(uint256 indexed campaignId, string title, address indexed owner, address indexed verifier, uint256 goal);
    event DonationReceived(uint256 indexed campaignId, address indexed donor, uint256 amount, uint256 currentEscrow);
    event MilestoneSubmitted(uint256 indexed campaignId, uint256 indexed milestoneId, string proofHash);
    event MilestoneApproved(uint256 indexed campaignId, uint256 indexed milestoneId, address indexed verifier);
    event MilestoneRejected(uint256 indexed campaignId, uint256 indexed milestoneId, address indexed verifier);
    event FundsReleased(uint256 indexed campaignId, uint256 indexed milestoneId, uint256 amount, address recipient);
    event CampaignCancelled(uint256 indexed campaignId, uint256 escrowAtCancellation);
    event RefundClaimed(uint256 indexed campaignId, address indexed donor, uint256 amount);

    // --- MODIFIERS (Access Control) ---

    modifier campaignExists(uint256 _campaignId) {
        require(_campaignId > 0 && _campaignId <= campaignCounter, "Campaign does not exist");
        _;
    }

    modifier milestoneExists(uint256 _campaignId, uint256 _milestoneId) {
        require(campaignMilestones[_campaignId][_milestoneId].id != 0, "Milestone does not exist");
        _;
    }

    modifier onlyCampaignOwner(uint256 _campaignId) {
        require(msg.sender == campaigns[_campaignId].campaignOwner, "Only campaign owner (NGO) can perform this");
        _;
    }

    modifier onlyVerifier(uint256 _campaignId) {
        require(msg.sender == campaigns[_campaignId].verifier, "Only designated verifier can perform this");
        _;
    }

    modifier onlyOwnerOrVerifier(uint256 _campaignId) {
        require(
            msg.sender == campaigns[_campaignId].campaignOwner || msg.sender == campaigns[_campaignId].verifier,
            "Only campaign owner or verifier can perform this"
        );
        _;
    }

    // --- CORE FUNCTIONS ---

    /**
     * @notice Creates a new fundraising campaign with predefined milestones.
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        address _verifier,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestoneAmounts
    ) external returns (uint256) {
        require(_verifier != address(0), "Invalid verifier address");
        require(_verifier != msg.sender, "Verifier cannot be the campaign owner");
        require(_milestoneDescriptions.length > 0, "At least one milestone required");
        require(_milestoneDescriptions.length == _milestoneAmounts.length, "Milestone counts mismatch");

        campaignCounter++;
        uint256 newId = campaignCounter;

        uint256 calculatedGoal = 0;
        for (uint256 i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0, "Milestone amount must be > 0");
            calculatedGoal += _milestoneAmounts[i];

            campaignMilestones[newId][i + 1] = Milestone({
                id: i + 1,
                description: _milestoneDescriptions[i],
                targetAmount: _milestoneAmounts[i],
                proofHash: "",
                status: MilestoneStatus.Pending
            });
        }

        campaigns[newId] = Campaign({
            id: newId,
            campaignOwner: payable(msg.sender),
            verifier: _verifier,
            title: _title,
            description: _description,
            fundingGoal: calculatedGoal,
            totalDonated: 0,
            escrowBalance: 0,
            totalDisbursed: 0,
            milestoneCount: _milestoneDescriptions.length,
            isCompleted: false,
            isCancelled: false,
            escrowAtCancellation: 0
        });

        emit CampaignCreated(newId, _title, msg.sender, _verifier, calculatedGoal);
        return newId;
    }

    /**
     * @notice Donors call this function and send ETH. Funds remain locked in contract escrow.
     *         Donations are capped so a campaign cannot be overfunded past its goal.
     */
    function donate(uint256 _campaignId) external payable campaignExists(_campaignId) {
        require(msg.value > 0, "Donation amount must be greater than 0");
        Campaign storage c = campaigns[_campaignId];
        require(!c.isCompleted, "Campaign is already completed");
        require(!c.isCancelled, "Campaign is cancelled");
        require(c.totalDonated + msg.value <= c.fundingGoal, "Donation exceeds remaining funding goal");

        c.totalDonated += msg.value;
        c.escrowBalance += msg.value;
        donorContributions[_campaignId][msg.sender] += msg.value;

        campaignDonations[_campaignId].push(DonationRecord({
            donor: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));

        emit DonationReceived(_campaignId, msg.sender, msg.value, c.escrowBalance);
    }

    /**
     * @notice NGO submits proof of completion (e.g., photo/receipt IPFS hash).
     */
    function submitMilestoneProof(
        uint256 _campaignId,
        uint256 _milestoneId,
        string memory _proofHash
    ) external campaignExists(_campaignId) onlyCampaignOwner(_campaignId) milestoneExists(_campaignId, _milestoneId) {
        Campaign storage c = campaigns[_campaignId];
        require(!c.isCancelled, "Campaign is cancelled");

        Milestone storage m = campaignMilestones[_campaignId][_milestoneId];
        require(m.status == MilestoneStatus.Pending, "Milestone is not in Pending state");
        require(bytes(_proofHash).length > 0, "Proof hash cannot be empty");

        m.proofHash = _proofHash;
        m.status = MilestoneStatus.Submitted;

        emit MilestoneSubmitted(_campaignId, _milestoneId, _proofHash);
    }

    /**
     * @notice Designated verifier reviews the proof and approves it.
     */
    function approveMilestone(
        uint256 _campaignId,
        uint256 _milestoneId
    ) external campaignExists(_campaignId) onlyVerifier(_campaignId) milestoneExists(_campaignId, _milestoneId) {
        Milestone storage m = campaignMilestones[_campaignId][_milestoneId];
        require(m.status == MilestoneStatus.Submitted, "Milestone proof not submitted yet");

        m.status = MilestoneStatus.Approved;

        emit MilestoneApproved(_campaignId, _milestoneId, msg.sender);
    }

    /**
     * @notice Designated verifier rejects submitted proof, sending the milestone
     *         back to Pending so the NGO can resubmit corrected proof.
     */
    function rejectMilestone(
        uint256 _campaignId,
        uint256 _milestoneId
    ) external campaignExists(_campaignId) onlyVerifier(_campaignId) milestoneExists(_campaignId, _milestoneId) {
        Milestone storage m = campaignMilestones[_campaignId][_milestoneId];
        require(m.status == MilestoneStatus.Submitted, "Milestone proof not submitted yet");

        m.status = MilestoneStatus.Pending;
        m.proofHash = "";

        emit MilestoneRejected(_campaignId, _milestoneId, msg.sender);
    }

    /**
     * @notice Releases escrowed funds for an approved milestone directly to the NGO.
     *         Restricted to the campaign owner or verifier so third parties cannot
     *         trigger fund movement on the NGO's behalf.
     */
    function releaseFunds(
        uint256 _campaignId,
        uint256 _milestoneId
    ) external campaignExists(_campaignId) onlyOwnerOrVerifier(_campaignId) milestoneExists(_campaignId, _milestoneId) {
        Campaign storage c = campaigns[_campaignId];
        Milestone storage m = campaignMilestones[_campaignId][_milestoneId];

        require(!c.isCancelled, "Campaign is cancelled");
        require(m.status == MilestoneStatus.Approved, "Milestone must be approved before releasing funds");
        require(c.escrowBalance >= m.targetAmount, "Insufficient escrow balance from donations");

        m.status = MilestoneStatus.Disbursed;
        c.escrowBalance -= m.targetAmount;
        c.totalDisbursed += m.targetAmount;

        // Check if all milestones are disbursed
        bool allDisbursed = true;
        for (uint256 i = 1; i <= c.milestoneCount; i++) {
            if (campaignMilestones[_campaignId][i].status != MilestoneStatus.Disbursed) {
                allDisbursed = false;
                break;
            }
        }
        if (allDisbursed) {
            c.isCompleted = true;
        }

        // Transfer funds from contract to NGO owner address
        (bool sent, ) = c.campaignOwner.call{value: m.targetAmount}("");
        require(sent, "Failed to transfer escrow funds to campaign owner");

        emit FundsReleased(_campaignId, _milestoneId, m.targetAmount, c.campaignOwner);
    }

    /**
     * @notice Cancels a campaign, freezing further donations, submissions and
     *         releases, and enabling donors to claim pro-rata refunds of the
     *         remaining escrow. Callable by the NGO or the verifier.
     */
    function cancelCampaign(uint256 _campaignId)
        external
        campaignExists(_campaignId)
        onlyOwnerOrVerifier(_campaignId)
    {
        Campaign storage c = campaigns[_campaignId];
        require(!c.isCompleted, "Campaign already completed");
        require(!c.isCancelled, "Campaign already cancelled");

        c.isCancelled = true;
        c.escrowAtCancellation = c.escrowBalance;

        emit CampaignCancelled(_campaignId, c.escrowAtCancellation);
    }

    /**
     * @notice Lets a donor claim their pro-rata share of the escrow balance
     *         that remained at the moment a campaign was cancelled.
     *         share = donorContribution * escrowAtCancellation / totalDonated
     */
    function claimRefund(uint256 _campaignId) external campaignExists(_campaignId) {
        Campaign storage c = campaigns[_campaignId];
        require(c.isCancelled, "Campaign is not cancelled");
        require(!refundClaimed[_campaignId][msg.sender], "Refund already claimed");

        uint256 contribution = donorContributions[_campaignId][msg.sender];
        require(contribution > 0, "No contribution found for this address");

        uint256 refundAmount = (contribution * c.escrowAtCancellation) / c.totalDonated;
        require(refundAmount > 0, "Nothing to refund");

        refundClaimed[_campaignId][msg.sender] = true;
        c.escrowBalance -= refundAmount;

        (bool sent, ) = payable(msg.sender).call{value: refundAmount}("");
        require(sent, "Refund transfer failed");

        emit RefundClaimed(_campaignId, msg.sender, refundAmount);
    }

    // --- VIEW / AUDIT FUNCTIONS ---

    function getDonations(uint256 _campaignId) external view campaignExists(_campaignId) returns (DonationRecord[] memory) {
        return campaignDonations[_campaignId];
    }

    function getMilestone(uint256 _campaignId, uint256 _milestoneId)
        external
        view
        campaignExists(_campaignId)
        milestoneExists(_campaignId, _milestoneId)
        returns (Milestone memory)
    {
        return campaignMilestones[_campaignId][_milestoneId];
    }
}
