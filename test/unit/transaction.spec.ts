import { it, expect, describe } from "@jest/globals"
import { TransactionType0 } from "../../src/index"

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
