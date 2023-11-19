const {ADDRESS_BASE58,PRIVATE_KEY, FEE_LIMIT} = require('../util/config');
const testFallbackOldVersion = require('../util/contracts').fallbackOldVersionTest;
const fallbackOldversionCall = require('../util/contracts').fallbackOldversionCall;
const Test0 = require('../util/contracts').Test0;
const Test1 = require('../util/contracts').Test1;
const Test2 = require('../util/contracts').Test2;
const TestPayable = require('../util/contracts').TestPayable;
const tronWebBuilder = require('../util/tronWebBuilder');
const broadcaster = require('../util/broadcaster');
const wait = require('../util/wait');
const chai = require('chai');
const assert = chai.assert;
const util = require('util');

describe('Fallback test', function() {
    describe('#mainChain', function() {
        const tronWeb = tronWebBuilder.createInstance();
        describe('#old version', function () {
            it('test fallback', async function () {
                // createSmartContract
                let options = {
                    abi: testFallbackOldVersion.abi,
                    bytecode: testFallbackOldVersion.bytecode,
                };
                let createTransaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_BASE58);
                let createTx = await broadcaster.broadcaster(null, PRIVATE_KEY, createTransaction);
                console.log("1111")
                assert.equal(createTx.transaction.txID.length, 64);
                console.log("txID:"+createTx.transaction.txID)
                console.log("2222")
                let createInfo;
                while (true) {
                    createInfo = await tronWeb.trx.getTransactionInfo(createTx.transaction.txID);
                    console.log("33333")
                    if (Object.keys(createInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        break;
                    }
                }
                console.log("44444")
                const contractAddressTest0 = createInfo.contract_address;
                options = {
                    abi: fallbackOldversionCall.abi,
                    bytecode: fallbackOldversionCall.bytecode,
                };
                createTransaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_BASE58);
                createTx = await broadcaster.broadcaster(null, PRIVATE_KEY, createTransaction);
                assert.equal(createTx.transaction.txID.length, 64);
                createInfo;
                while (true) {
                    createInfo = await tronWeb.trx.getTransactionInfo(createTx.transaction.txID);
                    if (Object.keys(createInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        break;
                    }
                }
                const contractAddressCall = createInfo.contract_address;

                // before trigger
                const accountBalanceBefore = await tronWeb.trx.getBalance(ADDRESS_BASE58);
                console.log('accountBalanceBefore: ' + accountBalanceBefore);

                // triggerSmartContract
                const value = 10000;
                const functionSelector = 'call(address)';
                let triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                    contractAddressCall, functionSelector, {feeLimit:FEE_LIMIT, callValue: value}, [{type: 'address', value: contractAddressTest0}], ADDRESS_BASE58);
                let triggerTx = await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
                console.log("triggerTx:"+util.inspect(triggerTx))
                assert.equal(triggerTx.transaction.txID.length, 64);
                let triggerInfo;
                while (true) {
                    triggerInfo = await tronWeb.trx.getTransactionInfo(triggerTx.transaction.txID);
                    if (Object.keys(triggerInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("triggerInfo:"+util.inspect(triggerInfo))
                        break;
                    }
                }
                const triggerTxFee = typeof(triggerInfo.fee)=="undefined"?0:triggerInfo.fee;
                console.log('triggerTxFee: ' + triggerTxFee)

                // after trigger
                const accountBalanceAfter = await tronWeb.trx.getBalance(ADDRESS_BASE58);
                console.log('accountBalanceAfter: ' + accountBalanceAfter);
                assert.equal(parseInt(accountBalanceBefore)-value-triggerTxFee, accountBalanceAfter);

                triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                    contractAddressCall, functionSelector, {feeLimit:FEE_LIMIT}, [{type: 'address', value: contractAddressTest0}], ADDRESS_BASE58);
                triggerTx = await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
                console.log("triggerTx:"+util.inspect(triggerTx))
                assert.equal(triggerTx.transaction.txID.length, 64);
                while (true) {
                    triggerInfo = await tronWeb.trx.getTransactionInfo(triggerTx.transaction.txID);
                    if (Object.keys(triggerInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("triggerInfo:"+util.inspect(triggerInfo))
                        break;
                    }
                }
                assert.equal(1,tronWeb.BigNumber(triggerInfo.contractResult[0], 16).valueOf());
            });
        });

        describe('#fallbackUpgrade', function () {
            let contractAddressTest0;
            let contractAddressTest1;
            let contractAddressTest2;
            let contractAddressTestPayable;
            before(async function () {
                // createSmartContract
                let options = {
                    abi: Test0.abi,
                    bytecode: Test0.bytecode,
                };
                let createTransaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_BASE58);
                let createTx0 = await broadcaster.broadcaster(null, PRIVATE_KEY, createTransaction);
                assert.equal(createTx0.transaction.txID.length, 64);
                options = {
                    abi: Test1.abi,
                    bytecode: Test1.bytecode,
                };
                createTransaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_BASE58);
                let createTx = await broadcaster.broadcaster(null, PRIVATE_KEY, createTransaction);
                assert.equal(createTx.transaction.txID.length, 64);
                options = {
                    abi: Test2.abi,
                    bytecode: Test2.bytecode,
                };
                createTransaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_BASE58);
                let createTx2 = await broadcaster.broadcaster(null, PRIVATE_KEY, createTransaction);
                assert.equal(createTx2.transaction.txID.length, 64);
                options = {
                    abi: TestPayable.abi,
                    bytecode: TestPayable.bytecode,
                };
                createTransaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_BASE58);
                let createTx3 = await broadcaster.broadcaster(null, PRIVATE_KEY, createTransaction);
                assert.equal(createTx3.transaction.txID.length, 64);
                let createInfo0;
                let createInfo;
                let createInfo2;
                let createInfo3;
                while (true) {
                    createInfo0 = await tronWeb.trx.getTransactionInfo(createTx0.transaction.txID);
                    createInfo = await tronWeb.trx.getTransactionInfo(createTx.transaction.txID);
                    createInfo2 = await tronWeb.trx.getTransactionInfo(createTx2.transaction.txID);
                    createInfo3 = await tronWeb.trx.getTransactionInfo(createTx3.transaction.txID);
                    if (Object.keys(createInfo0).length === 0 || Object.keys(createInfo).length === 0 || Object.keys(createInfo2).length === 0 || Object.keys(createInfo3).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        break;
                    }
                }
                contractAddressTest0 = createInfo0.contract_address;
                contractAddressTest1 = createInfo.contract_address;
                contractAddressTest2 = createInfo2.contract_address;
                contractAddressTestPayable = createInfo3.contract_address;
            });
            it('no fallback and no receive', async function () {
                // triggerSmartContract
                const functionSelector = 'hello()';
                const triggerOptions = {
                    feeLimit:FEE_LIMIT
                };
                let triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                    contractAddressTest0, functionSelector, triggerOptions, [], ADDRESS_BASE58);
                let triggerTx = await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
                console.log("triggerTx:"+util.inspect(triggerTx))
                assert.equal(triggerTx.transaction.txID.length, 64);
                let triggerInfo;
                while (true) {
                    triggerInfo = await tronWeb.trx.getTransactionInfo(triggerTx.transaction.txID);
                    if (Object.keys(triggerInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("triggerInfo1:"+util.inspect(triggerInfo))
                        break;
                    }
                }
                assert.equal(triggerInfo.result, "FAILED");

                triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                    contractAddressTest0, "  ", triggerOptions, [], ADDRESS_BASE58);
                triggerTx = await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
                console.log("triggerTx:"+util.inspect(triggerTx))
                assert.equal(triggerTx.transaction.txID.length, 64);
                while (true) {
                    triggerInfo = await tronWeb.trx.getTransactionInfo(triggerTx.transaction.txID);
                    if (Object.keys(triggerInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("triggerInfo2:"+util.inspect(triggerInfo))
                        break;
                    }
                }
                assert.equal(triggerInfo.result, "FAILED");
            });
            it('no calldata and no callvalue', async function () {
                // trigger receive
                const triggerOptions = {
                    feeLimit:FEE_LIMIT
                };
                let triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                    contractAddressTestPayable, "", triggerOptions, [], ADDRESS_BASE58);
                let triggerTx = await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
                console.log("triggerTx:"+util.inspect(triggerTx))
                assert.equal(triggerTx.transaction.txID.length, 64);
                let triggerInfo;
                while (true) {
                    triggerInfo = await tronWeb.trx.getTransactionInfo(triggerTx.transaction.txID);
                    if (Object.keys(triggerInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("triggerInfo1:"+util.inspect(triggerInfo))
                        break;
                    }
                }
                assert.equal(triggerInfo.receipt.result, "SUCCESS");
                assert.equal("receive",tronWeb.toUtf8(triggerInfo.log[0].data.substr(128,14)));

                triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                    contractAddressTest1, "", triggerOptions, [], ADDRESS_BASE58);
                triggerTx = await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
                console.log("triggerTx:"+util.inspect(triggerTx))
                assert.equal(triggerTx.transaction.txID.length, 64);
                while (true) {
                    triggerInfo = await tronWeb.trx.getTransactionInfo(triggerTx.transaction.txID);
                    if (Object.keys(triggerInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("triggerInfo1:"+util.inspect(triggerInfo))
                        break;
                    }
                }
                assert.equal(triggerInfo.receipt.result, "SUCCESS");
                assert.equal("fallback",tronWeb.toUtf8(triggerInfo.log[0].data.substr(128,16)));

                triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                    contractAddressTest2, "", triggerOptions, [], ADDRESS_BASE58);
                triggerTx = await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
                console.log("triggerTx:"+util.inspect(triggerTx))
                assert.equal(triggerTx.transaction.txID.length, 64);
                while (true) {
                    triggerInfo = await tronWeb.trx.getTransactionInfo(triggerTx.transaction.txID);
                    if (Object.keys(triggerInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("triggerInfo1:"+util.inspect(triggerInfo))
                        break;
                    }
                }
                assert.equal(triggerInfo.receipt.result, "SUCCESS");
                assert.equal("fallback",tronWeb.toUtf8(triggerInfo.log[0].data.substr(128,16)));
            });
            it('no calldata and has callvalue', async function () {
                // before trigger
                const accountBalanceBefore = await tronWeb.trx.getBalance(ADDRESS_BASE58);
                console.log('accountBalanceBefore: ' + accountBalanceBefore);
                // trigger receive
                const value = 1000;
                const triggerOptions = {
                    feeLimit:FEE_LIMIT,
                    callValue:value
                };
                let triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                    contractAddressTestPayable, "", triggerOptions, [], ADDRESS_BASE58);
                let triggerTx = await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
                console.log("triggerTx:"+util.inspect(triggerTx))
                assert.equal(triggerTx.transaction.txID.length, 64);
                let triggerInfo;
                while (true) {
                    triggerInfo = await tronWeb.trx.getTransactionInfo(triggerTx.transaction.txID);
                    if (Object.keys(triggerInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("triggerInfo1:"+util.inspect(triggerInfo))
                        break;
                    }
                }
                const triggerTxFee = typeof(triggerInfo.fee)=="undefined"?0:triggerInfo.fee;
                console.log('triggerTxFee: ' + triggerTxFee)

                // after trigger
                assert.equal(triggerInfo.receipt.result, "SUCCESS");
                assert.equal("receive",tronWeb.toUtf8(triggerInfo.log[0].data.substr(128,14)));
                const accountBalanceAfter = await tronWeb.trx.getBalance(ADDRESS_BASE58);
                console.log('accountBalanceAfter: ' + accountBalanceAfter);
                assert.equal(parseInt(accountBalanceBefore)-value-triggerTxFee, accountBalanceAfter);

                triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                    contractAddressTest2, "", triggerOptions, [], ADDRESS_BASE58);
                triggerTx = await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
                console.log("triggerTx:"+util.inspect(triggerTx))
                assert.equal(triggerTx.transaction.txID.length, 64);
                while (true) {
                    triggerInfo = await tronWeb.trx.getTransactionInfo(triggerTx.transaction.txID);
                    if (Object.keys(triggerInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("triggerInfo1:"+util.inspect(triggerInfo))
                        break;
                    }
                }
                const triggerTxFee2 = typeof(triggerInfo.fee)=="undefined"?0:triggerInfo.fee;
                console.log('triggerTxFee2: ' + triggerTxFee2)
                assert.equal(triggerInfo.receipt.result, "SUCCESS");
                assert.equal("fallback",tronWeb.toUtf8(triggerInfo.log[0].data.substr(128,16)));
                const accountBalanceAfter2 = await tronWeb.trx.getBalance(ADDRESS_BASE58);
                console.log('accountBalanceAfter2: ' + accountBalanceAfter2);
                assert.equal(parseInt(parseInt(accountBalanceAfter)-value-triggerTxFee2), accountBalanceAfter2);

                triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                    contractAddressTest1, "", triggerOptions, [], ADDRESS_BASE58);
                triggerTx = await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
                console.log("triggerTx:"+util.inspect(triggerTx))
                assert.equal(triggerTx.transaction.txID.length, 64);
                while (true) {
                    triggerInfo = await tronWeb.trx.getTransactionInfo(triggerTx.transaction.txID);
                    if (Object.keys(triggerInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("triggerInfo1:"+util.inspect(triggerInfo))
                        break;
                    }
                }
                assert.equal(triggerInfo.receipt.result, "REVERT");
                // assert.equal("fallback",tronWeb.toUtf8(triggerInfo.log[0].data.substr(128)));
            });

        });
    });
});

