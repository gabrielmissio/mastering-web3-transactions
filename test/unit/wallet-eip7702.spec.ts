import { describe, it, expect } from "@jest/globals";
import { setupWallet } from "../../samples/_setup";

describe("Wallet EIP-7702 Authorization", () => {
    const validContractAddress = "0x1234567890123456789012345678901234567890";

    describe("sign7702Authorization", () => {
        it("should create and sign a valid EIP-7702 authorization", async () => {
            const wallet = setupWallet();
            
            const authorization = await wallet.sign7702Authorization(
                validContractAddress,
                0n,  // nonce
                1n   // chainId
            );

            // Verify the authorization structure
            expect(authorization).toBeDefined();
            expect(authorization.address).toBe(validContractAddress);
            expect(authorization.nonce).toBe(0n);
            expect(authorization.chainId).toBe(1n);
            expect(authorization.signature).toBeDefined();
            expect(authorization.signature.r).toBeDefined();
            expect(authorization.signature.s).toBeDefined();
            expect(authorization.signature.v).toBeDefined();
            
            // Verify signature components are strings (for r and s) and number (for v)
            expect(typeof authorization.signature.r).toBe("string");
            expect(typeof authorization.signature.s).toBe("string");
            expect(typeof authorization.signature.v).toBe("number");
            
            // Verify r and s start with 0x
            expect(authorization.signature.r).toMatch(/^0x[a-fA-F0-9]+$/);
            expect(authorization.signature.s).toMatch(/^0x[a-fA-F0-9]+$/);
        }, 10000); // Increase timeout for network calls

        it("should create authorization with auto-fetched nonce and chainId", async () => {
            const wallet = setupWallet();
            
            const authorization = await wallet.sign7702Authorization(validContractAddress);

            // Verify the authorization structure
            expect(authorization).toBeDefined();
            expect(authorization.address).toBe(validContractAddress);
            expect(typeof authorization.nonce).toBe("bigint");
            expect(typeof authorization.chainId).toBe("bigint");
            expect(authorization.signature).toBeDefined();
        }, 10000);

        it("should create different signatures for different nonces", async () => {
            const wallet = setupWallet();
            
            const auth1 = await wallet.sign7702Authorization(validContractAddress, 0n, 1n);
            const auth2 = await wallet.sign7702Authorization(validContractAddress, 1n, 1n);

            // Same address and chainId, different nonce should produce different signatures
            expect(auth1.signature.r).not.toBe(auth2.signature.r);
            expect(auth1.signature.s).not.toBe(auth2.signature.s);
        }, 10000);

        it("should create different signatures for different chain IDs", async () => {
            const wallet = setupWallet();
            
            const auth1 = await wallet.sign7702Authorization(validContractAddress, 0n, 1n);
            const auth2 = await wallet.sign7702Authorization(validContractAddress, 0n, 42n);

            // Same address and nonce, different chainId should produce different signatures
            expect(auth1.signature.r).not.toBe(auth2.signature.r);
            expect(auth1.signature.s).not.toBe(auth2.signature.s);
        }, 10000);

        it("should throw error for invalid contract address", async () => {
            const wallet = setupWallet();
            
            await expect(
                wallet.sign7702Authorization("invalid-address", 0n, 1n)
            ).rejects.toThrow("Invalid address for hash7702Authorization");
        });
    });
});
