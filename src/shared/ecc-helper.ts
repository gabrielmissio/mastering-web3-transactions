import {
    Wallet,
    HDNodeWallet,
    SigningKey,
    getBytes as ethersGetBytes,
    keccak256 as ethersKeccak256,
} from "ethers"

export function calculatePublicKey(privateKey: string): string {
    const wallet = new SigningKey(privateKey);
    return wallet.publicKey;
}

export function calculateEthereumAddress(publicKey: string): string {
    if (!publicKey) {
        throw new Error("Unable to calculate address");
    }

    // Remove '0x' and '04' prefix if present
    let pubKey = publicKey.replace(/^0x/, "");
    if (pubKey.startsWith("04")) {
        pubKey = pubKey.slice(2);
    }

    const pubKeyBytes = getBytes("0x" + pubKey);
    const hash = keccak256(pubKeyBytes);

    // Take last 20 bytes (40 hex chars)
    const address = "0x" + hash.slice(-40);

    return address
}

export function generateBIP32NodeFromMnemonic(mnemonic: string, password = "", path = "m/44'/60'/0'/0/0") {
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

export function isValidBIP32Path(path: string): boolean {
    // Matches m/44'/60'/0'/0/0 or similar
    return /^m(\/\d+'?)*$/.test(path);
}

export function randomEOA() {
    return Wallet.createRandom();
}

export async function signWithRecoverableECDSA(privateKey: string, digest: any) {
    const key = new SigningKey(privateKey);
    const { r, s, v } = key.sign(getBytes(digest));
    return { r, s, v, recovery: v - 27 }; // recovery will be 0 or 1
}

export function keccak256(data: any) {
    return ethersKeccak256(data);
}

export function getBytes(data: any) {
    return ethersGetBytes(data);
}
