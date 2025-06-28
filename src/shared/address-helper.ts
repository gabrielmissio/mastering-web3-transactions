export function isValidAddress(address: string): boolean {
    // TODO: Add checksum validation when detect EIP-55
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// export function getAddressFromPublicKey(publicKey: string): string {}
