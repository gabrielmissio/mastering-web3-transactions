import { sendEthTransaction as legacySendEthTransaction } from "./tx-type-0.mjs"

async function main() {
    const legacyTxData = await legacySendEthTransaction()
    console.log("Legacy Transaction Data:", legacyTxData)
}

main().catch(console.error);
