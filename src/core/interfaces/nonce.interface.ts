export interface NonceManager {
    getCurrentNonce(address: string): Promise<bigint>;
}
