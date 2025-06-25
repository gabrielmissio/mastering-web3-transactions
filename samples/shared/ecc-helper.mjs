import { HDNodeWallet, SigningKey, getBytes as ethersGetBytes, keccak256 } from "ethers"

export async function createRandomEOA() {
    const wallet = HDNodeWallet.createRandom();

    return {
        address: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
    };
}

export async function signWithRecoverableECDSA(privateKey, digest) {
    const key = new SigningKey(privateKey);
    const { r, s, v } = key.sign(getBytes(digest));
    return { r, s, v, recovery: v - 27 }; // recovery will be 0 or 1
}

export function hashFrom(data) {
    return keccak256(data);
}

export function getBytes(data) {
    return ethersGetBytes(data);
}
