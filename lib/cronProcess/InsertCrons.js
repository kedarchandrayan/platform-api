/**
 * Module to insert crons.
 *
 * @module lib/cronProcess/InsertCrons
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

/**
 * Class to insert crons.
 *
 * @class InsertCrons
 */
class InsertCrons {
  /**
   * Insert cron.
   *
   * @param {string} cronKindName
   * @param {object} cronParams
   *
   * @return {Promise<void>}
   */
  async perform(cronKindName, cronParams) {
    const oThis = this;

    switch (cronKindName) {
      // Sub-env specific.
      case cronProcessConstants.workflowWorker:
        return oThis.insertWorkflowWorkerEntry(cronParams);
      case cronProcessConstants.updateRealtimeGasPrice:
        return oThis.insertUpdateRealtimeGasPriceEntry();
      case cronProcessConstants.cronProcessesMonitor:
        return oThis.insertCronProcessesMonitorEntry();
      case cronProcessConstants.recoveryRequestsMonitor:
        return oThis.insertRecoveryRequestsMonitorEntry();
      case cronProcessConstants.webhookErrorHandler:
        return oThis.insertWebhookErrorHandler(cronParams);
      case cronProcessConstants.trackLatestTransaction:
        return oThis.insertTrackLatestTransactionEntry(cronParams);
      case cronProcessConstants.usdToFiatCurrencyConversion:
        return oThis.insertUsdToFiatCurrencyConversion(cronParams);

      // Origin chain specific.
      case cronProcessConstants.fundByMasterInternalFunderOriginChainSpecific:
        return oThis.insertFundByMasterInternalFunderOriginChainSpecificEntry(cronParams);

      // Common for origin and aux chains.
      case cronProcessConstants.blockParser:
        return oThis.insertBlockParserEntry(cronParams);
      case cronProcessConstants.transactionParser:
        return oThis.insertTransactionParserEntry(cronParams);
      case cronProcessConstants.blockFinalizer:
        return oThis.insertBlockFinalizerEntry(cronParams);

      // Aux chain specific.
      case cronProcessConstants.economyAggregator:
        return oThis.insertEconomyAggregatorEntry(cronParams);
      case cronProcessConstants.fundByMasterInternalFunderAuxChainSpecificChainAddresses:
        return oThis.insertFundByMasterInternalFunderAuxChainSpecificChainAddressesEntry(cronParams);
      case cronProcessConstants.fundBySealerAuxChainSpecific:
        return oThis.insertFundBySealerAuxChainSpecificEntry(cronParams);
      case cronProcessConstants.fundByTokenAuxFunderAuxChainSpecific:
        return oThis.insertFundByTokenAuxFunderAuxChainSpecificEntry(cronParams);
      case cronProcessConstants.updatePriceOraclePricePoints:
        return oThis.insertUpdatePriceOraclePricePointsEntry(cronParams);
      case cronProcessConstants.fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses:
        return oThis.insertFundByMasterInternalFunderAuxChainSpecificTokenFunderAddressesEntry(cronParams);
      case cronProcessConstants.fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses:
        return oThis.insertFundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddressesEntry(cronParams);
      case cronProcessConstants.executeTransaction:
        return oThis.insertExecuteTransactionEntry(cronParams);
      case cronProcessConstants.auxWorkflowWorker:
        return oThis.insertAuxWorkflowWorkerTwoEntry(cronParams);
      case cronProcessConstants.fundByTokenAuxFunderToExTxWorkers:
        return oThis.insertFundByTokenAuxFunderToExTxWorkersEntry(cronParams);
      case cronProcessConstants.balanceSettler:
        return oThis.insertBalanceSettlerEntry(cronParams);
      case cronProcessConstants.originToAuxStateRootSync:
        return oThis.insertOriginToAuxStateRootSync(cronParams);
      case cronProcessConstants.auxToOriginStateRootSync:
        return oThis.insertAuxToOriginStateRootSync(cronParams);
      case cronProcessConstants.executeRecovery:
        return oThis.insertExecuteRecoveryEntry(cronParams);
      case cronProcessConstants.transactionErrorHandler:
        return oThis.insertTransactionErrorHandlerEntry(cronParams);
      case cronProcessConstants.balanceVerifier:
        return oThis.insertBalanceVerifier(cronParams);
      case cronProcessConstants.generateGraph:
        return oThis.insertGenerateGraph(cronParams);
      case cronProcessConstants.webhookPreprocessor:
        return oThis.insertWebhookPreprocessor(cronParams);
      case cronProcessConstants.webhookProcessor:
        return oThis.insertWebhookProcessor(cronParams);
      case cronProcessConstants.companyLowBalanceAlertEmail:
        return oThis.insertCompanyLowBalanceAlertEmail(cronParams);

      default:
        throw new Error(`Un-recognized cron kind name: ${cronKindName}`);
    }
  }

