import { NonceManager } from './core/nonce.mjs' 
import { JsonHttpProvider } from './core/provider.mjs'
import { Signer } from './core/signer.mjs'
import { TransactionBuilder } from './core/transaction.mjs'
// import { HDWallet, Wallet } from './core/wallet.mjs'
import {  Wallet } from './core/wallet.mjs'

import {
    buildCallData,
    getCounterSmartContractBytecode,
} from './shared/contract-helper.mjs'

async function main(wallet = setupWallet()) {
    // Deploy a smart contract
    console.log('Deploying contract...');
    const contractDeployTx = await wallet.deployContract({
        bytecode: getCounterSmartContractBytecode(),
    });
    console.log('Contract deployed at address:', contractDeployTx.contractAddress);

    // Get current number stored in the contract
    console.log('Getting current number from contract...');
    const previousNumber = await wallet.callContract({
        address: contractDeployTx.contractAddress,
        callData: buildCallData('number()'),
    });
    console.log('Current number in contract:', previousNumber);

    // Create a transaction to set the number to 42
    console.log('Sending transaction to set number...');
    const setNumberTx = await wallet.sendContractTransaction({
        address: contractDeployTx.contractAddress,
        callData: buildCallData('setNumber(uint256)', ["0x2a"]), // 42 in hex
    });
    console.log('Transaction sent:', setNumberTx);

    // Get the new number stored in the contract
    console.log('Getting new number from contract...');
    const newNumber = await wallet.callContract({
        address: contractDeployTx.contractAddress,
        callData: buildCallData('number()'),
    });
    console.log('New number in contract:', newNumber);
}

function setupWallet() {
    const rpcProvider = new JsonHttpProvider({ url: process.env.RPC_URL });
    const nonceManager = new NonceManager({ provider: rpcProvider });
    // const signer = new Signer({ privateKey: process.env.PRIVATE_KEY });
    const signer = new Signer();
    const txBuilder = new TransactionBuilder({ rpcProvider, nonceManager, signer }); // review whether we need to pass the signer here

    const wallet = new Wallet({
        signer,
        txBuilder,
        rpcProvider,
    }, {
        eip155: true,
        freeGas: process.env.IS_GASLESS_NETWORK === 'true',
    });

    return wallet;
}

main()
    .then(() => console.log('End2End test completed successfully'))
    .catch((error) => console.error('Error in End2End test:', error))
    .finally(() => process.exit(0))
