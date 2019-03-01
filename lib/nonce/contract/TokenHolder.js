'use strict';

/**
 * Module to fetch nonce of session address from token holder contract.
 *
 * @module lib/nonce/contract/TokenHolder
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ContractNonceBase = require(rootPrefix + '/lib/nonce/contract/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CoreAbi = require(rootPrefix + '/config/CoreAbis');

/**
 * Class to fetch nonce of session address from token holder contract
 *
 * @class
 */
class TokenHolderNonce extends ContractNonceBase {
  /**
   * Constructor
   *
   * @param params {Object}
   * @param {String} params.sessionAddress
   *
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.sessionAddress = params.sessionAddress;
  }

  /**
   * Initialize Contract Obj
   *
   * @private
   */
  _initContract() {
    const oThis = this;

    let tokenHolderAbi = CoreAbi.TokenHolder,
      tokenHolderAddress = oThis.userData.tokenHolderAddress;

    return new oThis.web3Instance.eth.Contract(tokenHolderAbi, tokenHolderAddress);
  }

  /**
   * Fetch nonce from contract.
   *
   * @private
   */
  async _fetchNonceFromContract() {
    const oThis = this;

    let contractResponse = await oThis.contractObj.methods.sessionKeys(oThis.sessionAddress).call();

    if (!contractResponse) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_n_c_th_1',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }

    return contractResponse.nonce;
  }
}

InstanceComposer.registerAsShadowableClass(TokenHolderNonce, coreConstants.icNameSpace, 'TokenHolderNonce');

module.exports = {};