  // --------------------------Sub-env specific-------------------

  /**
   * Insert workflowWorker cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertWorkflowWorkerEntry(cronParams) {
    const WorkflowWorker = require(rootPrefix + '/lib/cronProcess/WorkflowWorker');
    logger.log('Creating workflowWorker');
    const workflowWorker = new WorkflowWorker({
      prefetchCount: cronParams.prefetchCount,
      chainId: cronParams.chainId,
      sequenceNumber: cronParams.sequenceNumber
    });

    return workflowWorker.perform();
  }

  /**
   * Insert track latest transaction cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertTrackLatestTransactionEntry(cronParams) {
    const TrackLatestTransaction = require(rootPrefix + '/lib/cronProcess/TrackLatestTransaction');
    logger.log('Creating trackLatestTransaction');
    const trackLatestTransaction = new TrackLatestTransaction({
      prefetchCount: cronParams.prefetchCount,
      chainId: cronParams.chainId,
      sequenceNumber: cronParams.sequenceNumber
    });

    return trackLatestTransaction.perform();
  }
  /**
   * Insert updateRealtimeGasPrice cron entry.
   *
   * @return {Promise<*>}
   */
  async insertUpdateRealtimeGasPriceEntry() {
    const UpdateRealtimeGasPrice = require(rootPrefix + '/lib/cronProcess/UpdateRealtimeGasPrice');
    logger.log('Creating updateRealtimeGasPrice');
    const updateRealtimeGasPrice = new UpdateRealtimeGasPrice({});

    return updateRealtimeGasPrice.perform();
  }

  /**
   * Insert CronProcessesMonitor cron entry.
   *
   * @return {Promise<*>}
   */
  async insertCronProcessesMonitorEntry() {
    const CronProcessesMonitor = require(rootPrefix + '/lib/cronProcess/CronProcessesMonitor');
    logger.log('Creating CronProcessesMonitor');
    const cronProcessesMonitor = new CronProcessesMonitor({});

    return cronProcessesMonitor.perform();
  }

  /**
   * Insert recoveryRequestsMonitor cron entry.
   *
   * @return {Promise<*>}
   */
  async insertRecoveryRequestsMonitorEntry() {
    const RecoveryRequestsMonitor = require(rootPrefix + '/lib/cronProcess/RecoveryRequestsMonitor');
    logger.log('Creating RecoveryRequestsMonitor');
    const cronProcessesMonitor = new RecoveryRequestsMonitor({});

    return cronProcessesMonitor.perform();
  }

  // --------------------------Origin chain specific-------------------

