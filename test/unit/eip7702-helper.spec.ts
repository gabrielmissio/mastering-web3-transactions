import { describe, it, expect } from "@jest/globals";
import { 
    hash7702Authorization,
    createAuthorizationRequest,
    validateAuthorizationRequest 
} from "../../src/shared/eip7702-helper";

describe("EIP-7702 Authorization Helper", () => {
    const validAddress = "0x1234567890123456789012345678901234567890";
    const validChainId = 1n;
    const validNonce = 42n;

    describe("hash7702Authorization", () => {
        it("should create a valid hash for authorization with all fields", () => {
            const auth = createAuthorizationRequest(validAddress, validNonce, validChainId);
            const hash = hash7702Authorization(auth);
            
            expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
            expect(hash).toBeDefined();
            expect(typeof hash).toBe("string");
        });

        it("should create a valid hash for authorization with minimal fields", () => {
            const auth = createAuthorizationRequest(validAddress);
            const hash = hash7702Authorization(auth);
            
            expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
            expect(hash).toBeDefined();
            expect(typeof hash).toBe("string");
        });

        it("should create different hashes for different addresses", () => {
            const auth1 = createAuthorizationRequest(validAddress, validNonce, validChainId);
            const auth2 = createAuthorizationRequest("0x9876543210987654321098765432109876543210", validNonce, validChainId);
            
            const hash1 = hash7702Authorization(auth1);
            const hash2 = hash7702Authorization(auth2);
            
            expect(hash1).not.toBe(hash2);
        });

        it("should create different hashes for different nonces", () => {
            const auth1 = createAuthorizationRequest(validAddress, 1n, validChainId);
            const auth2 = createAuthorizationRequest(validAddress, 2n, validChainId);
            
            const hash1 = hash7702Authorization(auth1);
            const hash2 = hash7702Authorization(auth2);
            
            expect(hash1).not.toBe(hash2);
        });

        it("should create different hashes for different chain IDs", () => {
            const auth1 = createAuthorizationRequest(validAddress, validNonce, 1n);
            const auth2 = createAuthorizationRequest(validAddress, validNonce, 42n);
            
            const hash1 = hash7702Authorization(auth1);
            const hash2 = hash7702Authorization(auth2);
            
            expect(hash1).not.toBe(hash2);
        });

        it("should throw error for invalid address", () => {
            const auth = createAuthorizationRequest("invalid-address");
            
            expect(() => hash7702Authorization(auth)).toThrow("Invalid address for hash7702Authorization");
        });
    });

    describe("createAuthorizationRequest", () => {
        it("should create a valid authorization request with all parameters", () => {
            const auth = createAuthorizationRequest(validAddress, validNonce, validChainId);
            
            expect(auth.address).toBe(validAddress);
            expect(auth.nonce).toBe(validNonce);
            expect(auth.chainId).toBe(validChainId);
        });

        it("should create a valid authorization request with only address", () => {
            const auth = createAuthorizationRequest(validAddress);
            
            expect(auth.address).toBe(validAddress);
            expect(auth.nonce).toBeUndefined();
            expect(auth.chainId).toBeUndefined();
        });
    });

    describe("validateAuthorizationRequest", () => {
        it("should validate a correct authorization request", () => {
            const auth = createAuthorizationRequest(validAddress, validNonce, validChainId);
            
            expect(validateAuthorizationRequest(auth)).toBe(true);
        });

        it("should validate authorization request with only address", () => {
            const auth = createAuthorizationRequest(validAddress);
            
            expect(validateAuthorizationRequest(auth)).toBe(true);
        });

        it("should throw error for invalid address", () => {
            const auth = { address: "invalid", nonce: validNonce, chainId: validChainId };
            
            expect(() => validateAuthorizationRequest(auth)).toThrow("Invalid address in authorization request");
        });

        it("should throw error for invalid nonce", () => {
            const auth = { address: validAddress, nonce: -1n, chainId: validChainId };
            
            expect(() => validateAuthorizationRequest(auth)).toThrow("Invalid nonce in authorization request");
        });

        it("should throw error for invalid chainId", () => {
            const auth = { address: validAddress, nonce: validNonce, chainId: -1n };
            
            expect(() => validateAuthorizationRequest(auth)).toThrow("Invalid chainId in authorization request");
        });

        it("should throw error for non-object input", () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => validateAuthorizationRequest(null as any)).toThrow("Authorization request must be an object");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(() => validateAuthorizationRequest("invalid" as any)).toThrow("Authorization request must be an object");
        });
    });
});
