/**
 * Module for cron processes base.
 *
 * @module lib/cronProcess/Base
 */

const rootPrefix = '../..',
  CronProcessModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

// Declare constants.
const has = Object.prototype.hasOwnProperty; // Cache the lookup once, in module scope.

/**
 * Class for cron processes base.
 *
 * @class Base
 */
class Base {
  /**
   * Constructor for cron processes base.
   *
   * @param {object} params
   * @param {number/string} [params.id]
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tableAutoIncrementId = params.id;

    oThis.getCronKind;

    oThis.cronKindInt = new CronProcessModel().invertedKinds[oThis.cronKind];
  }

  /**
   * Validate if cron kind is valid or not.
   *
   * @return {Promise<never>}
   * @private
   */
  async validateCronKind() {
    const oThis = this;

    if (!oThis.cronKindInt) {
      logger.error('Invalid cron kind.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_b_1',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Check if cron kind exists with the same chainId already.
   *
   * @param {string} chainIdKey
   * @param {number} chainIdValue
   *
   * @return {Promise<never>}
   */
  async checkForExistingCronPerChain(chainIdKey, chainIdValue) {
    const oThis = this;

    const existingCrons = await new CronProcessModel()
        .select('*')
        .where({
          kind: oThis.cronKindInt
        })
        .fire(),
      existingCronsLength = existingCrons.length;

    for (let index = 0; index < existingCronsLength; index += 1) {
      const cronEntity = existingCrons[index],
        cronParams = JSON.parse(cronEntity.params);

      if (has.call(cronParams, chainIdKey) && +cronParams[chainIdKey] === +chainIdValue) {
        logger.error('Cron already exists for mentioned chainId.');

        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_cp_b_2',
            api_error_identifier: '',
            debug_options: {}
          })
        );
      }
    }
  }

  /**
   * Check if cron kind exists in the same sub-environment again.
   *
   * @return {Promise<never>}
   */
  async checkForExistingCronPerSubEnv() {
    const oThis = this;

    const existingCrons = await new CronProcessModel()
      .select('*')
      .where({
        kind: oThis.cronKindInt
      })
      .fire();

    if (existingCrons.length !== 0) {
      logger.error('Cron already exists for current sub-environment.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_b_3',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Check if sequence number for cron already exists for given chain Id.
   *
   * @param {string} chainIdKey
   * @param {number} chainIdValue
   * @param {number} sequenceNumber
   *
   * @return {Promise<never>}
   */
  async checkLatestSequenceNumber(chainIdKey, chainIdValue, sequenceNumber) {
    const oThis = this;

    const existingCrons = await new CronProcessModel()
        .select('*')
        .where({
          kind: oThis.cronKindInt
        })
        .fire(),
      existingCronsLength = existingCrons.length,
      chainIdToSequenceMapping = {};

    // If entry for cron kind does not exist at all, sequence number should always be one.
    if (existingCronsLength === 0 && sequenceNumber !== 1) {
      logger.error('Sequence number should be 1.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_b_4',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    for (let index = 0; index < existingCronsLength; index += 1) {
      const cronEntity = existingCrons[index],
        cronParams = JSON.parse(cronEntity.params);

      if (has.call(cronParams, chainIdKey)) {
        const chainId = cronParams[chainIdKey];
        chainIdToSequenceMapping[chainId] = chainIdToSequenceMapping[chainId] || [];
        chainIdToSequenceMapping[chainId].push(cronParams.sequenceNumber);
      }
    }

    // If entry for cronKind does not exist for the said chain, the sequence number should always be 1.
    if (!has.call(chainIdToSequenceMapping, chainIdValue) && sequenceNumber !== 1) {
      logger.error('Sequence number should be 1.');

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_cp_b_5',
          api_error_identifier: '',
          debug_options: {}
        })
      );
    }

    // If entry for chainId exists, perform some validations.
    if (has.call(chainIdToSequenceMapping, chainIdValue)) {
      const maxSequenceNumber = Math.max(...chainIdToSequenceMapping[chainIdValue]);
      // Sequence number should not repeat.
      if (sequenceNumber <= maxSequenceNumber) {
        logger.error('Invalid sequence number. Sequence number already exists.');

        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_cp_b_6',
            api_error_identifier: '',
            debug_options: {}
          })
        );
      }

      // There should only be a difference of 1 between maxSequenceNumber and current sequence number.
      if (sequenceNumber - maxSequenceNumber !== 1) {
        logger.error('Invalid sequence number. Sequence number is not in sequence.');

        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_cp_b_7',
            api_error_identifier: '',
            debug_options: {}
          })
        );
      }
    }
  }

  /**
   * Create entry in cron process table.
   *
   * @param {object} cronParams
   *
   * @return {Promise<any>}
   */
  async insert(cronParams) {
    const oThis = this;

    cronParams = cronParams ? JSON.stringify(cronParams) : null;

    const cronInsertParams = {
      kind: oThis.cronKindInt,
      kind_name: oThis.cronKind,
      params: cronParams,
      status: new CronProcessModel().invertedStatuses[cronProcessesConstants.stoppedStatus]
    };

    if (oThis.tableAutoIncrementId) {
      cronInsertParams.id = oThis.tableAutoIncrementId;
    }

    const cronProcessResponse = await new CronProcessModel().insert(cronInsertParams).fire();

    logger.win('Cron process added successfully.');
    logger.log('Cron processId: ', cronProcessResponse.insertId);

    return cronProcessResponse;
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    throw new Error('sub-class to implement.');
  }
}

module.exports = Base;
