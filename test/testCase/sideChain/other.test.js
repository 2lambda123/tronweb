const {DEPOSIT_FEE, WITHDRAW_FEE, FEE_LIMIT, ADDRESS_BASE58, SIDE_CHAIN, PRIVATE_KEY} = require('../util/config');
const trc20Contract = require('../util/contracts').trc20Contract;
const tronWebBuilder = require('../util/tronWebBuilder');
const assertThrow = require('../util/assertThrow');
const publicMethod = require('../util/PublicMethod');
const broadcaster = require('../util/broadcaster');
const wait = require('../util/wait');
const jwt = require('jsonwebtoken');
const {
    TEST_TRON_GRID_API,
    TEST_TRON_HEADER_API_KEY,
    TEST_TRON_HEADER_API_KEY2,
    TEST_TRON_HEADER_API_JWT_KEY,
    TEST_TRON_HEADER_JWT_ID,
    TEST_TRON_HEADER_JWT_PRIVATE_KEY
} = require('../util/config');
const chai = require('chai');
const assert = chai.assert;
const util = require('util');
var http = require('http');

describe('TronWeb Instance', function() {
    describe('#other', function() {
        describe('#setMain、SideGatewayAddress、ChainId', function () {
            const tronWeb = tronWebBuilder.createInstanceSide();
            it('setMainGatewayAddress normal', async function () {
                // before
                let mainGatewayAddressBefore = await tronWeb.sidechain.mainGatewayAddress;
                console.log('mainGatewayAddressBefore: ' + mainGatewayAddressBefore);
                assert.equal(SIDE_CHAIN.sideOptions.mainGatewayAddress, mainGatewayAddressBefore);

                // setMainGatewayAddress
                await tronWeb.sidechain.setMainGatewayAddress(ADDRESS_BASE58);
                let mainGatewayAddressAfter = await tronWeb.sidechain.mainGatewayAddress;
                console.log('mainGatewayAddressAfter: ' + mainGatewayAddressAfter);
                assert.equal(ADDRESS_BASE58, mainGatewayAddressAfter);
            });
            it('should throw if an invalid main gateway address', async function () {
                try {
                    await tronWeb.sidechain.setMainGatewayAddress("THph9K2M2nLvkianrMGswRhz5hjSA9fuH9")
                } catch (e) {
                    console.log("e.message:"+e.message)
                    assert.equal("Invalid main gateway address provided", e.message);
                }

            });
            it('setSideGatewayAddress normal', async function () {
                // before
                let sideGatewayAddressBefore = await tronWeb.sidechain.sideGatewayAddress;
                console.log('sideGatewayAddressBefore: ' + sideGatewayAddressBefore);
                assert.equal(SIDE_CHAIN.sideOptions.sideGatewayAddress, sideGatewayAddressBefore);

                // setSideGatewayAddress
                await tronWeb.sidechain.setSideGatewayAddress(ADDRESS_BASE58);
                let sideGatewayAddressAfter = await tronWeb.sidechain.sideGatewayAddress;
                console.log('sideGatewayAddressAfter: ' + sideGatewayAddressAfter);
                assert.equal(ADDRESS_BASE58, sideGatewayAddressAfter);
            });
            it('should throw if an invalid side gateway address', async function () {
                try {
                    await tronWeb.sidechain.setSideGatewayAddress("THph9K2M2nLvkianrMGswRhz5hjSA9fuH9")
                } catch (e) {
                    console.log("e.message:"+e.message)
                    assert.equal("Invalid side gateway address provided", e.message);
                }

            });
            it('setChainId normal', async function () {
                // before
                let sideChainIdBefore = await tronWeb.sidechain.chainId;
                console.log('sideChainIdBefore: ' + sideChainIdBefore);
                assert.equal(SIDE_CHAIN.sideOptions.sideChainId, sideChainIdBefore);

                // setChainId
                await tronWeb.sidechain.setChainId(ADDRESS_BASE58);
                let sideChainIdAfter = await tronWeb.sidechain.chainId;
                console.log('sideChainIdAfter: ' + sideChainIdAfter);
                assert.equal(ADDRESS_BASE58, sideChainIdAfter);
            });
            it('should throw if an invalid side gateway address', async function () {
                try {
                    await tronWeb.sidechain.setChainId("THph9K2M2nLvkianrMGswRhz5hjSA9fuH9")
                } catch (e) {
                    console.log("e.message:"+e.message)
                    assert.equal("Invalid side chainId provided", e.message);
                }

            });
            after(async function () {
                // setMainGatewayAddress
                await tronWeb.sidechain.setMainGatewayAddress(SIDE_CHAIN.sideOptions.mainGatewayAddress);
                let mainGatewayAddress = await tronWeb.sidechain.mainGatewayAddress;
                console.log('mainGatewayAddress: ' + mainGatewayAddress);
                assert.equal(SIDE_CHAIN.sideOptions.mainGatewayAddress, mainGatewayAddress);
            })
        });
        describe('#injectFund()', function () {
            it('injectFund', async function () {
                const tronWeb = tronWebBuilder.createInstanceSide();
                const txID = await tronWeb.sidechain.injectFund(1000000, FEE_LIMIT);
                assert.equal(txID.length, 64);
            });
        });
        /*describe('#Sign()', function () {
            it('sign with visible is true', async function () {
                const tronWeb = tronWebBuilder.createInstanceSide();

                /!*!// createSmartContract
                const options = {
                    abi: trc20Contract.abi,
                    bytecode: trc20Contract.bytecode,
                    parameters: [ADDRESS_BASE58],
                    feeLimit:FEE_LIMIT,
                };
                const createTransaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_BASE58);
                const createTx = await broadcaster.broadcaster(null, PRIVATE_KEY, createTransaction);
                assert.equal(createTx.transaction.txID.length, 64);
                let createInfo;
                while (true) {
                    createInfo = await tronWeb.trx.getTransactionInfo(createTx.transaction.txID);
                    if (Object.keys(createInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("createInfo:"+util.inspect(createInfo))
                        break;
                    }
                }
                const contractAddress = createInfo.contract_address;*!/

                // before trigger
                const accountBalanceBefore = await tronWeb.trx.getBalance(ADDRESS_BASE58);
                console.log('accountBalanceBefore: ' + accountBalanceBefore);

                const emptyAccount1 = await tronWeb.createAccount();
                await tronWeb.trx.sendTrx(emptyAccount1.address.hex,5000000000,{privateKey: PRIVATE_KEY})
                // triggerSmartContract
                const functionSelector = 'transfer(address,uint256)';
                const triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                    "TPAvbqNtjrDw1nmaVyQkfvteZdEnFte1sW", functionSelector, {visible: true},
                    [{type: 'address', value: emptyAccount1.address.base58},{type: 'uint256', value: 10}], ADDRESS_BASE58);
                console.log("triggerTransaction:"+util.inspect(triggerTransaction,true,null,true))
                tronWeb.sidechain.sign(transac2.transaction,PRIVATE_KEY,true,true,false).then(function (data) {
                    console.log(data.valueOf()["raw_data"]["contract"][0]);
                    console.log(data);
                });
                /!*const signedTransaction = await tronWeb.trx.sign(triggerTransaction,PRIVATE_KEY,true,false,false);
                console.log("signedTransaction:"+util.inspect(signedTransaction))
                const result = await tronWeb.trx.broadcast(signedTransaction)
                console.log("result:"+util.inspect(result))
                let createInfo = await tronWeb.trx.getTransactionInfo(result.transaction.txID);
                assert.equal(createInfo.receipt.result, "SUCCESS");*!/


                // let signedTransaction = transaction;
                // for (let i = 0; i < 2; i++) {
                //     signedTransaction = await tronWeb.sidechain.multiSign(signedTransaction, accounts.pks[i]);
                // }
                //
                // assert.equal(signedTransaction.signature.length, 2);
                //
                // // broadcast multi-sign transaction
                // const result = await tronWeb.sidechain.sidechain.trx.broadcast(signedTransaction);
                // assert.isTrue(result.result);
                // let createInfo = await tronWeb.trx.getTransactionInfo(result.transaction.txID);
                // console.log("createInfo:"+util.inspect(createInfo))
                // assert.equal(createInfo.receipt.result, "SUCCESS");
            });
        });*/
    });
});


