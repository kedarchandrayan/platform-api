'use strict';
/**
 * RabbitMQ instance provider
 *
 * @module lib/providers/rabbitmq
 */
const OSTNotification = require('@ostdotcom/notification');

const rootPrefix = '../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  rabbitmqConstants = require(rootPrefix + '/lib/globalConstant/rabbitmq');

/**
 * Provider class for ost-notification
 *
 * @class
 */
class RabbitmqProvider {
  /**
   * @constructor
   */
  constructor() {}

  /**
   * Get instance
   *
   * @param rabbitmqKind - rabbitmq kind
   * @param options {object} - options
   *
   * @return {Promise<*>}
   */
  async getInstance(rabbitmqKind, options) {
    const auxChainId = options.auxChainId,
      connectionWaitSeconds = options.connectionWaitSeconds,
      switchConnectionWaitSeconds = options.switchConnectionWaitSeconds;

    let chainCompleteConfig, rabbitmqConfig;

    if (rabbitmqKind == rabbitmqConstants.originRabbitmqKind) {
      chainCompleteConfig = await chainConfigProvider.getFor([0]);
      rabbitmqConfig = chainCompleteConfig['0'].originRabbitmq;
    } else if (rabbitmqKind == rabbitmqConstants.globalRabbitmqKind) {
      chainCompleteConfig = await chainConfigProvider.getFor([0]);
      rabbitmqConfig = chainCompleteConfig['0'].globalRabbitmq;
    } else {
      chainCompleteConfig = await chainConfigProvider.getFor([auxChainId]);
      rabbitmqConfig = chainCompleteConfig[auxChainId].rabbitmq;
    }

    Object.assign(rabbitmqConfig, {
      connectionTimeoutSec: connectionWaitSeconds,
      switchHostAfterSec: switchConnectionWaitSeconds,
      enableRabbitmq: '1'
    });

    return OSTNotification.getInstance({
      rabbitmq: rabbitmqConfig
    });
  }
}

module.exports = new RabbitmqProvider();