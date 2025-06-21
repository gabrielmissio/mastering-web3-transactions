const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';

export async function getNetworkInfo() {
    try {
        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'net_version',
                params: [],
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

        const result = {
            chainId: BigInt(data.result)
        };

        return [result, null];
    } catch (error) {
        console.error('Error fetching network info:', error);
        return [null, error];
    }
}

export async function getTransactionCount(address) {
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
