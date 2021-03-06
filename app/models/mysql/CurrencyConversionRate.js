'use strict';
/**
 * Model to get currency conversion details.
 *
 * @module app/models/mysql/CurrencyConversionRate
 */
const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  conversionRatesConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class CurrencyConversionRateModel extends ModelBase {
  /**
   * Constructor for Currency Conversion Rate Model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'currency_conversion_rates';
  }

  /**
   * Update transaction hash for a record
   *
   * @param {Number} id
   * @param {String} transactionHash
   *
   * @return {*|void}
   */
  updateTransactionHash(id, transactionHash) {
    const oThis = this;

    return oThis
      .update({ transaction_hash: transactionHash.toLowerCase() })
      .where({ id: id })
      .fire();
  }

  /**
   * Update Status for a record
   *
   * @param {Number} id
   * @param {String} status
   *
   * @return {*|void}
   */
  updateStatus(id, status) {
    const oThis = this;

    // Check if inverted data is present in input then use enumValues key
    if (conversionRatesConstants.invertedStatuses[status]) {
      status = conversionRatesConstants.invertedStatuses[status];
    }

    return oThis
      .update({ status: status })
      .where({ id: id })
      .fire();
  }

  /**
   * This function fetches latest conversion rate for given base currencies.
   * NOTE: It is expected that in the latest 20 rows we will be able to find all the base currencies. If data for some
   * base currencies is not found then call the same function again for the remaining base currencies.
   *
   * @param {Number} params.chainId
   * @param {Array} params.stakeCurrencyIds
   * @param {Array} params.quoteCurrencyIds
   *
   * @returns {Promise<*>}
   */
  async getBaseCurrencyLatestActiveRates(params) {
    const oThis = this;

    let chainId = params.chainId,
      stakeCurrencyIds = params.stakeCurrencyIds,
      quoteCurrencyIds = params.quoteCurrencyIds;

    let whereClause = {
      quote_currency_id: quoteCurrencyIds,
      stake_currency_id: stakeCurrencyIds
    };

    if (chainId) {
      whereClause['chain_id'] = chainId;
    }

    let records = await oThis
      .select('*')
      .where(whereClause)
      .order_by('timestamp DESC')
      .limit(20)
      .fire();

    if (records.length === 0) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'a_m_m_ccr_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { chainId: chainId, stakeCurrencyIds: stakeCurrencyIds, quoteCurrencyIds: quoteCurrencyIds }
        })
      );
    }

    let responseData = {};

    for (let i = 0; i < records.length; i++) {
      let currRecord = records[i];
      let unprocessedStakeCurrencyId = !responseData[currRecord.stake_currency_id],
        unprocessedQuoteCurrencyId =
          unprocessedStakeCurrencyId || !responseData[currRecord.stake_currency_id][currRecord.quote_currency_id];

      if (unprocessedStakeCurrencyId || unprocessedQuoteCurrencyId) {
        let dataHash = {};
        dataHash[currRecord.quote_currency_id] = currRecord.conversion_rate;
        dataHash['updated_timestamp'] = currRecord.timestamp;

        if (unprocessedStakeCurrencyId) {
          responseData[currRecord.stake_currency_id] = dataHash;
        } else {
          responseData[currRecord.stake_currency_id][currRecord.quote_currency_id] = currRecord.conversion_rate;
          responseData[currRecord.stake_currency_id]['updated_timestamp'] = Math.max(
            responseData[currRecord.stake_currency_id]['updated_timestamp'],
            currRecord.timestamp
          );
        }
      }
    }

    return responseHelper.successWithData(responseData);
  }
}

module.exports = CurrencyConversionRateModel;
