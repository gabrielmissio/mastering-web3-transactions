// import { Signer } from "./signer.mjs"
// import { Wallet } from "./wallet.mjs";

import {
    isValidBIP32Path,
    randomBIP39Mnemonic,
    generateBIP32NodeFromMnemonic,
} from '../shared/ecc-helper.mjs';

export class HDWallet {
    constructor({ mnemonic, password = '', path = "m/44'/60'/0'/0/0" } = {}) {
        if (!mnemonic) {
            mnemonic = randomBIP39Mnemonic();
        } else {
            // TODO: Review this validation logic
            try {
                generateBIP32NodeFromMnemonic(mnemonic, password, "m");
            } catch (e) {
                console.error('Invalid mnemonic:', e);
                throw new Error('Invalid mnemonic');
            }
        }

        if (!isValidBIP32Path(path)) {
            throw new Error('Invalid BIP32 path');
        }

        // TODO: Encrypt mnemonic, password, and node keys
        // this.masterNode = generateBIP32NodeFromMnemonic(mnemonic, password, "m");
        this.mnemonic = mnemonic;
        this.password = password;
        this.path = path;
        this.node = generateBIP32NodeFromMnemonic(mnemonic, password, path);
    }

    getCurrentNode() {
        return {
            address: this.node.address,
            publicKey: this.node.publicKey,
            privateKey: this.node.privateKey,
            derivationPath: this.path // review this later
        }
    }

    // eslint-disable-next-line no-unused-vars
    derivateNode(node, derivationPath) {
        // derivePath | derivateIndex
    }
}
