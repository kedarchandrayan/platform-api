'use strict';
/**
 * Formatter for Device entity.
 *
 * @module lib/formatter/entity/Device
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class for device formatter.
 *
 * @class DeviceFormatter
 */
class DeviceFormatter {
  /**
   * Constructor for device formatter.
   *
   * @param {Integer} params.userId
   * @param {String} params.walletAddress
   * @param {String} params.personalSignAddress
   * @param {Number} params.status
   * @param {Number} params.updatedTimestamp
   * @param {String} [params.linkedAddress]
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * Main performer method for the class.
   */
  perform() {
    const oThis = this,
      formattedDeviceData = {};

    if (
      !oThis.params.hasOwnProperty('userId') ||
      !oThis.params.hasOwnProperty('walletAddress') ||
      !oThis.params.hasOwnProperty('personalSignAddress') ||
      !oThis.params.hasOwnProperty('status') ||
      !oThis.params.hasOwnProperty('updatedTimestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_d_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { deviceParams: oThis.params }
        })
      );
    }

    formattedDeviceData['user_id'] = oThis.params.userId;
    formattedDeviceData['address'] = oThis.params.walletAddress;
    formattedDeviceData['linked_address'] = oThis.params.linkedAddress || null;
    formattedDeviceData['api_signer_address'] = oThis.params.personalSignAddress;
    formattedDeviceData['status'] = oThis.params.status;
    formattedDeviceData['updated_timestamp'] = Number(oThis.params.updatedTimestamp);

    return responseHelper.successWithData(formattedDeviceData);
  }
}

module.exports = DeviceFormatter;
