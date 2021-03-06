/**
 * Module for webhook pre-processor constants.
 *
 * @module lib/globalConstant/webhookPreprocessor
 */

/**
 * Class for webhook pre-processor constants.
 *
 * @class WebhookPreprocessorConstants
 */
class WebhookPreprocessorConstants {
  get topics() {
    return ['webhook_preprocessor.#'];
  }

  get publisher() {
    return 'OST-Webhooks';
  }

  get messageKind() {
    return 'webhooksPreprocessor';
  }
}

module.exports = new WebhookPreprocessorConstants();
