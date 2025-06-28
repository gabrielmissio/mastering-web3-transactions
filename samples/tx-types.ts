import { TransactionType0 } from "../src/index"

// import {
//     buildCallData,
//     getCounterSmartContractBytecode,
// } from '../src/shared/contract-helper';

const SEPOLIA_TESTNET_CHAIN_ID = 11155111n;

const simpleValueTx = new TransactionType0({
    chainId: SEPOLIA_TESTNET_CHAIN_ID,
    // to: "0xYourAddressHere", // Replace with your address
    to: "0x6c4837d1bbD09A660B83E5Fa49dD070db9f5733F", // Replace with your address
    value: 1000000000000000n, // 0.001 ETH in wei
    nonce: 0n,
    // gasLimit: 21000n,
    gasLimit: 1000n,
    gasPrice: 1000000000n, // 1 Gwei
    // signature: { // Uncomment and replace with actual signature values to get the signed transaction
    //     r: "0xYourRValueHere", // Replace with your R value
    //     s: "0xYourSValueHere", // Replace with your S value
    //     v: "0xYourVValueHere", // Replace with your V value
    // }
})
console.log("Simple Value Transaction:", simpleValueTx);
