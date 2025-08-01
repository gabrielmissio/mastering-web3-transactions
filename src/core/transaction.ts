import { keccak256 } from "../shared/ecc-helper";
import { isValidAddress } from "../shared/address-helper";
import { RLPencodeFields, toHexString } from "../shared/rlp-helper";
import { Signer, RpcProvider, NonceManager } from "./interfaces";

export type TxOptions = {
    eip155?: boolean; // Default: true
    freeGas?: boolean; // Default: false
}

export class TransactionBuilder {
    #signer: Signer;
    #rpcProvider: RpcProvider;
    #nonceManager: NonceManager;

    constructor({
        signer,
        rpcProvider,
        nonceManager,
    }: {
        signer: Signer;
        rpcProvider: RpcProvider;
        nonceManager: NonceManager;
    }) {
        if (!signer) {
            throw new Error("Signer is required");
        }
        if (!rpcProvider) {
            throw new Error("RPC Provider is required");
        }
        if (!nonceManager) {
            throw new Error("Nonce Manager is required");
        }

        this.#signer = signer
        this.#rpcProvider = rpcProvider;
        this.#nonceManager = nonceManager;
    }

    async buildType0(
        payload: {
            to?: string | null; // null for contract deployment
            value?: bigint; // in wei
            data?: string; // hex string, default: "0x"
            from: string; // address of the sender, used for nonce management
        },
        options: TxOptions = {
            eip155: true,
            freeGas: false,
        }
    ): Promise<TransactionType0> {
        if (!payload || typeof payload !== "object") {
            throw new Error("Invalid transaction data");
        }
        const { to, value, data, from } = payload;
        // const { to, value, data } = payload;
        // Maybe remove from from data and use signer.address instead

        const isSimpleTx = to && !data 
    
        const [ nonce, { chainId }, gasPrice, gasLimit] = await Promise.all([
            this.#nonceManager.getCurrentNonce(from),
            this.#rpcProvider.getNetworkInfo().then(([data, error]: [any, any]) => {
                if (error) throw error
                return data;
            }),
            options.freeGas ? 0n : this.#rpcProvider.estimateGasPrice().then(([data, error]: [any, any]) => {
                if (error) throw error
                return data;
            }),
            isSimpleTx ? 21000n : this.#rpcProvider.estimateGasUsage({ from, to, value, data }).then(([data, error]: [any, any]) => {
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
        const { r, s, recovery, v: tempV } = await this.#signer.signWithRecoverableECDSA(digest);
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

    async buildType2(
        payload: {
            to?: string | null; // null for contract deployment
            value?: bigint; // in wei
            data?: string; // hex string, default: "0x"
            from: string; // address of the sender, used for nonce management
            maxFeePerGas?: bigint; // maximum fee per gas
            maxPriorityFeePerGas?: bigint; // maximum priority fee per gas (tip)
        },
        options: TxOptions = {
            eip155: true,
            freeGas: false,
        }
    ): Promise<TransactionType2> {
        if (!payload || typeof payload !== "object") {
            throw new Error("Invalid transaction data");
        }
        const { to, value, data, from, maxFeePerGas, maxPriorityFeePerGas } = payload;

        const isSimpleTx = to && !data;

        const [nonce, { chainId }, feeData, gasLimit] = await Promise.all([
            this.#nonceManager.getCurrentNonce(from),
            this.#rpcProvider.getNetworkInfo().then(([data, error]: [any, any]) => {
                if (error) throw error;
                return data;
            }),
            options.freeGas ? { maxFeePerGas: 0n, maxPriorityFeePerGas: 0n } : 
                this.#rpcProvider.estimateFeeData().then(([data, error]: [any, any]) => {
                    if (error) throw error;
                    return data;
                }),
            isSimpleTx ? 21000n : this.#rpcProvider.estimateGasUsage({ from, to, value, data }).then(([data, error]: [any, any]) => {
                if (error) throw error;
                return data;
            })
        ]);

        const unsignedType2TxObject = {
            chainId,
            to: to ?? null, // null for contract deployment
            data: data ?? "0x",
            value: value ?? 0n, // in wei
            nonce: BigInt(nonce),
            gasLimit,
            maxFeePerGas: maxFeePerGas ?? feeData.maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas ?? feeData.maxPriorityFeePerGas,
        };

        const tx = new TransactionType2(unsignedType2TxObject);

        // EIP-1559 transactions use a different signing format
        const digest = keccak256(Buffer.concat([
            Buffer.from([0x02]), // Transaction type prefix
            RLPencodeFields(tx.getUnsignedRLPFields())
        ]));

        const { r, s, recovery } = await this.#signer.signWithRecoverableECDSA(digest);

        return new TransactionType2({
            ...unsignedType2TxObject,
            signature: {
                r,
                s,
                v: recovery,
                recoveryParam: recovery,
            },
        });
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
        if (signature && (!signature.r || !signature.s || (signature.v === undefined && signature.v !== 0))) {
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

export class TransactionType2 extends Transaction {
    #to: string | null;
    #value: bigint;
    #data: string;
    #nonce: bigint;
    #gasLimit: bigint;
    #maxFeePerGas: bigint;
    #maxPriorityFeePerGas: bigint;
    #chainId: bigint;

    constructor({
        to = null,
        value = 0n,
        data = "0x",
        nonce,
        gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        chainId,
        signature = null,
    }: any = {}) {
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
        if (typeof maxFeePerGas !== "bigint" || maxFeePerGas < 0n) {
            throw new Error(`Invalid "maxFeePerGas": ${maxFeePerGas}`);
        }
        if (typeof maxPriorityFeePerGas !== "bigint" || maxPriorityFeePerGas < 0n) {
            throw new Error(`Invalid "maxPriorityFeePerGas": ${maxPriorityFeePerGas}`);
        }

        this.#to = to;
        this.#value = value;
        this.#data = data;
        this.#nonce = nonce;
        this.#gasLimit = gasLimit;
        this.#maxFeePerGas = maxFeePerGas;
        this.#maxPriorityFeePerGas = maxPriorityFeePerGas;
        this.#chainId = chainId;
    }

    get to() { return this.#to; }
    get value() { return this.#value; }
    get data() { return this.#data; }
    get nonce() { return this.#nonce; }
    get gasLimit() { return this.#gasLimit; }
    get maxFeePerGas() { return this.#maxFeePerGas; }
    get maxPriorityFeePerGas() { return this.#maxPriorityFeePerGas; }
    get chainId() { return this.#chainId; }

    // Provide RLP fields for encoder
    getUnsignedRLPFields(): any[] {
        return [
            this.#chainId,
            this.#nonce,
            this.#maxPriorityFeePerGas,
            this.#maxFeePerGas,
            this.#gasLimit,
            this.#to ?? null,
            this.#value,
            this.#data ?? "0x",
            [] // accessList (empty for basic transactions)
        ];
    }

    getSignedRLPFields(): any[] {
        return [
            this.#chainId,
            this.#nonce,
            this.#maxPriorityFeePerGas,
            this.#maxFeePerGas,
            this.#gasLimit,
            this.#to ?? null,
            this.#value,
            this.#data ?? "0x",
            [], // accessList (empty for basic transactions)
            this.signature.v, // yParity
            this.signature.r,
            this.signature.s
        ];
    }

    // Override signedRawTxHex for EIP-1559 transactions
    signedRawTxHex() {
        const rlpEncoded = RLPencodeFields(this.getSignedRLPFields());
        // EIP-1559 transactions are prefixed with 0x02
        return "0x02" + toHexString(rlpEncoded).slice(2);
    }

    toUnsignedTxObject() {
        return {
            to: this.#to,
            value: this.#value,
            data: this.#data,
            nonce: this.#nonce,
            gasLimit: this.#gasLimit,
            maxFeePerGas: this.#maxFeePerGas,
            maxPriorityFeePerGas: this.#maxPriorityFeePerGas,
            chainId: this.#chainId,
        };
    }

    toSignedTxObject() {
        return {
            ...this.toUnsignedTxObject(),
            signature: {
                r: this.signature.r,
                s: this.signature.s,
                v: this.signature.v, // yParity for EIP-1559
            }
        };
    }
}
