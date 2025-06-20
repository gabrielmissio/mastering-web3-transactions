const FALLBACK_NONCE = 0;
const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';

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

async function getTransactionCount(address) {
    try {
        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getTransactionCount',
                params: [address, 'latest'],
                id: 1,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        return [parseInt(data.result, 16), null];
    } catch (error) {
        console.error(`Error fetching nonce for address ${address}:`, error);
        return [null, error];
    }
}
