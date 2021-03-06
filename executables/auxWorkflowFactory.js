'use strict';
/**
 * Factory class for workflowRouter.
 *
 * @module executables/auxWorkflowFactory
 */
const program = require('commander');

const rootPrefix = '..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  RabbitmqSubscription = require(rootPrefix + '/lib/entity/RabbitSubscription'),
  MultiSubscriptionBase = require(rootPrefix + '/executables/rabbitmq/MultiSubscriptionBase');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/auxWorkflowFactory.js --cronProcessId 18');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class for workflow router factory.
 *
 * @class
 */
class AuxWorkflowRouterFactory extends MultiSubscriptionBase {
  /**
   * Constructor for aux workflow router factory.
   *
   * @augments SubscriberBase
   *
   * @param {Object} params: params object
   * @param {Number} params.cronProcessId: cron_processes table id
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Process name prefix
   *
   * @returns {String}
   *
   * @private
   */
  get _processNamePrefix() {
    return 'aux_workflow_processor';
  }

  /**
   * Topics to subscribe
   *
   * @returns {*[]}
   *
   * @private
   */
  get _topicsToSubscribe() {
    return ['auxWorkflow.#'];
  }

  /**
   * Queue name
   *
   * @returns {String}
   *
   * @private
   */
  get _queueName() {
    return 'auxWorkflow';
  }

  /**
   * Specific validations
   *
   * @return {Promise<void>}
   * @private
   */
  async _specificValidations() {
    // Add specific validations here
  }

  /**
   * Cron kind
   *
   * @returns {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.auxWorkflowWorker;
  }

  /**
   * Steps to do before subscribe
   *
   * @return {Promise<boolean>}
   * @private
   */
  async _beforeSubscribe() {
    return true;
  }

  /**
   * Prepare subscription data.
   *
   * @returns {{}}
   * @private
   */

  _prepareSubscriptionData() {
    const oThis = this;

    oThis.subscriptionTopicToDataMap[oThis._topicsToSubscribe[0]] = new RabbitmqSubscription({
      rabbitmqKind: rabbitmqConstants.auxRabbitmqKind,
      topic: oThis._topicsToSubscribe[0],
      queue: oThis._queueName,
      prefetchCount: oThis.prefetchCount,
      auxChainId: oThis.auxChainId
    });
  }

  /**
   * Process message
   *
   * @param {Object} messageParams
   * @param {Object} messageParams.message
   * @param {Array} messageParams.topics
   * @param {String} messageParams.message.stepKind: Which step to execute in router
   * @param {Number} messageParams.message.currentStepId: id of process parent
   * @param {Number} messageParams.message.parentStepId: id of process parent
   * @param {String} messageParams.message.status
   * @param {Object} messageParams.message.payload
   *
   * @returns {Promise<>}
   *
   * @private
   */
  async _processMessage(messageParams) {
    const oThis = this;

    // Identify which file/function to initiate to execute task of specific kind.
    // Query in workflow_steps to get details pf parent id in message params
    let msgParams = messageParams.message.payload;
    msgParams.topic = messageParams.topics[0];

    switch (msgParams.topic) {
      case workflowTopicConstant.userSetup:
        const UserSetupRouter = require(rootPrefix + '/lib/workflow/userSetup/Router');
        return new UserSetupRouter(msgParams).perform();
      case workflowTopicConstant.authorizeDevice:
        const AuthorizeDeviceRouter = require(rootPrefix + '/lib/workflow/authorizeDevice/Router');
        return new AuthorizeDeviceRouter(msgParams).perform();
      case workflowTopicConstant.revokeDevice:
        const RevokeDeviceRouter = require(rootPrefix + '/lib/workflow/revokeDevice/Router');
        return new RevokeDeviceRouter(msgParams).perform();
      case workflowTopicConstant.authorizeSession:
        const AuthorizeSessionRouter = require(rootPrefix + '/lib/workflow/authorizeSession/Router');
        return new AuthorizeSessionRouter(msgParams).perform();
      case workflowTopicConstant.revokeSession:
        const RevokeSessionRouter = require(rootPrefix + '/lib/workflow/revokeSession/Router');
        return new RevokeSessionRouter(msgParams).perform();
      case workflowTopicConstant.initiateRecovery:
        const InitiateRecoveryRouter = require(rootPrefix +
          '/lib/workflow/deviceRecovery/byOwner/initiateRecovery/Router');
        return new InitiateRecoveryRouter(msgParams).perform();
      case workflowTopicConstant.abortRecoveryByOwner:
        const AbortRecoveryByOwnerRouter = require(rootPrefix +
          '/lib/workflow/deviceRecovery/byOwner/abortRecovery/Router');
        return new AbortRecoveryByOwnerRouter(msgParams).perform();
      case workflowTopicConstant.resetRecoveryOwner:
        const ResetRecoveryOwnerRouter = require(rootPrefix +
          '/lib/workflow/deviceRecovery/byOwner/resetRecoveryOwner/Router');
        return new ResetRecoveryOwnerRouter(msgParams).perform();
      case workflowTopicConstant.executeRecovery:
        const ExecuteRecoveryRouter = require(rootPrefix +
          '/lib/workflow/deviceRecovery/byRecoveryController/executeRecovery/Router');
        return new ExecuteRecoveryRouter(msgParams).perform();
      case workflowTopicConstant.abortRecoveryByRecoveryController:
        const AbortRecoveryByRecoveryControllerRouter = require(rootPrefix +
          '/lib/workflow/deviceRecovery/byRecoveryController/abortRecovery/Router');
        return new AbortRecoveryByRecoveryControllerRouter(msgParams).perform();
      case workflowTopicConstant.logoutSession:
        const logoutSessionRouter = require(rootPrefix + '/lib/workflow/logoutSessions/Router');
        return new logoutSessionRouter(msgParams).perform();
      case workflowTopicConstant.updatePricePoint:
        const updatePricePointsRouter = require(rootPrefix + '/lib/workflow/updatePricePoints/Router');
        return new updatePricePointsRouter(msgParams).perform();

      default:
        throw 'Unsupported workflow topic ' + messageParams.topics[0];
    }
  }

  /**
   * Start subscription
   *
   * @return {Promise<void>}
   * @private
   */
  async _startSubscription() {
    const oThis = this;

    await oThis._startSubscriptionFor(oThis._topicsToSubscribe[0]);
  }
}

logger.step('Aux Workflow Router Factory started.');

new AuxWorkflowRouterFactory({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.continuousCronRestartInterval);
