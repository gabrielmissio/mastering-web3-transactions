import { SigningKey } from 'ethers';
import { getBytes, randomEOA } from '../shared/ecc-helper.mjs'

export class Signer {
    constructor({ privateKey } = {}) {
        if (privateKey) {
            throw new Error("Not implemented yet: Signer with private key");
        } else {
            const eoa = randomEOA();
            this.address = eoa.address;
            this.publicKey = eoa.publicKey;
            this.privateKey = eoa.privateKey;
        }
    }

    getAddress() {
        return this.address
    }

    signWithRecoverableECDSA(digest) {
        const key = new SigningKey(this.privateKey);
        const { r, s, v } = key.sign(getBytes(digest));
        return { r, s, v, recovery: v - 27 };
    }
}
