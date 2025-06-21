/**
 * Manual RLP encoding utility for legacy Ethereum transactions.
 * This function encodes the transaction fields into RLP format, which is used for Ethereum transactions.
 */
import { toBeHex } from 'ethers';

export function RLPfrom(tx, options = { eip155: true }) {
    const isSigned = 'v' in tx && 'r' in tx && 's' in tx;

    const toHex = (val) => {
        if (typeof val === 'bigint' || typeof val === 'number') {
            if (val === 0n || val === 0) return '0x'; // empty RLP
            return toBeHex(val);
        }
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
            '0x',
            tx.v,
            tx.r,
            tx.s
        ]
        : options.eip155
            ? [
                tx.nonce,
                tx.gasPrice,
                tx.gasLimit,
                tx.to,
                tx.value,
                '0x',
                tx.chainId,
                '0x',
                '0x'
            ]
            : [
                tx.nonce,
                tx.gasPrice,
                tx.gasLimit,
                tx.to,
                tx.value,
                '0x'
            ];

    const encodedFields = fields.map(toHex).map(encode);
    return encodeList(encodedFields);
}

export function toHexString(bytes) {
    return '0x' + [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
