import { it, expect, describe } from "@jest/globals"
import { TransactionType0, TransactionType2 } from "../../src/index"

describe("Transaction", () => {
    describe("Transaction Type 0", () => {
        describe("Input Validation", () => {
            it("should throw an error when invalid 'to' address is provided", () => {
                // TODO: Add more cases for invalid 'to' addresses...
                const act = () => new TransactionType0(makeTxType0Args({ to: "0xInvalidAddress" }))
                
                // Assert
                expect(act).toThrow("Invalid \"to\": 0xInvalidAddress")
            })

            it("should throw an error when invalid 'nonce' is provided", () => {
                const nonceNotProvidedAct = () => new TransactionType0(makeTxType0Args({ nonce: undefined }))
                const invalidNonceTypeAct = () => new TransactionType0(makeTxType0Args({ nonce: "invalid" }))
                const negativeNonceAct = () => new TransactionType0(makeTxType0Args({ nonce: -1n }))

                // Assert
                expect(nonceNotProvidedAct).toThrow("Invalid \"nonce\": undefined")
                expect(invalidNonceTypeAct).toThrow("Invalid \"nonce\": invalid")
                expect(negativeNonceAct).toThrow("Invalid \"nonce\": -1")
            })

            it("should throw an error when invalid 'value' is provided", () => {
                const valueNotProvidedAct = () => new TransactionType0(makeTxType0Args({ value: undefined }))
                const invalidValueTypeAct = () => new TransactionType0(makeTxType0Args({ value: "invalid" }))
                const negativeValueAct = () => new TransactionType0(makeTxType0Args({ value: -1n }))

                // Assert
                expect(valueNotProvidedAct).not.toThrow() // TODO: Check whether we can assert the default value
                expect(invalidValueTypeAct).toThrow("Invalid \"value\": invalid")
                expect(negativeValueAct).toThrow("Invalid \"value\": -1")
            })

            it("should throw an error when invalid 'data' is provided", () => {
                const dataNotProvidedAct = () => new TransactionType0(makeTxType0Args({ data: undefined }))
                const invalidDataTypeAct = () => new TransactionType0(makeTxType0Args({ data: { any: "invalid type" } }))
                const negativeDataAct = () => new TransactionType0(makeTxType0Args({ data: -1n }))

                // Assert
                expect(dataNotProvidedAct).not.toThrow() // TODO: Check whether we can assert the default value
                expect(invalidDataTypeAct).toThrow("Invalid \"data\": [object Object]") // TODO: Improve error message
                expect(negativeDataAct).toThrow("Invalid \"data\": -1")
            })

            it("should throw an error when invalid 'gasLimit' is provided", () => {
                const gasLimitNotProvidedAct = () => new TransactionType0(makeTxType0Args({ gasLimit: undefined }))
                const invalidGasLimitTypeAct = () => new TransactionType0(makeTxType0Args({ gasLimit: "invalid" }))
                const lessThan21000GasLimitAct = () => new TransactionType0(makeTxType0Args({ gasLimit: 20999n }))

                // Assert
                expect(gasLimitNotProvidedAct).toThrow("Invalid \"gasLimit\": undefined")
                expect(invalidGasLimitTypeAct).toThrow("Invalid \"gasLimit\": invalid")
                expect(lessThan21000GasLimitAct).toThrow("Invalid \"gasLimit\": 20999")
            })

            it("should throw an error when invalid 'gasPrice' is provided", () => {
                const gasPriceNotProvidedAct = () => new TransactionType0(makeTxType0Args({ gasPrice: undefined }))
                const invalidGasPriceTypeAct = () => new TransactionType0(makeTxType0Args({ gasPrice: "invalid" }))
                const negativeGasPriceAct = () => new TransactionType0(makeTxType0Args({ gasPrice: -1n }))

                // Assert
                expect(gasPriceNotProvidedAct).toThrow("Invalid \"gasPrice\": undefined")
                expect(invalidGasPriceTypeAct).toThrow("Invalid \"gasPrice\": invalid")
                expect(negativeGasPriceAct).toThrow("Invalid \"gasPrice\": -1")
            })

            // NOTE: Chain ID is optional for legacy + pre-EIP-155 transactions
            it("should throw an error when invalid 'chainId' is provided", () => {
                const chainIdNotProvidedAct = () => new TransactionType0(makeTxType0Args({ chainId: undefined }))
                const invalidChainIdTypeAct = () => new TransactionType0(makeTxType0Args({ chainId: "invalid" }))
                const negativeChainIdAct = () => new TransactionType0(makeTxType0Args({ chainId: -1n }))

                // Assert
                expect(chainIdNotProvidedAct).not.toThrow() // TODO: Check whether we can assert the default value
                expect(invalidChainIdTypeAct).toThrow("Invalid \"chainId\": invalid")
                expect(negativeChainIdAct).toThrow("Invalid \"chainId\": -1")
            })

            // TODO: Add Signature validation tests
        })

        describe("RLP Encoding", () => {
            // https://eips.ethereum.org/EIPS/eip-155
            // NOTE: Check EIP-155 for RLP encoding of legacy transactions
            // pre-155 (nonce, gasprice, startgas/gasLimit, to, value, data)
            // post-155 (nonce, gasprice, startgas/gasLimit, to, value, data, chainId, 0, 0)
            it("should provide correct RLP fields for encoding unsigned pre-EIP-155", () => {
                // Arrange
                const legacyTxArgs = makeTxType0Args({ eip155: false })
                const expectedFields = [
                    legacyTxArgs.nonce,
                    legacyTxArgs.gasPrice,
                    legacyTxArgs.gasLimit,
                    legacyTxArgs.to,
                    legacyTxArgs.value,
                    legacyTxArgs.data ?? "0x",
                ]

                // Act
                const legacyTx = new TransactionType0(legacyTxArgs)

                // Assert
                expect(legacyTx.getUnsignedRLPFields()).toEqual(expectedFields)
            })

            it("should provide correct RLP fields for encoding unsigned post-EIP-155", () => {
                // Arrange
                const legacyTxArgs = makeTxType0Args({ eip155: true })
                const expectedFields = [
                    legacyTxArgs.nonce,
                    legacyTxArgs.gasPrice,
                    legacyTxArgs.gasLimit,
                    legacyTxArgs.to,
                    legacyTxArgs.value,
                    legacyTxArgs.data ?? "0x",
                    legacyTxArgs.chainId,
                    "0x",
                    "0x",
                ]

                // Act
                const legacyTx = new TransactionType0(legacyTxArgs)

                // Assert
                expect(legacyTx.getUnsignedRLPFields()).toEqual(expectedFields)
            })

            // TODO: Add tests for RLP encoding of signed transactions
        })
    })

    describe("Transaction Type 2 (EIP-1559)", () => {
        describe("Input Validation", () => {
            it("should throw an error when invalid 'to' address is provided", () => {
                const act = () => new TransactionType2(makeTxType2Args({ to: "0xInvalidAddress" }))

                expect(act).toThrow("Invalid \"to\": 0xInvalidAddress")
            })

            it("should throw an error when invalid 'nonce' is provided", () => {
                const nonceNotProvidedAct = () => new TransactionType2(makeTxType2Args({ nonce: undefined }))
                const invalidNonceTypeAct = () => new TransactionType2(makeTxType2Args({ nonce: "invalid" }))
                const negativeNonceAct = () => new TransactionType2(makeTxType2Args({ nonce: -1n }))

                expect(nonceNotProvidedAct).toThrow("Invalid \"nonce\": undefined")
                expect(invalidNonceTypeAct).toThrow("Invalid \"nonce\": invalid")
                expect(negativeNonceAct).toThrow("Invalid \"nonce\": -1")
            })

            it("should throw an error when invalid 'value' is provided", () => {
                const valueNotProvidedAct = () => new TransactionType2(makeTxType2Args({ value: undefined }))
                const invalidValueTypeAct = () => new TransactionType2(makeTxType2Args({ value: "invalid" }))
                const negativeValueAct = () => new TransactionType2(makeTxType2Args({ value: -1n }))

                expect(valueNotProvidedAct).not.toThrow()
                expect(invalidValueTypeAct).toThrow("Invalid \"value\": invalid")
                expect(negativeValueAct).toThrow("Invalid \"value\": -1")
            })

            it("should throw an error when invalid 'maxFeePerGas' is provided", () => {
                const maxFeePerGasNotProvidedAct = () => new TransactionType2(makeTxType2Args({ maxFeePerGas: undefined }))
                const invalidMaxFeePerGasTypeAct = () => new TransactionType2(makeTxType2Args({ maxFeePerGas: "invalid" }))
                const negativeMaxFeePerGasAct = () => new TransactionType2(makeTxType2Args({ maxFeePerGas: -1n }))

                expect(maxFeePerGasNotProvidedAct).toThrow("Invalid \"maxFeePerGas\": undefined")
                expect(invalidMaxFeePerGasTypeAct).toThrow("Invalid \"maxFeePerGas\": invalid")
                expect(negativeMaxFeePerGasAct).toThrow("Invalid \"maxFeePerGas\": -1")
            })

            it("should throw an error when invalid 'maxPriorityFeePerGas' is provided", () => {
                const maxPriorityFeePerGasNotProvidedAct = () => new TransactionType2(makeTxType2Args({ maxPriorityFeePerGas: undefined }))
                const invalidMaxPriorityFeePerGasTypeAct = () => new TransactionType2(makeTxType2Args({ maxPriorityFeePerGas: "invalid" }))
                const negativeMaxPriorityFeePerGasAct = () => new TransactionType2(makeTxType2Args({ maxPriorityFeePerGas: -1n }))

                expect(maxPriorityFeePerGasNotProvidedAct).toThrow("Invalid \"maxPriorityFeePerGas\": undefined")
                expect(invalidMaxPriorityFeePerGasTypeAct).toThrow("Invalid \"maxPriorityFeePerGas\": invalid")
                expect(negativeMaxPriorityFeePerGasAct).toThrow("Invalid \"maxPriorityFeePerGas\": -1")
            })

            it("should throw an error when invalid 'gasLimit' is provided", () => {
                const gasLimitNotProvidedAct = () => new TransactionType2(makeTxType2Args({ gasLimit: undefined }))
                const invalidGasLimitTypeAct = () => new TransactionType2(makeTxType2Args({ gasLimit: "invalid" }))
                const lessThan21000GasLimitAct = () => new TransactionType2(makeTxType2Args({ gasLimit: 20999n }))

                expect(gasLimitNotProvidedAct).toThrow("Invalid \"gasLimit\": undefined")
                expect(invalidGasLimitTypeAct).toThrow("Invalid \"gasLimit\": invalid")
                expect(lessThan21000GasLimitAct).toThrow("Invalid \"gasLimit\": 20999")
            })
        })

        describe("Property Accessors", () => {
            it("should provide access to transaction properties", () => {
                const txArgs = makeTxType2Args()
                const tx = new TransactionType2(txArgs)

                expect(tx.to).toBe(txArgs.to)
                expect(tx.value).toBe(txArgs.value)
                expect(tx.data).toBe(txArgs.data ?? "0x")
                expect(tx.nonce).toBe(txArgs.nonce)
                expect(tx.gasLimit).toBe(txArgs.gasLimit)
                expect(tx.maxFeePerGas).toBe(txArgs.maxFeePerGas)
                expect(tx.maxPriorityFeePerGas).toBe(txArgs.maxPriorityFeePerGas)
                expect(tx.chainId).toBe(txArgs.chainId)
            })
        })

        describe("RLP Encoding", () => {
            it("should provide correct RLP fields for encoding unsigned EIP-1559 transaction", () => {
                const txArgs = makeTxType2Args()
                const expectedFields = [
                    txArgs.chainId,
                    txArgs.nonce,
                    txArgs.maxPriorityFeePerGas,
                    txArgs.maxFeePerGas,
                    txArgs.gasLimit,
                    txArgs.to,
                    txArgs.value,
                    txArgs.data ?? "0x",
                    [] // accessList
                ]

                const tx = new TransactionType2(txArgs)

                expect(tx.getUnsignedRLPFields()).toEqual(expectedFields)
            })

            it("should provide correct RLP fields for encoding signed EIP-1559 transaction", () => {
                const txArgs = makeTxType2Args()
                const signature = {
                    r: "0x123",
                    s: "0x456",
                    v: 0,
                    recoveryParam: 0
                }
                const expectedFields = [
                    txArgs.chainId,
                    txArgs.nonce,
                    txArgs.maxPriorityFeePerGas,
                    txArgs.maxFeePerGas,
                    txArgs.gasLimit,
                    txArgs.to,
                    txArgs.value,
                    txArgs.data ?? "0x",
                    [], // accessList
                    signature.v, // yParity
                    signature.r,
                    signature.s
                ]

                const tx = new TransactionType2({ ...txArgs, signature })

                expect(tx.getSignedRLPFields()).toEqual(expectedFields)
            })
        })

        describe("Transaction Object Conversion", () => {
            it("should convert to unsigned transaction object", () => {
                const txArgs = makeTxType2Args()
                const tx = new TransactionType2(txArgs)
                const txObject = tx.toUnsignedTxObject()

                expect(txObject).toEqual({
                    to: txArgs.to,
                    value: txArgs.value,
                    data: txArgs.data ?? "0x",
                    nonce: txArgs.nonce,
                    gasLimit: txArgs.gasLimit,
                    maxFeePerGas: txArgs.maxFeePerGas,
                    maxPriorityFeePerGas: txArgs.maxPriorityFeePerGas,
                    chainId: txArgs.chainId,
                })
            })

            it("should convert to signed transaction object", () => {
                const txArgs = makeTxType2Args()
                const signature = {
                    r: "0x123",
                    s: "0x456",
                    v: 0,
                    recoveryParam: 0
                }
                const tx = new TransactionType2({ ...txArgs, signature })
                const txObject = tx.toSignedTxObject()

                expect(txObject).toEqual({
                    to: txArgs.to,
                    value: txArgs.value,
                    data: txArgs.data ?? "0x",
                    nonce: txArgs.nonce,
                    gasLimit: txArgs.gasLimit,
                    maxFeePerGas: txArgs.maxFeePerGas,
                    maxPriorityFeePerGas: txArgs.maxPriorityFeePerGas,
                    chainId: txArgs.chainId,
                    signature: {
                        r: signature.r,
                        s: signature.s,
                        v: signature.v, // yParity for EIP-1559 transactions
                    }
                })
            })
        })
    })
})

function makeTxType0Args(overrides: any = {}): any {
    return {
        chainId: 11155111n, // Sepolia Testnet Chain ID
        to: "0x6c4837d1bbD09A660B83E5Fa49dD070db9f5733F", // Replace with your address
        value: 1000000000000000n, // 0.001 ETH in wei
        // data: "0x",
        nonce: 0n,
        gasLimit: 21000n,
        gasPrice: 1000000000n, // 1 Gwei
        ...overrides,
    }
}

function makeTxType2Args(overrides: any = {}): any {
    return {
        chainId: 11155111n, // Sepolia Testnet Chain ID
        to: "0x6c4837d1bbD09A660B83E5Fa49dD070db9f5733F", // Replace with your address
        value: 1000000000000000n, // 0.001 ETH in wei
        data: "0x",
        nonce: 0n,
        gasLimit: 21000n,
        maxFeePerGas: 2000000000n, // 2 Gwei
        maxPriorityFeePerGas: 1000000000n, // 1 Gwei
        ...overrides,
    }
}
