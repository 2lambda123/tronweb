const {ADDRESS_BASE58,PRIVATE_KEY} = require('../util/config');
const testDeploy = require('../util/contracts').trc20Contract;
const tronWebBuilder = require('../util/tronWebBuilder');
const broadcaster = require('../util/broadcaster');
const wait = require('../util/wait');
const chai = require('chai');
const assert = chai.assert;
const util = require('util');
//ok
describe('TronWeb feelimit test', function() {
    let contractAddress;
    describe('#mainChain', function () {
        const tronWeb = tronWebBuilder.createInstance();
        before(async function () {
            const options = {
                abi: testDeploy.abi,
                bytecode: testDeploy.bytecode,
                parameters: [ADDRESS_BASE58],
            };
            const createTransaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_BASE58);
            console.log("createTransaction:" + util.inspect(createTransaction))
            const createTx = await broadcaster.broadcaster(null, PRIVATE_KEY, createTransaction);
            console.log("createTx:" + util.inspect(createTx))
            console.log("createTx.transaction.txID:" + createTx.transaction.txID)
            assert.equal(createTx.transaction.txID.length, 64);
            let createInfo;
            while (true) {
                createInfo = await tronWeb.trx.getTransactionInfo(createTx.transaction.txID);
                if (Object.keys(createInfo).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    console.log("createInfo:" + util.inspect(createInfo))
                    break;
                }
            }
            contractAddress = createInfo.contract_address;
            console.log("contractAddress:" + contractAddress)
            // before trigger
            const accountBalanceBefore = await tronWeb.trx.getBalance(ADDRESS_BASE58);
            console.log('accountBalanceBefore: ' + accountBalanceBefore);
        });
        describe('#_isConstant call', function () {
            it('Before clearabi trigger，trigger constant method, result is ok', async function () {
                // triggerSmartContract
                tw = await tronWeb.contract().at(contractAddress)
                const ts = await tw.totalSupply().call()
                console.log("ts:" + ts)
                assert.equal(ts,100000000000000);
            });

            it('After clearabi and add local abi trigger,result is ok', async function () {
                console.log("After clear abi and add local api,trigger constant method,result is ok")
                const clearAbiTransaction = await tronWeb.transactionBuilder.clearABI(contractAddress, ADDRESS_BASE58);
                console.log("clearAbiTransaction:"+util.inspect(clearAbiTransaction));
                const clearAbiTx = await broadcaster.broadcaster(null, PRIVATE_KEY, clearAbiTransaction);
                while (true) {
                    let clearAbiInfo = await tronWeb.trx.getTransactionInfo(clearAbiTx.transaction.txID);
                    if (Object.keys(clearAbiInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("clearAbiInfo:"+util.inspect(clearAbiInfo))
                        break;
                    }
                }
                const tw=await tronWeb.contract(testDeploy.abi, contractAddress)
                const ts = await tw.totalSupply().call()
                console.log("ts:" + ts)
                assert.equal(ts,100000000000000);
            });
        });
    });
});
