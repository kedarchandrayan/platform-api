/**
 * Module to progress stake on gateway.
 *
 * @module lib/stakeAndMint/common/ProgressStakeBase
 */

const MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../../..',
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  util = require(rootPrefix + '/lib/util'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

/**
 * Class to progress stake on gateway.
 *
 * @class ProgressStakeOnGateway
 */
class ProgressStakeOnGateway extends StakeAndMintBase {
  /**
   * Constructor to progress stake on gateway.
   *
   * @param {object} params
   * @param {string/number} params.originChainId
   * @param {string} params.facilitator
   * @param {string} params.secretString
   * @param {string} params.messageHash
   *
   * @augments StakeAndMintBase
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.facilitator = params.facilitator;
    oThis.secretString = params.secretString;
    oThis.messageHash = params.messageHash;

    oThis.gatewayContract = '';
    oThis.shuffledProviders = null;
    oThis.originWeb3 = null;
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._fetchGatewayContract();

    const response = await oThis._performProgressStake();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: { chainId: oThis.originChainId, transactionHash: response.data.transactionHash }
        })
      );
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        taskResponseData: JSON.stringify(response)
      })
    );
  }

  /**
   * Perform progress stake.
   *
   * @return {Promise<void>}
   * @private
   */
  async _performProgressStake() {
    const oThis = this;

    const contractInteract = new MosaicJs.ContractInteract.EIP20Gateway(oThis.originWeb3, oThis.gatewayContract);

    const unlockSecret = util.generateHashLock(oThis.secretString).unlockSecret,
      txObject = await contractInteract.progressStakeRawTx(oThis.messageHash, unlockSecret),
      data = txObject.encodeABI(),
      gasPrice = await oThis._fetchGasPrice(),
      txOptions = {
        gasPrice: gasPrice,
        gas: contractConstants.progressStakeGas
      };

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originShuffledProviders[0],
      oThis.facilitator,
      oThis.gatewayContract,
      txOptions,
      data
    );
  }

  /**
   * Fetch gateway contract address.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayContract() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Fetch gas price.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGasPrice() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = ProgressStakeOnGateway;
