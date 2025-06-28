import { computeContractAddress } from "../shared/contract-helper.mjs"

export class Wallet {
    constructor({
        signer,
        txBuilder,
        rpcProvider,
    } = {}, defaultTxOptions = {
        eip155: true,
        freeGas: false,
    }) {
        // TODO: Validate signer, txBuilder, rpcProvider, and nonceManager
        // TODO: Ensure all properties have default values if not provided
        this.signer = signer
        this.txBuilder = txBuilder;
        this.rpcProvider = rpcProvider;

        this.txOptions = {
            eip155: defaultTxOptions.eip155 ?? true,
            freeGas: defaultTxOptions.freeGas ?? false,
        }
    }

    async deployContract({ bytecode, value }, options = this.txOptions) {
        const signedTx = await this.txBuilder.buildType0({
            to: null,
            value,
            data: bytecode,
            address: this.signer.getAddress()
        }, options)

        const [broadcastData, broadcastError] = await this.rpcProvider.sendRawTransaction(signedTx.signedRawTxHex())
        if (broadcastError) {
            console.error('Error broadcasting transaction:', broadcastError);
            throw broadcastError;
        }

        const contractAddress =  computeContractAddress(this.signer.getAddress(), signedTx.toSignedTxObject().nonce)

        return {
           ...broadcastData,
            contractAddress,
        }
    }

    async callContract({ address, callData }, options = this.txOptions) {
        const [result, error] = await this.rpcProvider.call({
            to: address,
            from: this.signer.getAddress(),
            data: callData,
        }, options);

        if (error) {
            console.error('Error calling contract:', error);
            throw error;
        }

        return result;
    }

    async sendContractTransaction({ address, callData, value }, options = this.txOptions) {
        const signedTx = await this.txBuilder.buildType0({
            to: address,
            value,
            data: callData,
            address: this.signer.getAddress()
        }, options)

        const [broadcastData, broadcastError] = await this.rpcProvider.sendRawTransaction(signedTx.signedRawTxHex())
        if (broadcastError) {
            console.error('Error broadcasting transaction:', broadcastError);
            throw broadcastError;
        }

        return broadcastData
    }
}
