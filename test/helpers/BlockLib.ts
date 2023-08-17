import TronWeb from '../setup/TronWeb.js';

class BlockLib {
    tronWeb: TronWeb;
    constructor(tronWeb: TronWeb) {
        if (!tronWeb) throw new Error('Expected instances of TronWeb and utils');
        this.tronWeb = tronWeb;
    }

    async getCurrent() {
        const block: any = await this.tronWeb.fullNode.request('wallet/getnowblock');
        block.fromPlugin = true;
        return block;
    }

    pluginInterface() {
        return {
            requires: '^5.3.0',
            fullClass: true,
        };
    }
}

module.exports = BlockLib;