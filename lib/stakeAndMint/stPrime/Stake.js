'use strict';
/*
 * This file helps in performing stake
 *
 * lib/stakeAndMint/stPrime/Stake
 */
const BigNumber = require('bignumber.js'),
  MosaicJs = require('@openstfoundation/mosaic.js');

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

class Stake extends StakeAndMintBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.stakerAddress = params.stakerAddress;
    oThis.amountToStake = params.amountToStake;
    oThis.beneficiary = params.beneficiary;

    oThis.secretString = null;
    oThis.stakerNonce = null;
    oThis.hashLock = null;
    oThis.gatewayContract = null;
    oThis.mosaicStakeHelper = null;
  }

  /**
   * _asyncPerform
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._fetchGatewayAddress();

    oThis._validateStakerAddress();

    oThis._validateStakeAmount();

    await oThis._getStakerNonceFromGateway();

    await oThis._getHashLock();

    let response = await oThis._performStake();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: {
            transactionHash: response.data.transactionHash,
            secretString: oThis.secretString,
            chainId: oThis.originChainId,
            stakerNonce: oThis.stakerNonce
          }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          taskResponseData: {
            err: JSON.stringify(response),
            secretString: oThis.secretString,
            chainId: oThis.originChainId,
            stakerNonce: oThis.stakerNonce
          }
        })
      );
    }
  }

  /**
   * _setWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    oThis.originChainConfig = response[oThis.originChainId];
    oThis.originWsProviders = oThis.originChainConfig.originGeth.readWrite.wsProviders;

    oThis.shuffledProviders = basicHelper.shuffleArray(oThis.originWsProviders);

    oThis.originWeb3 = web3Provider.getInstance(oThis.shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Fetch Gateway address
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayAddress() {
    const oThis = this;

    // Fetch gateway contract address
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
  }

  /**
   * _validateStakerAddress - Validate staker address
   *
   * @return {Promise<void>}
   * @private
   */
  _validateStakerAddress() {
    const oThis = this;

    if (!oThis.stakerAddress) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { stakerAddress: oThis.stakerAddress }
        })
      );
    }
  }

  /**
   * Validate stake amount
   *
   * @return {Promise<void>}
   * @private
   */
  _validateStakeAmount() {
    const oThis = this;

    if (!oThis.amountToStake) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_s_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: { amountToStake: 'Stake Amount is invalid' + oThis.amountToStake }
        })
      );
    }

    oThis.amountToStake = new BigNumber(oThis.amountToStake);
  }

  /**
   * Get staker helper object
   */
  get _stakeHelperObject() {
    const oThis = this;

    if (!oThis.mosaicStakeHelper) {
      oThis.mosaicStakeHelper = new MosaicJs.Helpers.StakeHelper();
    }

    return oThis.mosaicStakeHelper;
  }

  /**
   * _getStakerNonceFromGateway
   *
   * @return {Promise<void>}
   * @private
   */
  async _getStakerNonceFromGateway() {
    const oThis = this;

    oThis.stakerNonce = await oThis._stakeHelperObject.getNonce(
      oThis.stakerAddress,
      oThis.originWeb3,
      oThis.gatewayContract
    );
  }

  /**
   * _getHashLock
   *
   * @return {Promise<void>}
   * @private
   */
  async _getHashLock() {
    const oThis = this;

    let response = MosaicJs.Helpers.StakeHelper.createSecretHashLock();

    oThis.secretString = response.secret;
    oThis.hashLock = response.hashLock;
  }

  /**
   * _performStake - Invoke stake
   *
   * @return {Promise<void>}
   * @private
   */
  async _performStake() {
    const oThis = this;

    // These Gas prices would be used for Rewards after MVP
    let gasPrice = '0',
      gasLimit = '0',
      txObject = oThis._stakeHelperObject._stakeRawTx(
        oThis.amountToStake.toString(10),
        oThis.beneficiary,
        gasPrice,
        gasLimit,
        oThis.stakerNonce,
        oThis.hashLock,
        {},
        oThis.originWeb3,
        oThis.gatewayContract,
        oThis.stakerAddress
      );

    let originGasPrice = await oThis._fetchGasPrice(),
      data = txObject.encodeABI(),
      txOptions = {
        gasPrice: originGasPrice,
        gas: contractConstants.stakeSTGas
      };

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.shuffledProviders[0],
      oThis.stakerAddress,
      oThis.gatewayContract,
      txOptions,
      data
    );
  }

  /**
   * Get origin chain gas price
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchGasPrice() {
    const oThis = this;

    let dynamicGasPriceResponse = await new DynamicGasPriceCache().fetch();

    return dynamicGasPriceResponse.data;
  }
}

module.exports = Stake;