  /**
   * Insert blockParser cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertBlockParserEntry(cronParams) {
    const BlockParser = require(rootPrefix + '/lib/cronProcess/BlockParser');
    logger.log('Creating blockParser');
    const blockParser = new BlockParser({
      chainId: cronParams.chainId,
      intentionalBlockDelay: cronParams.intentionalBlockDelay
    });

    return blockParser.perform();
  }

  /**
   * Insert transactionParser cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertTransactionParserEntry(cronParams) {
    const TransactionParser = require(rootPrefix + '/lib/cronProcess/TransactionParser');
    logger.log('Creating transactionParser');
    const transactionParser = new TransactionParser({
      chainId: cronParams.chainId,
      prefetchCount: cronParams.prefetchCount,
      sequenceNumber: cronParams.sequenceNumber
    });

    return transactionParser.perform();
  }

  /**
   * Insert blockFinalizer cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertBlockFinalizerEntry(cronParams) {
    const BlockFinalizer = require(rootPrefix + '/lib/cronProcess/BlockFinalizer');
    logger.log('Creating blockFinalizer');
    const blockFinalizer = new BlockFinalizer({
      chainId: cronParams.chainId
    });

    return blockFinalizer.perform();
  }

  /**
   * Insert fundByMasterInternalFunderOriginChainSpecific cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderOriginChainSpecificEntry(cronParams) {
    const FundByMasterInternalFunderOriginChainSpecific = require(rootPrefix +
      '/lib/cronProcess/fundByMasterInternalFunder/OriginChainSpecific');
    logger.log('Creating fundByMasterInternalFunderOriginChainSpecific');
    const fundByMasterInternalFunderOriginChainSpecific = new FundByMasterInternalFunderOriginChainSpecific({
      originChainId: cronParams.originChainId
    });

    return fundByMasterInternalFunderOriginChainSpecific.perform();
  }

  // --------------------------Aux chain specific-------------------

  /**
   * Insert economyAggregator cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertEconomyAggregatorEntry(cronParams) {
    const EconomyAggregator = require(rootPrefix + '/lib/cronProcess/EconomyAggregator');
    logger.log('Creating economyAggregator');
    const economyAggregator = new EconomyAggregator({
      chainId: cronParams.chainId,
      prefetchCount: cronParams.prefetchCount
    });

    return economyAggregator.perform();
  }

  /**
   * Insert fundByMasterInternalFunderAuxChainSpecificChainAddresses cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderAuxChainSpecificChainAddressesEntry(cronParams) {
    const FundByMasterInternalFunderAuxChainSpecificChainAddresses = require(rootPrefix +
      '/lib/cronProcess/fundByMasterInternalFunder/auxChainSpecific/ChainAddresses');
    logger.log('Creating fundByMasterInternalFunderAuxChainSpecificChainAddresses');
    const fundByMasterInternalFunderAuxChainSpecificChainAddresses = new FundByMasterInternalFunderAuxChainSpecificChainAddresses(
      {
        originChainId: cronParams.originChainId,
        auxChainId: cronParams.auxChainId
      }
    );

    return fundByMasterInternalFunderAuxChainSpecificChainAddresses.perform();
  }

  /**
   * Insert fundBySealerAuxChainSpecific cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundBySealerAuxChainSpecificEntry(cronParams) {
    const FundBySealerAuxChainSpecific = require(rootPrefix + '/lib/cronProcess/fundBySealer/AuxChainSpecific');
    logger.log('Creating fundBySealerAuxChainSpecific');
    const fundBySealerAuxChainSpecific = new FundBySealerAuxChainSpecific({
      originChainId: cronParams.originChainId,
      auxChainId: cronParams.auxChainId
    });

    return fundBySealerAuxChainSpecific.perform();
  }

  /**
   * Insert fundByTokenAuxFunderAuxChainSpecific cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundByTokenAuxFunderAuxChainSpecificEntry(cronParams) {
    const FundByTokenAuxFunderAuxChainSpecific = require(rootPrefix +
      '/lib/cronProcess/fundByTokenAuxFunder/AuxChainSpecific');
    logger.log('Creating fundByTokenAuxFunderAuxChainSpecific');
    const fundByTokenAuxFunderAuxChainSpecific = new FundByTokenAuxFunderAuxChainSpecific({
      originChainId: cronParams.originChainId,
      auxChainId: cronParams.auxChainId
    });

    return fundByTokenAuxFunderAuxChainSpecific.perform();
  }

  /**
   * Insert updatePriceOraclePricePoints cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertUpdatePriceOraclePricePointsEntry(cronParams) {
    const UpdatePriceOraclePricePoints = require(rootPrefix + '/lib/cronProcess/UpdatePriceOraclePricePoints');
    logger.log('Creating updatePriceOraclePricePoints');
    const updatePriceOraclePricePoints = new UpdatePriceOraclePricePoints({
      auxChainId: cronParams.auxChainId,
      baseCurrency: cronParams.baseCurrency
    });

    return updatePriceOraclePricePoints.perform();
  }

  /**
   * Insert fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderAuxChainSpecificTokenFunderAddressesEntry(cronParams) {
    const FundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses = require(rootPrefix +
      '/lib/cronProcess/fundByMasterInternalFunder/auxChainSpecific/TokenFunderAddresses');
    logger.log('Creating fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses');
    const fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses = new FundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses(
      {
        originChainId: cronParams.originChainId,
        auxChainId: cronParams.auxChainId
      }
    );

    return fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses.perform();
  }

  /**
   * Insert fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddressesEntry(cronParams) {
    const FundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses = require(rootPrefix +
      '/lib/cronProcess/fundByMasterInternalFunder/auxChainSpecific/InterChainFacilitatorAddresses');
    logger.log('Creating fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses');
    const fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses = new FundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses(
      {
        originChainId: cronParams.originChainId,
        auxChainId: cronParams.auxChainId
      }
    );

    return fundByMasterInternalFunderAuxChainSpecificInterChainFacilitatorAddresses.perform();
  }

  /**
   * Insert executeTransaction cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertExecuteTransactionEntry(cronParams) {
    const ExecuteTransaction = require(rootPrefix + '/lib/cronProcess/ExecuteTransaction');
    logger.log('Creating executeTransaction one.');
    const executeTransaction = new ExecuteTransaction({
      prefetchCount: cronParams.prefetchCount,
      auxChainId: cronParams.auxChainId,
      sequenceNumber: cronParams.sequenceNumber,
      queueTopicSuffix: cronParams.queueTopicSuffix
    });

    return executeTransaction.perform();
  }

  /**
   * Insert auxWorkflowWorker cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertAuxWorkflowWorkerTwoEntry(cronParams) {
    const AuxWorkflowWorker = require(rootPrefix + '/lib/cronProcess/AuxWorkflowWorker');
    logger.log('Creating auxWorkflowWorker.');
    const auxWorkflowWorker = new AuxWorkflowWorker({
      prefetchCount: cronParams.prefetchCount,
      auxChainId: cronParams.auxChainId,
      sequenceNumber: cronParams.sequenceNumber
    });

    return auxWorkflowWorker.perform();
  }

  /**
   * Insert fundByTokenAuxFunderToExTxWorkers cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertFundByTokenAuxFunderToExTxWorkersEntry(cronParams) {
    const FundByTokenAuxFunderToExTxWorkers = require(rootPrefix +
      '/lib/cronProcess/fundByTokenAuxFunder/ToExTxWorkers');
    logger.log('Creating fundByTokenAuxFunderToExTxWorkers');
    const fundByTokenAuxFunderToExTxWorkers = new FundByTokenAuxFunderToExTxWorkers({
      originChainId: cronParams.originChainId,
      auxChainId: cronParams.auxChainId
    });

    return fundByTokenAuxFunderToExTxWorkers.perform();
  }

  /**
   * Insert balanceSettler cron entry.
   *
   * @param {object} cronParams
   *
   * @return {Promise<*>}
   */
  async insertBalanceSettlerEntry(cronParams) {
    const BalanceSettler = require(rootPrefix + '/lib/cronProcess/BalanceSettler');
    logger.log('Creating balanceSettler.');
    const balanceSettler = new BalanceSettler({
      prefetchCount: cronParams.prefetchCount,
      auxChainId: cronParams.auxChainId,
      sequenceNumber: cronParams.sequenceNumber
    });

    return balanceSettler.perform();
  }

