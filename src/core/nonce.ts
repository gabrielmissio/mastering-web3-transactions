const FALLBACK_NONCE = 0;

export class NonceManager {
    provider: any;

    constructor({
        provider,
    }: any = {}) {
        this.provider = provider;

    }

    async getCurrentNonce(address: string): Promise<number> {
        const [nonce, error] = await this.provider.getTransactionCount(address)

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
}
