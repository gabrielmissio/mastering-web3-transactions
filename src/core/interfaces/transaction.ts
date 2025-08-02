export interface AuthorizationRequest {
    address: string;
    nonce?: bigint;
    chainId?: bigint;
}

export interface Authorization {
    address: string;
    nonce: bigint;
    chainId: bigint;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signature: any;
}
