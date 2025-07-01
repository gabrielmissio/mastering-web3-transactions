import { setupWallet } from "./_setup";

import {
    buildCallData,
    getCounterSmartContractBytecode,
} from "../src/shared/contract-helper";

async function main(wallet = setupWallet()) {
    console.log("Wallet address:", wallet.address)

    // Deploy a smart contract
    console.log("Deploying contract...");
    const contractDeployTx = await wallet.deployContract({
        bytecode: getCounterSmartContractBytecode(),
    });
    console.log("Contract deployed at address:", contractDeployTx.contractAddress);

    // Get current number stored in the contract
    console.log("Getting current number from contract...");
    const previousNumber = await wallet.callContract({
        address: contractDeployTx.contractAddress,
        callData: buildCallData("number()"),
    });
    console.log("Current number in contract:", previousNumber);

    // Create a transaction to set the number to 42
    console.log("Sending transaction to set number...");
    const setNumberTx = await wallet.sendContractTransaction({
        address: contractDeployTx.contractAddress,
        callData: buildCallData("setNumber(uint256)", ["0x2a"]), // 42 in hex
    });
    console.log("Transaction sent:", setNumberTx);

    // Get the new number stored in the contract
    console.log("Getting new number from contract...");
    const newNumber = await wallet.callContract({
        address: contractDeployTx.contractAddress,
        callData: buildCallData("number()"),
    });
    console.log("New number in contract:", newNumber);
}

main()
    .then(() => console.log("End2End test completed successfully"))
    .catch((error) => console.error("Error in End2End test:", error))
    .finally(() => process.exit(0))
