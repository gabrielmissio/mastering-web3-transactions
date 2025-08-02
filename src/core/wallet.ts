import { computeContractAddress } from "../shared/contract-helper"
import { hash7702Authorization, createAuthorizationRequest } from "../shared/eip7702-helper"
import { keccak256, getBytes } from "../shared/ecc-helper"
import { AuthorizationRequest, Authorization } from "./interfaces/transaction"
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
        defaultTxType: "type2",
    }) {
        // TODO: Validate signer, txBuilder, rpcProvider, and nonceManager
        // TODO: Ensure all properties have default values if not provided
        this.signer = signer
        this.txBuilder = txBuilder;
        this.rpcProvider = rpcProvider;

        this.txOptions = {
            eip155: defaultTxOptions.eip155 ?? true,
            freeGas: defaultTxOptions.freeGas ?? false,
            defaultTxType: defaultTxOptions.defaultTxType ?? "type2",
        }

        this.#address = this.signer.getAddress()
    }

    get address(): string {
        return this.#address
    }

    async getNonce(): Promise<bigint> {
        const [nonce, error] = await this.rpcProvider.getTransactionCount(this.address);
        if (error) {
            throw new Error(`Failed to get nonce: ${error.message}`);
        }
        return BigInt(nonce);
    }

    /**
     * Signs a message using Ethereum's EIP-191 standard
     * 
     * This method follows the same pattern as ethers.js signMessage:
     * 1. Prepends the message with Ethereum's standard prefix
     * 2. Hashes the prefixed message with keccak256
     * 3. Signs the hash using ECDSA
     * 
     * The format is: "\x19Ethereum Signed Message:\n" + messageLength + message
     * 
     * @param message - The message to sign (as bytes or string)
     * @returns The signature as a hex string (0x-prefixed)
     */
    async signMessage(message: string | Uint8Array): Promise<string> {
        // Convert message to bytes
        let messageBytes: Uint8Array;
        if (typeof message === "string") {
            // If it's a hex string, convert it using getBytes, otherwise use TextEncoder
            if (message.startsWith("0x")) {
                messageBytes = getBytes(message);
            } else {
                messageBytes = new TextEncoder().encode(message);
            }
        } else {
            messageBytes = message;
        }
        
        // Create the Ethereum signed message prefix
        const messageLength = messageBytes.length;
        const prefix = `\x19Ethereum Signed Message:\n${messageLength}`;
        const prefixBytes = new TextEncoder().encode(prefix);
        
        // Concatenate prefix + message
        const prefixedMessage = new Uint8Array(prefixBytes.length + messageBytes.length);
        prefixedMessage.set(prefixBytes, 0);
        prefixedMessage.set(messageBytes, prefixBytes.length);
        
        // Hash the prefixed message
        const messageHash = keccak256(prefixedMessage);
        
        // Sign the hash
        const signature = await this.signer.signWithRecoverableECDSA(messageHash);
        
        // Format as ethers v6 style signature (r + s + v as single hex string)
        // Remove 0x prefix from r and s, then concatenate with v
        const r = signature.r.slice(2);
        const s = signature.s.slice(2);
        const v = signature.v.toString(16).padStart(2, "0");
        
        return `0x${r}${s}${v}`;
    }

    // get loadSigner(): any {
    //     return this.signer
    // }

    // async signMessage

    async deployContract({ bytecode, value }: any, options = this.txOptions) {
        const signedTx = await this.txBuilder.buildType2({
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

    async callContract({ address, callData }: any) {
        const [result, error] = await this.rpcProvider.call({
            to: address,
            from: this.signer.getAddress(),
            data: callData,
        });

        if (error) {
            console.error("Error calling contract:", error);
            throw error;
        }

        return result;
    }

    async sendContractTransaction({ address, callData, value }: any, options = this.txOptions) {
        const signedTx = await this.txBuilder.buildType2({
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

    /**
     * Signs an EIP-7702 authorization request
     * 
     * This method creates and signs an authorization that allows an EOA to delegate
     * code execution to a smart contract. The authorization can be used in EIP-7702
     * transactions to temporarily give an EOA smart contract capabilities.
     * 
     * @param contractAddress - The address of the contract to delegate to
     * @param nonce - Optional nonce for replay protection (defaults to wallet's current nonce)
     * @param chainId - Optional chain ID (defaults to current network's chain ID)
     * @returns A complete Authorization object with signature
     */
    async sign7702Authorization(
        contractAddress: string,
        nonce?: bigint,
        chainId?: bigint
    ): Promise<Authorization> {
        // Get current network info if chainId not provided
        let resolvedChainId = chainId;
        if (resolvedChainId === undefined) {
            const [networkInfo, error] = await this.rpcProvider.getNetworkInfo();
            if (error) {
                throw new Error(`Failed to get chain ID: ${error.message}`);
            }
            resolvedChainId = networkInfo.chainId;
        }

        // Get current nonce if not provided
        let resolvedNonce = nonce;
        if (resolvedNonce === undefined) {
            const [currentNonce, error] = await this.rpcProvider.getTransactionCount(this.address);
            if (error) {
                throw new Error(`Failed to get nonce: ${error.message}`);
            }
            resolvedNonce = BigInt(currentNonce);
        }

        // At this point, both values should be defined
        if (resolvedChainId === undefined || resolvedNonce === undefined) {
            throw new Error("Failed to resolve chainId or nonce");
        }

        // Create the authorization request
        const authRequest = createAuthorizationRequest(
            contractAddress,
            resolvedNonce,
            resolvedChainId
        );

        // Create the authorization hash to sign
        const authHash = hash7702Authorization(authRequest);

        // Sign the authorization hash
        const signature = await this.signer.signWithRecoverableECDSA(authHash);

        // Return the complete authorization
        return {
            address: contractAddress,
            nonce: resolvedNonce,
            chainId: resolvedChainId,
            signature: {
                r: signature.r,
                s: signature.s,
                v: signature.recovery, // Use recovery parameter for EIP-7702
            }
        };
    }
}
