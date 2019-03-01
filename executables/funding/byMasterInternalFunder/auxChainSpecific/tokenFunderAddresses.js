'use strict';
/**
 * Cron to fund stPrime
 * by: Master Internal Funder
 * to: Token funder addresses.
 * what: St prime
 *
 * @module executables/funding/byMasterInternalFunder/auxChainSpecific/tokenFunderAddresses
 *
 * This cron expects originChainId and auxChainIds as parameter in the params.
 */
const program = require('commander');

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  AuxChainSpecificFundingCronBase = require(rootPrefix +
    '/executables/funding/byMasterInternalFunder/auxChainSpecific/Base');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/funding/byMasterInternalFunder/auxChainSpecific/tokenFunderAddresses.js --cronProcessId 16'
  );
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

// Declare variables.
const auxMaxGasPriceMultiplierWithBuffer = basicHelper.getAuxMaxGasPriceMultiplierWithBuffer();

/**
 * Class to fund StPrime by chain owner to token funder addresses.
 *
 * @class
 */
class fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses extends AuxChainSpecificFundingCronBase {
  /**
   * Constructor to fund StPrime by chain owner to token funder addresses.
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true;

    oThis.tokenFunderFundsConfig = {};
  }

  /**
   * Cron kind
   *
   * @return {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses;
  }

  /**
   * Pending tasks done
   *
   * @return {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   * Send ST Prime funds on all aux chains
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _sendFundsIfNeeded() {
    const oThis = this;

    oThis.tokenFunderFundsConfig = super.calculateTokenAuxFunderStPrimeRequirement();

    // Loop over all auxChainIds.
    for (let index = 0; index < oThis.auxChainIds.length; index++) {
      let auxChainId = oThis.auxChainIds[index];

      logger.step('** Starting auxChainId: ', auxChainId);

      logger.step(
        'Fetching chain specific token funder addresses for all clients and populating per token funding config'
      );
      let perTokenFundingConfig = await oThis._createDuplicateTokenFundingConfigFor(auxChainId);

      if (!perTokenFundingConfig[[tokenAddressConstants.auxFunderAddressKind]].addresses) {
        logger.error('No token addresses found on chainId: ', auxChainId);
        continue;
      }

      let tokenAddresses = perTokenFundingConfig[[tokenAddressConstants.auxFunderAddressKind]].addresses;

      logger.step('Fetching balances for chain addresses on auxChainId: ' + auxChainId);
      let addressesToBalanceMap = await oThis._fetchStPrimeBalance(auxChainId, tokenAddresses);

      logger.step('Fund chain specific addresses with StPrime if needed');
      await oThis._checkEligibilityAndTransferFunds(auxChainId, perTokenFundingConfig, addressesToBalanceMap);
    }
  }

  /**
   * Create local copy of token funding config for specific chain id
   *
   * @param {Number} auxChainId
   *
   * @return {Object} perTokenFundingConfig
   *
   * @private
   */
  async _createDuplicateTokenFundingConfigFor(auxChainId) {
    const oThis = this;

    // Fetch all addresses associated to auxChainId.
    let perTokenFundingConfig = basicHelper.deepDup(oThis.tokenFunderFundsConfig);

    logger.step('Fetching token addresses on auxChainId: ' + auxChainId);

    let clientIds = await oThis._fetchClientsOnChain(auxChainId);

    if (clientIds.length === 0) {
      return perTokenFundingConfig;
    }

    let tokenIds = await oThis._fetchClientTokenIdsFor(clientIds);

    if (tokenIds.length === 0) {
      return perTokenFundingConfig;
    }

    console.log('======perTokenFundingConfig', perTokenFundingConfig);
    let tokenFunderAddresses = await oThis._fetchTokenFunderAddresses(tokenIds),
      tokenFunderAddressesLength = tokenFunderAddresses.length;

    if (tokenFunderAddressesLength === 0) {
      return perTokenFundingConfig;
    }
    for (let index = 0; index < tokenFunderAddressesLength; index += 1) {
      perTokenFundingConfig[[tokenAddressConstants.auxFunderAddressKind]].addresses =
        perTokenFundingConfig[[tokenAddressConstants.auxFunderAddressKind]].addresses || [];
      perTokenFundingConfig[[tokenAddressConstants.auxFunderAddressKind]].addresses.push(
        tokenFunderAddresses[index].address
      );
    }

    console.log('======perTokenFundingConfig', perTokenFundingConfig);
    return perTokenFundingConfig;
  }

