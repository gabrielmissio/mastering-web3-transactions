import { NonceManager, RpcProvider } from "./interfaces";

const FALLBACK_NONCE = 0n;

export class SimpleNonceManager implements NonceManager{
    #provider: RpcProvider;

    constructor({
        provider,
    }: {
        provider: RpcProvider;
    }) {
        this.#provider = provider
    }

    async getCurrentNonce(address: string): Promise<bigint> {
        const [nonce, error] = await this.#provider.getTransactionCount(address)

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
