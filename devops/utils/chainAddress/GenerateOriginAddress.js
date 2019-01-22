'use strict';

/**
 * Generate address for Origin and Auxiliary chains
 *
 * @module devops/utils/GenerateAddress
 */
const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressBase = require(rootPrefix + '/devops/utils/chainAddress/Base');

/**
 * Class for Generating addresses for Origin and Auxiliary chains
 *
 * @class
 */
class GenerateOriginAddress extends ChainAddressBase {
  /**
   * Constructor
   *
   * @param chainId {number}
   *
   * @constructor
   */
  constructor(chainId) {
    super(chainId);
    const oThis = this;

    oThis.chainId = chainId;
    oThis.chainKind = coreConstants.originChainKind;
  }

  /**
   *
   * async perform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    let addressKinds = [
      chainAddressConstants.deployerKind,
      chainAddressConstants.ownerKind,
      chainAddressConstants.adminKind,
      chainAddressConstants.workerKind,
      chainAddressConstants.chainOwnerKind,
      chainAddressConstants.tokenAdminKind,
      chainAddressConstants.tokenWorkerKind
    ];

    logger.log('* Generating address for origin deployer.');
    logger.log('* Generating address for origin owner.');
    logger.log('* Generating address for origin admin.');
    logger.log('* Generating address for origin worker.');
    logger.log('* Generating address for chain owner.');
    logger.log('* Generating address for origin token admin.');
    logger.log('* Generating address for origin token worker.');

    let addresses = await oThis._generateAddresses(addressKinds);

    return addresses;
  }

}

module.exports = GenerateOriginAddress;
