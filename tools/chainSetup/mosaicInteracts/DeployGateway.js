'use strict';

/**
 * deploy Gateway contract on origin class
 *
 * @module /tools/chainSetup/mosaicInteracts/DeployGateway
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  Base = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/Base'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  MosaicJs = require('@openst/mosaic.js');

/**
 *
 * @class
 */
class DeployGateway extends Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number} params.chainId - chain id on which this is to be performed
   * @param {String} params.signerAddress - address who signs Tx
   * @param {String} params.chainEndpoint - url to connect to chain
   * @param {String} params.gasPrice -  gas price to use
   * @param {String} params.originContractAddress - The ERC20 token contract address that will be staked
   * @param {String} params.auxContractAddress - SPrime / BT contract address from aux chain
   * @param {String} params.anchorAddress - anchor address
   * @param {String} params.organizationAddress - organization address
   * @param {String} params.messageBusLibAddress
   * @param {String} params.gatewayLibAddress
   * @param {Number} params.gas: required gas for tx
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.originContractAddress = params['originContractAddress'];
    oThis.auxContractAddress = params['auxContractAddress'];
    oThis.anchorAddress = params['anchorAddress'];
    oThis.organizationAddress = params['organizationAddress'];
    oThis.messageBusLibAddress = params['messageBusLibAddress'];
    oThis.gatewayLibAddress = params['gatewayLibAddress'];

    oThis.bounty = contractConstants.bountyForGateway;
  }

  /**
   *
   * async perform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    let nonceRsp = await oThis._fetchNonce(),
      signerKey = await oThis._fetchSignerKey();

    oThis._addKeyToWallet(signerKey);

    let txOptions = {
      gasPrice: oThis.gasPrice,
      from: oThis.signerAddress,
      nonce: nonceRsp.data['nonce'],
      gas: oThis.gas
    };

    let helperObj = new DeployGateway.GatewayHelper(oThis._web3Instance),
      deployRsp = await helperObj
        .deploy(
          oThis.originContractAddress,
          oThis.auxContractAddress,
          oThis.anchorAddress,
          oThis.bounty,
          oThis.organizationAddress,
          oThis.messageBusLibAddress,
          oThis.gatewayLibAddress,
          txOptions
        )
        .then(function(txReceipt) {
          logger.debug('txReceipt', txReceipt);
          return responseHelper.successWithData({
            transactionReceipt: txReceipt,
            transactionHash: txReceipt.transactionHash,
            contractAddress: txReceipt.contractAddress
          });
        })
        .catch(function(errorResponse) {
          logger.error(errorResponse);
          return responseHelper.error({
            internal_error_identifier: 't_cos_dg_1',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
          });
        });

    oThis._removeKeyFromWallet(signerKey);

    let gatewayContractAddress = deployRsp.data['contractAddress'];
    deployRsp.data[chainAddressConstants.stSimpleStakeContractKind] = await oThis.stakeVault(gatewayContractAddress);

    return Promise.resolve(deployRsp);
  }

  static get GatewayHelper() {
    return MosaicJs.ChainSetup.GatewayHelper;
  }

  /**
   * Returns simpleStakeContractAddress.
   *
   * @param {String} gatewayContractAddress
   *
   * @return {Promise<*|result>}
   */
  async stakeVault(gatewayContractAddress) {
    const oThis = this,
      helperObj = new DeployGateway.GatewayHelper(oThis._web3Instance),
      stakeVaultResponse = await helperObj.getStakeVault(gatewayContractAddress, oThis._web3Instance);

    return stakeVaultResponse;
  }
}

module.exports = DeployGateway;
