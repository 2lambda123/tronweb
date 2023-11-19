const {DEPOSIT_FEE, WITHDRAW_FEE, FEE_LIMIT, PRIVATE_KEY} = require('../util/config');
const tronWebBuilder = require('../util/tronWebBuilder');
const assertThrow = require('../util/assertThrow');
const publicMethod = require('../util/PublicMethod');
const wait = require('../util/wait');
const chai = require('chai');
const assert = chai.assert;

describe('TronWeb Instance', function() {
    describe('#trx normal', function() {
        describe('#depositTrx()', function () {
            const tronWeb = tronWebBuilder.createInstanceSide();
            it('deposit trx from main chain to side chain', async function () {
                const mAccountBefore = await tronWeb.sidechain.mainchain.trx.getAccount();
                const sAccountBefore = await tronWeb.sidechain.sidechain.trx.getAccount();
                const mDepositBalanceBefore = mAccountBefore.balance;
                const sDepositBalanceBefore = sAccountBefore.balance;
                console.log('mDepositBalanceBefore: ' + mDepositBalanceBefore);
                console.log('sDepositBalanceBefore: ' + sDepositBalanceBefore);

                // depositTrx
                const depositNum = 10e7;
                let depositTrxMap = await publicMethod.depositTrx(depositNum);
                let depositTxFee = depositTrxMap.get("depositTxFee");

                const mAccountAfter = await tronWeb.sidechain.mainchain.trx.getAccount();
                const sAccountAfter = await tronWeb.sidechain.sidechain.trx.getAccount();
                const mDepositBalanceAfter = mAccountAfter.balance;
                const sDepositBalanceAfter = sAccountAfter.balance;
                console.log('mDepositBalanceAfter: ' +  mDepositBalanceAfter)
                console.log('sDepositBalanceAfter: ' +  sDepositBalanceAfter)
                assert.equal(mDepositBalanceAfter, mDepositBalanceBefore - depositNum - depositTxFee - DEPOSIT_FEE);
                assert.equal(sDepositBalanceAfter, sDepositBalanceBefore + depositNum);
            });

            it('depositTrx with the defined private key', async function () {
                const callValue = 10000000;
                const options = {};
                const txID = await tronWeb.sidechain.depositTrx(callValue, DEPOSIT_FEE, FEE_LIMIT, options, PRIVATE_KEY);
                assert.equal(txID.length, 64);
                console.log("txID: "+txID)
                await wait(20)
            });

            it('depositTrx with permissionId in options object', async function () {
                const callValue = 10000000;
                const options = { permissionId: 0 };
                const txID = await tronWeb.sidechain.depositTrx(callValue, DEPOSIT_FEE, FEE_LIMIT, options);
                assert.equal(txID.length, 64);
                console.log("txID: "+txID)
                await wait(20)
            });

            it('depositTrx with permissionId in options object and the defined private key', async function () {
                const callValue = 10000000;
                const options = { permissionId: 0 };
                const txID = await tronWeb.sidechain.depositTrx(callValue, DEPOSIT_FEE, FEE_LIMIT, options, PRIVATE_KEY);
                assert.equal(txID.length, 64);
                console.log("txID: "+txID)
                await wait(20)
            });

            it('should throw if an invalid trx number is passed', async function () {
                await assertThrow(
                    tronWeb.sidechain.depositTrx(1000.01, DEPOSIT_FEE, FEE_LIMIT),
                    'Invalid callValue provided'
                );
            });

            it('should throw if an invalid fee limit is passed', async function () {
                await assertThrow(
                    tronWeb.sidechain.depositTrx(10000, DEPOSIT_FEE, 0),
                    'Invalid feeLimit provided'
                );
            });
        });

        describe('#withdrawTrx()', function () {
            const tronWeb = tronWebBuilder.createInstanceSide();
            it('withdraw trx from side chain to main chain', async function () {
                const mAcountBefore = await tronWeb.sidechain.mainchain.trx.getAccount();
                const sAcountBefore = await tronWeb.sidechain.sidechain.trx.getAccount();
                const mWithdrawBalanceBefore = mAcountBefore.balance;
                const sWithdrawBalanceBefore = sAcountBefore.balance;
                console.log('mWithdrawBalanceBefore: ' + mWithdrawBalanceBefore);
                console.log('sWithdrawBalanceBefore: ' + sWithdrawBalanceBefore);

                // withdrawTrx
                const withdrawNum = 10e6;
                let withdrawTrxMap = await publicMethod.withdrawTrx(withdrawNum);
                let withdrawTxFee = withdrawTrxMap.get("withdrawTxFee");

                const mAccountAfter = await tronWeb.sidechain.mainchain.trx.getAccount();
                const sAccountAfter = await tronWeb.sidechain.sidechain.trx.getAccount();
                const mWithdrawBalanceAfter = mAccountAfter.balance;
                const sWithdrawBalanceAfter = sAccountAfter.balance;
                console.log('mWithdrawBalanceAfter: ' +  mWithdrawBalanceAfter)
                console.log('sWithdrawBalanceAfter: ' +  sWithdrawBalanceAfter)
                assert.equal(mWithdrawBalanceBefore + withdrawNum, mWithdrawBalanceAfter);
                assert.equal(sWithdrawBalanceAfter, sWithdrawBalanceBefore - withdrawNum - WITHDRAW_FEE - withdrawTxFee);
            });

            it('withdraw trx from side chain to main chain', async function () {
                const txID = await tronWeb.sidechain.withdrawTrx(10e6, WITHDRAW_FEE, 10000000);
                assert.equal(txID.length, 64);
            });

            it('withdrawTrx with the defined private key', async function () {
                const callValue = 10e6;
                const options = {};
                const txID = await tronWeb.sidechain.withdrawTrx(callValue, WITHDRAW_FEE, FEE_LIMIT, options, PRIVATE_KEY);
                assert.equal(txID.length, 64);
            });

            it('withdrawTrx with permissionId in options object', async function () {
                const callValue = 10e6;
                const options = { permissionId: 0 };
                const txID = await tronWeb.sidechain.withdrawTrx(callValue, WITHDRAW_FEE, FEE_LIMIT, options);
                assert.equal(txID.length, 64);
            });

            it('withdrawTrx with permissionId in options object and the defined private key', async function () {
                const callValue = 10e6;
                const options = { permissionId: 0 };
                const txID = await tronWeb.sidechain.withdrawTrx(callValue, WITHDRAW_FEE, FEE_LIMIT, options, PRIVATE_KEY);
                assert.equal(txID.length, 64);
            });

            it('should throw if an invalid trx number is passed', async function () {
                await assertThrow(
                    tronWeb.sidechain.withdrawTrx(1000.01, WITHDRAW_FEE, FEE_LIMIT),
                    'Invalid callValue provided'
                );
            });

            it('should throw if an invalid fee limit is passed', async function () {
                await assertThrow(
                    tronWeb.sidechain.withdrawTrx(10000, WITHDRAW_FEE, 0),
                    'Invalid feeLimit provided'
                );
            });
        });
    });
});

