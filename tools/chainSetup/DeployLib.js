'use strict';

/**
 * deploy lib
 *
 * @module tools/chainSetup/DeployLib
 */
const rootPrefix = '../..',
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainSetupLogModel = require(rootPrefix + '/app/models/mysql/ChainSetupLog'),
  DeployLibs = require(rootPrefix + '/tools/chainSetup/mosaicInteracts/DeployLibs'),
  chainSetupLogsConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice');

/**
 *
 * @class
 */
class DeployLib {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.chainKind - origin / aux (chain kind for which anchor org is to be setup)
   * @param {String} params.libKind - merklePatriciaProof / messageBus / gateway
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainKind = params['chainKind'];
    oThis.libKind = params['libKind'];

    oThis.chainId = null;
    oThis.auxChainId = null;
    oThis.gasPrice = null;
    oThis.configStrategyObj = null;
    oThis.merklePatriciaProofAddress = null;
    oThis.stepKind = null;
    oThis.chainAddressKind = null;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_cs_dl_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /***
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._getLibDeploymentAddresses();

    let params = {
      chainId: oThis.chainId,
      libKind: oThis.libKind,
      signerAddress: oThis.signerAddress,
      chainEndpoint: oThis._configStrategyObject.chainWsProvider(oThis.chainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      merklePatriciaProofAddress: oThis.merklePatriciaProofAddress,
      gas: oThis.gas
    };

    let deployHelper = new DeployLibs(params);

    let setupRsp = await deployHelper.perform();

    setupRsp.debugOptions = {
      inputParams: {},
      processedParams: params
    };

    await oThis._insertIntoChainSetupLogs(setupRsp);

    await oThis._insertIntoChainAddress(setupRsp);

    return setupRsp;
  }

  /***
   *
   * init vars on the basis of chain kind
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;

    switch (oThis.chainKind) {
      case coreConstants.originChainKind:
        oThis.chainId = oThis._configStrategyObject.originChainId;
        oThis.associatedAuxChainId = 0;
        oThis.deployerKind = chainAddressConstants.originDeployerKind;
        oThis.mppLibContractKind = chainAddressConstants.originMppLibContractKind;

        let gasPriceCacheObj = new gasPriceCacheKlass(),
          gasPriceRsp = await gasPriceCacheObj.fetch();
        oThis.gasPrice = gasPriceRsp.data;
        break;
      case coreConstants.auxChainKind:
        oThis.chainId = oThis._configStrategyObject.auxChainId;
        oThis.auxChainId = oThis._configStrategyObject.auxChainId;
        oThis.associatedAuxChainId = oThis.auxChainId;
        oThis.deployerKind = chainAddressConstants.auxDeployerKind;
        oThis.mppLibContractKind = chainAddressConstants.auxMppLibContractKind;
        oThis.gasPrice = contractConstants.zeroGasPrice;
        break;
      default:
        throw `unsupported chainKind: ${oThis.chainKind}`;
    }

    switch (oThis.libKind) {
      case 'merklePatriciaProof':
        oThis.stepKind = chainSetupLogsConstants.deployMerklePatriciaProofLibStepKind;
        oThis.chainAddressKind =
          oThis.chainKind == coreConstants.originChainKind
            ? chainAddressConstants.originMppLibContractKind
            : chainAddressConstants.auxMppLibContractKind;
        oThis.gas = contractConstants.deployMppLibGas;
        break;
      case 'messageBus':
        oThis.stepKind = chainSetupLogsConstants.deployMessageBusLibStepKind;
        oThis.chainAddressKind =
          oThis.chainKind == coreConstants.originChainKind
            ? chainAddressConstants.originMbLibContractKind
            : chainAddressConstants.auxMbLibContractKind;
        oThis.gas = contractConstants.deployMbLibGas;
        break;
      case 'gateway':
        oThis.stepKind = chainSetupLogsConstants.deployGatewayLibStepKind;
        oThis.chainAddressKind =
          oThis.chainKind == coreConstants.originChainKind
            ? chainAddressConstants.originGatewayLibContractKind
            : chainAddressConstants.auxGatewayLibContractKind;
        oThis.gas = contractConstants.deployGatewayLibGas;
        break;
      default:
        throw `unsupported libLind ${oThis.libKind}`;
    }
  }

  /**
   * Get addresses required for lib deployment
   *
   * @private
   *
   * @return {Promise}
   */
  async _getLibDeploymentAddresses() {
    const oThis = this;

    // Fetch all addresses associated with mentioned chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.associatedAuxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_dl_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.signerAddress = chainAddressesRsp.data[oThis.deployerKind].address;
    if (chainAddressesRsp.data[oThis.mppLibContractKind]) {
      oThis.merklePatriciaProofAddress = chainAddressesRsp.data[oThis.mppLibContractKind].address;
    }
  }

  /**
   * Insert entry into chain setup logs table.
   *
   * @private
   *
   * @param response
   *
   * @return {Promise<Result>}
   */
  async _insertIntoChainSetupLogs(response) {
    const oThis = this;

    let insertParams = {};

    insertParams['chainId'] = oThis.chainId;
    insertParams['chainKind'] = oThis.chainKind;
    insertParams['stepKind'] = oThis.stepKind;
    insertParams['debugParams'] = response.debugOptions;
    insertParams['transactionHash'] = response.data.transactionHash;

    if (response.isSuccess()) {
      insertParams['status'] = chainSetupLogsConstants.successStatus;
    } else {
      insertParams['status'] = chainSetupLogsConstants.failureStatus;
      insertParams['debugParams']['errorResponse'] = response.toHash();
    }

    await new ChainSetupLogModel().insertRecord(insertParams);

    return responseHelper.successWithData({});
  }

  /***
   *
   * insert anchor contract address into chain address
   *
   * @param {Result} response
   *
   * @return {Promise}
   *
   * @private
   */
  async _insertIntoChainAddress(response) {
    const oThis = this;

    if (response.isFailure()) return response;

    await new ChainAddressModel().insertAddress({
      address: response.data['contractAddress'],
      associatedAuxChainId: oThis.associatedAuxChainId,
      addressKind: oThis.chainAddressKind,
      deployedChainId: oThis.chainId,
      deployedChainKind: oThis.chainKind,
      status: chainAddressConstants.activeStatus
    });

    // Clear chain address cache.
    await new ChainAddressCache({ associatedAuxChainId: oThis.associatedAuxChainId }).clear();
  }

  /***
   *
   * config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;
    if (oThis.configStrategyObj) return oThis.configStrategyObj;
    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);
    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(DeployLib, coreConstants.icNameSpace, 'DeployLib');

module.exports = DeployLib;
