import { describe, it, expect } from "@jest/globals";
import { setupWallet } from "../../samples/_setup";
import { getBytes } from "../../src/shared/ecc-helper";

describe("Wallet Message Signing", () => {
    describe("signMessage", () => {
        it("should sign a string message correctly", async () => {
            const wallet = setupWallet();
            const message = "Hello, Ethereum!";
            
            const signature = await wallet.signMessage(message);
            
            // Verify signature format
            expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/); // 0x + 64 (r) + 64 (s) + 2 (v) = 130 chars
            expect(signature).toBeDefined();
            expect(typeof signature).toBe("string");
        });

        it("should sign bytes message correctly", async () => {
            const wallet = setupWallet();
            const message = "Hello, Ethereum!";
            const messageBytes = new TextEncoder().encode(message); // Use TextEncoder instead of getBytes for strings
            
            const signature = await wallet.signMessage(messageBytes);
            
            // Verify signature format
            expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
            expect(signature).toBeDefined();
            expect(typeof signature).toBe("string");
        });

        it("should produce the same signature for string and equivalent bytes", async () => {
            const wallet = setupWallet();
            const message = "Hello, Ethereum!";
            const messageBytes = new TextEncoder().encode(message);
            
            const signatureFromString = await wallet.signMessage(message);
            const signatureFromBytes = await wallet.signMessage(messageBytes);
            
            expect(signatureFromString).toBe(signatureFromBytes);
        });

        it("should produce different signatures for different messages", async () => {
            const wallet = setupWallet();
            
            const signature1 = await wallet.signMessage("Hello, Ethereum!");
            const signature2 = await wallet.signMessage("Hello, World!");
            
            expect(signature1).not.toBe(signature2);
        });

        it("should produce different signatures for different wallets", async () => {
            const wallet1 = setupWallet();
            const wallet2 = setupWallet();
            const message = "Hello, Ethereum!";
            
            const signature1 = await wallet1.signMessage(message);
            const signature2 = await wallet2.signMessage(message);
            
            expect(signature1).not.toBe(signature2);
        });

        it("should handle empty message", async () => {
            const wallet = setupWallet();
            const message = "";
            
            const signature = await wallet.signMessage(message);
            
            expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
            expect(signature).toBeDefined();
        });

        it("should handle hex digest input (like keccak256 output)", async () => {
            const wallet = setupWallet();
            const hexDigest = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
            const digestBytes = getBytes(hexDigest);
            
            const signature = await wallet.signMessage(digestBytes);
            
            expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
            expect(signature).toBeDefined();
        });
    });
});
