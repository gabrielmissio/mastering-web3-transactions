import { keccak256, getBytes } from "./ecc-helper";
import { RLPencodeFields } from "./rlp-helper";
import { isValidAddress } from "./address-helper";
import { AuthorizationRequest } from "../core/interfaces/transaction";

/**
 * Computes the EIP-7702 authorization digest to sign.
 * 
 * This function creates the hash that needs to be signed for an EIP-7702 authorization.
 * The authorization allows an EOA to temporarily delegate code execution to a smart contract.
 * 
 * Format: keccak256(0x05 || rlp([chainId, address, nonce]))
 * - 0x05 is the magic byte for EIP-7702 authorization
 * - chainId: the chain ID (optional, defaults to empty bytes if not provided)
 * - address: the contract address to delegate to
 * - nonce: the nonce for replay protection (optional, defaults to empty bytes if not provided)
 * 
 * @param auth - The authorization request containing address, nonce, and chainId
 * @returns The authorization digest as a hex string (0x-prefixed)
 * @throws Error if the address is invalid
 */
export function hash7702Authorization(auth: AuthorizationRequest): string {
    // Validate the address
    if (!auth.address || !isValidAddress(auth.address)) {
        throw new Error(`Invalid address for hash7702Authorization: ${auth.address}`);
    }

    // Prepare RLP fields according to EIP-7702 specification
    // Following the same pattern as your existing transaction RLP encoding
    const rlpFields = [
        // Chain ID: if provided, use the bigint value, otherwise null for empty encoding
        auth.chainId != null ? auth.chainId : null,
        
        // Address: the contract address to delegate to (must be valid)
        auth.address,
        
        // Nonce: if provided, use the bigint value, otherwise null for empty encoding
        auth.nonce != null ? auth.nonce : null,
    ];

    // Use your existing RLPencodeFields function to handle the encoding properly
    const rlpEncoded = RLPencodeFields(rlpFields);

    // Create the authorization digest with magic byte 0x05
    const magicByte = getBytes("0x05");
    const authorizationPayload = new Uint8Array(magicByte.length + rlpEncoded.length);
    authorizationPayload.set(magicByte, 0);
    authorizationPayload.set(rlpEncoded, magicByte.length);

    // Return the keccak256 hash
    return keccak256(authorizationPayload);
}

/**
 * Convenience function to create an authorization request with proper types
 * 
 * @param address - The contract address to delegate to
 * @param nonce - Optional nonce for replay protection
 * @param chainId - Optional chain ID
 * @returns An AuthorizationRequest object
 */
export function createAuthorizationRequest(
    address: string,
    nonce?: bigint,
    chainId?: bigint
): AuthorizationRequest {
    return {
        address,
        nonce,
        chainId,
    };
}

/**
 * Validates an authorization request structure
 * 
 * @param auth - The authorization request to validate
 * @returns true if valid, throws error if invalid
 */
export function validateAuthorizationRequest(auth: AuthorizationRequest): boolean {
    if (!auth || typeof auth !== "object") {
        throw new Error("Authorization request must be an object");
    }

    if (!auth.address || !isValidAddress(auth.address)) {
        throw new Error(`Invalid address in authorization request: ${auth.address}`);
    }

    if (auth.nonce !== undefined && auth.nonce !== null) {
        if (typeof auth.nonce !== "bigint" || auth.nonce < 0n) {
            throw new Error(`Invalid nonce in authorization request: ${auth.nonce}`);
        }
    }

    if (auth.chainId !== undefined && auth.chainId !== null) {
        if (typeof auth.chainId !== "bigint" || auth.chainId < 0n) {
            throw new Error(`Invalid chainId in authorization request: ${auth.chainId}`);
        }
    }

    return true;
}
