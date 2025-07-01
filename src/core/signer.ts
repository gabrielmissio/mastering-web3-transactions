import { SigningKey } from "ethers";
import { Signer } from "./interfaces"
import {
    getBytes,
    randomEOA,
    calculatePublicKey,
    calculateEthereumAddress,
 } from "../shared/ecc-helper"

export class SimpleSigner implements Signer {
    #address: string;
    #publicKey: string;
    #privateKey: string;

    constructor({ privateKey }: any = {}) {
        if (privateKey) {
            // TODO: validate private key
            this.#privateKey = privateKey
            this.#publicKey = calculatePublicKey(this.#privateKey)
            this.#address = calculateEthereumAddress(this.#publicKey)
        } else {
            const eoa = randomEOA();
            this.#address = eoa.address;
            this.#publicKey = eoa.publicKey;
            this.#privateKey = eoa.privateKey;
        }
    }

    // static async create() {
    //     // load async data and instance new object...
    // }

    getAddress() {
        return this.#address
    }

    getPublicKey() {
        return this.#publicKey
    }

    signWithRecoverableECDSA(digest: any): any {
        const key = new SigningKey(this.#privateKey);
        const { r, s, v } = key.sign(getBytes(digest));
        return { r, s, v, recovery: v - 27 };
    }
}
