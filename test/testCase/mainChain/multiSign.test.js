const {DEPOSIT_FEE, WITHDRAW_FEE, FEE_LIMIT, ADDRESS_BASE58, SIDE_CHAIN} = require('../util/config');
const tronWebBuilder = require('../util/tronWebBuilder');
const assertThrow = require('../util/assertThrow');
const publicMethod = require('../util/PublicMethod');
const broadcaster = require('../util/broadcaster');
const wait = require('../util/wait');
const chai = require('chai');
const assert = chai.assert;
const util = require('util');

describe('TronWeb Instance', function() {
    describe('#other', function() {
        let tronWeb;
        describe("#multiSignTransaction", async function () {
            const accounts = {
                b58: [],
                hex: [],
                pks: []
            }
            const ownerIdx = 0;
            const idxS = 0;
            const idxE = 2;
            const threshold = 2;

            before(async function() {
                tronWeb = tronWebBuilder.createInstance();
                const sendTrxTx = await tronWeb.trx.sendTrx("TRxh1GnspMRadaU37UzrRRpkME2EkwCHg4", 5000000000);
                const sendTrxTx2 = await tronWeb.trx.sendTrx("TELLNvWTiYbMEyGu1DQSr8UDQA8aJzpx6x", 500000000);
                console.log("sendTrxTx1:"+JSON.stringify(sendTrxTx))
                console.log("sendTrxTx2:"+JSON.stringify(sendTrxTx2))
                assert.isTrue(sendTrxTx.result);
                assert.isTrue(sendTrxTx2.result);
                await wait(15);

                // this.timeout(20000);
                let pk0 = "4521c13f65cc9f5c1daa56923b8598d4015801ad28379675c64106f5f6afec30";
                let addr = tronWeb.address.fromPrivateKey(pk0);
                accounts.pks.push(pk0);
                accounts.b58.push(addr);
                accounts.hex.push(tronWeb.address.toHex(addr));
                let pk1 = "2c4216bed2a58a2ae2f6ed0fc230f80e1daea1637993069819f1cd213ff03366";
                let addr1 = tronWeb.address.fromPrivateKey(pk1);
                accounts.pks.push(pk1);
                accounts.b58.push(addr1);
                accounts.hex.push(tronWeb.address.toHex(addr1));
                let ownerPk = "4521c13f65cc9f5c1daa56923b8598d4015801ad28379675c64106f5f6afec30";
                let ownerAddress = tronWeb.address.toHex(tronWeb.address.fromPrivateKey(ownerPk));
                console.log("ownerAddress: "+ownerAddress)

                // update account permission
                let ownerPermission = { type: 0, permission_name: 'owner' };
                ownerPermission.threshold = threshold;
                ownerPermission.keys  = [];
                let activePermission = { type: 2, permission_name: 'active0' };
                activePermission.threshold = threshold;
                activePermission.operations = '7fff1fc0037e0000000000000000000000000000000000000000000000000000';
                activePermission.keys = [];


                for (let i = idxS; i < idxE; i++) {
                    let address = accounts.hex[i];
                    let weight = 1;
                    ownerPermission.keys.push({ address: address, weight: weight });
                    activePermission.keys.push({ address: address, weight: weight });
                }

                const updateTransaction = await tronWeb.transactionBuilder.updateAccountPermissions(
                    ownerAddress,
                    ownerPermission,
                    null,
                    [activePermission]
                );

                console.log("ownerPk:"+ownerPk)
                console.log("updateTransaction:"+util.inspect(updateTransaction))
                await wait(30);
                const updateTx = await broadcaster.broadcaster(null, ownerPk, updateTransaction);
                console.log("updateTx:"+util.inspect(updateTx))
                console.log("updateTx.txID:"+updateTx.transaction.txID)
                assert.equal(updateTx.transaction.txID.length, 64);
                await wait(30);

                /*let updateInfo;
                while (true) {
                    updateInfo = await tronWeb.trx.getTransactionInfo(updateTx.transaction.txID);
                    if (Object.keys(updateInfo).length === 0) {
                        await wait(3);
                        continue;
                    } else {
                        console.log("updateInfo:"+util.inspect(updateInfo))
                        break;
                    }
                }*/
            });

            it('should multi-sign a transaction by owner permission', async function () {
                const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);
                console.log("transaction:"+util.inspect(transaction))
                let signedTransaction = transaction;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await tronWeb.trx.multiSign(signedTransaction, accounts.pks[i], 0);
                    console.log("signedTransaction:"+util.inspect(signedTransaction))
                }
                assert.equal(signedTransaction.signature.length, 2);

                // broadcast multi-sign transaction
                const result = await tronWeb.trx.broadcast(signedTransaction);
                assert.isTrue(result.result);

            });

            it('should multi-sign a transaction by owner permission (permission id inside tx)', async function () {
                const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx], {permissionId: 0});

                let signedTransaction = transaction;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await tronWeb.trx.multiSign(signedTransaction, accounts.pks[i]);
                }

                assert.equal(signedTransaction.signature.length, 2);

                // broadcast multi-sign transaction
                const result = await tronWeb.trx.broadcast(signedTransaction);
                assert.isTrue(result.result);

            });

            it('should verify weight after multi-sign by owner permission', async function () {

                // create transaction and do multi-sign
                const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);

                // sign and verify sign weight
                let signedTransaction = transaction;
                let signWeight;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await tronWeb.trx.multiSign(signedTransaction, accounts.pks[i], 0);
                    signWeight = await tronWeb.trx.getSignWeight(signedTransaction);
                    if (i < idxE - 1) {
                        assert.equal(signWeight.result.code, 'NOT_ENOUGH_PERMISSION');
                    }
                    assert.equal(signWeight.approved_list.length, i - idxS + 1);
                }

                // get approved list
                const approvedList = await tronWeb.trx.getApprovedList(signedTransaction);
                assert.isTrue(approvedList.approved_list.length === threshold);

                // broadcast multi-sign transaction
                const result = await tronWeb.trx.broadcast(signedTransaction);
                assert.isTrue(result.result);

            });

            it('should verify weight after multi-sign by owner permission (permission id inside tx)', async function () {

                // create transaction and do multi-sign
                const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx], {permissionId: 0});

                // sign and verify sign weight
                let signedTransaction = transaction;
                let signWeight;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await tronWeb.trx.multiSign(signedTransaction, accounts.pks[i]);
                    signWeight = await tronWeb.trx.getSignWeight(signedTransaction);
                    if (i < idxE - 1) {
                        assert.equal(signWeight.result.code, 'NOT_ENOUGH_PERMISSION');
                    }
                    assert.equal(signWeight.approved_list.length, i - idxS + 1);
                }

                // get approved list
                const approvedList = await tronWeb.trx.getApprovedList(signedTransaction);
                assert.isTrue(approvedList.approved_list.length === threshold);

                // broadcast multi-sign transaction
                const result = await tronWeb.trx.broadcast(signedTransaction);
                assert.isTrue(result.result);

            });

            it('should multi-sign a transaction with no permission error by owner permission', async function () {

                const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);
                try {
                    await tronWeb.trx.multiSign(transaction, (accounts.pks[ownerIdx] + '123'), 0);
                } catch (e) {
                    assert.isTrue(e.indexOf('has no permission to sign') != -1);
                }

            });

            it('should multi-sign duplicated a transaction by owner permission', async function () {

                const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);
                try {
                    let signedTransaction = await tronWeb.trx.multiSign(transaction, accounts.pks[ownerIdx], 0);
                    await tronWeb.trx.multiSign(signedTransaction, accounts.pks[ownerIdx], 0);
                } catch (e) {
                    assert.isTrue(e.indexOf('already sign transaction') != -1);
                }

            });

            it('should multi-sign a transaction by active permission', async function () {

                const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);
                let signedTransaction = transaction;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await tronWeb.trx.multiSign(signedTransaction, accounts.pks[i], 2);
                }

                assert.equal(signedTransaction.signature.length, 2);

                // broadcast multi-sign transaction
                const result = await tronWeb.trx.broadcast(signedTransaction);
                assert.isTrue(result.result);

            });

            it('should multi-sign a transaction by active permission (permission id inside tx)', async function () {

                const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx], {permissionId: 2});
                console.log("transaction:"+util.inspect(transaction))

                let signedTransaction = transaction;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await tronWeb.trx.multiSign(signedTransaction, accounts.pks[i]);
                    console.log("signedTransaction:"+util.inspect(signedTransaction.raw_data.contract))

                }

                assert.equal(signedTransaction.signature.length, 2);

                // broadcast multi-sign transaction
                const result = await tronWeb.trx.broadcast(signedTransaction);
                console.log("result:"+util.inspect(result))
                assert.isTrue(result.result);

            });

            it('should verify weight after multi-sign by active permission', async function () {

                // create transaction and do multi-sign
                const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);

                // sign and verify sign weight
                let signedTransaction = transaction;
                let signWeight;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await tronWeb.trx.multiSign(signedTransaction, accounts.pks[i], 2);
                    signWeight = await tronWeb.trx.getSignWeight(signedTransaction, 2);
                    if (i < idxE - 1) {
                        assert.equal(signWeight.result.code, 'NOT_ENOUGH_PERMISSION');
                    }
                    assert.equal(signWeight.approved_list.length, i - idxS + 1);
                }

                // get approved list
                const approvedList = await tronWeb.trx.getApprovedList(signedTransaction);
                assert.isTrue(approvedList.approved_list.length === threshold);

                // broadcast multi-sign transaction
                const result = await tronWeb.trx.broadcast(signedTransaction);
                assert.isTrue(result.result);

            });

            it('should verify weight after multi-sign by active permission (permission id inside tx)', async function () {

                // create transaction and do multi-sign
                const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx], {permissionId: 2});

                // sign and verify sign weight
                let signedTransaction = transaction;
                let signWeight;
                for (let i = idxS; i < idxE; i++) {
                    signedTransaction = await tronWeb.trx.multiSign(signedTransaction, accounts.pks[i]);
                    signWeight = await tronWeb.trx.getSignWeight(signedTransaction);
                    if (i < idxE - 1) {
                        assert.equal(signWeight.result.code, 'NOT_ENOUGH_PERMISSION');
                    }
                    assert.equal(signWeight.approved_list.length, i - idxS + 1);
                }

                // get approved list
                const approvedList = await tronWeb.trx.getApprovedList(signedTransaction);
                assert.isTrue(approvedList.approved_list.length === threshold);

                // broadcast multi-sign transaction
                const result = await tronWeb.trx.broadcast(signedTransaction);
                assert.isTrue(result.result);

            });

            it('should multi-sign a transaction with no permission error by active permission', async function () {

                const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);
                try {
                    await tronWeb.trx.multiSign(transaction, (accounts.pks[ownerIdx] + '123'), 2);
                } catch (e) {
                    assert.isTrue(e.indexOf('has no permission to sign') != -1);
                }

            });

            it('should multi-sign duplicated a transaction by active permission', async function () {

                const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);
                try {
                    let signedTransaction = await tronWeb.trx.multiSign(transaction, accounts.pks[ownerIdx], 2);
                    await tronWeb.trx.multiSign(signedTransaction, accounts.pks[ownerIdx], 2);
                } catch (e) {
                    assert.isTrue(e.indexOf('already sign transaction') != -1);
                }

            });

            it('should multi-sign a transaction with permission error by both owner and active permission', async function () {

                try {
                    const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);
                    let signedTransaction = await tronWeb.trx.multiSign(transaction, accounts.pks[ownerIdx], 0);
                    await tronWeb.trx.multiSign(signedTransaction, accounts.pks[ownerIdx], 2);
                } catch (e) {
                    assert.isTrue(e.indexOf('not contained of permission') != -1);
                }

            });

            it('should multi-sign a transaction with wrong permission id error', async function () {

                try {
                    const transaction = await tronWeb.transactionBuilder.freezeBalance(10e5, 3, 'BANDWIDTH', accounts.b58[ownerIdx]);
                    await tronWeb.trx.multiSign(transaction, accounts.pks[ownerIdx], 1);
                } catch (e) {
                    assert.isTrue(e.indexOf('Permission for this, does not exist!') != -1);
                }

            });

        });

    });
});

