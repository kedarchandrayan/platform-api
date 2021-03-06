/**
 * Module for authorize device router.
 *
 * @module lib/workflow/authorizeDevice/Router
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  AuxWorkflowRouterBase = require(rootPrefix + '/lib/workflow/AuxRouterBase'),
  util = require(rootPrefix + '/lib/util'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  authorizeDeviceStepsConfig = require(rootPrefix + '/lib/workflow/authorizeDevice/stepsConfig'),
  webhookSubscriptionsConstants = require(rootPrefix + '/lib/globalConstant/webhookSubscriptions');

/**
 * Class for authorize device router.
 *
 * @class AuthorizeDeviceRouter
 */
class AuthorizeDeviceRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for authorize device router.
   *
   * @augments AuxWorkflowRouterBase
   *
   * @constructor
   */
  constructor(params) {
    params.workflowKind = workflowConstants.authorizeDeviceKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @sets oThis.currentStepConfig
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = authorizeDeviceStepsConfig[oThis.stepKind];
  }

  /**
   * Perform step.
   *
   * @return {Promise<*>}
   * @private
   */
  async _performStep() {
    const oThis = this;

    const configStrategy = await oThis.getConfigStrategy(),
      ic = new InstanceComposer(configStrategy);

    switch (oThis.stepKind) {
      case workflowStepConstants.authorizeDeviceInit:
        {
          logger.step('**********', workflowStepConstants.authorizeDeviceInit);
        }

        return oThis.insertInitStep();

      // Authorize device transaction.
      case workflowStepConstants.authorizeDevicePerformTransaction: {
        logger.step('**********', workflowStepConstants.authorizeDevicePerformTransaction);
        require(rootPrefix + '/lib/device/Authorize');
        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        const AuthorizeDevicePerformTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'AuthorizeDevicePerformTransaction'
          ),
          authorizeDevicePerformTransactionObj = new AuthorizeDevicePerformTransaction(oThis.requestParams);

        return authorizeDevicePerformTransactionObj.perform();
      }

      // Authorize device verify transaction.
      case workflowStepConstants.authorizeDeviceVerifyTransaction: {
        logger.step('**********', workflowStepConstants.authorizeDeviceVerifyTransaction);
        require(rootPrefix + '/lib/device/VerifyAuthorize');
        const VerifyAuthorizeDeviceTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyAuthorizeDeviceTransaction'
          ),
          verifyAuthorizeDeviceTransactionObj = new VerifyAuthorizeDeviceTransaction(oThis.requestParams);

        return verifyAuthorizeDeviceTransactionObj.perform();
      }

      // Rollback authorize device transaction.
      case workflowStepConstants.rollbackAuthorizeDeviceTransaction: {
        logger.step('**********', workflowStepConstants.rollbackAuthorizeDeviceTransaction);
        require(rootPrefix + '/lib/device/RollbackAuthorizeDevice');
        const RollbackAuthorizeTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'RollbackAuthorizeDevice'
          ),
          rollbackAuthorizeTransactionObj = new RollbackAuthorizeTransaction(oThis.requestParams);

        return rollbackAuthorizeTransactionObj.perform();
      }

      case workflowStepConstants.markSuccess: {
        logger.step('*** Mark Authorize Device As Success.');

        const preProcessorWebhookDetails = oThis.preProcessorWebhookDetails(
          webhookSubscriptionsConstants.devicesAuthorizationSuccessTopic
        );

        await oThis.sendPreprocessorWebhook(preProcessorWebhookDetails.chainId, preProcessorWebhookDetails.payload);

        return await oThis.handleSuccess();
      }

      case workflowStepConstants.markFailure: {
        logger.step('*** Mark Authorize Device As Failed');

        const preProcessorWebhookDetails = oThis.preProcessorWebhookDetails(
          webhookSubscriptionsConstants.devicesAuthorizationFailureTopic
        );

        await oThis.sendPreprocessorWebhook(preProcessorWebhookDetails.chainId, preProcessorWebhookDetails.payload);

        return await oThis.handleFailure();
      }

      default: {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_awr_mo_adr_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { workflowId: oThis.workflowId }
          })
        );
      }
    }
  }

  /**
   * Get next step configs.
   *
   * @param {string} nextStep
   *
   * @return {*}
   */
  getNextStepConfigs(nextStep) {
    return authorizeDeviceStepsConfig[nextStep];
  }

  /**
   * SHA Hash to uniquely identify workflow, to avoid same commits
   *
   * @returns {String}
   *
   * @private
   */
  _uniqueWorkflowHash() {
    const oThis = this;

    let uniqueStr = oThis.requestParams.multisigAddress + '_';
    uniqueStr += oThis.requestParams.deviceNonce;

    return util.createSha256Digest(uniqueStr);
  }

  /**
   * Get config strategy.
   *
   * @return {Promise<*>}
   */
  async getConfigStrategy() {
    const oThis = this;

    const rsp = await chainConfigProvider.getFor([oThis.chainId]);

    return rsp[oThis.chainId];
  }

  /**
   * Get preprocessor webhook details.
   *
   * @param {string} webhookKind: Kind of webhook.
   *
   * @returns {{chainId: string, payload: {webhookKind: string, deviceAddress: string, clientId: string,
   *            tokenId: string, userId: string}}}
   */
  preProcessorWebhookDetails(webhookKind) {
    const oThis = this;

    return {
      chainId: oThis.requestParams.auxChainId,
      payload: {
        webhookKind: webhookKind,
        clientId: oThis.requestParams.clientId,
        tokenId: oThis.requestParams.tokenId,
        userId: oThis.requestParams.userId,
        deviceAddress: oThis.requestParams.deviceAddress
      }
    };
  }
}

module.exports = AuthorizeDeviceRouter;
