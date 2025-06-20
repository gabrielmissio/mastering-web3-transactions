import { HDNodeWallet, SigningKey, getBytes, keccak256 } from "ethers"

export async function createRandomEOA() {
    const wallet = HDNodeWallet.createRandom();

    return {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
    };
}

export async function signHashFromPrivateKey(privateKey, digest) {
    const key = new SigningKey(privateKey);
    const { r, s, v } = key.sign(getBytes(digest));
    return { r, s, recovery: v };
}

export function hashFrom(data) {
    return keccak256(data);
}