  /**
   * Insert originToAuxStateRootSync cron entry.
   *
   * @param {object} cronParams
   *
   * @returns {Promise<Promise<void>|Promise>}
   */
  async insertOriginToAuxStateRootSync(cronParams) {
    const StateRootSyncOriginToAux = require(rootPrefix + '/lib/cronProcess/stateRootSync/OriginToAux');
    logger.log('Creating originToAuxStateRootSync.');
    const stateRootSyncOriginToAuxObj = new StateRootSyncOriginToAux({
      auxChainId: cronParams.auxChainId,
      originChainId: cronParams.originChainId
    });

    return stateRootSyncOriginToAuxObj.perform();
  }

  /**
   * Insert auxToOriginStateRootSync cron entry.
   *
   * @param {object} cronParams
   *
   * @returns {Promise<Promise<void>|Promise>}
   */
  async insertAuxToOriginStateRootSync(cronParams) {
    const StateRootSyncAuxToOrigin = require(rootPrefix + '/lib/cronProcess/stateRootSync/AuxToOrigin');
    logger.log('Creating auxToOriginStateRootSync.');
    const stateRootSyncAuxToOriginObj = new StateRootSyncAuxToOrigin({
      auxChainId: cronParams.auxChainId,
      originChainId: cronParams.originChainId
    });

    return stateRootSyncAuxToOriginObj.perform();
  }

  /**
   * Insert executeRecovery cron entry.
   *
   * @param {object} cronParams
   *
   * @returns {Promise<Promise<void>|Promise>}
   */
  async insertExecuteRecoveryEntry(cronParams) {
    const ExecuteRecovery = require(rootPrefix + '/lib/cronProcess/ExecuteRecovery');
    logger.log('Creating executeRecovery');
    const executeRecovery = new ExecuteRecovery({
      chainId: cronParams.chainId
    });

    return executeRecovery.perform();
  }

  /**
   * Insert transactionErrorHandler cron entry.
   *
   * @param {object} cronParams
   *
   * @returns {Promise<Promise<void>|Promise>}
   */
  async insertTransactionErrorHandlerEntry(cronParams) {
    const TransactionErrorHandlerKlass = require(rootPrefix + '/lib/cronProcess/TransactionErrorHandler');
    logger.log('Creating transactionErrorHandler.');
    const TransactionErrorHandler = new TransactionErrorHandlerKlass({
      auxChainId: cronParams.auxChainId,
      noOfRowsToProcess: cronParams.noOfRowsToProcess,
      maxRetry: cronParams.maxRetry,
      sequenceNumber: cronParams.sequenceNumber
    });

    return TransactionErrorHandler.perform();
  }

