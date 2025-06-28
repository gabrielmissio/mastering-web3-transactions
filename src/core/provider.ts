export class JsonHttpProvider {
    url: string;

    constructor({ url }: any = {}) {
        // TODO: validate URL format
        this.url = url || "http://localhost:8545"; // Default to local Ethereum node
    }

    async request(method: string, params: any[], id = 1) {
        const response = await fetch(this.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method,
                params,
                id: id,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }
        return data.result;
    }

    async requestBatch(requests: any[]) {
        const response = await fetch(this.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requests),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }
        return data.result;
    }

    async getNetworkInfo() {
        try {
            const result = await this.request("net_version", []);
            return [{ chainId: BigInt(result) }, null];
        } catch (error) {
            console.error("Error fetching network info:", error);
            return [null, error];
        }
    }

    async getBlockNumber() {
        try {
            const result = await this.request("eth_blockNumber", []);
            return [BigInt(result), null];
        }
        catch (error) {
            console.error("Error fetching block number:", error);
            return [null, error];
        }
    }

    async getTransactionCount(address: string) {
        try {
            const result = await this.request("eth_getTransactionCount", [address, "latest"]);
            return [parseInt(result, 16), null];
        } catch (error) {
            console.error(`Error fetching nonce for address ${address}:`, error);
            return [null, error];
        }
    }

    async sendRawTransaction(rawTransaction: string) {
        try {
            const result = await this.request("eth_sendRawTransaction", [rawTransaction]);
            return [result, null];
        } catch (error) {
            console.error("Error sending raw transaction:", error);
            return [null, error];
        }
    }

    async estimateGasPrice() {
        try {
            const result = await this.request("eth_gasPrice", []);
            return [BigInt(result), null];
        } catch (error) {
            console.error("Error estimating gas price:", error);
            return [null, error];
        }
    }

    async estimateGasUsage({ from, to, value, data }: any = {}) {
        try {
            const params = [{
                from,
                to,
                value: value ? `0x${value.toString(16)}` : "0x0",
                data: data || "0x",
            }];
            const result = await this.request("eth_estimateGas", params);
            return [BigInt(result), null];
        } catch (error) {
            console.error("Error estimating gas usage:", error);
            return [null, error];
        }
    }

    async call({ to, data }: any) {
        try {
            const params = [{
                to,
                data,
            }, "latest"];
            const result = await this.request("eth_call", params);
            return [result, null];
        } catch (error) {
            console.error("Error calling contract:", error);
            return [null, error];
        }
    }
}
