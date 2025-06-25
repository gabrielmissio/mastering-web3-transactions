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

export async function sendRawTransaction(rawTransaction) {
    try {
        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_sendRawTransaction',
                params: [rawTransaction],
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

        return [data.result, null];
    } catch (error) {
        console.error('Error sending raw transaction:', error);
        return [null, error];
    }
}

export async function estimateGasPrice() {
    try {
        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_gasPrice',
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

        return [BigInt(data.result), null];
    } catch (error) {
        console.error('Error estimating gas price:', error);
        return [null, error];
    }
}

export async function estimateGasUsage({ from, to, value, data } = {})  {
    try {
        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_estimateGas',
                params: [{
                    from,
                    to,
                    value: value ? `0x${value.toString(16)}` : '0x0',
                    data: data || '0x',
                }],
                id: 1,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const dataResponse = await response.json();
        if (dataResponse.error) {
            throw new Error(dataResponse.error.message);
        }

        return [BigInt(dataResponse.result), null];
    } catch (error) {
        console.error('Error estimating gas usage:', error);
        return [null, error];
    }
}
