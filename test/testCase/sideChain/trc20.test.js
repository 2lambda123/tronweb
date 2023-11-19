const {PRIVATE_KEY,MAPPING_FEE, DEPOSIT_FEE, WITHDRAW_FEE, FEE_LIMIT, ADDRESS_BASE58, SIDE_CHAIN} = require('../util/config');
const trc20Contract = require('../util/contracts').trc20Contract;
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
    let createTxId;
    let contractAddress;
    let sideChainContractAddress;
    before(async function () {
        let deployMap = await publicMethod.deployTrc20ContractAndMapping();
        createTxId = deployMap.get("createTxId");
        contractAddress = deployMap.get("contractAddress");
        sideChainContractAddress = deployMap.get("sideChainContractAddress");
    })
    describe('#depositTrc20', function () {
        it('deposit trc20 from main chain to side chain', async function () {
            // before trx balance
            const mAccountbefore = await tronWeb.sidechain.mainchain.trx.getAccount();
            const sAccountbefore = await tronWeb.sidechain.sidechain.trx.getAccount();
            const mTrxBalanceBefore = mAccountbefore.balance;
            const sTrxBalanceBefore = sAccountbefore.balance;
            console.log('mTrxBalanceBefore: ' + mTrxBalanceBefore);
            console.log('sTrxBalanceBefore: ' + sTrxBalanceBefore);

            // approve
            let approveNum = 1000;
            let approveTrc20Map = await publicMethod.approveTrc20(approveNum, contractAddress);
            let approveTxFee = approveTrc20Map.get("approveTxFee");

            // before token balance
            const address = tronWeb.address.fromPrivateKey(PRIVATE_KEY);
            let mTrc20Contract = await tronWeb.sidechain.mainchain.contract().at(contractAddress);
            let mTrc20BalanceBefore = await mTrc20Contract.balanceOf(address).call();
            // mTrc20BalanceBefore = parseInt(mTrc20BalanceBefore, 16);
            console.log("mTrc20BalanceBefore："+mTrc20BalanceBefore);
            let sTrc20balanceResultBefore=await tronWeb.sidechain.sidechain.transactionBuilder.triggerSmartContract(
                sideChainContractAddress,
                'balanceOf(address)',
                {_isConstant: true},
                [{type: 'address', value: address}]);
            const sTrc20BalanceBefore = sTrc20balanceResultBefore && sTrc20balanceResultBefore.result ? new tronWeb.BigNumber(sTrc20balanceResultBefore.constant_result[0], 16).valueOf() : 0;
            console.log("sTrc20BalanceBefore:"+sTrc20BalanceBefore);

            // depositTrc20
            const depositNum = 1000;
            let depositTrc20Map = await publicMethod.depositTrc20(depositNum, contractAddress);
            let depositTxFee = depositTrc20Map.get("depositTxFee");

            // after trx balance
            const mAccountAfter = await tronWeb.sidechain.mainchain.trx.getAccount();
            const sAccountAfter = await tronWeb.sidechain.sidechain.trx.getAccount();
            const mTrxBalanceAfter = mAccountAfter.balance;
            const sTrxBalanceAfter = sAccountAfter.balance;
            console.log('mTrxBalanceAfter: ' + mTrxBalanceAfter);
            console.log('sTrxBalanceAfter: ' + sTrxBalanceAfter);
            assert.equal(mTrxBalanceBefore-depositTxFee-approveTxFee-DEPOSIT_FEE,mTrxBalanceAfter);
            assert.equal(sTrxBalanceBefore,sTrxBalanceAfter);

            // after token balance
            let mTrc20BalanceAfter = await mTrc20Contract.balanceOf(address).call();
            // mTrc20BalanceAfter = parseInt(mTrc20BalanceAfter, 16);
            console.log("mTrc20BalanceAfter："+mTrc20BalanceAfter);
            let sTrc20balanceResultAfter=await tronWeb.sidechain.sidechain.transactionBuilder.triggerSmartContract(
                sideChainContractAddress,
                'balanceOf(address)',
                {_isConstant: true},
                [{type: 'address', value: address}]);
            const sTrc20BalanceAfter = sTrc20balanceResultAfter && sTrc20balanceResultAfter.result ? new tronWeb.BigNumber(sTrc20balanceResultAfter.constant_result[0], 16).valueOf() : 0;
            console.log("sTrc20BalanceAfter:"+sTrc20BalanceAfter);
            assert.equal(mTrc20BalanceBefore-depositNum,mTrc20BalanceAfter.toString());
            assert.equal(parseInt(sTrc20BalanceBefore)+parseInt(depositNum),sTrc20BalanceAfter);
        });

        it('deposit trc20 from main chain to side chain', async function () {
            const num = 100;
            const txID = await tronWeb.sidechain.depositTrc20(num, DEPOSIT_FEE, FEE_LIMIT, contractAddress);
            assert.equal(txID.length, 64);
        });

        it('depositTrc20 with the defined private key', async function () {
            const num = 100;
            const options = {};
            const txID = await tronWeb.sidechain.depositTrc20(num, DEPOSIT_FEE, FEE_LIMIT, contractAddress, options, PRIVATE_KEY);
            assert.equal(txID.length, 64);
        });

        it('depositTrc20 with permissionId in options object', async function () {
            const num = 100;
            const options = { permissionId: 0 };
            const txID = await tronWeb.sidechain.depositTrc20(num, DEPOSIT_FEE, FEE_LIMIT, contractAddress, options);
            assert.equal(txID.length, 64);
        });

        it('depositTrc20 with permissionId in options object and the defined private key', async function () {
            const num = 100;
            const options = { permissionId: 0 };
            const txID = await tronWeb.sidechain.depositTrc20(num, DEPOSIT_FEE, FEE_LIMIT, contractAddress, options, PRIVATE_KEY);
            assert.equal(txID.length, 64);
        });

        it('should throw if an invalid num is passed', async function () {
            const num = 100.01;
            await assertThrow(
                tronWeb.sidechain.depositTrc20(num, DEPOSIT_FEE, FEE_LIMIT, contractAddress),
                'Invalid num provided'
            );
        });

        it('should throw if an invalid fee limit is passed', async function () {
            const num = 100;
            const feeLimit = 100000000000;
            await assertThrow(
                tronWeb.sidechain.depositTrc20(num, DEPOSIT_FEE, feeLimit, contractAddress),
                'Contract validate error : feeLimit must be >= 0 and <= 1000000000'
            );
        });

        it('should throw if an invalid contract address is passed', async function () {
            await assertThrow(
                tronWeb.sidechain.depositTrc20(100, DEPOSIT_FEE, FEE_LIMIT, 'aaaaaaaaaa'),
                'Invalid contractAddress address provided'
            );
        });
    });

    describe('#mappingTrc20', function () {
        const tronWeb = tronWebBuilder.createInstanceSide();
        it('mappingTrc20 with the defined private key', async function () {
            let deployMap = await publicMethod.deployTrc20Contract();
            createTxId = deployMap.get("createTxId");
            const options = {};
            const txID = await tronWeb.sidechain.mappingTrc20(createTxId, MAPPING_FEE, FEE_LIMIT, options, PRIVATE_KEY);
            assert.equal(txID.length, 64);
            console.log("txID: "+txID)
            await wait(20)
        });

        it('mappingTrc20 with permissionId in options object', async function () {
            const options = { permissionId: 0 };
            const txID = await tronWeb.sidechain.mappingTrc20(createTxId, MAPPING_FEE, FEE_LIMIT, options);
            assert.equal(txID.length, 64);
            console.log("txID: "+txID)
            await wait(20)
        });

        it('mappingTrc20 with permissionId in options object and the defined private key', async function () {
            const options = { permissionId: 0 };
            const txID = await tronWeb.sidechain.mappingTrc20(createTxId, MAPPING_FEE, FEE_LIMIT, options, PRIVATE_KEY);
            assert.equal(txID.length, 64);
            console.log("txID: "+txID)
            await wait(20)
        });

        it('should throw if an invalid trxHash', async function () {
            const trxHash = '';
            await assertThrow(
                tronWeb.sidechain.mappingTrc20(trxHash, MAPPING_FEE, FEE_LIMIT),
                'Invalid trxHash provided'
            );
        });

        it('should throw if an invalid fee limit is passed', async function () {
            const feeLimit = 100000000000;
            await assertThrow(
                tronWeb.sidechain.mappingTrc20(createTxId, MAPPING_FEE, feeLimit),
                'Contract validate error : feeLimit must be >= 0 and <= 1000000000'
            );
        });
    });

    describe('#withdrawTrc20', function () {
        describe('#withdrawTrc20', function () {
            const tronWeb = tronWebBuilder.createInstanceSide();
            it('withdraw trc20 from side chain to main chain', async function () {
                // before token balance
                let mTrc20Contract = await tronWeb.sidechain.mainchain.contract().at(contractAddress);
                let mTrc20BalanceBefore = await mTrc20Contract.balanceOf(ADDRESS_BASE58).call();
                console.log("mTrc20BalanceBefore："+mTrc20BalanceBefore);
                let sTrc20balanceResultBefore=await tronWeb.sidechain.sidechain.transactionBuilder.triggerSmartContract(
                    sideChainContractAddress,
                    'balanceOf(address)',
                    {_isConstant: true},
                    [{type: 'address', value: ADDRESS_BASE58}]);
                const sTrc20BalanceBefore = sTrc20balanceResultBefore && sTrc20balanceResultBefore.result ? new tronWeb.BigNumber(sTrc20balanceResultBefore.constant_result[0], 16).valueOf() : 0;
                console.log("sTrc20BalanceBefore:"+sTrc20BalanceBefore);

                // before trx balance
                const mAccountbefore = await tronWeb.sidechain.mainchain.trx.getAccount();
                const sAccountbefore = await tronWeb.sidechain.sidechain.trx.getAccount();
                const mTrxBalanceBefore = mAccountbefore.balance;
                const sTrxBalanceBefore = sAccountbefore.balance;
                console.log('mTrxBalanceBefore: ' + mTrxBalanceBefore);
                console.log('sTrxBalanceBefore: ' + sTrxBalanceBefore);

                // withdrawTrc20
                const depositNum = 10;
                let withdrawTrc20Map = await publicMethod.withdrawTrc20(depositNum, sideChainContractAddress);
                let withdrawTxFee = withdrawTrc20Map.get("withdrawTxFee");

                // after trx balance
                const mAccountAfter = await tronWeb.sidechain.mainchain.trx.getAccount();
                const sAccountAfter = await tronWeb.sidechain.sidechain.trx.getAccount();
                const mTrxBalanceAfter = mAccountAfter.balance;
                const sTrxBalanceAfter = sAccountAfter.balance;
                console.log('mTrxBalanceAfter: ' + mTrxBalanceAfter);
                console.log('sTrxBalanceAfter: ' + sTrxBalanceAfter);
                assert.equal(mTrxBalanceBefore,mTrxBalanceAfter);
                assert.equal(sTrxBalanceBefore-withdrawTxFee-WITHDRAW_FEE,sTrxBalanceAfter);

                // after token balance
                let mTrc20BalanceAfter = await mTrc20Contract.balanceOf(ADDRESS_BASE58).call();
                console.log("mTrc20BalanceAfter："+mTrc20BalanceAfter);
                let sTrc20balanceResultAfter=await tronWeb.sidechain.sidechain.transactionBuilder.triggerSmartContract(
                    sideChainContractAddress,
                    'balanceOf(address)',
                    {_isConstant: true},
                    [{type: 'address', value: ADDRESS_BASE58}]);
                const sTrc20BalanceAfter = sTrc20balanceResultAfter && sTrc20balanceResultAfter.result ? new tronWeb.BigNumber(sTrc20balanceResultAfter.constant_result[0], 16).valueOf() : 0;
                console.log("sTrc20BalanceAfter:"+sTrc20BalanceAfter);
                assert.equal(parseInt(mTrc20BalanceBefore)+parseInt(depositNum),mTrc20BalanceAfter);
                assert.equal(sTrc20BalanceBefore-depositNum,sTrc20BalanceAfter);
            });

            it('withdrawTrc20 with the defined private key', async function () {
                const num = 10;
                const options = {};
                const txID = await tronWeb.sidechain.withdrawTrc20(num, WITHDRAW_FEE, FEE_LIMIT, sideChainContractAddress, options, PRIVATE_KEY);
                assert.equal(txID.length, 64);
            });

            it('withdrawTrc20 with permissionId in options object', async function () {
                const num = 10;
                const options = { permissionId: 0 };
                const txID = await tronWeb.sidechain.withdrawTrc20(num, WITHDRAW_FEE, FEE_LIMIT, sideChainContractAddress, options);
                assert.equal(txID.length, 64);
            });

            it('withdrawTrc20 with permissionId in options object and the defined private key', async function () {
                const num = 10;
                const options = { permissionId: 0 };
                const txID = await tronWeb.sidechain.withdrawTrc20(num, WITHDRAW_FEE, FEE_LIMIT, sideChainContractAddress, options, PRIVATE_KEY);
                assert.equal(txID.length, 64);
            });

            it('should throw if an invalid num is passed', async function () {
                const num = 10.01;
                await assertThrow(
                    tronWeb.sidechain.withdrawTrc20(num, WITHDRAW_FEE, FEE_LIMIT, sideChainContractAddress),
                    'Invalid numOrId provided'
                );
            });

            it('should throw if an invalid fee limit is passed', async function () {
                const feeLimit = 100000000000;
                await assertThrow(
                    tronWeb.sidechain.withdrawTrc20(100, WITHDRAW_FEE, feeLimit, sideChainContractAddress),
                    'contract validate error : feeLimit must be >= 0 and <= 1000000000'
                );
            });

            it('should throw if an invalid contract address is passed', async function () {
                await assertThrow(
                    tronWeb.sidechain.withdrawTrc20(100, WITHDRAW_FEE, FEE_LIMIT, 'aaaaaaaaaa'),
                    'Invalid contractAddress address provided'
                );
            });
        });
    });
});




