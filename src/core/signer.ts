import { SigningKey } from "ethers";
import { getBytes, randomEOA } from "../shared/ecc-helper"
import { Signer } from "./interfaces"

export class SimpleSigner implements Signer {
    #address: string;
    #publicKey: string;
    #privateKey: string;

    constructor({ privateKey }: any = {}) {
        if (privateKey) {
            throw new Error("Not implemented yet: Signer with private key");
        } else {
            const eoa = randomEOA();
            this.#address = eoa.address;
            this.#publicKey = eoa.publicKey;
            this.#privateKey = eoa.privateKey;
        }
    }

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
