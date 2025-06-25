import { getCreateAddress } from 'ethers'
import {
    buildCallData,
    computeContractAddress,
    getCounterSmartContractBytecode,
 } from '../../shared/contract-helper.mjs'
import { createRandomEOA } from '../../shared/ecc-helper.mjs'
import { sendRawTransaction } from '../../shared/evm-provider.mjs'
import { sendLegacyTransaction } from "./tx-type-0.mjs"

async function main() {
    return legacyEnd2End();
}

async function legacyEnd2End() {
    // simple send eth transaction
    const simpleTx = await sendLegacyTransaction({
        to: (await createRandomEOA()).address,
        // value: 1000000000n // 1 gwei in wei
        value: 0n // 0 wei for testing
    }, {
        eip155: true, // Use EIP-155 for transaction signing
        freeGas: true, // Use free gas for testing
    })
    console.log("Legacy Transaction Data (simple send):", simpleTx);
    const legacySimpleTxBroadcastResult = await sendRawTransaction(simpleTx.rawSignedTransaction)
    console.log("Legacy Transaction Broadcast Result (simple send):", legacySimpleTxBroadcastResult);

    // contract deployment transaction
    const deployContractTx = await sendLegacyTransaction({
        to: null, // Deploy a smart contract
        value: null,
        data: getCounterSmartContractBytecode(),
    }, {
        eip155: true, // Use EIP-155 for transaction signing
        freeGas: true, // Use free gas for testing
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

    const setCounterTx = await sendLegacyTransaction({
        to: legacyCounterContractAddress,
        value: null,
        data: buildCallData('setNumber(uint256)', ['0x1234']),
    }, {
        eip155: true, // Use EIP-155 for transaction signing
        freeGas: true, // Use free gas for testing
    })
    console.log("Legacy Transaction Data (set counter):", setCounterTx);
    const legacySetCounterTxBroadcastResult = await sendRawTransaction(setCounterTx.rawSignedTransaction)
    console.log("Legacy Transaction Broadcast Result (set counter):", legacySetCounterTxBroadcastResult);
}

main().catch(console.error);
