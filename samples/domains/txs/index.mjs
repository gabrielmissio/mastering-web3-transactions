import { getCreateAddress } from 'ethers'
import {
    // eslint-disable-next-line no-unused-vars
    buildCallData,
    computeContractAddress,
    getCounterSmartContractBytecode,
 } from '../../shared/contract-helper.mjs'
// eslint-disable-next-line no-unused-vars
import { createRandomEOA } from '../../shared/ecc-helper.mjs'
import { sendRawTransaction } from '../../shared/evm-provider.mjs'
import { sendLegacyTransaction } from "./tx-type-0.mjs"

async function main() {
    return legacyEnd2End();
}

async function legacyEnd2End() {
    // simple send eth transaction
    // const legacyTxResult = await sendLegacyTransaction({
    //     to: (await createRandomEOA()).address,
    //     value: 1000000000n // 1 gwei in wei
    // }, {
    //     eip155: true // Use EIP-155 for transaction signing
    // })

    // contract deployment transaction
    const deployContractTx = await sendLegacyTransaction({
        to: null, // Deploy a smart contract
        value: null,
        data: getCounterSmartContractBytecode(),
    }, {
        eip155: true // Use EIP-155 for transaction signing
    })
    console.log("Legacy Transaction Data (deploy contract):", deployContractTx);
    const legacyDeployContractTxBroadcastResult = await sendRawTransaction(deployContractTx.rawSignedTransaction)
    console.log("Legacy Transaction Broadcast Result (deploy contract):", legacyDeployContractTxBroadcastResult);
    console.log({
        address: deployContractTx.signer.address,
        nonce: deployContractTx.signedLegacyTxObject.nonce,
    });
    const legacyCounterContractAddress = computeContractAddress(deployContractTx.signer.address, '0x' + deployContractTx.signedLegacyTxObject.nonce.toString(16));
    console.log("Legacy Counter Contract Address:", legacyCounterContractAddress);
    console.log("Legacy Counter Contract Address (ethers):", getCreateAddress({ from: deployContractTx.signer.address, nonce: '0x' + deployContractTx.signedLegacyTxObject.nonce.toString(16) }));
}

main().catch(console.error);