  /**
   * Insert balanceVerifier cron entry.
   *
   * @param {object} cronParams
   *
   * @returns {Promise<Promise<void>|Promise>}
   */
  async insertBalanceVerifier(cronParams) {
    const BalanceVerifier = require(rootPrefix + '/lib/cronProcess/BalanceVerifier');
    logger.log('Creating balance verifier entry.');
    const balanceVerifierObj = new BalanceVerifier({
      auxChainId: cronParams.auxChainId,
      timeStamp: cronParams.timeStamp
    });

    return balanceVerifierObj.perform();
  }

  /**
   * Insert generateGraph cron entry.
   *
   * @param {object} cronParams
   *
   * @returns {Promise<*>}
   */
  async insertGenerateGraph(cronParams) {
    const GenerateGraph = require(rootPrefix + '/lib/cronProcess/GenerateGraph');
    logger.log('Creating generate graph entry.');
    const generateGraphObj = new GenerateGraph({
      auxChainId: cronParams.auxChainId
    });

    return generateGraphObj.perform();
  }

  /**
   * Insert webhook preprocessor cron entry.
   *
   * @param {object} cronParams
   *
   * @returns {Promise<*>}
   */
  async insertWebhookPreprocessor(cronParams) {
    const WebhookPreprocessor = require(rootPrefix + '/lib/cronProcess/WebhookPreprocessor');
    logger.log('Creating webhook preprocessor entry.');
    const webhookPreprocessorObj = new WebhookPreprocessor({
      auxChainId: cronParams.auxChainId,
      prefetchCount: cronParams.prefetchCount,
      sequenceNumber: cronParams.sequenceNumber
    });

    return webhookPreprocessorObj.perform();
  }

  /**
   * Insert webhook preprocessor cron entry.
   *
   * @param {object} cronParams
   *
   * @returns {Promise<*>}
   */
  async insertWebhookProcessor(cronParams) {
    const WebhookProcessor = require(rootPrefix + '/lib/cronProcess/WebhookProcessor');
    logger.log('Creating webhook processor entry.');
    const webhookProcessorObj = new WebhookProcessor({
      auxChainId: cronParams.auxChainId,
      prefetchCount: cronParams.prefetchCount,
      sequenceNumber: cronParams.sequenceNumber,
      queueTopicSuffix: cronParams.queueTopicSuffix,
      subscribeSubTopic: cronParams.subscribeSubTopic
    });

    return webhookProcessorObj.perform();
  }

  /**
   * Insert company low balance alert email cron entry.
   *
   * @param {object} cronParams
   *
   * @returns {Promise<*>}
   */
  async insertCompanyLowBalanceAlertEmail(cronParams) {
    const CompanyLowBalanceAlertEmail = require(rootPrefix + '/lib/cronProcess/CompanyLowBalanceAlertEmail');
    logger.log('Creating company low balance alert email entry.');
    const companyLowBalanceAlertEmailObj = new CompanyLowBalanceAlertEmail({
      auxChainId: cronParams.auxChainId,
      groupId: cronParams.groupId
    });

    return companyLowBalanceAlertEmailObj.perform();
  }

  /**
   * Insert webhook preprocessor cron entry.
   *
   * @param {object} cronParams
   *
   * @returns {Promise<*>}
   */
  async insertUsdToFiatCurrencyConversion(cronParams) {
    const usdToFiatCurrencyConversion = require(rootPrefix + '/lib/cronProcess/usdToFiatCurrencyConversion');
    logger.log('Creating usdToFiatCurrencyConversion processor entry.');
    const usdToFiatCurrencyConversionObj = new usdToFiatCurrencyConversion({});

    return usdToFiatCurrencyConversionObj.perform();
  }

  /**
   * Insert webhook preprocessor cron entry.
   *
   * @param {object} cronParams
   *
   * @returns {Promise<*>}
   */
  async insertWebhookErrorHandler(cronParams) {
    const WebhookErrorHandler = require(rootPrefix + '/lib/cronProcess/WebhookErrorHandler');
    logger.log('Creating webhook preprocessor entry.');
    const webhookErrorHandlerObj = new WebhookErrorHandler({
      sequenceNumber: cronParams.sequenceNumber
    });

    return webhookErrorHandlerObj.perform();
  }
}

module.exports = InsertCrons;
