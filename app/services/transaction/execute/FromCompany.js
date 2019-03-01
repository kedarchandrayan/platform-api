'use strict';
/**
 * This service executes Company To User Transaction
 *
 * @module app/services/transaction/execute/FromCompany
 */

const BigNumber = require('bignumber.js'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  sessionConstants = require(rootPrefix + '/lib/globalConstant/session'),
  NonceGetForSession = require(rootPrefix + '/lib/nonce/get/ForSession'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser'),
  ExecuteTxBase = require(rootPrefix + '/app/services/transaction/execute/Base'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/cacheManagement/shared/AddressPrivateKey');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/cacheManagement/chain/UserTransactionCount');
require(rootPrefix + '/lib/cacheManagement/chainMulti/SessionsByAddress');

/**
 * Class
 *
 * @class
 */
class ExecuteCompanyToUserTx extends ExecuteTxBase {
  /**
   * Constructor for company to user tx class
   *
   * @param {Object} params
   * @param {Object} params.client_id - client id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.clientId = params.client_id;
  }

  /**
   *
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    oThis.rawCalldata = await basicHelper.sanitizeRawCallData(oThis.rawCalldata);
  }

  /**
   *  Set sender token holder address
   *
   * @private
   */
  async _setTokenHolderAddress() {
    const oThis = this;

    // fetch company users details
    let TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({
        tokenId: oThis.tokenId,
        userIds: [oThis.userId]
      }),
      tokenUserDetailsCacheRsp = await tokenUserDetailsCacheObj.fetch();

    if (tokenUserDetailsCacheRsp.isFailure()) {
      logger.error('Could not fetched token user details.');
      Promise.reject(tokenUserDetailsCacheRsp);
    }

    let companyUserData = tokenUserDetailsCacheRsp.data[oThis.userId];

    if (!CommonValidators.validateObject(companyUserData)) {
      return oThis._validationError('s_et_fc_1', ['invalid_user_id'], {
        userId: oThis.userId
      });
    }

    if (companyUserData.kind !== tokenUserConstants.companyKind) {
      return oThis._validationError('s_et_fc_2', ['invalid_user_id'], {
        userKind: companyUserData.kind
      });
    }

    if (companyUserData.saasApiStatus !== tokenUserConstants.saasApiActiveStatus) {
      return oThis._validationError('s_et_fc_3', ['saas_inactive_user_id'], {
        saasApiStatus: companyUserData.saasApiStatus
      });
    }

    if (companyUserData.status !== tokenUserConstants.activatedStatus) {
      return oThis._validationError('s_et_fc_4', ['inactive_user_id'], {
        status: companyUserData.status
      });
    }

    oThis.tokenHolderAddress = companyUserData.tokenHolderAddress;
    oThis.sessionShardNumber = companyUserData.sessionShardNumber;
  }

  /**
   * Set session address
   *
   * @private
   */
  async _setSessionAddress() {
    const oThis = this;

    // fetch session key addresses for given user id
    let UserSessionAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserSessionAddressCache'),
      userSessionAddressCache = new UserSessionAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        shardNumber: oThis.sessionShardNumber
      }),
      userSessionAddressCacheResp = await userSessionAddressCache.fetch();

    if (userSessionAddressCacheResp.isFailure() || !userSessionAddressCacheResp.data) {
      return Promise.reject(userSessionAddressCacheResp);
    }

    if (userSessionAddressCacheResp.data['addresses'].length === 0) {
      return oThis._validationError('s_et_fc_5', ['session_not_found'], {
        userId: oThis.userId
      });
    }

    oThis.sessionKeyAddresses = userSessionAddressCacheResp.data['addresses'];

    // fetch session addresses details
    let getUserSessionsCacheResponse = await oThis._getUserSessionsDataFromCache();

    if (getUserSessionsCacheResponse.isFailure() || !getUserSessionsCacheResponse.data) {
      return Promise.reject(getUserSessionsCacheResponse);
    }

    let sessionAddressToDetailsMap = getUserSessionsCacheResponse.data,
      allowedSessionKeys = [],
      sessionData = {};

    // select session keys such that its spending limit is greater than pessimisticDebitAmount
    for (let i = 0; i < oThis.sessionKeyAddresses.length; i++) {
      sessionData = sessionAddressToDetailsMap[oThis.sessionKeyAddresses[i]];
      if (
        sessionData.status === sessionConstants.authorizedStatus &&
        oThis.pessimisticDebitAmount.lte(new BigNumber(sessionData.spendingLimit))
      ) {
        allowedSessionKeys.push(oThis.sessionKeyAddresses[i]);
      }
    }

    if (allowedSessionKeys.length === 0) {
      return oThis._validationError('s_et_fc_6', ['session_key_spending_limit_breached'], {
        spendingLimit: basicHelper.formatWeiToString(sessionData.spendingLimit),
        pessimisticDebitAmount: basicHelper.formatWeiToString(oThis.pessimisticDebitAmount)
      });
    }

    // then, sequentially select one session key using index from cache
    oThis.sessionKeyAddress = await oThis._selectSessionKey(allowedSessionKeys);
    logger.debug('sessionKeyAddress-----', oThis.sessionKeyAddress);
  }

  /**
   * Function to set session key nonce value.
   *
   * @private
   */
  async _setNonce() {
    const oThis = this;

    // get nonce from session nonce manager
    let nonceGetForSessionResp = await new NonceGetForSession({
      address: oThis.sessionKeyAddress,
      chainId: oThis.auxChainId,
      userId: oThis.userId,
      tokenId: oThis.tokenId,
      configStrategy: oThis.ic().configStrategy
    }).getNonce();

    if (nonceGetForSessionResp.isFailure()) {
      return Promise.reject(nonceGetForSessionResp);
    }

    oThis.sessionKeyNonce = nonceGetForSessionResp.data.nonce;
  }

  /**
   * set signature
   *
   * @return {Promise<void>}
   * @private
   */
  async _setSignature() {
    const oThis = this;

    logger.debug('========signEIP1077Transaction===transactionObject==========', oThis.executableTxData);

    // fetch Private Key of session address
    let sessionKeyAddrPK = await oThis._fetchPrivateKey(oThis.sessionKeyAddress),
      sessionKeyObject = oThis.web3Instance.eth.accounts.wallet.add(sessionKeyAddrPK);

    // sign EIP1077 tx
    // TODO - ethereum js tx support for EIP1077
    const vrs = sessionKeyObject.signEIP1077Transaction(oThis.executableTxData);

    oThis.signatureData = {
      r: vrs.r,
      s: vrs.s,
      v: vrs.v,
      messageHash: vrs.messageHash,
      signature: vrs.signature
    };
  }

  /**
   *
   * @private
   */
  _verifySessionSpendingLimit() {
    // do nothing as session spending limit is checked in _setSessionAddress function
  }

  /**
   * Get session details of a user from session details cache
   *
   * @returns {Promise<*|result>}
   */
  async _getUserSessionsDataFromCache() {
    const oThis = this;

    let SessionsByAddressCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'SessionsByAddressCache'),
      sessionsByAddressCache = new SessionsByAddressCache({
        userId: oThis.userId,
        tokenId: oThis.tokenId,
        addresses: oThis.sessionKeyAddresses,
        shardNumber: oThis.sessionShardNumber
      }),
      sessionsByAddressCacheRsp = await sessionsByAddressCache.fetch();

    if (sessionsByAddressCacheRsp.isFailure()) {
      return oThis._validationError('s_et_fc_7', ['invalid_session_addresses'], {
        userId: oThis.userId
      });
    }

    return sessionsByAddressCacheRsp;
  }

  /**
   * Select one key given array using index returned from cache
   *
   * @param sessionKeys
   * @return {Promise<void>}
   * @private
   */
  async _selectSessionKey(sessionKeys) {
    const oThis = this;

    let indexFromCache = 0,
      UserTransactionCount = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'UserTransactionCount'),
      userTransactionCount = new UserTransactionCount({
        tokenId: oThis.tokenId
      }),
      userTransactionCountTxCacheRsp = await userTransactionCount.fetch();

    if (userTransactionCountTxCacheRsp.isSuccess() && userTransactionCountTxCacheRsp.data) {
      indexFromCache = userTransactionCountTxCacheRsp.data;
    }

    let indexToSelect = indexFromCache % sessionKeys.length;

    logger.debug('indexToSelect------', indexToSelect);

    return basicHelper.sanitizeAddress(sessionKeys[indexToSelect]);
  }

  /***
   *
   * get private key from cache
   *
   * @param {String} address
   *
   * @return {String}
   */
  async _fetchPrivateKey(address) {
    const oThis = this,
      addressPrivateKeyCache = new AddressPrivateKeyCache({ address: address }),
      addressPrivateKeyCacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData();

    return addressPrivateKeyCacheFetchRsp.data['private_key_d'];
  }
}

InstanceComposer.registerAsShadowableClass(ExecuteCompanyToUserTx, coreConstants.icNameSpace, 'ExecuteCompanyToUserTx');

module.exports = {};