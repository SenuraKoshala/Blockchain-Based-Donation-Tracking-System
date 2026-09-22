const { ethers } = require("hardhat");

async function main() {
    console.log("==================================================");
    console.log("🔍 INSPECTING LOCAL BLOCKCHAIN LEDGER");
    console.log("==================================================");

    const latestBlockNumber = await ethers.provider.getBlockNumber();
    console.log(`📊 Total Blocks on Chain: ${latestBlockNumber + 1} (Block #0 to Block #${latestBlockNumber})\n`);

    for (let i = 0; i <= latestBlockNumber; i++) {
        const block = await ethers.provider.getBlock(i);
        console.log(`📦 --- BLOCK #${block.number} ---`);
        console.log(`   🔑 Hash:        ${block.hash}`);
        console.log(`   🔗 Parent Hash: ${block.parentHash}`);
        console.log(`   ⏰ Timestamp:   ${new Date(block.timestamp * 1000).toLocaleString()}`);
        console.log(`   📝 Tx Count:    ${block.transactions.length}`);
        if (block.transactions.length > 0) {
            console.log(`   📜 Tx Hashes:   ${block.transactions.join(", ")}`);
        }
        console.log("--------------------------------------------------");
    }
}

main().catch(console.error);
