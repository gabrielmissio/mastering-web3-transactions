/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    setupWallet,
    USDC_TOKEN_CONTRACT_ADDRESS,
    ANVIL_DEFAULT_FIRST_ACCOUNT_PRIVATE_KEY,
    EIP7702_BATCH_AND_SPONSORED_TXS_CONTRACT_ADDRESS,
} from "./_setup";

import { buildCallData } from "../src/shared/contract-helper";
import { getBytes, keccak256 } from "../src/shared/ecc-helper";
import { solidityPacked } from "../src/shared/solidity-helper";

// BEGIN TEMPORARY IMPORTS
import { Transaction, parseUnits, JsonRpcProvider, Wallet, Interface } from "ethers";
const tempProvider = new JsonRpcProvider(process.env.RPC_URL as string);
const tempSponsorWallet = new Wallet(
    process.env.EIP7702_SPONSOR_PRIVATE_KEY as string,
    tempProvider
);
const tempSmartEOAWallet = new Wallet(
    process.env.EIP7702_SMART_EOA_PRIVATE_KEY as string,
    tempProvider
);
// END TEMPORARY IMPORTS

// TEMPORARY ARTIFACTS
const contractABI = [
  "function execute((address,uint256,bytes)[] calls) external payable",
  "function execute((address,uint256,bytes)[] calls, bytes signature) external payable",
  "function nonce() external view returns (uint256)"
];
// END TEMPORARY ARTIFACTS

