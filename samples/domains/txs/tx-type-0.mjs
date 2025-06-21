/* 
    Legacy transaction (type 0)
    This is the first transaction type in the Ethereum network.
    It is the most basic and supported transaction type though it is the least efficient and has the least features.
*/
import { Transaction } from 'ethers';
import { getCurrentNonce } from '../../shared/nonce-manager.mjs';
import { getNetworkInfo } from '../../shared/evm-provider.mjs';
import { hashFrom, createRandomEOA, signHashFromPrivateKey } from '../../shared/ecc-helper.mjs';
import { RLPfrom,toHexString } from '../../shared/rlp-helper.mjs';

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
