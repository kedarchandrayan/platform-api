'use strict';

const rootPrefix = '../../..',
  CacheManagementSharedBase = require(rootPrefix + '/lib/cacheManagement/shared/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  KnownAddressModel = require(rootPrefix + '/app/models/mysql/KnownAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.general),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  AddressesEncryptor = require(rootPrefix + '/lib/encryptors/AddressesEncryptor'),
  localCipher = require(rootPrefix + '/lib/encryptors/localCipher');

class AddressPrivateKeyCache extends CacheManagementSharedBase {
  /**
   * @constructor
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.address = params['address'];
    oThis.cacheType = cacheManagementConst.sharedMemcached;
    oThis.consistentBehavior = '1';

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis.setCacheKey();

    // Call sub class method to set cache expiry using params provided
    oThis.setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis.setCacheImplementer();
  }

  /**
   *
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.saasSubEnvLevel;
  }

  /**
   * set cache key
   */
  setCacheKey() {
    const oThis = this;

    oThis.cacheKey = (oThis._sharedCacheKeyPrefix() + 'c_apk_' + oThis.address).toLowerCase();
  }

  /**
   * set cache expiry in oThis.cacheExpiry and return it
   */
  setCacheExpiry() {
    const oThis = this;
    oThis.cacheExpiry = 86400; // 24 hours
  }

  /**
   * fetch data from source and return eth balance from VC in Wei
   *
   * @return {Result}
   */
  async fetchDataFromSource() {
    const oThis = this;

    const managedAddresses = await new KnownAddressModel().getByAddressesSecure([oThis.address]),
      managedAddress = managedAddresses[0];

    if (!managedAddress) {
      return responseHelper.error({
        internal_error_identifier: 'scm_apk_1',
        api_error_identifier: 'invalid_address',
        error_config: errorConfig
      });
    }

    let KMSObject = new KmsWrapper(KnownAddressModel.encryptionPurpose),
      decryptedSalt = await KMSObject.decrypt(managedAddress.encryption_salt);

    if (!decryptedSalt['Plaintext']) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'cm_mas_2',
          api_error_identifier: 'invalid_params',
          error_config: errorConfig
        })
      );
    }

    return responseHelper.successWithData({
      encryption_salt_e: localCipher.encrypt(coreConstants.CACHE_SHA_KEY, decryptedSalt['Plaintext'].toString('hex')),
      private_key_e: managedAddress.private_key
    });
  }

  /**
   * fetch data from cache and decrypt
   *
   * @return {Promise<Result>}
   */
  async fetchDecryptedData() {
    const oThis = this;

    const fetchFromCacheRsp = await oThis.fetch();

    if (fetchFromCacheRsp.isFailure()) {
      return Promise.reject(fetchFromCacheRsp);
    }

    const cachedResponse = fetchFromCacheRsp.data;

    return responseHelper.successWithData({
      private_key_d: await new AddressesEncryptor({ encryptionSaltE: cachedResponse['encryption_salt_e'] }).decrypt(
        cachedResponse['private_key_e']
      )
    });
  }
}

module.exports = AddressPrivateKeyCache;
