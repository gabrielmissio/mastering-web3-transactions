import { sendEthTransaction as legacySendEthTransaction } from "./tx-type-0.mjs"

async function main() {
    const legacyTxData = await legacySendEthTransaction({
        // to: "0xRandomRecipientAddress",
        value: 1000000000n // 1 gwei in wei
    }, {
        eip155: true // Use EIP-155 for transaction signing
    })
    console.log("Legacy Transaction Data:", legacyTxData)

    const digestMatch = legacyTxData.digest === legacyTxData.digest2;
    const rawUnsignedMatch = legacyTxData.rawUnsignedTransaction === legacyTxData.rawUnsignedTransaction2;
    const rawSignedMatch = (legacyTxData.rawSignedTransaction === legacyTxData.rawSignedTransaction2) && (legacyTxData.rawSignedTransaction2 === legacyTxData.rawSignedTransaction3);

    console.log({
        digestMatch,
        rawUnsignedMatch,
        rawSignedMatch,
    })
}

main().catch(console.error);
