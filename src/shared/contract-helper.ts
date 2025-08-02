import { keccak256, getBytes } from "./ecc-helper";
import { rlpEncode, rlpEncodeList } from "./rlp-helper";

/**
 * 
 * @param {string} senderAddress - The deploying EOA address (0x-prefixed, lowercase recommended).
 * @param {bigint|number|string} nonce - The nonce of the sender when creating the contract.
 * @returns {string} The resulting contract address (0x-prefixed, lowercase hex).
 */
export function computeContractAddress(senderAddress: string, nonce: any): string {
    if (typeof senderAddress !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(senderAddress)) {
        throw new Error("Invalid sender address — must be 0x-prefixed 20-byte hex string");
    }

    // Convert nonce to number or bigint
    let nonceNum;
    if (typeof nonce === "string") {
        if (nonce.startsWith("0x")) {
            nonceNum = BigInt(nonce);
        } else {
            nonceNum = BigInt(nonce);
        }
    } else {
        nonceNum = BigInt(nonce);
    }

    // RLP encode [address, nonce]
    const addressBytes = getBytes(senderAddress);
    const encoded = rlpEncodeList([
        rlpEncode(addressBytes),
        rlpEncode(nonceNum === 0n ? null : nonceNum)
    ]);

    // keccak256 and take last 20 bytes
    const hash = keccak256(encoded);
    return "0x" + hash.slice(-40);
}

/**
 * Encodes a uint256 value as 32-byte left-padded hex (no 0x prefix).
 */
function encodeUint256(value: any): string {
    let hex = BigInt(value).toString(16);
    if (hex.length > 64) throw new Error("uint256 overflow");
    while (hex.length < 64) hex = "0" + hex;
    return hex;
}

/**
 * Encodes an address as 32-byte left-padded hex (no 0x prefix).
 */
function encodeAddress(addr: string): string {
    const hex = addr.toLowerCase().replace(/^0x/, "");
    if (hex.length !== 40) throw new Error("Invalid address");
    return "0".repeat(24) + hex;
}

/**
 * Encodes a bool as 32-byte left-padded hex (no 0x prefix).
 */
function encodeBool(val: boolean): string {
    return "0".repeat(63) + (val ? "1" : "0");
}

/**
 * Minimal ABI encoder for uint256, address, bool, bytes, and tuple arrays.
 */
function abiEncode(type: string, value: any): string {
    if (type === "uint256") return encodeUint256(value);
    if (type === "address") return encodeAddress(value);
    if (type === "bool") return encodeBool(value);
    if (type === "bytes") {
        // For simplicity, we'll treat bytes as a simple hex string
        // In production, proper ABI encoding would include length + data
        const hex = value.startsWith("0x") ? value.slice(2) : value;
        // Pad to 32-byte boundary
        const paddedHex = hex.padEnd(Math.ceil(hex.length / 64) * 64, "0");
        return paddedHex;
    }
    if (type === "(address,uint256,bytes)[]") {
        // For our specific use case, we'll use the already encoded calls
        // In production, this would need proper dynamic array encoding with offsets
        const hex = value.startsWith("0x") ? value.slice(2) : value;
        return hex;
    }
    throw new Error(`Unsupported type: ${type}`);
}

/**
 * Extracts parameter types from a method signature string, handling complex types.
 * E.g., "setCounter(uint256,address,bool)" => ["uint256","address","bool"]
 * E.g., "execute((address,uint256,bytes)[],bytes)" => ["(address,uint256,bytes)[]","bytes"]
 */
function extractTypes(method: string): string[] {
    // Find the method parameters section by finding the last opening parenthesis
    // and matching closing parenthesis
    const methodNameEnd = method.indexOf("(");
    if (methodNameEnd === -1) return [];
    
    const paramStart = methodNameEnd + 1;
    let paramEnd = -1;
    let depth = 0;
    
    // Find the matching closing parenthesis for the method signature
    for (let i = methodNameEnd; i < method.length; i++) {
        if (method[i] === "(") {
            depth++;
        } else if (method[i] === ")") {
            depth--;
            if (depth === 0) {
                paramEnd = i;
                break;
            }
        }
    }
    
    if (paramEnd === -1) return [];
    
    const paramString = method.substring(paramStart, paramEnd);
    if (!paramString.trim()) return [];
    
    // Handle complex types by parsing parentheses and brackets
    const types: string[] = [];
    let current = "";
    depth = 0;
    
    for (let i = 0; i < paramString.length; i++) {
        const char = paramString[i];
        
        if (char === "(" || char === "[") {
            depth++;
            current += char;
        } else if (char === ")" || char === "]") {
            depth--;
            current += char;
        } else if (char === "," && depth === 0) {
            // Only split on commas at depth 0 (not inside parentheses/brackets)
            types.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    
    // Don't forget the last type
    if (current.trim()) {
        types.push(current.trim());
    }
    
    return types;
}

/**
 * Builds the call data for a smart contract method.
 * Supports uint256, address, bool.
 */
export function buildCallData(method: string, params: unknown[] = []): string {
    if (typeof method !== "string") throw new Error("Method must be a string");
    if (!Array.isArray(params)) throw new Error("Params must be an array");

    // Function selector: first 4 bytes of keccak256 hash of the signature
    const hash = keccak256(Buffer.from(method)); // should return hex string
    const selector = hash.replace(/^0x/, "").slice(0, 8);

    // Extract types and encode params
    const types = extractTypes(method);
    if (types.length !== params.length) throw new Error("Parameter count mismatch");

    const encodedParams = params.map((p, i) => {
        const type = types[i];
        if (!type) throw new Error(`No type found for parameter ${i}`);
        return abiEncode(type, p);
    }).join("");

    return "0x" + selector + encodedParams;
}

/**
 *  Returns the bytecode of a simple Counter smart contract.
 *  The contract has a public state variable `number` and two methods:
 *  - `setNumber(uint256 newNumber)`: Sets the value of `number`.
 *  - `increment()`: Increments the value of `number` by 1.
 *  - `number`: A public getter for the `number` variable.
 *  @returns {string} The bytecode of the Counter smart contract.
 *  @throws {Error} If the bytecode cannot be retrieved.
 */
export function getCounterSmartContractBytecode(): string {
    /*
    pragma solidity ^0.8.13;

    contract Counter {
        uint256 public number;

        function setNumber(uint256 newNumber) public {
            number = newNumber;
        }

        function increment() public {
            number++;
        }
    }*/

    return "0x6080604052348015600e575f5ffd5b506101e18061001c5f395ff3fe608060405234801561000f575f5ffd5b506004361061003f575f3560e01c80633fb5c1cb146100435780638381f58a1461005f578063d09de08a1461007d575b5f5ffd5b61005d600480360381019061005891906100e4565b610087565b005b610067610090565b604051610074919061011e565b60405180910390f35b610085610095565b005b805f8190555050565b5f5481565b5f5f8154809291906100a690610164565b9190505550565b5f5ffd5b5f819050919050565b6100c3816100b1565b81146100cd575f5ffd5b50565b5f813590506100de816100ba565b92915050565b5f602082840312156100f9576100f86100ad565b5b5f610106848285016100d0565b91505092915050565b610118816100b1565b82525050565b5f6020820190506101315f83018461010f565b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61016e826100b1565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82036101a05761019f610137565b5b60018201905091905056fea264697066735822122037ad68ebe8f3853c8fa6cfe7296c8c5c7240233bdc0835097ec7a021cd787c0964736f6c634300081d0033";
}