async function main({
    sponsorWallet,              // Must hold native tokens to pay for gas
    smartEOAWallet,             // Must hold ERC20 tokens to transfer to recipient
    recipientWallet,            // Will receive tokens from smartEOA
    delegationContractAddress,  // Contract logic our smartEOA will use to delegate transactions
    erc20TokenContractAddress,  // ERC20 token contract address to transfer
}: {
    sponsorWallet: any;
    smartEOAWallet: any;
    recipientWallet: any;
    delegationContractAddress: string;
    erc20TokenContractAddress: string;
} = {} as any) {
    console.log("\n=== EIP-7702 Sponsored Transaction Example ===");
    console.log("Sponsor Wallet address:", sponsorWallet.address);
    console.log("Smart EOA Wallet address:", smartEOAWallet.address);
    console.log("Recipient Wallet address:", recipientWallet.address);
    console.log("ERC20 Token Contract address:", erc20TokenContractAddress);
    console.log("Delegation Contract address:", delegationContractAddress);

    const sponsorWalletNonce = await tempSponsorWallet.getNonce()
    const smartEOAWalletNonce = await tempSmartEOAWallet.getNonce()

    console.log("Create authorization for the smart EOA wallet...");
    const walletAuthorization = await smartEOAWallet.sign7702Authorization(
        delegationContractAddress,    // Contract to delegate to
        BigInt(smartEOAWalletNonce),  // Nonce for replay protection
        BigInt(11155111)              // Chain ID
    );
    console.log("Smart EOA Authorization:", walletAuthorization);

    console.log("Building smart EOA execute calls...");
    // Our default (and hardcoded) delegation contract address behaves like a "smart contract wallet"
    // So we are going to call the "execute" method on it -> execute((address,uint256,bytes)[],bytes) -> execute(calls[],signature)
    // So smartEOAExecuteCalls is an array of calls the smartEOA wants to execute
    const smartEOAExecuteCalls: Array<[string, bigint, string]> = [
      [
        erc20TokenContractAddress, // to: ERC20 contract address
        0n,                        // value: 0 ETH (no ETH sent with this call)
        buildCallData("transfer(address,uint256)", [recipientWallet.address, parseUnits("0.01", 6)]),
      ],
    ];
    console.log("Smart EOA Execute Calls:", smartEOAExecuteCalls);

    console.log("Encoding smart EOA execute calls...");
    // Encode the smart EOA execute calls (don't worry too much about this, it's just a way to pack the calls into bytes)
    const encodedSmartEOAExecuteCalls = "0x" + smartEOAExecuteCalls.reduce((acc, call) => {
      const [to, value, data] = call;
      return acc + solidityPacked(["address", "uint256", "bytes"], [to, value, data]).slice(2);
    }, "");
    console.log("Encoded Smart EOA Execute Calls:", encodedSmartEOAExecuteCalls);
    
    const contractDelegationNonce = await smartEOAWallet.callContract({
        address: smartEOAWallet.address,
        callData: buildCallData("nonce()"),
    }).catch((error: any) => {
      console.error("Error fetching contract nonce:", error)
      // TODO: handle error appropriately
      return 0n; // Default to 0 if error occurs
    });
    const smartEOAExecuteCallsDigest = keccak256(solidityPacked(["uint256", "bytes"], [Number(contractDelegationNonce), encodedSmartEOAExecuteCalls]));
    const smartEOAExecuteSignature = await smartEOAWallet.signMessage(getBytes(smartEOAExecuteCallsDigest));

    // Now we can finally build our txData
    // execute((address,uint256,bytes)[],bytes) -> execute(calls[],signature)
    // For our simplified ABI encoder, we pass the already encoded calls and signature
    // BEGIN TEMPORARY
    const contractInterface = new Interface(contractABI);
    const txData = contractInterface.encodeFunctionData(
      "execute((address,uint256,bytes)[],bytes)",
      [smartEOAExecuteCalls, smartEOAExecuteSignature]
    );
    // const txData = buildCallData(
    //     "execute((address,uint256,bytes)[],bytes)",
    //     [encodedSmartEOAExecuteCalls, smartEOAExecuteSignature]
    // );
    // END TEMPORARY

    const unsignedType4Tx = Transaction.from({
      type: 4,                           // EIP-7702 transaction type
      chainId: 11155111,                 // Network chain ID
      nonce: Number(sponsorWalletNonce), // Use sponsor's nonce (sponsor sends tx)
      to: smartEOAWallet.address,        // Send to the delegated EOA
      value: 0n,
      data: txData,
      gasLimit: 300000n,
      maxFeePerGas: parseUnits("20", "gwei"),
      maxPriorityFeePerGas: parseUnits("2", "gwei"),
      authorizationList: [walletAuthorization], // Include the smart EOA authorization
    });

    // START TEMPORARY
    const signedTx = await tempSponsorWallet.signTransaction(unsignedType4Tx);
    const txResponse = await tempProvider.broadcastTransaction(signedTx);
    console.log("Sponsored transaction sent:", txResponse.hash);
    console.log("Transaction type: 4 (EIP-7702)");

    const receipt = await txResponse.wait();
    console.log("Sponsored transaction confirmed in block:", receipt?.blockNumber);
    console.log("View on Etherscan: https://sepolia.etherscan.io/tx/" + txResponse.hash);
    // END TEMPORARY
}

main({
    sponsorWallet: setupWallet(process.env.EIP7702_SPONSOR_PRIVATE_KEY || ANVIL_DEFAULT_FIRST_ACCOUNT_PRIVATE_KEY),
    smartEOAWallet: setupWallet(process.env.EIP7702_SMART_EOA_PRIVATE_KEY || ANVIL_DEFAULT_FIRST_ACCOUNT_PRIVATE_KEY),
    recipientWallet: setupWallet(),
    delegationContractAddress: (process.env.EIP7702_DELEGATION_CONTRACT_ADDRESS || EIP7702_BATCH_AND_SPONSORED_TXS_CONTRACT_ADDRESS),
    erc20TokenContractAddress: (process.env.ERC20_TOKEN_CONTRACT_ADDRESS || USDC_TOKEN_CONTRACT_ADDRESS),
})
    .then(() => console.log("End2End test completed successfully"))
    .catch((error) => console.error("Error in End2End test:", error))
    .finally(() => process.exit(0))
