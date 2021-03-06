'use strict';
/**
 * Error constants
 *
 * @module lib/globalConstant/error
 */
/**
 * Class
 *
 * @class
 */
class Error {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor() {}

  get conditionalCheckFailedExceptionSuffix() {
    return 'ConditionalCheckFailedException';
  }

  get gethDown() {
    return 'gethDown';
  }

  get nonceTooLow() {
    return 'nonceTooLow';
  }

  get insufficientGas() {
    return 'insufficientGas';
  }

  get replacementTxUnderpriced() {
    return 'replacementTxUnderpriced';
  }

  get gethOutOfSync() {
    return 'gethOutOfSync';
  }

  get unKnownTxError() {
    return 'unKnownTxError';
  }

  get insufficientFunds() {
    return 'insufficientFunds';
  }
}

module.exports = new Error();
