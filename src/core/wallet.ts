import { computeContractAddress } from "../shared/contract-helper"
// import { Signer, RpcProvider } from "./interfaces";

export class Wallet {
    signer: any;
    txBuilder: any;
    rpcProvider: any;
    txOptions: any;
    #address: string;

    constructor({
        signer,
        txBuilder,
        rpcProvider,
    }: any = {}, defaultTxOptions = {
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

        this.#address = this.signer.getAddress()
    }

    get address(): string {
        return this.#address
    }

    async deployContract({ bytecode, value }: any, options = this.txOptions) {
        const signedTx = await this.txBuilder.buildType0({
            to: null,
            value,
            data: bytecode,
            from: this.signer.getAddress()
        }, options)

        const [broadcastData, broadcastError] = await this.rpcProvider.sendRawTransaction(signedTx.signedRawTxHex())
        if (broadcastError) {
            console.error("Error broadcasting transaction:", broadcastError);
            throw broadcastError;
        }

        const contractAddress =  computeContractAddress(this.signer.getAddress(), signedTx.nonce)

        return {
           ...broadcastData,
            contractAddress,
        }
    }

    async callContract({ address, callData }: any, options = this.txOptions) {
        const [result, error] = await this.rpcProvider.call({
            to: address,
            from: this.signer.getAddress(),
            data: callData,
        }, options);

        if (error) {
            console.error("Error calling contract:", error);
            throw error;
        }

        return result;
    }

    async sendContractTransaction({ address, callData, value }: any, options = this.txOptions) {
        const signedTx = await this.txBuilder.buildType0({
            to: address,
            value,
            data: callData,
            from: this.signer.getAddress()
        }, options)

        const [broadcastData, broadcastError] = await this.rpcProvider.sendRawTransaction(signedTx.signedRawTxHex())
        if (broadcastError) {
            console.error("Error broadcasting transaction:", broadcastError);
            throw broadcastError;
        }

        return broadcastData
    }
}
