import { describe, it, expect } from "@jest/globals";

// Test our improved extractTypes function
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

describe("buildCallData complex types", () => {
    it("should extract complex types correctly", () => {
        const method = "execute((address,uint256,bytes)[],bytes)";
        
        // Let's debug what extractTypes is doing
        const methodNameEnd = method.indexOf("(");
        const paramStart = methodNameEnd + 1;
        console.log("Method name end:", methodNameEnd, "Param start:", paramStart);
        
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
        
        console.log("Param end:", paramEnd);
        const paramString = method.substring(paramStart, paramEnd);
        console.log("Param string:", paramString);
        
        const types = extractTypes(method);
        
        console.log("Method:", method);
        console.log("Extracted types:", types);
        console.log("Types length:", types.length);
        
        expect(types).toHaveLength(2);
        expect(types[0]).toBe("(address,uint256,bytes)[]");
        expect(types[1]).toBe("bytes");
    });

    it("should handle simple types", () => {
        const method = "transfer(address,uint256)";
        const types = extractTypes(method);
        
        expect(types).toHaveLength(2);
        expect(types[0]).toBe("address");
        expect(types[1]).toBe("uint256");
    });
});
