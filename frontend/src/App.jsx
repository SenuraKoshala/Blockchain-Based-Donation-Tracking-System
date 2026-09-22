import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import deployedContract from './contracts/deployedContract.json';
import {
  ShieldCheck,
  HeartHandshake,
  Building2,
  Eye,
  Wallet,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileText,
  Layers,
  Check,
  Coins
} from 'lucide-react';

const RPC_URL = "http://127.0.0.1:8545";

export default function App() {
  const [activeTab, setActiveTab] = useState('donor'); // 'donor' | 'ngo' | 'verifier' | 'audit'
  const [activeRoleAccount, setActiveRoleAccount] = useState('donor1'); // 'donor1' | 'donor2' | 'ngo' | 'verifier'
  const [campaign, setCampaign] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Form states
  const [donationAmount, setDonationAmount] = useState('0.5');
  const [proofInput, setProofInput] = useState({ milestoneId: 1, proofHash: '' });

  const getProviderAndSigner = () => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const address = deployedContract.accounts[activeRoleAccount];
    const signer = provider.getSigner(address);
    return { provider, signer, address };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(deployedContract.address, deployedContract.abi, provider);

      // Load Campaign 1
      const c = await contract.campaigns(1);
      if (c && c.id > 0n) {
        setCampaign({
          id: Number(c.id),
          campaignOwner: c.campaignOwner,
          verifier: c.verifier,
          title: c.title,
          description: c.description,
          fundingGoal: ethers.formatEther(c.fundingGoal),
          totalDonated: ethers.formatEther(c.totalDonated),
          escrowBalance: ethers.formatEther(c.escrowBalance),
          totalDisbursed: ethers.formatEther(c.totalDisbursed),
          milestoneCount: Number(c.milestoneCount),
          isCompleted: c.isCompleted
        });

        // Load milestones
        const mList = [];
        for (let i = 1; i <= Number(c.milestoneCount); i++) {
          const m = await contract.getMilestone(1, i);
          mList.push({
            id: Number(m.id),
            description: m.description,
            targetAmount: ethers.formatEther(m.targetAmount),
            proofHash: m.proofHash,
            status: Number(m.status) // 0: Pending, 1: Submitted, 2: Approved, 3: Disbursed
          });
        }
        setMilestones(mList);

        // Load donation audit trail
        const dList = await contract.getDonations(1);
        setDonations(dList.map(d => ({
          donor: d.donor,
          amount: ethers.formatEther(d.amount),
          timestamp: new Date(Number(d.timestamp) * 1000).toLocaleString()
        })));
      }
    } catch (err) {
      console.error("Failed loading contract data:", err);
      setStatusMessage({ type: 'error', text: 'Error connecting to local blockchain. Ensure `npx hardhat node` is running.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeRoleAccount]);

  // Handle donation
  const handleDonate = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const { signer } = getProviderAndSigner();
      const contract = new ethers.Contract(deployedContract.address, deployedContract.abi, await signer);

      const tx = await contract.donate(1, { value: ethers.parseEther(donationAmount) });
      setStatusMessage({ type: 'info', text: `Transaction submitted: ${tx.hash.slice(0, 12)}... Waiting for block confirmation.` });
      await tx.wait();

      setStatusMessage({ type: 'success', text: `Successfully donated ${donationAmount} ETH into smart contract escrow!` });
      await loadData();
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.reason || 'Donation failed' });
    } finally {
      setActionLoading(false);
    }
  };

  // NGO: Submit proof
  const handleSubmitProof = async (milestoneId) => {
    try {
      if (!proofInput.proofHash) {
        setStatusMessage({ type: 'error', text: 'Please enter a proof hash or receipt link' });
        return;
      }
      setActionLoading(true);
      const { signer } = getProviderAndSigner();
      const contract = new ethers.Contract(deployedContract.address, deployedContract.abi, await signer);

      const tx = await contract.submitMilestoneProof(1, milestoneId, proofInput.proofHash);
      await tx.wait();

      setStatusMessage({ type: 'success', text: `Proof submitted on-chain for Milestone #${milestoneId}!` });
      setProofInput({ milestoneId: 1, proofHash: '' });
      await loadData();
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.reason || 'Proof submission failed' });
    } finally {
      setActionLoading(false);
    }
  };

  // Verifier: Approve milestone
  const handleApprove = async (milestoneId) => {
    try {
      setActionLoading(true);
      const { signer } = getProviderAndSigner();
      const contract = new ethers.Contract(deployedContract.address, deployedContract.abi, await signer);

      const tx = await contract.approveMilestone(1, milestoneId);
      await tx.wait();

      setStatusMessage({ type: 'success', text: `Milestone #${milestoneId} approved by Verifier! Funds are ready for disbursement.` });
      await loadData();
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.reason || 'Approval failed' });
    } finally {
      setActionLoading(false);
    }
  };

  // Release funds
  const handleReleaseFunds = async (milestoneId) => {
    try {
      setActionLoading(true);
      const { signer } = getProviderAndSigner();
      const contract = new ethers.Contract(deployedContract.address, deployedContract.abi, await signer);

      const tx = await contract.releaseFunds(1, milestoneId);
      await tx.wait();

      setStatusMessage({ type: 'success', text: `Escrow funds for Milestone #${milestoneId} transferred directly to the NGO wallet!` });
      await loadData();
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.reason || 'Fund release failed' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 0: return <span className="badge badge-pending"><Clock size={12} /> Pending</span>;
      case 1: return <span className="badge badge-submitted"><FileText size={12} /> Submitted</span>;
      case 2: return <span className="badge badge-approved"><ShieldCheck size={12} /> Approved</span>;
      case 3: return <span className="badge badge-disbursed"><CheckCircle2 size={12} /> Disbursed</span>;
      default: return null;
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', padding: '10px', borderRadius: '12px', color: '#fff' }}>
              <HeartHandshake size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                TrustRelief <span style={{ color: 'var(--accent-cyan)' }}>Ledger</span>
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Blockchain-Based Milestone Escrow & Donation Tracking Platform
              </p>
            </div>
          </div>
        </div>

        {/* Role Simulator Switcher */}
        <div className="glass-panel" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Wallet size={16} />
            <span>Simulate Wallet:</span>
          </div>
          <select
            value={activeRoleAccount}
            onChange={(e) => {
              const val = e.target.value;
              setActiveRoleAccount(val);
              if (val.startsWith('donor')) setActiveTab('donor');
              if (val === 'ngo') setActiveTab('ngo');
              if (val === 'verifier') setActiveTab('verifier');
            }}
            style={{ width: 'auto', padding: '6px 10px', background: 'rgba(255,255,255,0.08)', cursor: 'pointer' }}
          >
            <option value="donor1">Donor 1 (Alice) - {deployedContract.accounts.donor1.slice(0, 8)}...</option>
            <option value="donor2">Donor 2 (Bob) - {deployedContract.accounts.donor2.slice(0, 8)}...</option>
            <option value="ngo">NGO Owner (Red Cross) - {deployedContract.accounts.ngo.slice(0, 8)}...</option>
            <option value="verifier">Auditor / Verifier - {deployedContract.accounts.verifier.slice(0, 8)}...</option>
          </select>
          <button onClick={loadData} className="btn-secondary" style={{ padding: '6px 10px' }} title="Refresh on-chain data">
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {/* Status alerts */}
      {statusMessage && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: statusMessage.type === 'error' ? 'rgba(244, 63, 94, 0.15)' : statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)',
          border: `1px solid ${statusMessage.type === 'error' ? 'var(--accent-rose)' : statusMessage.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-cyan)'}`
        }}>
          <span style={{ fontSize: '0.9rem' }}>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('donor')}
          className={activeTab === 'donor' ? 'btn-primary' : 'btn-secondary'}
        >
          <HeartHandshake size={16} /> Donor Dashboard
        </button>
        <button
          onClick={() => setActiveTab('ngo')}
          className={activeTab === 'ngo' ? 'btn-primary' : 'btn-secondary'}
        >
          <Building2 size={16} /> NGO Manager
        </button>
        <button
          onClick={() => setActiveTab('verifier')}
          className={activeTab === 'verifier' ? 'btn-primary' : 'btn-secondary'}
        >
          <ShieldCheck size={16} /> Verifier / Auditor
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}
        >
          <Eye size={16} /> Public Audit Trail
        </button>
      </div>

      {loading && !campaign ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '16px', display: 'inline-block' }} />
          <p>Connecting to smart contract ledger...</p>
        </div>
      ) : campaign ? (
        <div>
          {/* Top Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600', marginBottom: '6px' }}>TOTAL GOAL</div>
              <div style={{ fontSize: '1.7rem', fontWeight: '800', color: '#fff' }}>{campaign.fundingGoal} ETH</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: '4px' }}>Across {campaign.milestoneCount} Milestones</div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600', marginBottom: '6px' }}>TOTAL RAISED</div>
              <div style={{ fontSize: '1.7rem', fontWeight: '800', color: 'var(--accent-emerald)' }}>{campaign.totalDonated} ETH</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {((Number(campaign.totalDonated) / Number(campaign.fundingGoal)) * 100).toFixed(0)}% of goal reached
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600', marginBottom: '6px' }}>LOCKED IN ESCROW</div>
              <div style={{ fontSize: '1.7rem', fontWeight: '800', color: 'var(--accent-amber)' }}>{campaign.escrowBalance} ETH</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Released only upon verification</div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600', marginBottom: '6px' }}>RELEASED TO NGO</div>
              <div style={{ fontSize: '1.7rem', fontWeight: '800', color: 'var(--accent-purple)' }}>{campaign.totalDisbursed} ETH</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-purple)', marginTop: '4px' }}>Completed & Verified work</div>
            </div>
          </div>

          {/* Main Campaign Showcase Card */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                  Campaign #1 • Active On-Chain
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '6px' }}>{campaign.title}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px', maxWidth: '800px' }}>
                  {campaign.description}
                </p>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div>Contract: <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{deployedContract.address.slice(0, 10)}...</span></div>
                <div>Owner (NGO): <span className="mono">{campaign.campaignOwner.slice(0, 8)}...</span></div>
                <div>Auditor: <span className="mono">{campaign.verifier.slice(0, 8)}...</span></div>
              </div>
            </div>

            {/* Overall funding progress bar */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Funding Progress</span>
                <span style={{ fontWeight: '600' }}>{campaign.totalDonated} / {campaign.fundingGoal} ETH</span>
              </div>
              <div className="progress-container">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, (Number(campaign.totalDonated) / Number(campaign.fundingGoal)) * 100)}%`,
                    background: 'linear-gradient(90deg, #06b6d4, #10b981)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* TAB 1: DONOR VIEW */}
          {activeTab === 'donor' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              {/* Donation Form */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Coins style={{ color: 'var(--accent-emerald)' }} /> Contribute to Escrow
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                  Your donation is securely locked in the smart contract escrow. The NGO cannot access your funds until each milestone is verified by an independent auditor.
                </p>

                <form onSubmit={handleDonate}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      Donation Amount (ETH)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.01"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      placeholder="0.5"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    {['0.1', '0.5', '1.0', '2.0'].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDonationAmount(amt)}
                        className="btn-secondary"
                        style={{ flex: 1, padding: '6px 0', justifyContent: 'center', fontSize: '0.8rem' }}
                      >
                        {amt} ETH
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn-emerald"
                    style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                  >
                    {actionLoading ? 'Processing on Ledger...' : `Donate ${donationAmount} ETH to Escrow`}
                  </button>
                </form>
              </div>

              {/* Milestone Breakdown */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers style={{ color: 'var(--accent-cyan)' }} /> Campaign Milestones
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {milestones.map((m) => (
                    <div key={m.id} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Milestone #{m.id}</span>
                        {getStatusBadge(m.status)}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{m.description}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Target Escrow Release:</span>
                        <span style={{ fontWeight: '600', color: 'var(--accent-cyan)' }}>{m.targetAmount} ETH</span>
                      </div>
                      {m.proofHash && (
                        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '6px 8px', borderRadius: '6px' }}>
                          Proof Hash: <span className="mono" style={{ color: 'var(--accent-purple)' }}>{m.proofHash}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NGO MANAGER */}
          {activeTab === 'ngo' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Building2 style={{ color: 'var(--accent-cyan)' }} /> Milestone Execution & Proof of Work
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Submit cryptographic proof (e.g. IPFS receipt hash, supplier delivery confirmation) once you complete each milestone.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {milestones.map((m) => (
                    <div key={m.id} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: '600' }}>Milestone #{m.id} ({m.targetAmount} ETH)</span>
                        {getStatusBadge(m.status)}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{m.description}</p>

                      {/* Step A: If Pending, allow submitting proof */}
                      {m.status === 0 && (
                        <div>
                          <div style={{ marginBottom: '10px' }}>
                            <input
                              type="text"
                              placeholder="Enter IPFS Hash or Receipt URL (e.g. QmZtmG...)"
                              value={proofInput.milestoneId === m.id ? proofInput.proofHash : ''}
                              onChange={(e) => setProofInput({ milestoneId: m.id, proofHash: e.target.value })}
                            />
                          </div>
                          <button
                            onClick={() => handleSubmitProof(m.id)}
                            disabled={actionLoading}
                            className="btn-primary"
                            style={{ width: '100%', justifyContent: 'center' }}
                          >
                            Submit Proof of Work on Ledger
                          </button>
                        </div>
                      )}

                      {/* Step B: If Submitted, waiting for Verifier */}
                      {m.status === 1 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '8px 12px', borderRadius: '8px' }}>
                          ⏳ Proof submitted. Awaiting independent auditor verification.
                        </div>
                      )}

                      {/* Step C: If Approved, allow releasing funds */}
                      {m.status === 2 && (
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: '8px', marginBottom: '10px' }}>
                            ✅ Verified! Funds are unlocked and ready for transfer.
                          </div>
                          <button
                            onClick={() => handleReleaseFunds(m.id)}
                            disabled={actionLoading || Number(campaign.escrowBalance) < Number(m.targetAmount)}
                            className="btn-emerald"
                            style={{ width: '100%', justifyContent: 'center' }}
                          >
                            Release {m.targetAmount} ETH to NGO Wallet
                          </button>
                        </div>
                      )}

                      {/* Step D: Disbursed */}
                      {m.status === 3 && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
                          ✨ Funds successfully disbursed to NGO wallet.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VERIFIER / AUDITOR */}
          {activeTab === 'verifier' && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <ShieldCheck style={{ color: 'var(--accent-purple)' }} size={24} />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Independent Auditor / Verifier Portal</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Inspect proof of work submitted by the NGO and authorize release of locked escrow funds.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                {milestones.map((m) => (
                  <div key={m.id} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <span style={{ fontWeight: '700', fontSize: '1rem' }}>Milestone #{m.id}: {m.description}</span>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: '2px' }}>Value: {m.targetAmount} ETH</div>
                      </div>
                      {getStatusBadge(m.status)}
                    </div>

                    {m.status === 1 ? (
                      <div style={{ marginTop: '14px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                          <strong>Submitted Proof Hash:</strong> <span className="mono" style={{ color: 'var(--accent-purple)' }}>{m.proofHash}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                          <button
                            onClick={() => handleApprove(m.id)}
                            disabled={actionLoading}
                            className="btn-emerald"
                            style={{ flex: 1, justifyContent: 'center' }}
                          >
                            <Check size={16} /> Approve & Authorize Fund Release
                          </button>
                        </div>
                      </div>
                    ) : m.status === 0 ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        NGO is still working on this milestone. Proof not yet submitted.
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', marginTop: '8px' }}>
                        ✓ Milestone already audited and approved.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PUBLIC AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Eye style={{ color: 'var(--accent-cyan)' }} size={24} />
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Immutable Public Ledger Audit Trail</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Transparent real-time record of all donations, proof hashes, and fund disbursements. Accessible to anyone with zero login.
                  </p>
                </div>
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-muted)', marginTop: '24px', marginBottom: '12px' }}>
                ON-CHAIN DONATION TRANSACTIONS ({donations.length})
              </h4>

              {donations.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No donations recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {donations.map((d, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                            Donor Address: <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{d.donor}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Timestamp: {d.timestamp}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-emerald)' }}>
                        +{d.amount} ETH
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      <footer style={{ textAlign: 'center', marginTop: '48px', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        <p>EC8204 — Blockchain and Cyber Security • University of Ruhuna • Take Home Assignment</p>
      </footer>
    </div>
  );
}
