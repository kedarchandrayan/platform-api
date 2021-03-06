'use strict';

/*
  * Validate api signature of Api request
*/

const crypto = require('crypto');

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.v2);

class AuthenticateApiByWebhookKeySecret {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.inputParams - Params sent in API call
   * @param {Number} params.inputParams.api_key - api_key using which signature was generated
   * @param {Number} params.inputParams.api_request_timestamp - in seconds timestamp when request was signed
   * @param {String} params.inputParams.api_signature_kind - algo of signature
   * @param {String} params.inputParams.api_signature - signature generated after applying algo
   * @param {String} params.requestPath - path of the url called
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.inputParams = params.inputParams;
    oThis.reqPath = params.requestPath;
    oThis.requestHeaders = params.requestHeaders;
  }

  /**
   *
   * @return {Promise}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return Promise.resolve(
          responseHelper.error({
            internal_error_identifier: 'l_vas_bbbbbb_3',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: { error: error.toString() }
          })
        );
      }
    });
  }

  /***
   * Perform validation
   *
   * @return {Promise}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    console.log('I am in AuthenticateApiByWebhookKeySecret');
    return oThis._validateSignature();
  }

  /**
   *
   * Validate API Signature
   *
   * @return {Promise<*>}
   */
  async _validateSignature() {
    const oThis = this;

    logger.debug('apiAuthentication: ByApiKeySecretStep: 2');
    let apiSecret = 'c4fd845c2b916bea992c5c1d15922bcdba09fbd2a938aabb32fd36192e2c916e';
    const signature = oThis.requestHeaders['ost-signature'];

    let computedSignature = oThis.generateApiSignature(oThis._stringToSign, apiSecret);

    logger.debug('apiAuthentication: ByApiKeySecretStep: 5', computedSignature);
    logger.debug('apiAuthentication: ByApiKeySecretStep: 6', signature);

    if (signature.indexOf(computedSignature) == -1) {
      return oThis._validationError('l_vas_baks_4', ['invalid_api_signature'], {
        computedSignature: computedSignature,
        signature: signature
      });
    }

    logger.debug('apiAuthentication: ByApiKeySecretStep: 6');

    return Promise.resolve(
      responseHelper.successWithData({
        apiSignatureKind: oThis._signatureKind
      })
    );
  }

  /**
   *
   * Generate String to Sign
   *
   * @return {string}
   * @private
   */
  get _stringToSign() {
    const oThis = this;

    return `${oThis.requestHeaders['ost-timestamp']}.${oThis.requestHeaders['ost-version']}.${JSON.stringify(
      oThis.inputParams
    )}`;
  }

  get _signatureKind() {
    return apiSignature.hmacKind;
  }

  generateApiSignature(stringParams, clientSecret) {
    var hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(stringParams);
    return hmac.digest('hex');
  }

  /**
   *
   * @param {string} code
   * @param {array} paramErrors
   * @param {Object} [debugOptions]
   *
   * @return {Promise}
   */
  _validationError(code, paramErrors, debugOptions) {
    const oThis = this;

    if (!debugOptions) {
      debugOptions = {
        inputParams: oThis.inputParams,
        currentTimeStamp: Math.floor(new Date().getTime() / 1000)
      };
    }

    return Promise.reject(
      responseHelper.paramValidationError({
        internal_error_identifier: code,
        api_error_identifier: 'unauthorized_api_request',
        params_error_identifiers: paramErrors,
        error_config: errorConfig,
        debug_options: debugOptions
      })
    );
  }
}

module.exports = AuthenticateApiByWebhookKeySecret;
