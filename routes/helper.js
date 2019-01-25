'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ApiParamsValidator = require(rootPrefix + '/lib/validators/ApiParams'),
  ConfigCrudByClientId = require(rootPrefix + '/helpers/configStrategy/ByClientId');

class RoutesHelper {
  /**
   * Perform
   *
   * @param req
   * @param res
   * @param next
   * @param serviceGetter - in case of getting from ic, this is the getter name. else it is relative path in app root folder
   * @param errorCode
   * @param afterValidationCallback
   * @param formatter
   * @return {Promise<T>}
   */
  static perform(req, res, next, serviceGetter, errorCode, afterValidationCallback, formatter) {
    const oThis = this,
      errorConfig = basicHelper.fetchErrorConfig(req.decodedParams.apiVersion);

    return oThis.asyncPerform(req, res, next, serviceGetter, afterValidationCallback, formatter).catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        error.renderResponse(res, errorConfig);
      } else {
        //TODO:- temp change (remove this and use notify)
        logger.error(errorCode, 'Something went wrong', error);

        responseHelper
          .error({
            internal_error_identifier: errorCode,
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
          })
          .renderResponse(res, errorConfig);
      }
    });
  }

  /**
   * Async Perform
   *
   * @param req
   * @param res
   * @param next
   * @param serviceGetter
   * @param afterValidationCallback
   * @param formatter
   * @return {Promise<*>}
   */
  static async asyncPerform(req, res, next, serviceGetter, afterValidationCallback, formatter) {
    req.decodedParams = req.decodedParams || {};

    const oThis = this,
      errorConfig = basicHelper.fetchErrorConfig(req.decodedParams.apiVersion);

    const apiParamsValidatorRsp = await new ApiParamsValidator({
      api_name: req.decodedParams.apiName,
      api_version: req.decodedParams.apiVersion,
      api_params: req.decodedParams
    }).perform();

    req.serviceParams = apiParamsValidatorRsp.data.sanitisedApiParams;

    if (afterValidationCallback) {
      req.serviceParams = await afterValidationCallback(req.serviceParams);
    }

    let handleResponse = async function(response) {
      if (response.isSuccess() && formatter) {
        // if requires this function could reformat data as per API version requirements.
        await formatter(response);
      }

      response.renderResponse(res, errorConfig);
    };

    let Service;

    if (req.decodedParams.clientConfigStrategyRequired) {
      let configStrategy = await oThis._fetchConfigStrategyByClientId(req.serviceParams['client_id']);
      let instanceComposer = new InstanceComposer(configStrategy);
      Service = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, serviceGetter);
    } else {
      Service = require(rootPrefix + serviceGetter);
    }

    return new Service(req.serviceParams).perform().then(handleResponse);
  }

  /**
   * Fetch config strategy by client id
   *
   * @param clientId
   * @return {Promise<*>}
   * @private
   */
  static async _fetchConfigStrategyByClientId(clientId) {
    let configCrudByClientId = new ConfigCrudByClientId(clientId),
      configStrategyRsp = await configCrudByClientId.get();

    if (configStrategyRsp.isFailure()) {
      return Promise.reject(configStrategyRsp);
    }

    return configStrategyRsp.data;
  }
}

module.exports = RoutesHelper;
