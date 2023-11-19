const {PRIVATE_KEY,ORACLE_PRIVATE_KEY, RETRY_MAPPING_FEE, DEPOSIT_FEE, WITHDRAW_FEE, FEE_LIMIT, ADDRESS_BASE58, SIDE_CHAIN} = require('../util/config');
const trc721Contract = require('../util/contracts').trc721Contract;
const tronWebBuilder = require('../util/tronWebBuilder');
const assertThrow = require('../util/assertThrow');
const publicMethod = require('../util/PublicMethod');
const broadcaster = require('../util/broadcaster');
const wait = require('../util/wait');
const chai = require('chai');
const util = require('util');
const assert = chai.assert;

describe('TronWeb Instance', function() {
    const tronWeb = tronWebBuilder.createInstanceSide();
    let createTrc20TxId;
    let trc20ContractAddress;
    let sideChainTrc20ContractAddress;
    let createTrc721TxId;
    let trc721ContractAddress;
    let trc721Id;
    let sideChainTrc721ContractAddress;
    let newOtherAccountKey;
    let newOtherAccount;
    let newOtherAddress;
    let sideOracleAddress;
    before(async function () {
        // generate a new account
        // newOtherAccount = await tronWeb.utils.accounts.generateAccount();
        // newOtherAccountKey = newOtherAccount.privateKey;
        newOtherAccountKey = "04E873F2920C6282FA70D0B5F485B7F456BBCD07771DD64FD46958B5A7C6DBA9";
        console.log("newOtherAccountKey:"+newOtherAccountKey)
        assert.equal(newOtherAccountKey.length, 64);
        newOtherAddress = tronWeb.address.fromPrivateKey(newOtherAccountKey);
        console.log("newOtherAddress:"+newOtherAddress)

        // sideOracleAddress
        sideOracleAddress = tronWeb.address.fromPrivateKey(ORACLE_PRIVATE_KEY);

        // deploy trc20、721contract
        let deployTrc20Map = await publicMethod.deployTrc20Contract();
        createTrc20TxId = deployTrc20Map.get("createTxId");
        trc20ContractAddress = deployTrc20Map.get("contractAddress");
        let deployTrc721Map = await publicMethod.deployTrc721Contract();
        createTrc721TxId = deployTrc721Map.get("createTxId");
        trc721ContractAddress = deployTrc721Map.get("contractAddress");
    });
    describe('#retryMappingTrc20、721', function () {
        it('retryMappingTrc20、721 normal(sideOracle balance is zero)', async function () {
            // freezeBalance sideOracle for get bandwidth
            const freezeForBandwidthTx = await tronWeb.sidechain.sidechain.trx.freezeBalance(10e6, 3, 'BANDWIDTH', {privateKey:ORACLE_PRIVATE_KEY});
            // console.log("freezeForBandwidthTx:"+freezeForBandwidthTx.inspect(freezeTx))
            assert.isTrue(freezeForBandwidthTx.result);
            await wait(15);
            let freezeForBandwidthRes = await tronWeb.sidechain.sidechain.trx.getTransaction(freezeForBandwidthTx.txid);
            // console.log("freezeForBandwidthRes:"+JSON.stringify(freezeForBandwidthRes))
            assert.equal("SUCCESS",freezeForBandwidthRes.ret[0].contractRet)

            // get sideOracle balance
            let sideOracleAccount = await tronWeb.sidechain.sidechain.trx.getAccount(sideOracleAddress);
            let sideOracleBalance = sideOracleAccount.balance;
            console.log("sideOracleBalance:"+sideOracleBalance)

            // transfer sideOracle's all trx balance to other account
            const sendTrxTx = await tronWeb.sidechain.sidechain.trx.sendTrx(newOtherAddress, sideOracleBalance, {privateKey: ORACLE_PRIVATE_KEY});
            console.log("sendTrxTx:"+JSON.stringify(sendTrxTx))
            assert.isTrue(sendTrxTx.result);
            await wait(15);
            let sendTrxRes = await tronWeb.sidechain.sidechain.trx.getTransaction(sendTrxTx.txid);
            assert.equal("SUCCESS",sendTrxRes.ret[0].contractRet)
            sideOracleAccount = await tronWeb.sidechain.sidechain.trx.getAccount(sideOracleAddress);
            console.log("sideOracleAccount:"+JSON.stringify(sideOracleAccount))
            sideOracleBalance = typeof(sideOracleAccount.balance)=="undefined"?0:sideOracleAccount.balance;
            assert.equal(0, parseInt(sideOracleBalance));

            // mapping trc20,will fail
            /*const mappingTrc20Id = await tronWeb.sidechain.mappingTrc20(createTrc20TxId, MAPPING_FEE, FEE_LIMIT);
            // console.log("mappingTrc20Id:"+util.inspect(mappingTrc20Id,true,null,true))
            assert.equal(mappingTrc20Id.length, 64);
            await wait(90);
            const mappingTrc20Info = await tronWeb.sidechain.mainchain.trx.getTransactionInfo(mappingTrc20Id);
            console.log("mappingTrc20Info:"+JSON.stringify(mappingTrc20Info))
            const mappingTrc20TxFee = typeof(mappingTrc20Info.fee)=="undefined"?0:mappingTrc20Info.fee;
            console.log('mappingTrc20TxFee: ' + mappingTrc20TxFee)
            assert.equal("SUCCESS", mappingTrc20Info.receipt.result);*/
            let mappingTrc20Map = await publicMethod.mappingTrc20Contract(trc20ContractAddress, createTrc20TxId);
            sideChainTrc20ContractAddress = mappingTrc20Map.get("sideChainContractAddress");
            assert.equal("T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb", sideChainTrc20ContractAddress);
            let mappingTrc20Nonce = mappingTrc20Map.get("mappingNonce");
            console.log("mappingTrc20Nonce:"+mappingTrc20Nonce)

            // mapping trc721,will fail
            /*const mappingTrc721Id = await tronWeb.sidechain.mappingTrc721(createTrc721TxId, MAPPING_FEE, FEE_LIMIT);
            // console.log("mappingTrc721Id:"+util.inspect(mappingTrc721Id,true,null,true))
            assert.equal(mappingTrc721Id.length, 64);
            await wait(90);
            const mappingTrc721Info = await tronWeb.sidechain.mainchain.trx.getTransactionInfo(mappingTrc721Id);
            console.log("mappingTrc721Info:"+JSON.stringify(mappingTrc721Info))
            const mappingTrc721TxFee = typeof(mappingTrc721Info.fee)=="undefined"?0:mappingTrc721Info.fee;
            console.log('mappingTrc721TxFee: ' + mappingTrc721TxFee)
            assert.equal("SUCCESS", mappingTrc721Info.receipt.result);*/
            let mappingTrc721Map = await publicMethod.mappingTrc721Contract(trc721ContractAddress, createTrc721TxId);
            sideChainTrc721ContractAddress = mappingTrc721Map.get("sideChainContractAddress");
            assert.equal("T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb", sideChainTrc721ContractAddress);
            let mappingTrc721Nonce = mappingTrc721Map.get("mappingNonce");
            console.log("mappingTrc721Nonce:"+mappingTrc721Nonce)

            // get other account balance
            let newOtherAccount = await tronWeb.sidechain.sidechain.trx.getAccount(newOtherAddress);
            let newOtherBalance = newOtherAccount.balance;
            // transfer other account's all trx balance to oracle
            const sendTrxTx2 = await tronWeb.sidechain.sidechain.trx.sendTrx(sideOracleAddress, newOtherBalance-1000000, { privateKey: newOtherAccountKey});
            assert.isTrue(sendTrxTx2.result);
            await wait(15);
            let sendTrxRes2 = await tronWeb.sidechain.sidechain.trx.getTransaction(sendTrxTx2.txid);
            assert.equal("SUCCESS",sendTrxRes2.ret[0].contractRet)
            sideOracleAccount = await tronWeb.sidechain.sidechain.trx.getAccount(sideOracleAddress);
            sideOracleBalance = sideOracleAccount.balance;
            assert.isTrue(sideOracleBalance > 0);

            // retryMapping trc20
            const retryMappingTrc20Id = await tronWeb.sidechain.retryMapping(mappingTrc20Nonce, RETRY_MAPPING_FEE, FEE_LIMIT);
            const retryMappingTrc721Id = await tronWeb.sidechain.retryMapping(mappingTrc721Nonce, RETRY_MAPPING_FEE, FEE_LIMIT);
            assert.equal(retryMappingTrc20Id.length, 64);
            assert.equal(retryMappingTrc721Id.length, 64);
            await wait(90);

            // mainToSideContractMap
            const sideChainTrc20ContractResult = await tronWeb.sidechain.sidechain.transactionBuilder.triggerConstantContract(
                SIDE_CHAIN.sideOptions.sideGatewayAddress,
                "mainToSideContractMap(address)",
                {},
                [{type: 'address', value: trc20ContractAddress}]);
            console.log("sideChainContractResult:"+util.inspect(sideChainTrc20ContractResult,true,5,true))
            sideChainTrc20ContractAddress = sideChainTrc20ContractResult.constant_result;
            sideChainTrc20ContractAddress = tronWeb.address.fromHex("41"+sideChainTrc20ContractAddress.toString().substr(24))
            console.log("sideChainTrc20ContractAddress:"+sideChainTrc20ContractAddress);
            assert.notEqual("T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb", sideChainTrc20ContractAddress);

            // mainToSideContractMap
            const sideChainTrc721ContractResult = await tronWeb.sidechain.sidechain.transactionBuilder.triggerConstantContract(
                SIDE_CHAIN.sideOptions.sideGatewayAddress,
                "mainToSideContractMap(address)",
                {},
                [{type: 'address', value: trc721ContractAddress}]);
            console.log("sideChainTrc721ContractResult:"+util.inspect(sideChainTrc721ContractResult,true,5,true))
            sideChainTrc721ContractAddress = sideChainTrc721ContractResult.constant_result;
            sideChainTrc721ContractAddress = tronWeb.address.fromHex("41"+sideChainTrc721ContractAddress.toString().substr(24))
            console.log("sideChainTrc721ContractAddress:"+sideChainTrc721ContractAddress)
            assert.notEqual("T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb", sideChainTrc721ContractAddress);
        });
    });
    after(async function () {
        // transfer other account's all trx balance to oracle
        // get other account balance
        let newOtherAccount = await tronWeb.sidechain.sidechain.trx.getAccount(newOtherAddress);
        let newOtherBalance = newOtherAccount.balance;
        if (newOtherBalance > 1800000) {
            const sendTrxTx = await tronWeb.sidechain.sidechain.trx.sendTrx(sideOracleAddress, newOtherBalance-1000000, { privateKey: newOtherAccountKey});
            assert.isTrue(sendTrxTx.result);
            await wait(15);
            let sendTrxRes = await tronWeb.sidechain.sidechain.trx.getTransaction(sendTrxTx.txid);
            assert.equal("SUCCESS",sendTrxRes.ret[0].contractRet)
            let sideOracleAccount = await tronWeb.sidechain.sidechain.trx.getAccount(sideOracleAddress);
            let sideOracleBalance = sideOracleAccount.balance;
            assert.isTrue(sideOracleBalance > 0);
        }
    });
});









