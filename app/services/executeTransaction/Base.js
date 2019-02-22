'use strict';

/**
 * Base Execute Tx service
 *
 * @module app/services/executeTransaction/Base
 */

const uuidv4 = require('uuid/v4');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  kwcConstant = require(rootPrefix + '/lib/globalConstant/kwc'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  entityConst = require(rootPrefix + '/lib/globalConstant/shard'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ruleConstants = require(rootPrefix + '/lib/globalConstant/rule'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  errorConstant = require(rootPrefix + '/lib/globalConstant/error'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  PendingTransactionCrud = require(rootPrefix + '/lib/transactions/PendingTransactionCrud'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  ProcessTokenRuleExecutableData = require(rootPrefix +
    '/lib/executeTransactionManagement/processExecutableData/TokenRule'),
  ProcessPricerRuleExecutableData = require(rootPrefix +
    '/lib/executeTransactionManagement/processExecutableData/PricerRule'),
  TokenRuleDetailsByTokenId = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenRuleDetailsByTokenId');

require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/app/models/ddb/sharded/Balance');
require(rootPrefix + '/lib/executeTransactionManagement/GetPublishDetails');

/**
 * Class
 *
 * @class
 */
class ExecuteTxBase extends ServiceBase {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.token_id
   * @param {Object} params.meta_property
   * @param {String} params.executable_data - executable_data json string
   * @param {Number} params.operation_type
   * @param {Object} params.meta_property
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.token_id;
    oThis.metaProperty = params.meta_property;
    oThis.executableData = params.executable_data;
    oThis.operationType = params.operation_type;

    oThis.tokenAddresses = null;
    oThis.erc20Address = null;
    oThis.tokenRuleAddress = null;
    oThis.pricerRuleAddress = null;
    oThis.pricerRuleData = null;
    oThis.sessionKeyAddress = null;
    oThis.pessimisticDebitAmount = null;
    oThis.unsettledDebits = null;
    oThis.transactionUuid = null;
    oThis.ruleId = null;
    oThis.configStrategyObj = null;
    oThis.rmqInstance = null;
    oThis.web3Instance = null;
    oThis.balanceShardNumber = null;
    oThis.tokenHolderAddress = null;
    oThis.gas = null;
    oThis.sessionKeyNonce = null;
    oThis.gasPrice = null;
    oThis.estimatedTransfers = null;
    oThis.failureStatusToUpdateInTxMeta = null;
    oThis.pessimisticAmountDebitted = null;
    oThis.pendingTransactionInserted = null;
    oThis.transactionMetaId = null;
    oThis.token = null;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(async function(err) {
      let customError;
      if (responseHelper.isCustomResult(err)) {
        customError = err;
      } else {
        logger.error(`In catch block of ${__filename}`, err);
        customError = responseHelper.error({
          internal_error_identifier: 's_et_b_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { error: err.toString() }
        });
      }

      await oThis._revertOperations(customError);

      return customError;
    });
  }

  /**
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitize();

    await oThis._initializeVars();

    await oThis._processExecutableData();

    await oThis._setSessionAddress();

    await oThis._setNonce();

    await oThis._setSignature();

    await oThis._verifySessionSpendingLimit();

    await oThis._createTransactionMeta();

    await oThis._performPessimisticDebit();

    await oThis._createPendingTransaction();

    await oThis._publishToRMQ();

    return Promise.resolve(
      responseHelper.successWithData({
        transactionUuid: oThis.transactionUuid //TODO: To change after discussions
      })
    );
  }

  /**
   * Initializes web3 and rmq instances and fetches token holder address
   *
   * @return {Promise<void>}
   * @private
   */
  async _initializeVars() {
    const oThis = this;

    oThis.toAddress = basicHelper.sanitizeAddress(oThis.executableData.to);
    oThis.gasPrice = contractConstants.auxChainGasPrice;
    oThis.transactionUuid = uuidv4();

    await oThis._setRmqInstance();

    await oThis._setWebInstance();

    let tokenAddresses = await oThis._tokenAddresses();
    oThis.erc20Address = tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract];

    await oThis._setTokenHolderAddress();
  }

  /**
   * Process executable data
   *
   * @private
   */
  async _processExecutableData() {
    const oThis = this;

    await oThis._getRulesDetails();

    let response;

    if (oThis.tokenRuleAddress === oThis.toAddress) {
      response = await new ProcessTokenRuleExecutableData({
        executableData: oThis.executableData,
        contractAddress: oThis.tokenRuleAddress,
        web3Instance: oThis.web3Instance,
        tokenHolderAddress: oThis.tokenHolderAddress
      }).perform();
    } else if (oThis.pricerRuleAddress === oThis.toAddress) {
      response = await new ProcessPricerRuleExecutableData({
        executableData: oThis.executableData,
        contractAddress: oThis.pricerRuleAddress,
        web3Instance: oThis.web3Instance,
        tokenHolderAddress: oThis.tokenHolderAddress,
        auxChainId: oThis.auxChainId,
        conversionFactor: oThis.token.conversionFactor
      }).perform();
    } else {
      return oThis._validationError('s_et_b_4', ['invalid_executable_data'], {
        executableData: oThis.executableData
      });
    }

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    oThis.pessimisticDebitAmount = response.data.pessimisticDebitAmount;
    oThis.transferExecutableData = response.data.transferExecutableData;
    oThis.estimatedTransfers = response.data.estimatedTransfers;
    oThis.gas = response.data.gas;
  }

  /**
   * Perform Pessimistic Debit
   *
   * @private
   */
  async _performPessimisticDebit() {
    const oThis = this;

    await oThis._setBalanceShardNumber();

    let BalanceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel'),
      balanceObj = new BalanceModel({ shardNumber: oThis.balanceShardNumber });

    let tokenAddresses = await oThis._tokenAddresses();
    let buffer = {
      erc20Address: tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract],
      tokenHolderAddress: oThis.tokenHolderAddress,
      blockChainUnsettleDebits: oThis.pessimisticDebitAmount.toString(10)
    };

    let updateBalanceRsp = await balanceObj.updateBalance(buffer).catch(function(updateBalanceResponse) {
      if (updateBalanceResponse.internalErrorCode.endsWith(errorConstant.conditionalCheckFailedExceptionSuffix)) {
        return oThis._validationError('s_et_b_9', ['insufficient_funds']);
      }
      return updateBalanceResponse;
    });

    if (updateBalanceRsp.isFailure()) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.finalFailedStatus;
      return Promise.reject(updateBalanceRsp);
    }

    oThis.pessimisticAmountDebitted = true;

    oThis.unsettledDebits = [buffer];
  }

  /**
   * Get balance shard for token id
   *
   * @private
   */
  async _setBalanceShardNumber() {
    const oThis = this,
      TokenShardNumbersCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenShardNumbersCache');

    let response = await new TokenShardNumbersCache({ tokenId: oThis.tokenId }).fetch();

    let balanceShardNumber = response.data[entityConst.balanceEntityKind];

    if (!balanceShardNumber) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_et_b_6',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            shards: response.data
          }
        })
      );
    }

    oThis.balanceShardNumber = balanceShardNumber;
  }

  /**
   * create entry in tx meta table.
   *
   * @return {Promise<void>}
   * @private
   */
  async _createTransactionMeta() {
    const oThis = this;

    let createRsp = await new TransactionMetaModel()
      .insert({
        transaction_uuid: oThis.transactionUuid,
        associated_aux_chain_id: oThis.auxChainId,
        token_id: oThis.tokenId,
        status: transactionMetaConst.invertedStatuses[transactionMetaConst.queuedStatus],
        kind: transactionMetaConst.invertedKinds[transactionMetaConst.ruleExecution],
        next_action_at: transactionMetaConst.getNextActionAtFor(transactionMetaConst.queuedStatus),
        session_address: oThis.sessionKeyAddress,
        session_nonce: oThis.sessionKeyNonce
      })
      .fire();

    oThis.transactionMetaId = createRsp.insertId;
  }

  /**
   *
   *
   * @private
   */
  async _rollBackPessimisticDebit() {
    const oThis = this;

    let BalanceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel'),
      balanceObj = new BalanceModel({ shardNumber: oThis.balanceShardNumber });

    let tokenAddresses = await oThis._tokenAddresses();
    let buffer = {
      erc20Address: tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract],
      tokenHolderAddress: oThis.tokenHolderAddress,
      blockChainUnsettleDebits: oThis.pessimisticDebitAmount.mul(-1).toString(10)
    };

    await balanceObj.updateBalance(buffer);
  }

  /***
   *
   * Create Pending transaction in Db
   *
   * @return {Promise<*>}
   */
  async _createPendingTransaction() {
    const oThis = this;

    let insertRsp = await new PendingTransactionCrud(oThis.auxChainId).create({
      transactionData: {
        to: oThis.tokenHolderAddress,
        value: oThis.executableData.value,
        gas: oThis.gas,
        gasPrice: oThis.gasPrice
      },
      unsettledDebits: oThis.unsettledDebits,
      eip1077Signature: oThis.signatureData,
      metaProperty: oThis.metaProperty,
      ruleId: oThis.ruleId,
      transferExecutableData: oThis.transferExecutableData,
      transfers: oThis.estimatedTransfers,
      transactionUuid: oThis.transactionUuid,
      ruleAddress: oThis.toAddress,
      erc20Address: oThis.erc20Address,
      sessionKeyNonce: oThis.sessionKeyNonce,
      status: pendingTransactionConstants.createdStatus,
      tokenId: oThis.tokenId
    });

    if (insertRsp.isFailure()) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.finalFailedStatus;
      return Promise.reject(insertRsp);
    } else {
      oThis.pendingTransactionInserted = 1;
    }
  }

  /**
   *
   * @return {Promise<void>}
   * @private
   */
  async _publishToRMQ() {
    const oThis = this,
      ExTxGetPublishDetails = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'ExTxGetPublishDetails'),
      exTxGetPublishDetails = new ExTxGetPublishDetails({
        tokenId: oThis.tokenId,
        ephemeralAddress: oThis.sessionKeyAddress
      });

    let publishDetails = await exTxGetPublishDetails.perform().catch(async function(error) {
      logger.error(`In catch block of exTxGetPublishDetails in file: ${__filename}`, error);
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.finalFailedStatus;
      return Promise.reject(error);
    });

    let messageParams = {
      topics: [publishDetails.topicName],
      publisher: 'OST',
      message: {
        kind: kwcConstant.executeTx,
        payload: {
          tokenAddressId: publishDetails.tokenAddressId,
          transaction_uuid: oThis.transactionUuid,
          transactionMetaId: oThis.transactionMetaId
        }
      }
    };

    let setToRMQ = await oThis.rmqInstance.publishEvent.perform(messageParams);

    if (setToRMQ.isFailure()) {
      oThis.failureStatusToUpdateInTxMeta = transactionMetaConst.queuedFailedStatus;
      return Promise.reject(setToRMQ);
    }

    return setToRMQ;
  }

  async _revertOperations(customError) {
    const oThis = this;

    if (oThis.pessimisticAmountDebitted) {
      logger.debug('something_went_wrong rolling back pessimitic debitted balances');
      await oThis._rollBackPessimisticDebit().catch(async function(rollbackError) {
        // TODO: Mark user balance as dirty
        logger.error(`In catch block of _rollBackPessimisticDebit in file: ${__filename}`, rollbackError);
      });
    }

    if (oThis.pendingTransactionInserted) {
      new PendingTransactionCrud(oThis.chainId)
        .update({
          transactionUuid: oThis.transactionUuid,
          status: pendingTransactionConstants.failedStatus
        })
        .catch(async function(updatePendingTxError) {
          // Do nothing
        });
    }

    if (oThis.transactionMetaId) {
      await new TransactionMetaModel()
        .update({
          status: transactionMetaConst.invertedStatuses[oThis.failureStatusToUpdateInTxMeta],
          debug_params: JSON.stringify(customError.toHash())
        })
        .where({ id: oThis.transactionMetaId })
        .fire();
    }
  }

  async _setRmqInstance() {
    const oThis = this;
    oThis.rmqInstance = await rabbitmqProvider.getInstance(rabbitmqConstants.auxRabbitmqKind, {
      connectionWaitSeconds: connectionTimeoutConst.crons,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionCrons,
      auxChainId: oThis.auxChainId
    });
  }

  async _setWebInstance() {
    const oThis = this;
    oThis.web3Instance = await web3Provider.getInstance(oThis._configStrategyObject.auxChainWsProvider).web3WsProvider;
  }

  /**
   * Get Token Rule Details from cache
   *
   * @return {Promise<never>}
   * @private
   */
  async _getRulesDetails() {
    const oThis = this;

    let tokenRuleDetailsCacheRsp = await new TokenRuleDetailsByTokenId({ tokenId: oThis.tokenId }).fetch();

    if (tokenRuleDetailsCacheRsp.isFailure() || !tokenRuleDetailsCacheRsp.data) {
      return Promise.reject(tokenRuleDetailsCacheRsp);
    }

    oThis.tokenRuleAddress = tokenRuleDetailsCacheRsp.data[ruleConstants.tokenRuleName].address;
    oThis.pricerRuleAddress = tokenRuleDetailsCacheRsp.data[ruleConstants.pricerRuleName].address;
  }

  /**
   * Fetch token addresses from cache
   *
   * @private
   */
  async _tokenAddresses() {
    const oThis = this;

    if (oThis.tokenAddresses) {
      return oThis.tokenAddresses;
    }

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (getAddrRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_et_b_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.tokenAddresses = getAddrRsp.data;

    return oThis.tokenAddresses;
  }

  /**
   *
   * @param {string} code
   * @param {array} paramErrors
   * @param {object} debugOptions
   *
   * @return {Promise}
   */
  _validationError(code, paramErrors, debugOptions) {
    const oThis = this;
    return Promise.reject(
      responseHelper.paramValidationError({
        internal_error_identifier: code,
        api_error_identifier: 'invalid_params',
        params_error_identifiers: paramErrors,
        debug_options: debugOptions
      })
    );
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis.ic().configStrategy);

    return oThis.configStrategyObj;
  }

  get auxChainId() {
    const oThis = this;
    return oThis._configStrategyObject.auxChainId;
  }

  async _setTokenHolderAddress() {
    throw 'subclass to implement';
  }

  /**
   *
   * @private
   */
  async _setSessionAddress() {
    throw 'subclass to implement';
  }

  /**
   *
   * @private
   */
  async _setNonce() {
    throw 'subclass to implement';
  }

  async _setSignature() {
    throw 'subclass to implement';
  }

  async _validateAndSanitize() {
    throw 'subclass to implement';
  }

  async _verifySessionSpendingLimit() {
    throw 'subclass to implement';
  }
}

module.exports = ExecuteTxBase;
