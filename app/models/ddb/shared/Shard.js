'use strict';
/**
 * Shard Model
 *
 * @module app/models/ddb/shared/Shard
 */
const rootPrefix = '../../../..',
  OSTBase = require('@ostdotcom/base'),
  Base = require(rootPrefix + '/app/models/ddb/shared/Base'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  util = require(rootPrefix + '/lib/util');

const InstanceComposer = OSTBase.InstanceComposer;

class Shard extends Base {
  constructor(params) {
    super(params);
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {{entityKind: string, shardNumber: string, isAvailableForAllocation: string}}
   */
  get longToShortNamesMap() {
    return {
      entityKind: 'ek',
      shardNumber: 'sno',
      isAvailableForAllocation: 'iafa'
    };
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {Object|*}
   */
  get shortToLongNamesMap() {
    const oThis = this;

    return util.invert(oThis.longToShortNamesMap);
  }

  /**
   * shortNameToDataType
   *
   * @return {{ek: string, sno: string, iafa: string}}
   */
  get shortNameToDataType() {
    return {
      ek: 'N',
      sno: 'S',
      iafa: 'BOOL'
    };
  }

  /**
   * Returns the table name.
   *
   * @returns {String}
   */
  tableName() {
    return this.tablePrefix + 'shards';
  }

  /**
   * Primary key of the table.
   *
   * @param params
   * @returns {Object}
   * @private
   */
  _keyObj(params) {
    const oThis = this,
      shortNameForEntityKind = oThis.shortNameFor('entityKind'),
      shortNameForShardNumber = oThis.shortNameFor('shardNumber'),
      keyObj = {};

    keyObj[shortNameForEntityKind] = {
      [oThis.shortNameToDataType[shortNameForEntityKind]]: params['entityKind'].toString()
    };
    keyObj[shortNameForShardNumber] = {
      [oThis.shortNameToDataType[shortNameForShardNumber]]: params['shardNumber'].toString()
    };

    return keyObj;
  }

  /**
   * Create table params
   *
   * @returns {Object}
   */
  tableSchema() {
    const oThis = this,
      shortNameForEntityKind = oThis.shortNameFor('entityKind'),
      shortNameForShardNumber = oThis.shortNameFor('shardNumber');

    return {
      TableName: oThis.tableName(),
      KeySchema: [
        {
          AttributeName: oThis.shortNameFor('entityKind'),
          KeyType: 'HASH'
        }, //Partition key
        {
          AttributeName: oThis.shortNameFor('shardNumber'),
          KeyType: 'RANGE'
        } //Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: shortNameForEntityKind, AttributeType: oThis.shortNameToDataType[shortNameForEntityKind] },
        { AttributeName: shortNameForShardNumber, AttributeType: oThis.shortNameToDataType[shortNameForShardNumber] }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      },
      SSESpecification: {
        Enabled: false
      }
    };
  }

  _sanitizeRowFromDynamo(params) {
    params['entityKind'] = shardConstant.entityKinds[params['entityKind']];
    return params;
  }

  _sanitizeRowForDynamo(params) {
    params['entityKind'] = shardConstant.invertedEntityKinds[params['entityKind']];
    return params;
  }

  /**
   * insertShard - Inserts a new shard kind
   *
   * @param params
   * @param params.entityKind {String} - entity kind
   * @param params.shardNumber {Number} - shard number
   * @param params.isAvailableForAllocation {Bool} - availability flag of shard
   *
   * @return {string}
   */
  async insertShard(params) {
    const oThis = this,
      shortNameForEntityKind = oThis.shortNameFor('entityKind'),
      shortNameForShardNumber = oThis.shortNameFor('shardNumber');

    let conditionalExpression =
      'attribute_not_exists(' + shortNameForEntityKind + ') AND attribute_not_exists(' + shortNameForShardNumber + ')';

    return oThis.putItem(params, conditionalExpression);
  }

  /**
   * updateAllocationStatus - Updates allocation status for a shard kind
   *
   * @param params
   * @param params.entityKind {String} - entity kind
   * @param params.shardNumber {Number} - shard number
   * @param params.isAvailableForAllocation {Bool} - availability flag of shard
   *
   * @return {Promise<void>}
   */
  async updateAllocationStatus(params) {
    const oThis = this,
      shortNameForEntityKind = oThis.shortNameFor('entityKind'),
      shortNameForShardNumber = oThis.shortNameFor('shardNumber');

    let conditionalExpression =
      'attribute_exists(' + shortNameForEntityKind + ') AND attribute_exists(' + shortNameForShardNumber + ')';

    return oThis.updateItem(params, conditionalExpression);
  }

  /**
   * Gets list of shards which are available for allocation
   *
   * @returns {Object}
   */
  async getAvailableShards() {
    const oThis = this,
      shortNameForIsAvailable = oThis.shortNameFor('isAvailableForAllocation'),
      availableShards = {};

    let queryParams = {
      TableName: oThis.tableName(),
      FilterExpression: `${shortNameForIsAvailable} = :iafa`,
      ExpressionAttributeValues: {
        ':iafa': { [oThis.shortNameToDataType[shortNameForIsAvailable]]: true }
      },
      ConsistentRead: oThis.consistentRead
    };

    let response = await oThis.ddbServiceObj.scan(queryParams);

    if (response.isFailure()) {
      return Promise.reject(
        oThis._prepareErrorObject({
          errorObject: response,
          internalErrorCode: 'a_m_d_s_1',
          apiErrorIdentifier: 'available_shard_fetch_failed'
        })
      );
    }

    if (!response.data.Items || !response.data.Items[0]) {
      return Promise.resolve(responseHelper.successWithData(availableShards));
    }

    let row, formattedRow, sanitizedRow, buffer, chainId;

    for (let i = 0; i < response.data.Items.length; i++) {
      row = response.data.Items[i];
      formattedRow = oThis._formatRowFromDynamo(row);
      sanitizedRow = oThis._sanitizeRowFromDynamo(formattedRow);
      buffer = Shard.splitShardNoStr(sanitizedRow['shardNumber']);
      chainId = buffer.chainId;
      if (!availableShards[chainId]) {
        availableShards[chainId] = {};
      }
      if (!availableShards[chainId][sanitizedRow['entityKind']]) {
        availableShards[chainId][sanitizedRow['entityKind']] = [];
      }
      availableShards[chainId][sanitizedRow['entityKind']].push(buffer.shardNumber);
    }

    return Promise.resolve(responseHelper.successWithData(availableShards));
  }

  /**
   * Gets list of all shards (available or not)
   *
   * @param {String} entityKind
   *
   * @returns {Object}
   */
  async getAllShardsOf(entityKind) {
    const oThis = this,
      shortNameForEntityKind = oThis.shortNameFor('entityKind'),
      dataTypeForEntityKind = oThis.shortNameToDataType[shortNameForEntityKind];

    let queryParams = {
      TableName: oThis.tableName(),
      KeyConditionExpression: `${shortNameForEntityKind} = :ek`,
      ExpressionAttributeValues: {
        ':ek': { [dataTypeForEntityKind]: shardConstant.invertedEntityKinds[entityKind] }
      }
    };

    let response = await oThis.ddbServiceObj.query(queryParams);

    if (response.isFailure()) {
      return Promise.reject(response);
    }

    let row,
      formattedRow,
      sanitizedRow,
      allShards = [];

    for (let i = 0; i < response.data.Items.length; i++) {
      row = response.data.Items[i];
      formattedRow = oThis._formatRowFromDynamo(row);
      sanitizedRow = oThis._sanitizeRowFromDynamo(formattedRow);
      allShards.push(sanitizedRow);
    }

    return Promise.resolve(responseHelper.successWithData(allShards));
  }

  /**
   * Subclass to return its own class here
   *
   * @returns {object}
   */
  get subClass() {
    return Shard;
  }

  /**
   * afterUpdate - Method to implement any after update actions
   *
   * @return {Promise<void>}
   */
  static async afterUpdate(ic) {
    require(rootPrefix + '/lib/cacheManagement/shared/AvailableShard');

    let AvailableShardCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'AvailableShardsCache'),
      cacheObject = new AvailableShardCache({});

    await cacheObject.clear();

    return responseHelper.successWithData({});
  }

  /**
   *
   * @param {Number} chainId
   * @param {Number} shardNo
   */
  static generateShardNoStr(chainId, shardNo) {
    return `${chainId}${Shard.shardNoStrDelimiter()}${shardNo}`;
  }

  /**
   *
   * @param {String} shardNoStr
   */
  static splitShardNoStr(shardNoStr) {
    let buffer = shardNoStr.split(Shard.shardNoStrDelimiter());
    return {
      chainId: buffer[0],
      shardNumber: buffer[1]
    };
  }

  /**
   *
   */
  static shardNoStrDelimiter() {
    return '|';
  }
}

InstanceComposer.registerAsShadowableClass(Shard, coreConstants.icNameSpace, 'ShardModel');

module.exports = Shard;
