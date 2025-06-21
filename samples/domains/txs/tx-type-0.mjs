/* 
    Legacy transaction (type 0)
    This is the first transaction type in the Ethereum network.
    It is the most basic and supported transaction type though it is the least efficient and has the least features.
*/
import { toBeHex, Transaction } from 'ethers';
import { getCurrentNonce } from '../../shared/nonce-manager.mjs';
import { getNetworkInfo } from '../../shared/evm-provider.mjs';
import { hashFrom, createRandomEOA, signHashFromPrivateKey } from '../../shared/ecc-helper.mjs';

/**
 * Sends an Ethereum transaction using a randomly generated EOA (Externally Owned Account).
 * @param {Object} data - The data for the transaction.
 * @param {string} [data.to] - The recipient address of the transaction. If not provided, a random EOA will be created.
 * @param {bigint} [data.value] - The amount of Ether to send in wei. Defaults to 1 wei.
 * @param {Object} [options] - Options for the transaction.
 * @param {boolean} [options.eip155=true] - Whether to use EIP-155 for transaction signing. Defaults to true.
 * @returns {Promise<Object>}
 * @throws {Error}
 */
export async function sendEthTransaction({ to, value } = {}, options = { eip155: true }) {
    const signer = await createRandomEOA();
    const [[networkInfo], nonce] = await Promise.all([
        getNetworkInfo(), getCurrentNonce(signer.address),
    ]);

    const chainId = BigInt(networkInfo.chainId || 1);
    const unsignedLegacyTxObject = {
        chainId,
        to: to || (await createRandomEOA()).address, //.toLowerCase(),
        value: value || 1n, // in wei
        nonce: BigInt(nonce),
        gasLimit: 21000n,
        gasPrice: 1000000000n // 1 gwei
    };

    const digest = hashFrom(RLPfrom(unsignedLegacyTxObject, options));
    const { r, s, recovery, v: tempV } = await signHashFromPrivateKey(signer.privateKey, digest);
    const v = chainId * 2n + 35n + BigInt(recovery);

    const signedLegacyTxObject = {
        ...unsignedLegacyTxObject,
        r, s, v: options.eip155 ? v : tempV, // v is 27 or 28 for legacy transactions, or chainId * 2 + 35 + recovery for EIP-155
    };

    console.log({ v, recovery, tempV, chainId, signedLegacyTxObject });
    const rlpSignedTxObject = RLPfrom(signedLegacyTxObject, options);

    return {
        signer,
        digest,
        digest2: Transaction.from({ ...unsignedLegacyTxObject, type: 0 }).unsignedHash,
        rawUnsignedTransaction: toHexString(RLPfrom(unsignedLegacyTxObject, options)),
        rawUnsignedTransaction2: Transaction.from({ ...unsignedLegacyTxObject, type: 0 }).unsignedSerialized,
        rawSignedTransaction: toHexString(rlpSignedTxObject),
        rawSignedTransaction2: Transaction.from(toHexString(rlpSignedTxObject)).serialized,
        rawSignedTransaction3: Transaction.from({
            ...unsignedLegacyTxObject,
            type: 0,
            signature: {
                r,
                s,
                yParity: Number(recovery),        // 0 or 1
                networkV: Number(chainId)         // chainId for EIP‑155
            }
        }).serialized
    };
}

function RLPfrom(tx, options = { eip155: true }) {
    const isSigned = 'v' in tx && 'r' in tx && 's' in tx;

    const toHex = (val) => {
        if (typeof val === 'bigint' || typeof val === 'number') {
            if (val === 0n) return '0x'; // empty RLP = 0x80
            return toBeHex(val);
        }
        return val; // assume already hex string
    };;

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
            tx.data || "0x",
            tx.v,
            tx.r,
            tx.s
        ]
        : options.eip155
            ?[
                tx.nonce,
                tx.gasPrice,
                tx.gasLimit,
                tx.to,
                tx.value,
                tx.data || "0x",
                tx.chainId,
                "0x",
                "0x"
            ]
            : [
                tx.nonce,
                tx.gasPrice,
                tx.gasLimit,
                tx.to,
                tx.value,
                tx.data || "0x",
            ];

    const encodedFields = fields.map(toHex).map(encode);
    return encodeList(encodedFields);
}

function toHexString(bytes) {
    return '0x' + [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
