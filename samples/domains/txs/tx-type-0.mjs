/* 
    Legacy transaction (type 0)
    This is the first transaction type in the Ethereum network.
    It is the most basic and supported transaction type though it is the least efficient and has the least features.
*/
import { getCurrentNonce } from '../../shared/nonce-manager.mjs';
import { hashFrom, createRandomEOA, signHashFromPrivateKey } from '../../shared/ecc-helper.mjs';
import { toBeHex } from 'ethers';

export async function sendEthTransaction(to) {
    const signer = await createRandomEOA();
    const nonce = await getCurrentNonce(signer.address);

    const unsignedLegacyTxObject = {
        chainId: 1n, // Mainnet chain ID
        to: to || (await createRandomEOA()).address.toLowerCase(),
        value: 1n, // in wei
        nonce: BigInt(nonce),
        gasLimit: 21000n,
        gasPrice: 1000000000n // 1 gwei
    };

    const digest = hashFrom(RLPfrom(unsignedLegacyTxObject));
    const { r, s, recovery } = await signHashFromPrivateKey(signer.privateKey, digest);
    const v = unsignedLegacyTxObject.chainId * 2n + 35n + BigInt(recovery);

    const signedLegacyTxObject = {
        ...unsignedLegacyTxObject,
        v, r, s
        // v: recovery, r, s
    };

    const rlpSignedTxObject = RLPfrom(signedLegacyTxObject);

    return {
        signer,
        digest,
        signedLegacyTxObject,
        signature: { v, r, s },
        rawTransaction: toHexString(rlpSignedTxObject),
    };
}

function RLPfrom(tx) {
    const isSigned = 'v' in tx && 'r' in tx && 's' in tx;

    const toHex = (val) => {
        if (typeof val === 'bigint' || typeof val === 'number') return toBeHex(val);
        return val; // assume already hex string
    };

    const encode = (input) => {
        if (typeof input === 'string' && input.startsWith('0x')) input = input.slice(2);
        if (input === '') return Uint8Array.from([0x80]);
        if (input.length % 2 === 1) input = '0' + input;
        const bytes = Uint8Array.from(Buffer.from(input, 'hex'));
        if (bytes.length === 1 && bytes[0] < 0x80) return bytes;
        return Uint8Array.from([ ...encodeLength(bytes.length, 0x80), ...bytes ]);
    };

    const encodeList = (encodedItems) => {
        const payload = Uint8Array.from(encodedItems.flatMap(item => [...item]));
        return Uint8Array.from([ ...encodeLength(payload.length, 0xc0), ...payload ]);
    };

    const encodeLength = (len, offset) => {
        if (len < 56) return [offset + len];
        const hexLen = len.toString(16);
        const l = hexLen.length % 2 === 0 ? hexLen : '0' + hexLen;
        const buf = Uint8Array.from(Buffer.from(l, 'hex'));
        return [offset + 55 + buf.length, ...buf];
    };

    const fields = isSigned
        ? [
            tx.nonce,
            tx.gasPrice,
            tx.gasLimit,
            tx.to,
            tx.value,
            "0x",
            tx.v,
            tx.r,
            tx.s
        ]
        : [
            tx.nonce,
            tx.gasPrice,
            tx.gasLimit,
            tx.to,
            tx.value,
            "0x",
            tx.chainId,
            0n,
            0n
        ];

    const encodedFields = fields.map(toHex).map(encode);
    return encodeList(encodedFields);
}

function toHexString(bytes) {
    return '0x' + [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
