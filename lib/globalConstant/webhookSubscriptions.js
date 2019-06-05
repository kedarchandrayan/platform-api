/**
 * Module for webhook subscription constants.
 *
 * @module lib/globalConstant/webhookSubscriptions
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let statuses, invertedStatuses, topics, invertedTopics, webhookQueueTopics;

/**
 * Class for webhook subscriptions constants.
 *
 * @class WebhookSubscriptions
 */
class WebhookSubscriptionsConstants {
  get activeStatus() {
    return 'active';
  }

  get inActiveStatus() {
    return 'inActive';
  }

  // Transactions topic start.
  get transactionsCreateTopic() {
    return 'transactions/create';
  }

  get transactionsSuccessTopic() {
    return 'transactions/success';
  }

  get transactionsFailureTopic() {
    return 'transactions/failure';
  }
  // Transactions topic end.

  // Users topic start.
  get usersActivateTopic() {
    return 'users/activate';
  }

  get usersDeleteTopic() {
    return 'users/delete';
  }
  // Users topic end.

  // Devices topic start.
  get devicesAuthorizedTopic() {
    return 'devices/authorized';
  }

  get devicesUnauthorizedTopic() {
    return 'devices/unauthorized';
  }

  get devicesInitiateRecoveryTopic() {
    return 'devices/initiate_recovery';
  }

  get devicesRecoveryAbortedTopic() {
    return 'devices/recovery_aborted';
  }

  get devicesRecoverySuccessTopic() {
    return 'devices/recovery_success';
  }
  // Devices topic end.

  // Sessions topic start.
  get sessionsAuthorizedTopic() {
    return 'sessions/authorized';
  }

  get sessionsRevokedTopic() {
    return 'sessions/revoked';
  }

  get sessionsLogoutAllTopic() {
    return 'sessions/logoutall';
  }
  // Sessions topic end.

  // Webhook queues subscription topic names start.
  get transactionsTopic() {
    return 'transactions';
  }

  get usersTopic() {
    return 'users';
  }

  get devicesTopic() {
    return 'devices';
  }

  get sessionsTopic() {
    return 'sessions';
  }
  // Webhook queues subscription topic names end.

  get statuses() {
    const oThis = this;

    if (statuses) {
      return statuses;
    }

    statuses = {
      '1': oThis.activeStatus,
      '2': oThis.inActiveStatus
    };

    return statuses;
  }

  get invertedStatuses() {
    const oThis = this;

    if (invertedStatuses) {
      return invertedStatuses;
    }

    invertedStatuses = util.invert(oThis.statuses);

    return invertedStatuses;
  }

  get topics() {
    const oThis = this;

    if (topics) {
      return topics;
    }

    topics = {
      '1': oThis.transactionsCreateTopic,
      '2': oThis.transactionsSuccessTopic,
      '3': oThis.transactionsFailureTopic,
      '4': oThis.usersActivateTopic,
      '5': oThis.usersDeleteTopic,
      '6': oThis.devicesAuthorizedTopic,
      '7': oThis.devicesUnauthorizedTopic,
      '8': oThis.devicesInitiateRecoveryTopic,
      '9': oThis.devicesRecoveryAbortedTopic,
      '10': oThis.devicesRecoverySuccessTopic,
      '11': oThis.sessionsAuthorizedTopic,
      '12': oThis.sessionsRevokedTopic,
      '13': oThis.sessionsLogoutAllTopic
    };

    return topics;
  }

  get invertedTopics() {
    const oThis = this;

    if (invertedTopics) {
      return invertedTopics;
    }

    invertedTopics = util.invert(oThis.topics);

    return invertedTopics;
  }

  get maxTopicsPerEndpoint() {
    return 3;
  }

  get webhookQueueTopicName() {
    const oThis = this;

    if (webhookQueueTopics) {
      return webhookQueueTopics;
    }

    webhookQueueTopics = {
      [oThis.transactionsCreateTopic]: oThis.transactionsTopic,
      [oThis.transactionsSuccessTopic]: oThis.transactionsTopic,
      [oThis.transactionsFailureTopic]: oThis.transactionsTopic,
      [oThis.usersActivateTopic]: oThis.usersTopic,
      [oThis.usersDeleteTopic]: oThis.usersTopic,
      [oThis.devicesAuthorizedTopic]: oThis.devicesTopic,
      [oThis.devicesUnauthorizedTopic]: oThis.devicesTopic,
      [oThis.devicesInitiateRecoveryTopic]: oThis.devicesTopic,
      [oThis.devicesRecoveryAbortedTopic]: oThis.devicesTopic,
      [oThis.devicesRecoverySuccessTopic]: oThis.devicesTopic,
      [oThis.sessionsAuthorizedTopic]: oThis.sessionsTopic,
      [oThis.sessionsRevokedTopic]: oThis.sessionsTopic,
      [oThis.sessionsLogoutAllTopic]: oThis.sessionsTopic
    };

    return webhookQueueTopics;
  }
}

module.exports = new WebhookSubscriptionsConstants();