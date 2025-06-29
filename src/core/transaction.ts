import { keccak256 } from "../shared/ecc-helper";
import { isValidAddress } from "../shared/address-helper";
import { RLPencodeFields, toHexString } from "../shared/rlp-helper"; // <-- update import

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

        // Use TransactionType0 to build RLP fields
        const tx = new TransactionType0({ ...unsignedLegacyTxObject, eip155: options.eip155 });
        const digest = keccak256(RLPencodeFields(tx.getUnsignedRLPFields())); // <-- use new encoder
        const { r, s, recovery, v: tempV } = await this.signer.signWithRecoverableECDSA(digest);
        const v = chainId * 2n + 35n + BigInt(recovery);

        return new TransactionType0({
            ...unsignedLegacyTxObject,
            signature: {
                r,
                s,
                v: options.eip155 ? v : tempV,
                recoveryParam: recovery,
                tempV,
                // recoveryParam: recovery, // for testing purposes
            },
            eip155: options.eip155,
        })
    }  
}

// TODO: Add support to Buffer / Hex string
type Signature = {
    r: string;
    s: string;
    v: number;
    tempV?: number; // for educational purposes, not used in production
    recoveryParam?: 0 | 1;
};

class Transaction {
    signature: Signature;

    constructor({ signature }: any = {}) {
        if (signature && typeof signature !== "object") {
            throw new Error("Invalid signature format");
        }
        if (signature && (!signature.r || !signature.s || !signature.v)) {
            throw new Error("Signature must contain r, s, and v");
        }
        this.signature = signature ?? null;
    }
    
    // Remove eip155 from base class, and require subclasses to provide RLP fields
    getUnsignedRLPFields(): any[] {
        throw new Error("Method getUnsignedRLPFields must be implemented by subclasses");
    }

    getSignedRLPFields(): any[] {
        throw new Error("Method getSignedRLPFields must be implemented by subclasses");
    }

    unsignedHash() {
        return keccak256(RLPencodeFields(this.getUnsignedRLPFields()));
    }

    unsignedRawTxHex() {
        return toHexString(RLPencodeFields(this.getUnsignedRLPFields()));
    }

    signedHash() {
        return keccak256(RLPencodeFields(this.getSignedRLPFields()));
    }

    signedRawTxHex() {
        return toHexString(RLPencodeFields(this.getSignedRLPFields()));
    }
}

export class TransactionType0 extends Transaction {
    #to: string | null;
    #value: bigint;
    #data: string;
    #nonce: bigint;
    #gasLimit: bigint;
    #gasPrice: bigint;
    #chainId: bigint;

    // test / educational purposes only
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

        if (to && !isValidAddress(to)) {
            throw new Error(`Invalid "to": ${to}`);
        }

        // validate chainId
        // OBS: ChainId is optional for legacy + pre-EIP-155 transactions
        if (chainId && (typeof chainId !== "bigint" || chainId < 0n)) {
            throw new Error(`Invalid "chainId": ${chainId}`);
        }
        if (typeof value !== "bigint" || value < 0n) {
            throw new Error(`Invalid "value": ${value}`);
        }
        if (data && typeof data !== "string") {
            throw new Error(`Invalid "data": ${data}`);
        }
        if (typeof nonce !== "bigint" || nonce < 0n) {
            throw new Error(`Invalid "nonce": ${nonce}`);
        }
        if (typeof gasLimit !== "bigint" || gasLimit < 21000n) {
            throw new Error(`Invalid "gasLimit": ${gasLimit}`);
        }
        if (typeof gasPrice !== "bigint" || gasPrice < 0n) {
            throw new Error(`Invalid "gasPrice": ${gasPrice}`);
        }

        // TODO: add "from" property (recovery from signature)

        this.#to = to;
        this.#value = value;
        this.#data = data;
        this.#nonce = nonce;
        this.#gasLimit = gasLimit;
        this.#gasPrice = gasPrice;
        this.#chainId = chainId;
        this.eip155 = eip155;
    }

    get to() { return this.#to; }
    get value() { return this.#value; }
    get data() { return this.#data; }
    get nonce() { return this.#nonce; }
    get gasLimit() { return this.#gasLimit; }
    get gasPrice() { return this.#gasPrice; }
    get chainId() { return this.#chainId; }

    // Provide RLP fields for encoder
    getUnsignedRLPFields(): any[] {
        if (this.eip155) {
            return [
                this.#nonce,
                this.#gasPrice,
                this.#gasLimit,
                this.#to ?? null,
                this.#value,
                this.#data ?? "0x",
                this.#chainId,
                "0x",
                "0x"
            ];
        } else {
            return [
                this.#nonce,
                this.#gasPrice,
                this.#gasLimit,
                this.#to ?? null,
                this.#value,
                this.#data ?? "0x"
            ];
        }
    }

    getSignedRLPFields(): any[] {
        return [
            this.#nonce,
            this.#gasPrice,
            this.#gasLimit,
            this.#to ?? null,
            this.#value,
            this.#data ?? "0x",
            this.eip155 ? this.signature.v : this.signature.tempV,
            this.signature.r,
            this.signature.s
        ];
    }

    toUnsignedTxObject() {
        return {
            to: this.#to,
            value: this.#value,
            data: this.#data,
            nonce: this.#nonce,
            gasLimit: this.#gasLimit,
            gasPrice: this.#gasPrice,
            chainId: this.#chainId,
        };
    }

    toSignedTxObject() {
        return {
            ...this.toUnsignedTxObject(),
            signature: {
                r: this.signature.r,
                s: this.signature.s,
                v: this.eip155 ? this.signature.v : this.signature.tempV,
            }
        };
    }
}
