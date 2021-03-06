'use strict';
/**
 * Module to create base currencies table.
 *
 * @module executables/oneTimers/multipleQuoteCurrencies/populateQuoteCurrencyIdInConversionRates
 */

const rootPrefix = '../../..',
  QuoteCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/QuoteCurrencyBySymbol'),
  CurrencyConversionRateModel = require(rootPrefix + '/app/models/mysql/CurrencyConversionRate'),
  quoteCurrencyConstants = require(rootPrefix + '/lib/globalConstant/quoteCurrency'),
  PricePointsCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/OstPricePoint');

const auxChainId = process.argv[2];

class PopulateQuoteCurrencyId {
  constructor() {}

  /**
   * Perform
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchQuoteCurrencyId();

    await oThis._populateQuoteCurrencyInCurrencyConversionRates();
  }

  /**
   * Fetch quote currency id
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchQuoteCurrencyId() {
    const oThis = this;

    let quoteCurrencyBySymbolCache = new QuoteCurrencyBySymbolCache({
      quoteCurrencySymbols: [quoteCurrencyConstants.USD]
    });

    let quoteCurrencyCacheRsp = await quoteCurrencyBySymbolCache.fetch();

    oThis.quoteCurrencyId = quoteCurrencyCacheRsp.data[quoteCurrencyConstants.USD].id;
  }

  /**
   * Populate quote currency in conversion rates
   *
   * @return {Promise<void>}
   * @private
   */
  async _populateQuoteCurrencyInCurrencyConversionRates() {
    const oThis = this;

    let currencyConversionRateModelObj = new CurrencyConversionRateModel({});

    await currencyConversionRateModelObj
      .update({
        quote_currency_id: oThis.quoteCurrencyId
      })
      .where({
        chain_id: auxChainId
      })
      .fire();

    let pricePointsCacheObj = new PricePointsCache({ chainId: oThis.chainId });

    await pricePointsCacheObj.clear();
  }
}

let populateQuoteCurrencyId = new PopulateQuoteCurrencyId();

populateQuoteCurrencyId
  .perform()
  .then(function(resp) {
    console.log(resp);
    process.exit(0);
  })
  .catch(function(err) {
    console.error(err);
    process.exit(1);
  });
