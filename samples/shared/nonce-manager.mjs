import { getTransactionCount } from './evm-provider.mjs';

const FALLBACK_NONCE = 0;

export async function getCurrentNonce(address) {
    const [nonce, error] = await getTransactionCount(address)

    if (error) {
        console.error(`Error fetching nonce for address ${address}:`, error);
        return FALLBACK_NONCE;
    }

    if (isNaN(nonce)) {
        console.warn(`Nonce for address ${address} is NaN, returning fallback nonce.`);
        return FALLBACK_NONCE;
    }

    return nonce;
}
