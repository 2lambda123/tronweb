const {testRevert, testConstant, arrayParam, tronToken, testAddressArray, trcTokenTest070, trcTokenTest059} = require('../util/contracts');
const assertThrow = require('../../helpers/assertThrow');
const broadcaster = require('../util/broadcaster');
const pollAccountFor = require('../../helpers/pollAccountFor');
const tronWebBuilder = require('../util/tronWebBuilder');
const assertEqualHex = require('../../helpers/assertEqualHex');
const waitChainData = require('../util/waitChainData');
const publicMethod = require('../util/PublicMethod');
const txPars = require('../../helpers/txPars');
const wait = require('../../helpers/wait');
const jlog = require('../../helpers/jlog');
const util = require('util');
const chai = require('chai');
const assert = chai.assert;
const _ = require('lodash');
const TronWeb = tronWebBuilder.TronWeb;
const {
    ADDRESS_HEX,
    ADDRESS_BASE58,
    UPDATED_TEST_TOKEN_OPTIONS,
    PRIVATE_KEY,
    getTokenOptions,
    isProposalApproved,
    TOKEN_ID
} = require('../util/config');

describe('TronWeb.transactionBuilder', function () {

    let accounts;
    let tronWeb;
    let emptyAccount;

    before(async function () {
        emptyAccount = await TronWeb.createAccount();
        tronWeb = tronWebBuilder.createInstance();
        await tronWebBuilder.newTestAccountsInMain(26);
        accounts = await tronWebBuilder.getTestAccountsInMain(26);
    });

    describe('#constructor()', function () {

        it('should have been set a full instance in tronWeb', function () {

            assert.instanceOf(tronWeb.transactionBuilder, TronWeb.TransactionBuilder);
        });

    });

    describe('#sendTrx()', function () {

        it(`should send 10 trx from default address to accounts[1]`, async function () {
            const params = [
                [accounts.b58[1], 10, {permissionId: 2}],
                [accounts.b58[1], 10]
            ];
            for (let param of params) {
                const transaction = await tronWeb.transactionBuilder.sendTrx(...param);

                const parameter = txPars(transaction);

                assert.equal(transaction.txID.length, 64);
                assert.equal(parameter.value.amount, 10);
                assert.equal(parameter.value.owner_address, ADDRESS_HEX);
                assert.equal(parameter.value.to_address, accounts.hex[1]);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.TransferContract');
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, param[2] ? param[2]['permissionId'] : 0);
            }
        });

        it(`should send 10 trx from accounts[0] to accounts[1]`, async function () {
            const params = [
                [accounts.b58[1], 10, accounts.b58[0], {permissionId: 2}],
                [accounts.b58[1], 10, accounts.b58[0]]
            ];
            for (let param of params) {
                const transaction = await tronWeb.transactionBuilder.sendTrx(...param);
                const parameter = txPars(transaction);

                assert.equal(transaction.txID.length, 64);
                assert.equal(parameter.value.amount, 10);
                assert.equal(parameter.value.owner_address, accounts.hex[0]);
                assert.equal(parameter.value.to_address, accounts.hex[1]);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.TransferContract');
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, param[3] ? param[3]['permissionId'] : 0);
            }

        });

        it('should throw if an invalid address is passed', async function () {

            await assertThrow(
                tronWeb.transactionBuilder.sendTrx('40f0b27e3d16060a5b0e8e995120e00', 10),
                'Invalid recipient address provided'
            );

        });

        it('should throw if an invalid amount is passed', async function () {

            await assertThrow(
                tronWeb.transactionBuilder.sendTrx(accounts.hex[2], -10),
                'Invalid amount provided'
            );

        });

        it('should throw if an invalid origin address is passed', async function () {

            await assertThrow(
                tronWeb.transactionBuilder.sendTrx(accounts.hex[3], 10, '40f0b27e3d16060a5b0e8e995120e00'),
                'Invalid origin address provided'
            );

        });


        it('should throw if trying to transfer to itself', async function () {

            await assertThrow(
                tronWeb.transactionBuilder.sendTrx(accounts.hex[3], 10, accounts.hex[3]),
                'Cannot transfer TRX to the same account'
            );

        });

        it('should throw if trying to transfer from an account with not enough funds', async function () {

            await assertThrow(
                tronWeb.transactionBuilder.sendTrx(accounts.hex[3], 10, emptyAccount.address.base58),
                null,
                'ContractValidateException'
            );

        });
    });

    describe('#createToken()', function () {

        // This test passes only the first time because, in order to test updateToken, we broadcast the token creation

        it(`should allow accounts[2] to create a TestToken`, async function () {

            const options = getTokenOptions();
            for (let i = 0; i < 2; i++) {
                if (i === 1) options.permissionId = 2;
                const transaction = await tronWeb.transactionBuilder.createToken(options, accounts.b58[2]);
                const parameter = txPars(transaction);
                assert.equal(transaction.txID.length, 64);
                assert.equal(parameter.value.total_supply, options.totalSupply);
                await assertEqualHex(parameter.value.abbr, options.abbreviation);
                assert.equal(parameter.value.owner_address, accounts.hex[2]);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.AssetIssueContract');
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, options.permissionId || 0);

            }
        });

        it(`should allow accounts[8] to create a TestToken with voteScore and precision`, async function () {
            const options = getTokenOptions();
            options.voteScore = 5;
            options.precision = 4;

            for (let i = 0; i < 2; i++) {
                if (i === 1) options.permissionId = 2;
                const transaction = await tronWeb.transactionBuilder.createToken(options, accounts.b58[8 + i]);

                const parameter = txPars(transaction);
                assert.equal(transaction.txID.length, 64);
                assert.equal(parameter.value.vote_score, options.voteScore);
                assert.equal(parameter.value.precision, options.precision);
                assert.equal(parameter.value.total_supply, options.totalSupply);
                await assertEqualHex(parameter.value.abbr, options.abbreviation);
                assert.equal(parameter.value.owner_address, accounts.hex[8 + i]);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.AssetIssueContract');
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, options.permissionId || 0);

                await broadcaster.broadcaster(null, accounts.pks[8 + i], transaction)

                const tokenList = await tronWeb.trx.getTokensIssuedByAddress(accounts.b58[8 + i])
                const tokenID = tokenList[options.name].id
                const token = await tronWeb.trx.getTokenByID(tokenID)

                assert.equal(token.vote_score, options.voteScore);
                assert.equal(token.precision, options.precision);
            }
        });

        it(`should create a TestToken passing any number as a string`, async function () {
            const options = getTokenOptions();
            options.totalSupply = '100'
            options.frozenAmount = '5'
            options.frozenDuration = '2'
            options.saleEnd = options.saleEnd.toString()
            for (let i = 0; i < 2; i++) {
                if (i === 1) options.permissionId = 2;
                const transaction = await tronWeb.transactionBuilder.createToken(options, accounts.b58[25]);
                const parameter = txPars(transaction);
                await assertEqualHex(parameter.value.abbr, options.abbreviation);
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, options.permissionId || 0);
            }
        });

        it(`should create a TestToken without freezing anything in 3.6.0`, async function () {
            if (tronWeb.fullnodeSatisfies('^3.6.0')) {
                const options = getTokenOptions();
                options.totalSupply = '100'
                options.frozenAmount = '0'
                options.frozenDuration = '0'
                options.saleEnd = options.saleEnd.toString()
                for (let i = 0; i < 2; i++) {
                    if (i === 1) options.permissionId = 2;
                    const transaction = await tronWeb.transactionBuilder.createToken(options);
                    const parameter = txPars(transaction);
                    await assertEqualHex(parameter.value.abbr, options.abbreviation);
                    assert.equal(transaction.raw_data.contract[0].Permission_id || 0, options.permissionId || 0);
                }
            } else {
                this.skip()
            }
        });

        it(`should allow create a TestToken with precision is 0 or 6`, async function () {
            const options = getTokenOptions();

            options.precision = 0;
            let transaction = await tronWeb.transactionBuilder.createToken(options, accounts.b58[11]);
            let parameter = txPars(transaction);
            console.log("parameter: "+util.inspect(parameter,true,null,true));
            const precision = typeof (parameter.value.precision) === 'number' ? (parameter.value.precision) : 0;
            assert.equal(transaction.txID.length, 64);
            assert.equal(parameter.value.vote_score, options.voteScore);
            assert.equal(precision, options.precision);
            assert.equal(parameter.value.total_supply, options.totalSupply);
            await assertEqualHex(parameter.value.abbr, options.abbreviation);
            assert.equal(parameter.value.owner_address, accounts.hex[11]);
            assert.equal(parameter.type_url, 'type.googleapis.com/protocol.AssetIssueContract');
            await broadcaster.broadcaster(null, accounts.pks[11], transaction)
            let tokenList = await tronWeb.trx.getTokensIssuedByAddress(accounts.b58[11])
            let tokenID = tokenList[options.name].id
            let token = await tronWeb.trx.getTokenByID(tokenID)
            const tokenPrecision = typeof (token.precision) === 'number' ? (token.precision) : 0;
            assert.equal(tokenPrecision, options.precision);

            options.precision = 6;
            transaction = await tronWeb.transactionBuilder.createToken(options, accounts.b58[12]);
            parameter = txPars(transaction);
            console.log("parameter: "+util.inspect(parameter,true,null,true));
            assert.equal(transaction.txID.length, 64);
            assert.equal(parameter.value.vote_score, options.voteScore);
            assert.equal(parameter.value.precision, options.precision);
            assert.equal(parameter.value.total_supply, options.totalSupply);
            await assertEqualHex(parameter.value.abbr, options.abbreviation);
            assert.equal(parameter.value.owner_address, accounts.hex[12]);
            assert.equal(parameter.type_url, 'type.googleapis.com/protocol.AssetIssueContract');
            await broadcaster.broadcaster(null, accounts.pks[12], transaction)
            tokenList = await tronWeb.trx.getTokensIssuedByAddress(accounts.b58[12])
            tokenID = tokenList[options.name].id
            token = await tronWeb.trx.getTokenByID(tokenID)
            assert.equal(token.precision, options.precision);
        });

        it('should throw if an invalid name is passed', async function () {

            const options = getTokenOptions();
            options.name = 123;

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid token name provided'
            );

        });

        it('should throw if an invalid abbrevation is passed', async function () {

            const options = getTokenOptions();
            options.abbreviation = 123;

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid token abbreviation provided'
            );

        });

        it('should throw if an invalid supply amount is passed', async function () {

            const options = getTokenOptions();
            options.totalSupply = [];

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Supply amount must be a positive integer'
            );

        });

        it('should throw if TRX ratio is not a positive integer', async function () {

            const options = getTokenOptions();
            options.trxRatio = {};

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'TRX ratio must be a positive integer'
            );

        });

        it('should throw if token ratio is not a positive integer', async function () {

            const options = getTokenOptions();
            options.tokenRatio = 'tokenRatio';

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Token ratio must be a positive integer'
            );

        });

        it('should throw if sale start is invalid', async function () {

            const options = getTokenOptions();
            options.saleStart = Date.now() - 1;

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid sale start timestamp provided'
            );

            options.saleStart = 'something';

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid sale start timestamp provided'
            );

        });

        it('should throw if sale end is invalid', async function () {

            const options = getTokenOptions();
            options.saleEnd = Date.now() - 1000;

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid sale end timestamp provided'
            );

            options.saleEnd = 'something';

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid sale end timestamp provided'
            );

        });

        it('should throw if an invalid description is passed', async function () {

            const options = getTokenOptions();
            options.description = 123;

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid token description provided'
            );

            options.description = '';

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid token description provided'
            );

        });

        it('should throw if an invalid url is passed', async function () {

            const options = getTokenOptions();
            options.url = 123;

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid token url provided'
            );

            options.url = '';

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid token url provided'
            );

            options.url = '//www.example.com';

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid token url provided'
            );

        });

        it('should throw if freeBandwidth is invalid', async function () {

            const options = getTokenOptions();
            options.freeBandwidth = -1;

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid Free bandwidth amount provided'
            );

            options.freeBandwidth = 'something';

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid Free bandwidth amount provided'
            );

        });

        it('should throw if freeBandwidthLimit is invalid', async function () {
            const options = getTokenOptions();

            options.freeBandwidth = 10;
            delete options.freeBandwidthLimit;

            console.log("accounts.b58[22]:"+util.inspect(accounts.b58[22],true,null,true))
            await assertThrow(
                tronWeb.transactionBuilder.createToken(options,accounts.b58[22]),
                'Invalid Free bandwidth limit provided'
            );

            options.freeBandwidthLimit = 'something';

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid Free bandwidth limit provided'
            );

        });

        it('should throw if frozen supply is invalid', async function () {

            const options = getTokenOptions();
            options.frozenAmount = -1;

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid Frozen supply provided'
            );

            options.frozenAmount = 'something';

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid Frozen supply provided'
            );
        });

        it('should throw if frozen duration is invalid', async function () {
            const options = getTokenOptions();

            options.frozenDuration = 'something';

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'Invalid Frozen duration provided'
            );

        });

        it('should throw if the issuer address is invalid', async function () {

            const options = getTokenOptions();

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options, '0xzzzww'),
                'Invalid issuer address provided'
            );

        });

        it('should throw if precision is invalid', async function () {

            const options = getTokenOptions();
            options.precision = -1;

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'precision must be a positive integer >= 0 and <= 6'
            );

            options.precision = 7;

            await assertThrow(
                tronWeb.transactionBuilder.createToken(options),
                'precision must be a positive integer >= 0 and <= 6'
            );

        });

        describe('#createAsset()', function () {

            // This test passes only the first time because, in order to test updateToken, we broadcast the token creation

            it(`should allow accounts[2] to create a TestToken`, async function () {
                const options = getTokenOptions();
                const transaction = await tronWeb.transactionBuilder.createAsset(options, accounts.b58[2]);
                const parameter = txPars(transaction);
                assert.equal(transaction.txID.length, 64);
                assert.equal(parameter.value.total_supply, options.totalSupply);
                await assertEqualHex(parameter.value.abbr, options.abbreviation);
                assert.equal(parameter.value.owner_address, accounts.hex[2]);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.AssetIssueContract');
            });
        });

    });

    describe('#updateAccount()', function () {

        it(`should update accounts[3]`, async function () {
            const newName = 'New name'
            const params = [
                [newName, accounts.b58[3], {permissionId: 2}],
                [newName, accounts.b58[3]]
            ];

            for (let param of params) {
                const transaction = await tronWeb.transactionBuilder.updateAccount(...param);
                const parameter = txPars(transaction);

                assert.equal(transaction.txID.length, 64);
                await assertEqualHex(parameter.value.account_name, newName);
                assert.equal(parameter.value.owner_address, accounts.hex[3]);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.AccountUpdateContract');
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, param[2] ? param[2]['permissionId'] : 0);
            }
        });

        it('should throw if an invalid name is passed', async function () {

            await assertThrow(
                tronWeb.transactionBuilder.updateAccount(123, accounts.b58[4]),
                'Invalid Name provided'
            );

        });

        it('should throw if the issuer address is invalid', async function () {

            await assertThrow(
                tronWeb.transactionBuilder.updateAccount('New name', '0xzzzww'),
                'Invalid origin address provided'
            );

        });

    });

    describe('#setAccountId()', function () {

        it(`should set account id accounts[4]`, async function () {

            const ids = ['abcabc110', 'testtest', 'jackieshen110'];

            for (let id of ids) {
                let accountId = TronWeb.toHex(id);
                const transaction = await tronWeb.transactionBuilder.setAccountId(accountId, accounts.b58[4]);
                const parameter = txPars(transaction);
                assert.equal(transaction.txID.length, 64);
                assert.equal(parameter.value.account_id, accountId.slice(2));
                assert.equal(parameter.value.owner_address, accounts.hex[4]);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.SetAccountIdContract');
            }

        });

        it('should throw invalid account id error', async function () {

            // account id length should be between 8 and 32
            const ids = ['', '12', '616161616262626231313131313131313131313131313131313131313131313131313131313131']
            for (let id of ids) {
                await assertThrow(
                    tronWeb.transactionBuilder.setAccountId(id, accounts.b58[4]),
                    'Invalid accountId provided'
                );
            }

        });

        it('should throw invalid owner address error', async function () {

            await assertThrow(
                tronWeb.transactionBuilder.setAccountId(TronWeb.toHex('testtest001'), '0xzzzww'),
                'Invalid origin address provided'
            );

        });

    });

    describe('#updateToken()', function () {

        let tokenOptions
        let tokenID

        before(async function () {

            this.timeout(10000)

            tokenOptions = getTokenOptions();
            await broadcaster.broadcaster(tronWeb.transactionBuilder.createToken(tokenOptions, accounts.b58[2]), accounts.pks[2])

            let tokenList
            while (!tokenList) {
                tokenList = await tronWeb.trx.getTokensIssuedByAddress(accounts.b58[2])
            }
            tokenID = tokenList[tokenOptions.name].id
        });

        it(`should allow accounts[2] to update a TestToken`, async function () {
            for (let i = 0; i < 2; i++) {
                if (i === 1) UPDATED_TEST_TOKEN_OPTIONS.permissionId = 2;
                const transaction = await tronWeb.transactionBuilder.updateToken(UPDATED_TEST_TOKEN_OPTIONS, accounts.b58[2]);
                const parameter = txPars(transaction);
                assert.equal(transaction.txID.length, 64);
                await assertEqualHex(parameter.value.description, UPDATED_TEST_TOKEN_OPTIONS.description);
                await assertEqualHex(parameter.value.url, UPDATED_TEST_TOKEN_OPTIONS.url);
                assert.equal(parameter.value.owner_address, accounts.hex[2]);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.UpdateAssetContract');
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, UPDATED_TEST_TOKEN_OPTIONS.permissionId || 0);
            }
        });

        it('should throw if an invalid description is passed', async function () {

            const options = _.clone(UPDATED_TEST_TOKEN_OPTIONS);
            options.description = 123;

            await assertThrow(
                tronWeb.transactionBuilder.updateToken(options, accounts.hex[2]),
                'Invalid token description provided'
            );

            options.description = '';

            await assertThrow(
                tronWeb.transactionBuilder.updateToken(options, accounts.hex[2]),
                'Invalid token description provided'
            );

        });


        it('should throw if an invalid url is passed', async function () {

            const options = _.clone(UPDATED_TEST_TOKEN_OPTIONS);
            options.url = 123;

            await assertThrow(
                tronWeb.transactionBuilder.updateToken(options, accounts.hex[2]),
                'Invalid token url provided'
            );

            options.url = '';

            await assertThrow(
                tronWeb.transactionBuilder.updateToken(options, accounts.hex[2]),
                'Invalid token url provided'
            );

            options.url = '//www.example.com';

            await assertThrow(
                tronWeb.transactionBuilder.updateToken(options, accounts.hex[2]),
                'Invalid token url provided'
            );

        });

        it('should throw if freeBandwidth is invalid', async function () {

            const options = _.clone(UPDATED_TEST_TOKEN_OPTIONS);
            options.freeBandwidth = -1;

            await assertThrow(
                tronWeb.transactionBuilder.updateToken(options, accounts.hex[2]),
                'Free bandwidth amount must be a positive integer'
            );

            options.freeBandwidth = 'something';

            await assertThrow(
                tronWeb.transactionBuilder.updateToken(options, accounts.hex[2]),
                'Free bandwidth amount must be a positive integer'
            );

        });

        it('should throw if freeBandwidthLimit is invalid', async function () {
            const options = _.clone(UPDATED_TEST_TOKEN_OPTIONS);

            options.freeBandwidth = 10;
            delete options.freeBandwidthLimit;

            await assertThrow(
                tronWeb.transactionBuilder.updateToken(options, accounts.hex[20]),
                'Free bandwidth limit must be a positive integer'
            );

            options.freeBandwidthLimit = 'something';

            await assertThrow(
                tronWeb.transactionBuilder.updateToken(options, accounts.hex[20]),
                'Free bandwidth limit must be a positive integer'
            );

        });

        it('should throw if the issuer address is invalid', async function () {

            await assertThrow(
                tronWeb.transactionBuilder.updateToken(UPDATED_TEST_TOKEN_OPTIONS, '0xzzzww'),
                'Invalid issuer address provided'
            );

        });

        describe('#updateAsset()', async function () {
            it(`should allow accounts[2] to update a TestToken`, async function () {
                const transaction = await tronWeb.transactionBuilder.updateAsset(UPDATED_TEST_TOKEN_OPTIONS, accounts.b58[2]);
                const parameter = txPars(transaction);
                assert.equal(transaction.txID.length, 64);
                await assertEqualHex(parameter.value.description, UPDATED_TEST_TOKEN_OPTIONS.description);
                await assertEqualHex(parameter.value.url, UPDATED_TEST_TOKEN_OPTIONS.url);
                assert.equal(parameter.value.owner_address, accounts.hex[2]);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.UpdateAssetContract');
            });
        });

    });

    describe('#purchaseToken()', function () {

        let tokenOptions
        let tokenID

        before(async function () {

            this.timeout(10000)

            tokenOptions = getTokenOptions();

            await broadcaster.broadcaster(tronWeb.transactionBuilder.createToken(tokenOptions, accounts.b58[5]), accounts.pks[5])

            let tokenList
            while (!tokenList) {
                tokenList = await tronWeb.trx.getTokensIssuedByAddress(accounts.b58[5])
            }
            console.log("tokenList:"+util.inspect(tokenList,true,null,true))
            tokenID = tokenList[tokenOptions.name].id
            assert.equal(tokenList[tokenOptions.name].abbr, tokenOptions.abbreviation)
        });

        it('should verify that the asset has been created', async function () {

            let token
            token = await tronWeb.trx.getTokenByID(tokenID)
            assert.equal(token.id, tokenID)
            assert.equal(token.name, tokenOptions.name)
        })

        it(`should allow accounts[2] to purchase a token created by accounts[5]`, async function () {
            this.timeout(20000)

            const params = [
                [accounts.b58[5], tokenID, 20, accounts.b58[2], {permissionId: 2}],
                [accounts.b58[5], tokenID, 20, accounts.b58[2]]
            ];

            for (let param of params) {
                await wait(4)

                const transaction = await tronWeb.transactionBuilder.purchaseToken(...param);
                const parameter = txPars(transaction);
                assert.equal(transaction.txID.length, 64);
                assert.equal(parameter.value.amount, 20);
                assert.equal(parameter.value.owner_address, accounts.hex[2]);
                assert.equal(parameter.value.to_address, accounts.hex[5]);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.ParticipateAssetIssueContract');
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, param[4] ? param[4]['permissionId'] : 0);
            }
        });

        it("should throw if issuerAddress is invalid", async function () {

            await assertThrow(
                tronWeb.transactionBuilder.purchaseToken('sasdsadasfa', tokenID, 20, accounts.b58[2]),
                'Invalid issuer address provided'
            )

        });

        it("should throw if issuerAddress is not the right one", async function () {
            await assertThrow(
                tronWeb.transactionBuilder.purchaseToken(accounts.b58[4], tokenID, 20, accounts.b58[2]),
                null,
                'The asset is not issued by'
            )
        });

        it("should throw if the token Id is invalid", async function () {

            await assertThrow(
                tronWeb.transactionBuilder.purchaseToken(accounts.b58[5], 123432, 20, accounts.b58[2]),
                'Invalid token ID provided'
            )
        });

        it("should throw if token does not exist", async function () {

            await assertThrow(
                tronWeb.transactionBuilder.purchaseToken(accounts.b58[5], '1110000', 20, accounts.b58[2]),
                null,
                'No asset named '
            )

        });

        it("should throw if buyer address is invalid", async function () {

            await assertThrow(
                tronWeb.transactionBuilder.purchaseToken(accounts.b58[5], tokenID, 20, 'sasdadasdas'),
                'Invalid buyer address provided'
            )

        });

        it("should throw if amount is invalid", async function () {

            await assertThrow(
                tronWeb.transactionBuilder.purchaseToken(accounts.b58[5], tokenID, -3, accounts.b58[2]),
                'Invalid amount provided'
            )

            await assertThrow(
                tronWeb.transactionBuilder.purchaseToken(accounts.b58[5], tokenID, "some-amount", accounts.b58[2]),
                'Invalid amount provided'
            )
        });
    });

    describe('#sendToken()', function () {

        let tokenOptions
        let tokenID

        before(async function () {

            this.timeout(30000)

            tokenOptions = getTokenOptions();

            await broadcaster.broadcaster(tronWeb.transactionBuilder.createToken(tokenOptions, accounts.b58[6]), accounts.pks[6])

            let tokenList
            while (!tokenList) {
                tokenList = await tronWeb.trx.getTokensIssuedByAddress(accounts.b58[6])
            }
            console.log("tokenList2:"+util.inspect(tokenList,true,null,true))
            tokenID = tokenList[tokenOptions.name].id
        });

        it('should verify that the asset has been created', async function () {

            let token
            token = await tronWeb.trx.getTokenByID(tokenID)
            assert.equal(token.id, tokenID)
            assert.equal(token.name, tokenOptions.name)
        })

        it("should allow accounts [7]  to send a token to accounts[1]", async function () {

            this.timeout(30000)

            const params = [
                [accounts.b58[1], 5, tokenID, accounts.b58[7], {permissionId: 2}],
                [accounts.b58[1], 5, tokenID, accounts.b58[7]]
            ];

            for (let param of params) {
                await wait(4)

                await broadcaster.broadcaster(tronWeb.transactionBuilder.purchaseToken(accounts.b58[6], tokenID, 50, accounts.b58[7]), accounts.pks[7])

                await wait(10)

                const transaction = await tronWeb.transactionBuilder.sendToken(...param)

                const parameter = txPars(transaction)

                assert.equal(parameter.value.amount, 5)
                assert.equal(parameter.value.owner_address, accounts.hex[7]);
                assert.equal(parameter.value.to_address, accounts.hex[1]);
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, param[4] ? param[4]['permissionId'] : 0);

            }

        });


        it("should allow accounts [6]  to send a token to accounts[1]", async function () {

            const params = [
                [accounts.b58[1], 5, tokenID, accounts.b58[6], {permissionId: 2}],
                [accounts.b58[1], 5, tokenID, accounts.b58[6]]
            ];

            for (let param of params) {
                const transaction = await tronWeb.transactionBuilder.sendToken(...param)

                const parameter = txPars(transaction);

                assert.equal(parameter.value.amount, 5)
                assert.equal(parameter.value.owner_address, accounts.hex[6]);
                assert.equal(parameter.value.to_address, accounts.hex[1]);
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, param[4] ? param[4]['permissionId'] : 0);
            }

        });

        it("should throw if recipient address is invalid", async function () {

            await assertThrow(
                tronWeb.transactionBuilder.sendToken('sadasfdfsgdfgssa', 5, tokenID, accounts.b58[7]),
                'Invalid recipient address provided'
            )

        });

        it("should throw if the token Id is invalid", async function () {

            await assertThrow(
                tronWeb.transactionBuilder.sendToken(accounts.b58[1], 5, 143234, accounts.b58[7]),
                'Invalid token ID provided'
            )
        });

        it("should throw if origin address is invalid", async function () {

            await assertThrow(
                tronWeb.transactionBuilder.sendToken(accounts.b58[1], 5, tokenID, 213253453453),
                'Invalid origin address provided'
            )

        });

        it("should throw if amount is invalid", async function () {

            await assertThrow(
                tronWeb.transactionBuilder.sendToken(accounts.b58[1], -5, tokenID, accounts.b58[7]),
                'Invalid amount provided'
            )

            await assertThrow(
                tronWeb.transactionBuilder.sendToken(accounts.b58[1], 'amount', tokenID, accounts.b58[7]),
                'Invalid amount provided'
            )
        });
    });

    describe("#createProposal", async function () {

        let parameters = [{"key": 0, "value": 100000}, {"key": 1, "value": 2}]
        const witnessAccount = "TT1smsmhxype64boboU8xTuNZVCKP1w6qT"

        it('should allow the SR account to create a new proposal as a single object', async function () {

            const inputs = [
                [parameters[0], witnessAccount, {permissionId: 2}],
                [parameters[0], witnessAccount]
            ];
            await tronWeb.trx.sendTrx(witnessAccount,10000000000,{privateKey: PRIVATE_KEY})
            for (let input of inputs) {
                const transaction = await tronWeb.transactionBuilder.createProposal(...input)

                const parameter = txPars(transaction);

                assert.equal(parameter.value.owner_address, "41bafb56091591790e00aa05eaddcc7dc1474b5d4b");
                assert.equal(parameter.value.parameters[0].value, parameters[0].value);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.ProposalCreateContract');
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, input[2] ? input[2]['permissionId'] : 0);
            }

        })

        it('should allow the SR account to create a new proposal as an array of objects', async function () {

            const inputs = [
                [parameters, witnessAccount, {permissionId: 2}],
                [parameters, witnessAccount]
            ];

            for (let input of inputs) {
                const transaction = await tronWeb.transactionBuilder.createProposal(...input)

                const parameter = txPars(transaction);

                assert.equal(parameter.value.owner_address, "41bafb56091591790e00aa05eaddcc7dc1474b5d4b");
                assert.equal(parameter.value.parameters[0].value, parameters[0].value);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.ProposalCreateContract');
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, input[2] ? input[2]['permissionId'] : 0);
            }

        })

        it("should throw if issuer address is invalid", async function () {

            await assertThrow(
                tronWeb.transactionBuilder.createProposal(parameters, 'sadasdsffdgdf'),
                'Invalid issuer address provided'
            )

        });


        it("should throw if the issuer address is not an SR", async function () {

            await assertThrow(
                tronWeb.transactionBuilder.createProposal(parameters, accounts.b58[0]),
                null,
                `Witness[${accounts.hex[0]}] not exists`
            )

        });

        // TODO Complete throws

    });

    describe("#deleteProposal", async function () {


        let proposals;
        const witnessAccount = "TT1smsmhxype64boboU8xTuNZVCKP1w6qT"
        const witnessKey = "9FD8E129DE181EA44C6129F727A6871440169568ADE002943EAD0E7A16D8EDAC"

        before(async function () {

            this.timeout(20000)

            let parameters = [{"key": 0, "value": 100000}, {"key": 1, "value": 2}]

            await broadcaster.broadcaster(tronWeb.transactionBuilder.createProposal(parameters, witnessAccount), witnessKey)

            proposals = await tronWeb.trx.listProposals();
            console.log("proposals:"+util.inspect(proposals,true,null,true))
        })

        after(async function () {
            proposals = await tronWeb.trx.listProposals();
            for (let proposal of proposals) {
                if (proposal.state !== 'CANCELED')
                    await broadcaster.broadcaster(tronWeb.transactionBuilder.deleteProposal(proposal.proposal_id, witnessAccount), witnessKey)
            }
        })

        it('should allow the SR to delete its own proposal', async function () {

            const params = [
                [proposals[0].proposal_id, witnessAccount, {permissionId: 2}],
                [proposals[0].proposal_id, witnessAccount]
            ];
            for (let param of params) {
                const transaction = await tronWeb.transactionBuilder.deleteProposal(...param,)
                const parameter = txPars(transaction);

                assert.equal(parameter.value.owner_address, "41bafb56091591790e00aa05eaddcc7dc1474b5d4b");
                assert.equal(parameter.value.proposal_id, proposals[0].proposal_id);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.ProposalDeleteContract');
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, param[2] ? 2 : 0);
            }

        })

        it('should throw trying to cancel an already canceled proposal', async function () {

            await broadcaster.broadcaster(await tronWeb.transactionBuilder.deleteProposal(proposals[0].proposal_id, witnessAccount), witnessKey);

            await assertThrow(
                tronWeb.transactionBuilder.deleteProposal(proposals[0].proposal_id, witnessAccount),
                null,
                `Proposal[${proposals[0].proposal_id}] canceled`);

        })

        // TODO add invalid params throws

    });

    describe.skip("#applyForSR", async function () {

        let url = 'https://xtron.network';

        it('should allow accounts[0] to apply for SR', async function () {

            const transaction = await tronWeb.transactionBuilder.applyForSR(accounts.b58[10], url);
            const parameter = txPars(transaction);

            assert.equal(parameter.value.owner_address, accounts.hex[10]);
            await assertEqualHex(parameter.value.url, url);
            assert.equal(parameter.type_url, 'type.googleapis.com/protocol.WitnessCreateContract');
        });

        // TODO add invalid params throws
    });

    describe("#freezeBalance", async function () {

        it('should allows accounts[1] to freeze its balance', async function () {
            const params = [
                [100e6, 3, 'BANDWIDTH', accounts.b58[1], {permissionId: 2}],
                [100e6, 3, 'BANDWIDTH', accounts.b58[1]]
            ];

            for (let param of params) {
                const transaction = await tronWeb.transactionBuilder.freezeBalance(...param)

                const parameter = txPars(transaction);
                // jlog(parameter)
                assert.equal(parameter.value.owner_address, accounts.hex[1]);
                assert.equal(parameter.value.frozen_balance, 100e6);
                assert.equal(parameter.value.frozen_duration, 3);
                assert.equal(parameter.type_url, 'type.googleapis.com/protocol.FreezeBalanceContract');
                assert.equal(transaction.raw_data.contract[0].Permission_id || 0, param[4] ? param[4]['permissionId'] : 0);
            }
        })

        // TODO add invalid params throws

    });

    describe("#unfreezeBalance", async function () {

        // TODO this is not fully testable because the minimum time before unfreezing is 3 days

    });

    describe.skip("#vote", async function () {
        // this is not testable because on Tron Quickstart (like on Shasta) it is not possible to vote

        let url = 'https://xtron.network';
        // let witnesses;


        before(async function () {

            await broadcaster.broadcaster(tronWeb.transactionBuilder.applyForSR(accounts.b58[0], url), accounts.pks[0])
            await broadcaster.broadcaster(tronWeb.transactionBuilder.freezeBalance(100e6, 3, 'BANDWIDTH', accounts.b58[1]), accounts.pks[1])
        })


        it('should allows accounts[1] to vote for accounts[0] as SR', async function () {
            let votes = {}
            votes[accounts.hex[0]] = 5

            const transaction = await tronWeb.transactionBuilder.vote(votes, accounts.b58[1])
            const parameter = txPars(transaction);

            assert.equal(parameter.value.owner_address, accounts.hex[1]);
            assert.equal(parameter.value.votes[0].vote_address, accounts.hex[0]);
            assert.equal(parameter.value.votes[0].vote_count, 5);
            assert.equal(parameter.type_url, 'type.googleapis.com/protocol.VoteWitnessContract');
        })

    });

    describe("#createSmartContract", async function () {

        it('should create a smart contract with default parameters', async function () {

            const options = {
                abi: testRevert.abi,
                bytecode: testRevert.bytecode
            };
            for (let i = 0; i < 2; i++) {
                if (i === 1) options.permissionId = 2;
                const tx = await tronWeb.transactionBuilder.createSmartContract(options)
                assert.equal(tx.raw_data.contract[0].parameter.value.new_contract.consume_user_resource_percent, 100);
                assert.equal(tx.raw_data.contract[0].parameter.value.new_contract.origin_energy_limit, 1e7);
                assert.equal(tx.raw_data.fee_limit, 15e7);
                assert.equal(tx.raw_data.contract[0].Permission_id || 0, options.permissionId || 0);
            }
        });

        it('should create a smart contract with array parameters', async function () {
            this.timeout(20000);
            const bals = [1000, 2000, 3000, 4000];
            const options = {
                abi: arrayParam.abi,
                bytecode: arrayParam.bytecode,
                permissionId: 2,
                parameters: [
                    [accounts.hex[16], accounts.hex[17], accounts.hex[18], accounts.hex[19]],
                    [bals[0], bals[1], bals[2], bals[3]]
                ]
            };
            const transaction = await tronWeb.transactionBuilder.createSmartContract(options, accounts.hex[0]);
            await broadcaster.broadcaster(null, accounts.pks[0], transaction);
            while (true) {
                const tx = await tronWeb.trx.getTransactionInfo(transaction.txID);
                if (Object.keys(tx).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
            const deployed = await tronWeb.contract().at(transaction.contract_address);
            for (let j = 16; j <= 19; j++) {
                let bal = await deployed.balances(accounts.hex[j]).call();
                bal = bal.toNumber();
                assert.equal(bal, bals[j - 16]);
            }
        });

        it('should create a smart contract with array[3] parameters', async function () {
            const options = {
                abi: testAddressArray.abi,
                bytecode: testAddressArray.bytecode,
                permissionId: 2,
                parameters: [
                    [accounts.hex[16], accounts.hex[17], accounts.hex[18]]
                ]
            };
            const transaction = await tronWeb.transactionBuilder.createSmartContract(options, accounts.hex[0]);
            await broadcaster.broadcaster(null, accounts.pks[0], transaction);
            while (true) {
                const tx = await tronWeb.trx.getTransactionInfo(transaction.txID);
                if (Object.keys(tx).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
            const deployed = await tronWeb.contract().at(transaction.contract_address);
            for (let j = 16; j <= 18; j++) {
                let bal = await deployed.balanceOf(accounts.hex[j]).call();
                bal = bal.toNumber();
                assert.equal(bal, 100000000);
            }
        });

        it('should create a smart contract with trctoken and stateMutability parameters', async function () {
            // before token balance
            const accountbefore = await tronWeb.trx.getAccount(ADDRESS_HEX);
            const accountTrc10BalanceBefore = accountbefore.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
            console.log("accountTrc10BalanceBefore:"+accountTrc10BalanceBefore);
            const options = {
                abi: trcTokenTest070.abi,
                bytecode: trcTokenTest070.bytecode,
                parameters: [
                    accounts.hex[16], TOKEN_ID, 123
                ],
                callValue:321,
                tokenId:TOKEN_ID,
                tokenValue:1e3
            };
            const transaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_HEX);
            await broadcaster.broadcaster(null, PRIVATE_KEY, transaction);
            let createInfo
            while (true) {
                createInfo = await tronWeb.trx.getTransactionInfo(transaction.txID);
                if (Object.keys(createInfo).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }

            // after token balance
            const accountAfter = await tronWeb.trx.getAccount(ADDRESS_HEX);
            const accountTrc10BalanceAfter = accountAfter.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
            console.log("accountTrc10BalanceAfter:"+accountTrc10BalanceAfter);
            const toAddressAfter = await tronWeb.trx.getAccount(accounts.hex[16]);
            const toAddressTrc10BalanceAfter = toAddressAfter.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
            console.log("toAddressTrc10BalanceAfter:"+toAddressTrc10BalanceAfter);
            assert.equal(accountTrc10BalanceAfter,(accountTrc10BalanceBefore-1e3));
            assert.equal(toAddressTrc10BalanceAfter,123);
        });

        it('should create a smart contract with payable parameters', async function () {
            // before token balance
            const accountbefore = await tronWeb.trx.getAccount(ADDRESS_HEX);
            const accountTrc10BalanceBefore = accountbefore.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
            console.log("accountTrc10BalanceBefore:"+accountTrc10BalanceBefore);
            const options = {
                abi: trcTokenTest059.abi,
                bytecode: trcTokenTest059.bytecode,
                parameters: [
                    accounts.hex[13], TOKEN_ID, 123
                ],
                callValue:321,
                tokenId:TOKEN_ID,
                tokenValue:1e3
            };
            const transaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_HEX);
            await broadcaster.broadcaster(null, PRIVATE_KEY, transaction);
            let createInfo
            while (true) {
                createInfo = await tronWeb.trx.getTransactionInfo(transaction.txID);
                if (Object.keys(createInfo).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }

            // after token balance
            const accountAfter = await tronWeb.trx.getAccount(ADDRESS_HEX);
            const accountTrc10BalanceAfter = accountAfter.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
            console.log("accountTrc10BalanceAfter:"+accountTrc10BalanceAfter);
            const toAddressAfter = await tronWeb.trx.getAccount(accounts.hex[13]);
            const toAddressTrc10BalanceAfter = toAddressAfter.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
            console.log("toAddressTrc10BalanceAfter:"+toAddressTrc10BalanceAfter);
            assert.equal(accountTrc10BalanceAfter,(accountTrc10BalanceBefore-1e3));
            assert.equal(toAddressTrc10BalanceAfter,123);
        });

        it('should create a smart contract and verify the parameters', async function () {

            const options = {
                abi: testRevert.abi,
                bytecode: testRevert.bytecode,
                userFeePercentage: 30,
                originEnergyLimit: 9e6,
                feeLimit: 9e8
            };
            for (let i = 0; i < 2; i++) {
                if (i === 1) options.permissionId = 2;
                const tx = await tronWeb.transactionBuilder.createSmartContract(options)
                assert.equal(tx.raw_data.contract[0].parameter.value.new_contract.consume_user_resource_percent, 30);
                assert.equal(tx.raw_data.contract[0].parameter.value.new_contract.origin_energy_limit, 9e6);
                assert.equal(tx.raw_data.fee_limit, 9e8);
                assert.equal(tx.raw_data.contract[0].Permission_id || 0, options.permissionId || 0);
            }
        });
    });

    describe("#triggerSmartContract", async function () {

        let transaction;
        let contractAddress;
        let contractAddressWithArray;
        let contractAddressWithTrctoken;
        before(async function () {
            transaction = await tronWeb.transactionBuilder.createSmartContract({
                abi: testConstant.abi,
                bytecode: testConstant.bytecode
            }, accounts.hex[6]);
            await broadcaster.broadcaster(null, accounts.pks[6], transaction);
            while (true) {
                const tx = await tronWeb.trx.getTransactionInfo(transaction.txID);
                if (Object.keys(tx).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
            contractAddress = transaction.contract_address;

            transaction = await tronWeb.transactionBuilder.createSmartContract({
                abi: testAddressArray.abi,
                bytecode: testAddressArray.bytecode,
                permissionId: 2,
                parameters: [
                    [accounts.hex[16], accounts.hex[17], accounts.hex[18]]
                ]
            }, accounts.hex[6]);
            await broadcaster.broadcaster(null, accounts.pks[6], transaction);
            while (true) {
                const tx = await tronWeb.trx.getTransactionInfo(transaction.txID);
                if (Object.keys(tx).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
            contractAddressWithArray = transaction.contract_address;

            const options = {
                abi: trcTokenTest070.abi,
                bytecode: trcTokenTest070.bytecode,
                parameters: [
                    accounts.hex[18], TOKEN_ID, 123
                ],
                callValue:321,
                tokenId:TOKEN_ID,
                tokenValue:1e3
            };
            transaction = await tronWeb.transactionBuilder.createSmartContract(options, ADDRESS_HEX);
            await broadcaster.broadcaster(null, PRIVATE_KEY, transaction);
            let createInfo
            while (true) {
                createInfo = await tronWeb.trx.getTransactionInfo(transaction.txID);
                if (Object.keys(createInfo).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
            contractAddressWithTrctoken = transaction.contract_address;
        })

        it('should trigger smart contract successfully', async function () {
            const issuerAddress = accounts.hex[6];
            const functionSelector = 'testPure(uint256,uint256)';
            const parameter = [
                {type: 'uint256', value: 1},
                {type: 'uint256', value: 2}
            ]
            const options = {};

            for (let i = 0; i < 2; i++) {
                if (i === 1) options.permissionId = 2;
                transaction = await tronWeb.transactionBuilder.triggerSmartContract(contractAddress, functionSelector, options,
                    parameter, issuerAddress);
                assert.isTrue(transaction.result.result &&
                    transaction.transaction.raw_data.contract[0].parameter.type_url === 'type.googleapis.com/protocol.TriggerSmartContract');
                assert.equal(transaction.constant_result, '0000000000000000000000000000000000000000000000000000000000000004');
                transaction = await broadcaster.broadcaster(null, accounts.pks[6], transaction.transaction);
                assert.isTrue(transaction.receipt.result)
                assert.equal(transaction.transaction.raw_data.contract[0].Permission_id || 0, options.permissionId || 0);
            }
        });

        it('should trigger smart contract with array[2] parameters', async function () {
            const functionSelector = 'transferWith2(address[2],uint256[2])';
            const parameter = [
                {type: 'address[2]', value: [accounts.hex[16], accounts.hex[17]]},
                {type: 'uint256[2]', value: [123456, 123456]}
            ]
            const transaction = await tronWeb.transactionBuilder.triggerSmartContract(contractAddressWithArray,  functionSelector, {},
                parameter, accounts.hex[6]);
            await broadcaster.broadcaster(null, accounts.pks[6], transaction.transaction);
            while (true) {
                const tx = await tronWeb.trx.getTransactionInfo(transaction.transaction.txID);
                if (Object.keys(tx).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
            const deployed = await tronWeb.contract().at(contractAddressWithArray);
            for (let j = 16; j <= 17; j++) {
                let bal = await deployed.balanceOf(accounts.hex[j]).call();
                bal = bal.toNumber();
                assert.equal(bal, 100123456);
            }
        });

        it('should trigger smart contract with array[] parameters', async function () {
            const functionSelector = 'transferWithArray(address[],uint256[])';
            const parameter = [
                {type: 'address[]', value: [accounts.hex[16], accounts.hex[17]]},
                {type: 'uint256[]', value: [123456, 123456]}
            ]
            const transaction = await tronWeb.transactionBuilder.triggerSmartContract(contractAddressWithArray,  functionSelector, {},
                parameter, accounts.hex[6]);
            await broadcaster.broadcaster(null, accounts.pks[6], transaction.transaction);
            while (true) {
                const tx = await tronWeb.trx.getTransactionInfo(transaction.transaction.txID);
                if (Object.keys(tx).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
            const deployed = await tronWeb.contract().at(contractAddressWithArray);
            for (let j = 16; j <= 17; j++) {
                let bal = await deployed.balanceOf(accounts.hex[j]).call();
                bal = bal.toNumber();
                assert.equal(bal, 100246912);
            }
        });

        it('should trigger smart contract with trctoken parameters', async function () {
            // before token balance
            const accountbefore = await tronWeb.trx.getAccount(contractAddressWithTrctoken);
            const accountTrc10BalanceBefore = accountbefore.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
            console.log("accountTrc10BalanceBefore:"+accountTrc10BalanceBefore);

            const functionSelector = 'TransferTokenTo(address,trcToken,uint256)';
            const parameter = [
                {type: 'address', value: accounts.hex[17]},
                {type: 'trcToken', value: TOKEN_ID},
                {type: 'uint256', value: 123}
            ];
            const transaction = await tronWeb.transactionBuilder.triggerSmartContract(contractAddressWithTrctoken,  functionSelector, {},
                parameter, accounts.hex[6]);
            await broadcaster.broadcaster(null, accounts.pks[6], transaction.transaction);
            while (true) {
                const tx = await tronWeb.trx.getTransactionInfo(transaction.transaction.txID);
                if (Object.keys(tx).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
            // after token balance
            const accountAfter = await tronWeb.trx.getAccount(contractAddressWithTrctoken);
            const accountTrc10BalanceAfter = accountAfter.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
            console.log("accountTrc10BalanceAfter:"+accountTrc10BalanceAfter);
            const toAddressAfter = await tronWeb.trx.getAccount(accounts.hex[17]);
            const toAddressTrc10BalanceAfter = toAddressAfter.assetV2.filter((item)=> item.key == TOKEN_ID)[0].value;
            console.log("toAddressTrc10BalanceAfter:"+toAddressTrc10BalanceAfter);
            assert.equal(accountTrc10BalanceAfter,(accountTrc10BalanceBefore-123));
            assert.equal(toAddressTrc10BalanceAfter,123);
        });
    });

    describe("#triggerConstantContract", async function () {

        let transaction;
        before(async function () {

            transaction = await tronWeb.transactionBuilder.createSmartContract({
                abi: testConstant.abi,
                bytecode: testConstant.bytecode
            }, accounts.hex[6]);
            await broadcaster.broadcaster(null, accounts.pks[6], transaction);
            while (true) {
                const tx = await tronWeb.trx.getTransactionInfo(transaction.txID);
                if (Object.keys(tx).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
        })

        it('should trigger constant contract successfully', async function () {
            this.timeout(20000);

            const contractAddress = transaction.contract_address;
            const issuerAddress = accounts.hex[6];
            const functionSelector = 'testPure(uint256,uint256)';
            const parameter = [
                {type: 'uint256', value: 1},
                {type: 'uint256', value: 2}
            ]
            const options = {};

            for (let i = 0; i < 2; i++) {
                if (i === 1) options.permissionId = 2;
                transaction = await tronWeb.transactionBuilder.triggerConstantContract(contractAddress, functionSelector, options,
                    parameter, issuerAddress);
                assert.isTrue(transaction.result.result &&
                    transaction.transaction.raw_data.contract[0].parameter.type_url === 'type.googleapis.com/protocol.TriggerSmartContract');
                assert.equal(transaction.constant_result, '0000000000000000000000000000000000000000000000000000000000000004');
                transaction = await broadcaster.broadcaster(null, accounts.pks[6], transaction.transaction);
                assert.isTrue(transaction.receipt.result)
                assert.equal(transaction.transaction.raw_data.contract[0].Permission_id || 0, options.permissionId || 0);
            }
        });
    });

    describe("#triggerComfirmedConstantContract", async function () {

        let transaction;
        before(async function () {
            this.timeout(20000);

            transaction = await tronWeb.transactionBuilder.createSmartContract({
                abi: testConstant.abi,
                bytecode: testConstant.bytecode
            }, accounts.hex[6]);
            await broadcaster.broadcaster(null, accounts.pks[6], transaction);
            while (true) {
                const tx = await tronWeb.trx.getTransactionInfo(transaction.txID);
                if (Object.keys(tx).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
        })

        it('should trigger confirmed constant contract successfully', async function () {
            this.timeout(20000);

            const contractAddress = transaction.contract_address;
            const issuerAddress = accounts.hex[6];
            const functionSelector = 'testPure(uint256,uint256)';
            const parameter = [
                {type: 'uint256', value: 1},
                {type: 'uint256', value: 2}
            ]
            const options = {};

            for (let i = 0; i < 2; i++) {
                if (i === 1) options.permissionId = 2;
                transaction = await tronWeb.transactionBuilder.triggerConfirmedConstantContract(contractAddress, functionSelector, options,
                    parameter, issuerAddress);
                assert.isTrue(transaction.result.result &&
                    transaction.transaction.raw_data.contract[0].parameter.type_url === 'type.googleapis.com/protocol.TriggerSmartContract');
                assert.equal(transaction.constant_result, '0000000000000000000000000000000000000000000000000000000000000004');
                transaction = await broadcaster.broadcaster(null, accounts.pks[6], transaction.transaction);
                assert.isTrue(transaction.receipt.result)
                assert.equal(transaction.transaction.raw_data.contract[0].Permission_id || 0, options.permissionId || 0);
            }
        });
    });

    describe("#clearabi", async function () {

        let transaction;
        let contract;
        before(async function () {
            this.timeout(20000);

            transaction = await tronWeb.transactionBuilder.createSmartContract({
                abi: testConstant.abi,
                bytecode: testConstant.bytecode
            }, accounts.hex[7]);
            await broadcaster.broadcaster(null, accounts.pks[7], transaction);
            while (true) {
                const tx = await tronWeb.trx.getTransactionInfo(transaction.txID);
                if (Object.keys(tx).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
        })

        it('should clear contract abi', async function () {
            this.timeout(10000);

            const contractAddress = transaction.contract_address;
            const ownerAddress = accounts.hex[7];

            // verify contract abi before
            contract = await tronWeb.trx.getContract(contractAddress);
            assert.isTrue(Object.keys(contract.abi).length > 0)

            // clear abi
            transaction = await tronWeb.transactionBuilder.clearABI(contractAddress, ownerAddress);
            assert.isTrue(!transaction.visible &&
                transaction.raw_data.contract[0].parameter.type_url === 'type.googleapis.com/protocol.ClearABIContract');
            transaction = await broadcaster.broadcaster(null, accounts.pks[7], transaction);
            assert.isTrue(transaction.receipt.result);

            // verify contract abi after
            while (true) {
                contract = await tronWeb.trx.getContract(contractAddress);
                if (Object.keys(contract.abi).length > 0) {
                    await wait(3);
                    continue;
                } else {
                    break;
                }
            }
            assert.isTrue(Object.keys(contract.abi).length === 0);
        });
    });

    describe("#updateBrokerage", async function () {

        it('should update sr brokerage successfully', async function () {
            // const transaction = await tronWeb.transactionBuilder.updateBrokerage(10, accounts.hex[1]);
        });

        it('should throw invalid brokerage provided error', async function () {
            await assertThrow(
                tronWeb.transactionBuilder.updateBrokerage(null, accounts.hex[1]),
                'Invalid brokerage provided'
            );
        });

        it('should throw brokerage must be an integer between 0 and 100 error', async function () {
            let brokerages = [-1, 101]
            for (let brokerage of brokerages) {
                await assertThrow(
                    tronWeb.transactionBuilder.updateBrokerage(brokerage, accounts.hex[1]),
                    'Brokerage must be an integer between 0 and 100'
                );
            }
        });

        it('should throw invalid owner address provided error', async function () {
            await assertThrow(
                tronWeb.transactionBuilder.updateBrokerage(10, 'abcd'),
                'Invalid owner address provided'
            );
        });

    });

    describe("#withdrawBlockRewards", async function () {
    });

    describe("#createTokenExchange", async function () {

        const idxS = 13;
        const idxE = 15;
        const toIdx1 = 5;
        const toIdx2 = 6;
        let tokenNames = [];

        before(async function () {
            this.timeout(90000);

            // create token
            for (let i = idxS; i < idxE; i++) {
                const options = getTokenOptions();
                const transaction = await tronWeb.transactionBuilder.createToken(options, accounts.hex[i]);
                await broadcaster.broadcaster(null, accounts.pks[i], transaction);
                assert.equal(transaction.txID.length, 64);
                await waitChainData('token', accounts.hex[i]);
                const token = await tronWeb.trx.getTokensIssuedByAddress(accounts.hex[i]);
                await waitChainData('tokenById', token[Object.keys(token)[0]]['id']);
                await broadcaster.broadcaster(null, accounts.pks[i], await tronWeb.transactionBuilder.sendToken(
                    accounts.hex[toIdx1],
                    10e4,
                    token[Object.keys(token)[0]]['id'],
                    token[Object.keys(token)[0]]['owner_address']
                ));
                await waitChainData('sendToken', accounts.hex[toIdx1], 0);
                await broadcaster.broadcaster(null, accounts.pks[i], await tronWeb.transactionBuilder.sendToken(
                    accounts.hex[toIdx2],
                    10e4,
                    token[Object.keys(token)[0]]['id'],
                    token[Object.keys(token)[0]]['owner_address']
                ));
                await waitChainData('sendToken', accounts.hex[toIdx2], 0);
                tokenNames.push(token[Object.keys(token)[0]]['id']);
            }

        });

        it('should create token exchange', async function () {
            let transaction = await tronWeb.transactionBuilder.createTokenExchange(tokenNames[0], 10e3, tokenNames[1], 10e3, accounts.hex[toIdx1]);
            let parameter = txPars(transaction);

            assert.equal(transaction.txID.length, 64);
            assert.equal(TronWeb.toUtf8(parameter.value.first_token_id), tokenNames[0]);
            assert.equal(TronWeb.toUtf8(parameter.value.second_token_id), tokenNames[1]);
            assert.equal(parameter.type_url, 'type.googleapis.com/protocol.ExchangeCreateContract');
            assert.isUndefined(transaction.raw_data.contract[0].Permission_id);

            transaction = await tronWeb.transactionBuilder.createTokenExchange(tokenNames[0], 10e3, tokenNames[1], 10e3, accounts.hex[toIdx1], {permissionId: 2});
            parameter = txPars(transaction);

            assert.equal(transaction.txID.length, 64);
            assert.equal(TronWeb.toUtf8(parameter.value.first_token_id), tokenNames[0]);
            assert.equal(TronWeb.toUtf8(parameter.value.second_token_id), tokenNames[1]);
            assert.equal(parameter.type_url, 'type.googleapis.com/protocol.ExchangeCreateContract');
            assert.equal(transaction.raw_data.contract[0].Permission_id, 2);
        });

    });

    describe("#createTRXExchange", async function () {
    });

    describe("#injectExchangeTokens", async function () {
    });

    describe("#withdrawExchangeTokens", async function () {
    });

    describe("#tradeExchangeTokens", async function () {
    });

    describe("Alter existent transactions", async function () {

        describe("#extendExpiration", async function () {

            it('should extend the expiration', async function () {

                const receiver = accounts.b58[20]
                const sender = accounts.hex[21]
                const privateKey = accounts.pks[21]
                const balance = await tronWeb.trx.getUnconfirmedBalance(sender);

                let transaction = await tronWeb.transactionBuilder.sendTrx(receiver, 10, sender);
                const previousId = transaction.txID;
                transaction = await tronWeb.transactionBuilder.extendExpiration(transaction, 3600);
                await broadcaster.broadcaster(null, privateKey, transaction);

                assert.notEqual(transaction.txID, previousId)
                assert.equal(balance - await tronWeb.trx.getUnconfirmedBalance(sender), 10);

            });

        });

        describe("#addUpdateData", async function () {

            it('should add a data field', async function () {

                this.timeout(90000)

                const receiver = accounts.b58[22]
                const sender = accounts.hex[23]
                const privateKey = accounts.pks[23]
                const balance = await tronWeb.trx.getUnconfirmedBalance(sender);

                let transaction = await tronWeb.transactionBuilder.sendTrx(receiver, 10, sender);
                const data = "Sending money to Bill.";
                transaction = await tronWeb.transactionBuilder.addUpdateData(transaction, data);
                const id = transaction.txID;
                await broadcaster.broadcaster(null, privateKey, transaction);
                await waitChainData('tx', id);
                assert.equal(balance - await tronWeb.trx.getUnconfirmedBalance(sender), 10);
                const unconfirmedTx = await tronWeb.trx.getTransaction(id)
                assert.equal(tronWeb.toUtf8(unconfirmedTx.raw_data.data), data);

            });

        });

        describe("#alterTransaction", async function () {

            // before(async function() {
            //     await wait(4);
            // })

            it('should alter the transaction adding a data field', async function () {

                const receiver = accounts.b58[24]
                const sender = accounts.hex[25]
                const privateKey = accounts.pks[25]
                // const balance = await tronWeb.trx.getUnconfirmedBalance(sender);

                let transaction = await tronWeb.transactionBuilder.sendTrx(receiver, 10, sender);
                const previousId = transaction.txID;
                const data = "Sending money to Bill.";
                transaction = await tronWeb.transactionBuilder.alterTransaction(transaction, {data});
                const id = transaction.txID;
                console.log("id: "+id)
                assert.notEqual(id, previousId)
                await broadcaster.broadcaster(null, privateKey, transaction);
                await waitChainData('tx', id);
                const unconfirmedTx = await tronWeb.trx.getTransaction(id)
                assert.equal(tronWeb.toUtf8(unconfirmedTx.raw_data.data), data);

            });

        });
    });

    describe("#rawParameter", async function () {
        let param1;
        let param2;
        let contractAddress1;
        let contractAddress2;
        let contractAddress3;
        const totalSupply = 100000000000000000;

        before(async function () {
            param1 = await publicMethod.to64String(ADDRESS_HEX)+ await publicMethod.to64String(TronWeb.fromDecimal(totalSupply));
            param2 = await publicMethod.to64String(accounts.hex[25])+await publicMethod.to64String(TronWeb.fromDecimal(123));
            const tx1 = await broadcaster.broadcaster(tronWeb.transactionBuilder.createSmartContract(
                {
                    abi: [],
                    bytecode: tronToken.bytecode,
                    rawParameter: param1,
                },
                ADDRESS_BASE58
            ), PRIVATE_KEY);
            contractAddress1 = tronWeb.address.fromHex(tx1.transaction.contract_address)

            const tx2 = await broadcaster.broadcaster(tronWeb.transactionBuilder.createSmartContract(
                {
                    abi: [{}],
                    bytecode: tronToken.bytecode,
                    rawParameter: param1,
                },
                ADDRESS_BASE58
            ), PRIVATE_KEY)
            contractAddress2 = tronWeb.address.fromHex(tx2.transaction.contract_address)

            const tx3 = await broadcaster.broadcaster(tronWeb.transactionBuilder.createSmartContract(
                {
                    abi: tronToken.abi,
                    bytecode: tronToken.bytecode,
                    rawParameter: param1,
                },
                ADDRESS_BASE58
            ), PRIVATE_KEY)
            contractAddress3 = tronWeb.address.fromHex(tx3.transaction.contract_address)
        })

        it("abi is []", async function () {
            // abi:[]
            const triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                contractAddress1, "transfer(address,uint256)",
                {
                    rawParameter: param2,
                },
                [], ADDRESS_BASE58);
            const triggerTx = await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
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
            assert.equal("SUCCESS", triggerInfo.receipt.result);

            const functionSelector = 'balanceOf(address)';
            let param3 = await publicMethod.to64String(ADDRESS_HEX);
            transaction = await tronWeb.transactionBuilder.triggerConstantContract(contractAddress1, functionSelector, {rawParameter: param3},
                [], ADDRESS_BASE58);
            let ownerBalanceAfter = tronWeb.BigNumber(transaction.constant_result[0], 16);
            assert.equal(ownerBalanceAfter, totalSupply-123);

            let param4 = await publicMethod.to64String(accounts.hex[25]);
            transaction = await tronWeb.transactionBuilder.triggerConstantContract(contractAddress1, functionSelector, {rawParameter: param4},
                [], ADDRESS_BASE58);
            let newAccount1BalanceAfter = tronWeb.BigNumber(transaction.constant_result[0], 16);
            assert.equal(newAccount1BalanceAfter, 123);
        });
        it("abi is [{}]", async function () {
            // abi:[{}]
            const triggerTransaction2 = await tronWeb.transactionBuilder.triggerSmartContract(
                contractAddress2, "transfer(address,uint256)",
                {
                    rawParameter: param2,
                },
                [], ADDRESS_BASE58);
            const triggerTx2 = await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction2.transaction);
            assert.equal(triggerTx2.transaction.txID.length, 64);
            let triggerInfo2;
            while (true) {
                triggerInfo2 = await tronWeb.trx.getTransactionInfo(triggerTx2.transaction.txID);
                if (Object.keys(triggerInfo2).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    console.log("triggerInfo2:"+util.inspect(triggerInfo2))
                    break;
                }
            }
            assert.equal("SUCCESS", triggerInfo2.receipt.result);

            const functionSelector = 'balanceOf(address)';
            let param3 = await publicMethod.to64String(ADDRESS_HEX);
            transaction = await tronWeb.transactionBuilder.triggerConstantContract(contractAddress2, functionSelector, {rawParameter: param3},
                [], ADDRESS_BASE58);
            let ownerBalanceAfter = tronWeb.BigNumber(transaction.constant_result[0], 16);
            assert.equal(ownerBalanceAfter, totalSupply-123);

            let param4 = await publicMethod.to64String(accounts.hex[25]);
            transaction = await tronWeb.transactionBuilder.triggerConstantContract(contractAddress2, functionSelector, {rawParameter: param4},
                [], ADDRESS_BASE58);
            let newAccount1BalanceAfter = tronWeb.BigNumber(transaction.constant_result[0], 16);
            assert.equal(newAccount1BalanceAfter, 123);
        });

        it('trigger have abi with address and number', async function () {
            // triggerSmartContract
            const triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                contractAddress3, "transfer(address,uint256)",
                {
                    rawParameter: param2,
                },
                [], ADDRESS_BASE58);
            await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
            assert.equal(triggerTransaction.transaction.txID.length, 64);
            while (true) {
                triggerInfo3 = await tronWeb.trx.getTransactionInfo(triggerTransaction.transaction.txID);
                if (Object.keys(triggerInfo3).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    console.log("triggerInfo3:"+util.inspect(triggerInfo3))
                    break;
                }
            }
            assert.equal("SUCCESS", triggerInfo3.receipt.result);

            const functionSelector = 'balanceOf(address)';
            let param3 = await publicMethod.to64String(ADDRESS_HEX);
            transaction = await tronWeb.transactionBuilder.triggerConstantContract(contractAddress3, functionSelector, {rawParameter: param3},
                [], ADDRESS_BASE58);
            let ownerBalanceAfter = tronWeb.BigNumber(transaction.constant_result[0], 16);
            assert.equal(ownerBalanceAfter, totalSupply-123);

            let param4 = await publicMethod.to64String(accounts.hex[25]);
            transaction = await tronWeb.transactionBuilder.triggerConstantContract(contractAddress3, functionSelector, {rawParameter: param4},
                [], ADDRESS_BASE58);
            let newAccount1BalanceAfter = tronWeb.BigNumber(transaction.constant_result[0], 16);
            assert.equal(newAccount1BalanceAfter, 123);
        });

        it("abi is {}", async function () {
            // clear abi
            console.log("clear abi")
            const clearAbiTransaction = await tronWeb.transactionBuilder.clearABI(contractAddress3, ADDRESS_BASE58);
            console.log("clearAbiTransaction:"+util.inspect(clearAbiTransaction))
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
            // abi:{}
            const triggerTransaction = await tronWeb.transactionBuilder.triggerSmartContract(
                contractAddress3, "transfer(address,uint256)",
                {
                    rawParameter: param2,
                },
                [], ADDRESS_BASE58);
            await broadcaster.broadcaster(null, PRIVATE_KEY, triggerTransaction.transaction);
            assert.equal(triggerTransaction.transaction.txID.length, 64);
            while (true) {
                triggerInfo4 = await tronWeb.trx.getTransactionInfo(triggerTransaction.transaction.txID);
                if (Object.keys(triggerInfo4).length === 0) {
                    await wait(3);
                    continue;
                } else {
                    console.log("triggerInfo4:"+util.inspect(triggerInfo4))
                    break;
                }
            }
            assert.equal("SUCCESS", triggerInfo4.receipt.result);

            const functionSelector = 'balanceOf(address)';
            let param3 = await publicMethod.to64String(ADDRESS_HEX);
            transaction = await tronWeb.transactionBuilder.triggerConstantContract(contractAddress3, functionSelector, {rawParameter: param3},
                [], ADDRESS_BASE58);
            let ownerBalanceAfter = tronWeb.BigNumber(transaction.constant_result[0], 16);
            assert.equal(ownerBalanceAfter, totalSupply-246);

            let param4 = await publicMethod.to64String(accounts.hex[25]);
            transaction = await tronWeb.transactionBuilder.triggerConstantContract(contractAddress3, functionSelector, {rawParameter: param4},
                [], ADDRESS_BASE58);
            let newAccount1BalanceAfter = tronWeb.BigNumber(transaction.constant_result[0], 16);
            assert.equal(newAccount1BalanceAfter, 246);
        });
    });

});