  /**
   * Fetch all client ids on specific chain.
   *
   * @param {Number} auxChainId
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchClientsOnChain(auxChainId) {
    const oThis = this;

    // Step 1: Fetch all clientIds associated to auxChainIds.
    let chainClientIds = await new ClientConfigGroup()
      .select('client_id')
      .where(['chain_id = (?)', auxChainId])
      .fire();

    let clientIds = [];
    for (let index = 0; index < chainClientIds.length; index++) {
      let clientId = chainClientIds[index].client_id;

      clientIds.push(clientId);
    }

    return clientIds;
  }

  /**
   * Fetch token ids for specific clients.
   *
   * @param {Array} clientIds
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchClientTokenIdsFor(clientIds) {
    const oThis = this;

    // Step 2: Fetch all tokenIds associated to clientIds.
    let clientTokenIds = await new TokenModel()
      .select('id')
      .where([
        'client_id IN (?) AND status = (?)',
        clientIds,
        new TokenModel().invertedStatuses[tokenConstants.deploymentCompleted]
      ])
      .fire();

    let tokenIds = [];
    for (let index = 0; index < clientTokenIds.length; index++) {
      let tokenId = clientTokenIds[index].id;

      tokenIds.push(tokenId);
    }

    return tokenIds;
  }

  /**
   * Fetch funder addresses for specific token ids.
   *Todo: Introduce batching
   * @param {Array} tokenIds
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchTokenFunderAddresses(tokenIds) {
    const oThis = this;

    // Step 3: Fetch aux funder addresses associated to tokenIds.
    let tokenIdAuxFunderAddresses = await new TokenAddressModel()
      .select('address')
      .where([
        'token_id IN (?) AND kind = (?) AND status = (?)',
        tokenIds,
        new TokenAddressModel().invertedKinds[tokenAddressConstants.auxFunderAddressKind],
        new TokenAddressModel().invertedStatuses[tokenAddressConstants.activeStatus]
      ])
      .fire();

    return tokenIdAuxFunderAddresses;
  }

  /**
   * Check if token addresses are eligible for funding and transfer them funds.
   *
   * @param {Number} auxChainId
   * @param {Object} perTokenFundingConfig
   * @param {Object} addressesToBalanceMap
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _checkEligibilityAndTransferFunds(auxChainId, perTokenFundingConfig, addressesToBalanceMap) {
    const oThis = this;

    console.log('\n\n======>perTokenFundingConfig', perTokenFundingConfig);
    console.log('======>addressesToBalanceMap', addressesToBalanceMap);
    let transferDetails = [],
      totalAmountToTransferFromMIF = basicHelper.convertToBigNumber(0),
      fundingAddressDetails = perTokenFundingConfig[[tokenAddressConstants.auxFunderAddressKind]],
      addressMaxAmountToFund = basicHelper
        .convertToBigNumber(String(fundingAddressDetails.maxBalanceToFundAtOneGwei))
        .mul(basicHelper.convertToBigNumber(auxMaxGasPriceMultiplierWithBuffer));

    for (let address in addressesToBalanceMap) {
      let addressCurrentBalance = basicHelper.convertToBigNumber(addressesToBalanceMap[address]),
        addressThresholdFund = basicHelper
          .convertToBigNumber(String(fundingAddressDetails.thresholdBalanceAtOneGwei))
          .mul(basicHelper.convertToBigNumber(auxMaxGasPriceMultiplierWithBuffer));

      logger.log('\n\nAddress: ', address);
      logger.log('Current balance of address: ', addressCurrentBalance.toString(10));
      logger.log('Minimum required balance of address: ', addressMaxAmountToFund.toString(10));
      logger.log('Threshold amount ', addressThresholdFund.toString(10));

      if (addressCurrentBalance.lt(addressThresholdFund)) {
        let amountToBeTransferredBN = addressMaxAmountToFund
            .minus(addressCurrentBalance)
            .plus(basicHelper.convertToWei(1)),
          transferParams = {
            fromAddress: oThis.masterInternalFunderAddress,
            toAddress: address,
            amountInWei: amountToBeTransferredBN.toString(10)
          };

        logger.log('Funds transferred are: ', amountToBeTransferredBN.toString(10));
        transferDetails.push(transferParams);
        totalAmountToTransferFromMIF = totalAmountToTransferFromMIF.plus(amountToBeTransferredBN);
      }
    }

    // Start transfer.
    oThis.canExit = false;

    if (transferDetails.length > 0 && (await oThis._isMIFStPrimeBalanceGreaterThan(totalAmountToTransferFromMIF))) {
      logger.step('Transferring StPrime to token addresses on auxChainId: ' + auxChainId);

      await oThis._transferStPrime(auxChainId, transferDetails);
    } else {
      logger.step('No transfer performed on chainID: ', auxChainId);
    }
    oThis.canExit = true;
  }
}

logger.log('Starting cron to fund StPrime by chainOwner to token funder addresses.');

new fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });