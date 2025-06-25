/* 
    Legacy transaction (type 0)
    This is the first transaction type in the Ethereum network.
    It is the most basic and supported transaction type though it is the least efficient and has the least features.
*/
import { Transaction } from 'ethers';
import { getCurrentNonce } from '../../shared/nonce-manager.mjs';
import { getNetworkInfo, estimateGasPrice, estimateGasUsage } from '../../shared/evm-provider.mjs';
import { hashFrom, createRandomEOA, signWithRecoverableECDSA } from '../../shared/ecc-helper.mjs';
import { RLPfrom,toHexString } from '../../shared/rlp-helper.mjs';

/**
 * Sends an Ethereum transaction using a randomly generated EOA (Externally Owned Account).
 * @param {Object} data - The data for the transaction.
 * @param {string} [data.to] - The recipient address of the transaction. If not provided, its a smartcontract deployment.
 * @param {string} [data.data] - The data to send with the transaction, typically used for smart contract interactions. Defaults to '0x'.
 * @param {bigint} [data.value] - The amount of Ether to send in wei. Defaults to 1 wei.
 * @param {Object} [options] - Options for the transaction.
 * @param {boolean} [options.eip155=true] - Whether to use EIP-155 for transaction signing. Defaults to true.
 * @param {boolean} [options.freeGas=false] - Whether to use free gas (0 gas price). Defaults to false.
 * @returns {Promise<Object>}
 * @throws {Error}
 */
export async function sendLegacyTransaction({
    to,
    data,
    value,
    // nonce,
} = {},
    options = {
        eip155: true,
        freeGas: false,
    })
{
    const isSimpleTx = to && !data 
    const signer = await createRandomEOA();

    const [ nonce, { chainId }, gasPrice, gasLimit] = await Promise.all([
        getCurrentNonce(signer.address),
        getNetworkInfo().then(([data, error]) => {
            if (error) throw error
            return data;
        }),
        options.freeGas ? 0n : estimateGasPrice().then(([data, error]) => {
            if (error) throw error
            return data;
        }),
        isSimpleTx ? 21000n : estimateGasUsage({ from: signer.address, to, value, data }).then(([data, error]) => {
            if (error) throw error
            return data;
        })
    ]);

    const unsignedLegacyTxObject = {
        chainId,
        to: to  ?? null, // null for contract deployment
        data: data ?? '0x',
        value: value ?? 0n, // in wei
        nonce: BigInt(nonce),
        gasLimit,
        gasPrice,
    };

    const digest = hashFrom(RLPfrom(unsignedLegacyTxObject, options));
    const { r, s, recovery, v: tempV } = await signWithRecoverableECDSA(signer.privateKey, digest);
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
        signedLegacyTxObject,
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
