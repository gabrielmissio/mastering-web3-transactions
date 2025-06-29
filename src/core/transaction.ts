import { keccak256 } from "../shared/ecc-helper";
import { isValidAddress } from "../shared/address-helper";
import { RLPfrom, toHexString } from "../shared/rlp-helper";

export class TransactionBuilder {
    signer: any;
    rpcProvider: any;
    nonceManager: any;

    constructor({
        signer,
        rpcProvider,
        nonceManager,
    }: any = {}) {
        if (!rpcProvider) {
            throw new Error("RPC Provider is required");
        }
        if (!nonceManager) {
            throw new Error("Nonce Manager is required");
        }

        this.signer = signer
        this.rpcProvider = rpcProvider;
        this.nonceManager = nonceManager;
    }

    async buildType0(
        payload: any,
        options
    = {
        eip155: true,
        freeGas: false,
    }) {
        if (!payload || typeof payload !== "object") {
            throw new Error("Invalid transaction data");
        }
        const { to, value, data, address } = payload;
        // const { to, value, data } = payload;
        // Maybe remove address from data and use signer.address instead

        const isSimpleTx = to && !data 
    
        const [ nonce, { chainId }, gasPrice, gasLimit] = await Promise.all([
            this.nonceManager.getCurrentNonce(address),
            this.rpcProvider.getNetworkInfo().then(([data, error]: [any, any]) => {
                if (error) throw error
                return data;
            }),
            options.freeGas ? 0n : this.rpcProvider.estimateGasPrice().then(([data, error]: [any, any]) => {
                if (error) throw error
                return data;
            }),
            isSimpleTx ? 21000n : this.rpcProvider.estimateGasUsage({ from: address, to, value, data }).then(([data, error]: [any, any]) => {
                if (error) throw error
                return data;
            })
        ]);
    
        const unsignedLegacyTxObject = {
            chainId,
            to: to  ?? null, // null for contract deployment
            data: data ?? "0x",
            value: value ?? 0n, // in wei
            nonce: BigInt(nonce),
            gasLimit,
            gasPrice,
        };
    
        const digest = keccak256(RLPfrom(unsignedLegacyTxObject, options));
        const { r, s, recovery, v: tempV } = await this.signer.signWithRecoverableECDSA(digest);
        const v = chainId * 2n + 35n + BigInt(recovery);
    
        const signedLegacyTxObject = {
            ...unsignedLegacyTxObject,
            r, s, v: options.eip155 ? v : tempV, // v is 27 or 28 for legacy transactions, or chainId * 2 + 35 + recovery for EIP-155
        };
    
        return new TransactionType0({
            to: signedLegacyTxObject.to,
            value: signedLegacyTxObject.value,
            data: signedLegacyTxObject.data,
            nonce: signedLegacyTxObject.nonce,
            gasLimit: signedLegacyTxObject.gasLimit,
            gasPrice: signedLegacyTxObject.gasPrice,
            chainId: signedLegacyTxObject.chainId,
            signature: {
                r: signedLegacyTxObject.r,
                s: signedLegacyTxObject.s,
                v: signedLegacyTxObject.v,
                tempV, // for educational purposes
            },
            eip155: options.eip155,
        })
    }  
}

class Transaction {
    eip155!: boolean;
    signature: any;

    constructor({ signature }: any = {}) {
        if (signature && typeof signature !== "object") {
            throw new Error("Invalid signature format");
        }
        if (signature && (!signature.r || !signature.s || !signature.v)) {
            throw new Error("Signature must contain r, s, and v");
        }
        this.signature = signature ?? null;
    }

    toUnsignedTxObject() {
        throw new Error("Method toUnsignedTxObject must be implemented by subclasses");
    }

    toSignedTxObject() {
        if (!this.signature) throw new Error("Missing signature");
        throw new Error("Method toSignedTxObject must be implemented by subclasses");
    }

    unsignedHash() {
        return keccak256(RLPfrom(this.toUnsignedTxObject(), { eip155: this.eip155 }));
    }

    unsignedRawTxHex() {
        return toHexString(RLPfrom(this.toUnsignedTxObject(), { eip155: this.eip155 }));
    }

    signedHash() {
        return keccak256(RLPfrom(this.toSignedTxObject(), { eip155: this.eip155 }));
    }

    signedRawTxHex() {
        return toHexString(RLPfrom(this.toSignedTxObject(), { eip155: this.eip155 }));
    }
}

export class TransactionType0 extends Transaction {
    to: string | null;
    value: any
    data: any
    nonce: bigint;
    gasLimit: bigint;
    gasPrice: bigint;
    chainId: bigint;
    eip155: boolean;


    constructor({
        to = null,
        value = 0n,
        data = "0x",
        nonce,
        gasLimit,
        gasPrice,
        chainId,
        signature = null,
        eip155 = true, // educational purposes only
    }: any = {}) {
        // TODO: Review what more properties we want to handle in the "Transaction" class
        super({ signature });

        // validate address
        if (to && !isValidAddress(to)) {
            throw new Error(`Invalid "to": ${to}`);
        }

        // validate chainId
        // OBS: ChainId is optional for legacy + pre-EIP-155 transactions
        if (chainId && (typeof chainId !== "bigint" || chainId < 0n)) {
            throw new Error(`Invalid "chainId": ${chainId}`);
        }

        // validate value
        if (typeof value !== "bigint" || value < 0n) {
            throw new Error(`Invalid "value": ${value}`);
        }

        // validate data
        if (data && typeof data !== "string") {
            throw new Error(`Invalid "data": ${data}`);
        }

        // validate nonce
        if (typeof nonce !== "bigint" || nonce < 0n) {
            throw new Error(`Invalid "nonce": ${nonce}`);
        }
        
        // validate gasLimit
        if (typeof gasLimit !== "bigint" || gasLimit < 21000n) {
            throw new Error(`Invalid "gasLimit": ${gasLimit}`);
        }

        // validate gasPrice
        if (typeof gasPrice !== "bigint" || gasPrice < 0n) {
            throw new Error(`Invalid "gasPrice": ${gasPrice}`);
        }

        // TODO: validate inputs
        this.to = to;
        this.value = value;
        this.data = data;
        this.nonce = nonce;
        this.gasLimit = gasLimit;
        this.gasPrice = gasPrice;
        this.chainId = chainId;
        this.eip155 = eip155;
    }

    toUnsignedTxObject() {
        return {
            to: this.to,
            value: this.value,
            data: this.data,
            nonce: this.nonce,
            gasLimit: this.gasLimit,
            gasPrice: this.gasPrice,
            chainId: this.chainId,
        };
    }

    toSignedTxObject() {
        return {
            ...this.toUnsignedTxObject(),
            r: this.signature.r,
            s: this.signature.s,
            v: this.eip155 ? this.signature.v : this.signature.tempV,
        };
    }
}
