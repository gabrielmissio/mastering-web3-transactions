import {
    Wallet,
    HDNodeWallet,
    SigningKey,
    getBytes as ethersGetBytes,
    keccak256 as ethersKeccak256,
} from "ethers"

export function generateBIP32NodeFromMnemonic(mnemonic, password = '', path = "m/44'/60'/0'/0/0") {
    const wallet = HDNodeWallet.fromPhrase(mnemonic, password, path);
    return {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
    };
}

export function randomBIP39Mnemonic() {
    return HDNodeWallet.createRandom().mnemonic
}

export function isValidBIP32Path(path) {
    // Matches m/44'/60'/0'/0/0 or similar
    return /^m(\/\d+'?)*$/.test(path);
}

export function randomEOA() {
    return Wallet.createRandom();
}

export async function signWithRecoverableECDSA(privateKey, digest) {
    const key = new SigningKey(privateKey);
    const { r, s, v } = key.sign(getBytes(digest));
    return { r, s, v, recovery: v - 27 }; // recovery will be 0 or 1
}

export function keccak256(data) {
    return ethersKeccak256(data);
}

export function getBytes(data) {
    return ethersGetBytes(data);
}