describe("#testTronGrid", function () {
    describe("#testTronGridApiKey", function () {
        it("headers TEST_TRON_HEADER_API_KEY normal", async function () {
            // headers:TEST_TRON_HEADER_API_KEY
            const tronWeb = tronWebBuilder.createInstance({
                headers: { "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_KEY },
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );

            let account = await tronWeb.trx.getAccount();
            assert.equal(typeof account, "object");
            let tx = await tronWeb.event.getEventsByContractAddress(
                tronWeb.defaultAddress.base58
            );
            assert.equal(typeof tx, "object");
        });

        it("headers and eventHeaders TEST_TRON_HEADER_API_KEY normal", async function () {
            const tronWeb = tronWebBuilder.createInstance({
                fullHost: TEST_TRON_GRID_API,
                headers: { "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_KEY },
                eventHeaders: { "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_KEY2 },
            });

            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY2
            );

            const account = await tronWeb.trx.getAccount();
            assert.equal(typeof account, "object");

            const tx = await tronWeb.event.getEventsByContractAddress(
                tronWeb.defaultAddress.base58
            );
            assert.equal(typeof tx, "object");
        });

        it("setHeader TEST_TRON_HEADER_API_KEY normal", async function () {
            const tronWeb = tronWebBuilder.createInstance({
                fullHost: TEST_TRON_GRID_API,
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                undefined
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                undefined
            );
            try {
                await tronWeb.trx.getAccount();
            } catch (error) {
                assert.equal(error.response.status, 401);
                assert.exists(error.response.data, "ApiKey not exists");
            }
            try {
                await tronWeb.event.getEventsByContractAddress(
                    tronWeb.defaultAddress.base58
                );
            } catch (error) {
                assert.equal(error.statusCode, 401);
                assert.exists(error.error, "ApiKey not exists");
            }

            // setHeader:TEST_TRON_HEADER_API_KEY
            tronWeb.setHeader({ "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_KEY });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            const account = await tronWeb.trx.getAccount();
            assert.equal(typeof account, "object");
            const tx = await tronWeb.event.getEventsByContractAddress(
                tronWeb.defaultAddress.base58
            );
            assert.equal(typeof tx, "object");
        });

        it("setFullNodeHeader TEST_TRON_HEADER_API_KEY normal", async function () {
            const tronWeb = tronWebBuilder.createInstance({
                fullHost: TEST_TRON_GRID_API,
            });
            tronWeb.setFullNodeHeader({
                "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_KEY,
            });

            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                undefined
            );

            const account = await tronWeb.trx.getAccount();
            assert.equal(typeof account, "object");

            try {
                await tronWeb.event.getEventsByContractAddress(
                    tronWeb.defaultAddress.base58
                );
            } catch (error) {
                assert.equal(error.statusCode, 401);
                assert.exists(error.error, "ApiKey not exists");
            }
        });

        it("setEventHeader TEST_TRON_HEADER_API_KEY normal", async function () {
            const tronWeb = tronWebBuilder.createInstance({
                fullHost: TEST_TRON_GRID_API,
            });
            tronWeb.setEventHeader({
                "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_KEY,
            });

            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                undefined
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );

            try {
                await tronWeb.trx.getAccount();
            } catch (error) {
                assert.equal(error.response.status, 401);
                assert.exists(error.response.data, "ApiKey not exists");
            }

            const tx = await tronWeb.event.getEventsByContractAddress(
                tronWeb.defaultAddress.base58
            );
            assert.equal(typeof tx, "object");
        });

        it("headers FAKE_KEY-valid-key", async function () {
            // headers:FAKE_KEY
            const FAKE_KEY = "ABCEDF";
            let tronWeb = tronWebBuilder.createInstance({
                fullHost: TEST_TRON_GRID_API,
                headers: { "TRON-PRO-API-KEY": FAKE_KEY },
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                FAKE_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                FAKE_KEY
            );
            try {
                await tronWeb.trx.getAccount();
            } catch (error) {
                assert.equal(error.response.status, 401);
                assert.exists(error.response.data, "ApiKey not exists");
            }
            try {
                await tronWeb.event.getEventsByContractAddress(
                    tronWeb.defaultAddress.base58
                );
            } catch (error) {
                assert.equal(error.statusCode, 401);
                assert.exists(error.error, "ApiKey not exists");
            }

            // headers:EMPTY_KEY
            const EMPTY_KEY = "";
            tronWeb = tronWebBuilder.createInstance({
                fullHost: TEST_TRON_GRID_API,
                headers: { "TRON-PRO-API-KEY": EMPTY_KEY },
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                EMPTY_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                EMPTY_KEY
            );
            try {
                await tronWeb.trx.getAccount();
            } catch (error) {
                assert.equal(error.response.status, 401);
                assert.exists(error.response.data, "ApiKey not exists");
            }
            try {
                await tronWeb.event.getEventsByContractAddress(
                    tronWeb.defaultAddress.base58
                );
            } catch (error) {
                assert.equal(error.statusCode, 401);
                assert.exists(error.error, "ApiKey not exists");
            }
        });

        it("headers FAKE_KEY-valid-key eventHeaders TEST_TRON_HEADER_API_KEY", async function () {
            // headers:FAKE_KEY,eventHeaders:TEST_TRON_HEADER_API_KEY
            const FAKE_KEY = "ABCEDF";
            let tronWeb = tronWebBuilder.createInstance({
                fullHost: TEST_TRON_GRID_API,
                headers: { "TRON-PRO-API-KEY": FAKE_KEY },
                eventHeaders: { "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_KEY },
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                FAKE_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            try {
                await tronWeb.trx.getAccount();
            } catch (error) {
                assert.equal(error.response.status, 401);
                assert.exists(error.response.data, "ApiKey not exists");
            }
            const tx = await tronWeb.event.getEventsByContractAddress(
                tronWeb.defaultAddress.base58
            );
            assert.equal(typeof tx, "object");

            // headers:TEST_TRON_HEADER_API_KEY,eventHeaders:EMPTY_KEY
            const EMPTY_KEY = "";
            tronWeb = tronWebBuilder.createInstance({
                fullHost: TEST_TRON_GRID_API,
                headers: { "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_KEY },
                eventHeaders: { "TRON-PRO-API-KEY": EMPTY_KEY }
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                EMPTY_KEY
            );
            let account = await tronWeb.trx.getAccount();
            assert.equal(typeof account, "object");
            try {
                await tronWeb.event.getEventsByContractAddress(
                    tronWeb.defaultAddress.base58
                );
            } catch (error) {
                assert.equal(error.statusCode, 401);
                assert.exists(error.error, "ApiKey not exists");
            }
        });

        it("headers TEST_TRON_HEADER_API_KEY eventHeaders FAKE_KEY-valid-key", async function () {
            const FAKE_KEY = "ABCEDF";
            const tronWeb = tronWebBuilder.createInstance({
                fullHost: TEST_TRON_GRID_API,
                headers: { "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_KEY },
                eventHeaders: { "TRON-PRO-API-KEY": FAKE_KEY },
            });

            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                FAKE_KEY
            );

            const account = await tronWeb.trx.getAccount();
            assert.equal(typeof account, "object");

            try {
                await tronWeb.event.getEventsByContractAddress(
                    tronWeb.defaultAddress.base58
                );
            } catch (error) {
                // console.log("error:"+util.inspect(error,true,null,true))
                assert.equal(error.statusCode, 401);
                assert.exists(error.error, "ApiKey not exists");
            }
        });

        it("setHeader FAKE_KEY-valid-key", async function () {
            // headers:TEST_TRON_HEADER_API_KEY
            const tronWeb = tronWebBuilder.createInstance({
                headers: { "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_KEY },
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            let account = await tronWeb.trx.getAccount();
            assert.equal(typeof account, "object");
            let tx = await tronWeb.event.getEventsByContractAddress(
                tronWeb.defaultAddress.base58
            );
            assert.equal(typeof tx, "object");

            // setHeader:FAKE_KEY
            const FAKE_KEY = "ABCEDF";
            tronWeb.setHeader({ "TRON-PRO-API-KEY": FAKE_KEY });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                FAKE_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                FAKE_KEY
            );
            try {
                await tronWeb.trx.getAccount();
            } catch (error) {
                assert.equal(error.response.status, 401);
                assert.exists(error.response.data, "ApiKey not exists");
            }
            try {
                await tronWeb.event.getEventsByContractAddress(
                    tronWeb.defaultAddress.base58
                );
            } catch (error) {
                assert.equal(error.statusCode, 401);
                assert.exists(error.error, "ApiKey not exists");
            }

            // setHeader:EMPTY_KEY
            const EMPTY_KEY = "";
            tronWeb.setHeader({ "TRON-PRO-API-KEY": EMPTY_KEY });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                EMPTY_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                EMPTY_KEY
            );
            try {
                await tronWeb.trx.getAccount();
            } catch (error) {
                assert.equal(error.response.status, 401);
                assert.exists(error.response.data, "ApiKey not exists");
            }
            try {
                await tronWeb.event.getEventsByContractAddress(
                    tronWeb.defaultAddress.base58
                );
            } catch (error) {
                assert.equal(error.statusCode, 401);
                assert.exists(error.error, "ApiKey not exists");
            }
        });

        it("setFullNodeHeader FAKE_KEY-valid-key", async function () {
            // headers:TEST_TRON_HEADER_API_KEY
            const tronWeb = tronWebBuilder.createInstance({
                headers: { "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_KEY },
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            let account = await tronWeb.trx.getAccount();
            assert.equal(typeof account, "object");
            let tx = await tronWeb.event.getEventsByContractAddress(
                tronWeb.defaultAddress.base58
            );
            assert.equal(typeof tx, "object");

            // setFullNodeHeader:FAKE_KEY
            const FAKE_KEY = "ABCEDF";
            tronWeb.setFullNodeHeader({
                "TRON-PRO-API-KEY": FAKE_KEY,
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                FAKE_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            try {
                await tronWeb.trx.getAccount();
            } catch (error) {
                assert.equal(error.response.status, 401);
                assert.exists(error.response.data, "ApiKey not exists");
            }
            tx = await tronWeb.event.getEventsByContractAddress(
                tronWeb.defaultAddress.base58
            );
            assert.equal(typeof tx, "object");

            // setFullNodeHeader:EMPTY_KEY
            const EMPTY_KEY = "";
            tronWeb.setFullNodeHeader({
                "TRON-PRO-API-KEY": EMPTY_KEY,
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                EMPTY_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            try {
                await tronWeb.trx.getAccount();
            } catch (error) {
                assert.equal(error.response.status, 401);
                assert.exists(error.response.data, "ApiKey not exists");
            }
            tx = await tronWeb.event.getEventsByContractAddress(
                tronWeb.defaultAddress.base58
            );
            assert.equal(typeof tx, "object");
        });

        it("setEventHeader FAKE_KEY-valid-key", async function () {
            // headers:TEST_TRON_HEADER_API_KEY
            const tronWeb = tronWebBuilder.createInstance({
                headers: { "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_KEY },
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            let account = await tronWeb.trx.getAccount();
            assert.equal(typeof account, "object");
            let tx = await tronWeb.event.getEventsByContractAddress(
                tronWeb.defaultAddress.base58
            );
            assert.equal(typeof tx, "object");

            // setEventHeader:FAKE_KEY
            const FAKE_KEY = "ABCEDF";
            tronWeb.setEventHeader({
                "TRON-PRO-API-KEY": FAKE_KEY,
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                FAKE_KEY
            );
            account = await tronWeb.trx.getAccount();
            assert.equal(typeof account, "object");
            try {
                await tronWeb.event.getEventsByContractAddress(
                    tronWeb.defaultAddress.base58
                );
            } catch (error) {
                assert.equal(error.statusCode, 401);
                assert.exists(error.error, "ApiKey not exists");
            }

            // setEventHeader:EMPTY_KEY
            const EMPTY_KEY = "";
            tronWeb.setEventHeader({
                "TRON-PRO-API-KEY": EMPTY_KEY,
            });
            assert.equal(
                tronWeb.fullNode.headers["TRON-PRO-API-KEY"],
                TEST_TRON_HEADER_API_KEY
            );
            assert.equal(
                tronWeb.eventServer.headers["TRON-PRO-API-KEY"],
                EMPTY_KEY
            );
            account = await tronWeb.trx.getAccount();
            assert.equal(typeof account, "object");
            try {
                await tronWeb.event.getEventsByContractAddress(
                    tronWeb.defaultAddress.base58
                );
            } catch (error) {
                assert.equal(error.statusCode, 401);
                assert.exists(error.error, "ApiKey not exists");
            }
        });
    });

    describe("#testTronGridJwtKey", function () {
        it("should add the parameter Authorization=Key to the header of the request", async function () {
            let token = jwt.sign(
                { aud: "trongrid.io" },
                TEST_TRON_HEADER_JWT_PRIVATE_KEY,
                {
                    header: {
                        alg: "RS256",
                        typ: "JWT",
                        kid: TEST_TRON_HEADER_JWT_ID,
                    },
                }
            );
            const tronWeb = tronWebBuilder.createInstance({
                fullHost: TEST_TRON_GRID_API,
                headers: {
                    "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_JWT_KEY,
                    Authorization: `Bearer ${token}`,
                },
            });
            const account = await tronWeb.trx.getAccount();
            assert.equal(typeof account, "object");

            // setHeader:aud: "trongrid.iohgj"
            token = jwt.sign(
                { aud: "trongrid.iohgj" },
                TEST_TRON_HEADER_JWT_PRIVATE_KEY,
                {
                    header: {
                        alg: "RS256",
                        typ: "JWT",
                        kid: TEST_TRON_HEADER_JWT_ID,
                    },
                }
            );
            tronWeb.setHeader({
                "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_JWT_KEY,
                Authorization: `Bearer ${token}`,
            });
            try {
                await tronWeb.trx.getAccount();
            } catch (error) {
                assert.equal(error.response.status, 401);
                assert.exists(error.response.data, "invalid request due to settings");
            }
        });

        it("should the valid exp to the payload of the sign", async function () {
            const token = jwt.sign(
                {
                    exp: 0,
                    aud: "trongrid.io",
                },
                TEST_TRON_HEADER_JWT_PRIVATE_KEY,
                {
                    header: {
                        alg: "RS256",
                        typ: "JWT",
                        kid: TEST_TRON_HEADER_JWT_ID,
                    },
                }
            );

            const tronWeb = tronWebBuilder.createInstance({
                fullHost: TEST_TRON_GRID_API,
                headers: {
                    "TRON-PRO-API-KEY": TEST_TRON_HEADER_API_JWT_KEY,
                    Authorization: `Bearer ${token}`,
                },
            });

            try {
                await tronWeb.trx.getAccount();
            } catch (error) {
                assert.equal(error.response.status, 401);
            }
        });
    });
});

