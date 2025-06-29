/**
 * Manual RLP encoding utility for legacy Ethereum transactions.
 * Supports EIP-155 replay protection and contract deployment (to = null).
 */
import { toBeHex, getBytes } from "ethers";


/**
 * RLP encode an array of fields (already ordered for the transaction type).
 */
export function RLPencodeFields(fields: any[]) {
    const toHex = (val: any) => {
        if (val === null || val === undefined) return "0x";
        if (typeof val === "bigint" || typeof val === "number") {
            if (val === 0n || val === 0) return "0x";
            return toBeHex(val);
        }
        if (typeof val === "string") return val;
        throw new Error(`Unsupported value type for RLP encoding: ${typeof val}`);
    };
    const encodedFields = fields.map(toHex).map(rlpEncode);
    return rlpEncodeList(encodedFields);
}

export function toHexString(bytes: any) {
    return "0x" + [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function rlpEncode(input: any) {
    if (input === null || input === undefined) {
        // RLP empty string
        return Uint8Array.from([0x80]);
    }
    if (typeof input === "string") {
        if (input.startsWith("0x")) {
            input = input.slice(2);
        }
        if (input.length % 2 === 1) {
            input = "0" + input; // pad to even length
        }
        input = "0x" + input;
    }

    const bytes = getBytes(input); // ethers ensures this works with hex strings
    if (bytes[0] === undefined){
            return Uint8Array.from([...encodeLength(bytes.length, 0x80), ...bytes]);
    } // review it later
    
    if (bytes.length === 1 && bytes[0] < 0x80) return bytes;
    return Uint8Array.from([...encodeLength(bytes.length, 0x80), ...bytes]);
}

export function rlpEncodeList(encodedItems: any[]) {
    const payload = Uint8Array.from(encodedItems.flatMap(i => [...i]));
    return Uint8Array.from([...encodeLength(payload.length, 0xc0), ...payload]);
}

function encodeLength(len: number, offset: number) {
    if (len < 56) return [offset + len];
    const hexLen = len.toString(16);
    const l = hexLen.length % 2 === 0 ? hexLen : "0" + hexLen;
    const buf = Uint8Array.from(Buffer.from(l, "hex"));
    return [offset + 55 + buf.length, ...buf];
}
