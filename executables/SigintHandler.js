'use strict';
/**
 * This code handles sigint and sigterm signals.
 * NOTE: Every sub-class should call attachHandlers on their own in the constructor.
 *
 * @module executables/sigintHandler
 */
const rootPrefix = '..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessHandler = require(rootPrefix + '/lib/cronProcessesHandler'),
  cronProcessHandlerObject = new cronProcessHandler();

/**
 * Class for sigint handler
 *
 * @class
 */
class SigintHandler {
  /**
   * Constructor for sigint handler
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.idToBeKilled = params.id;
  }

  /**
   * Attach SIGINT/SIGTERM handlers to the current process.
   */
  attachHandlers() {
    const oThis = this;

    oThis.pendingTasksDone(); // Throw if the method is not implemented by caller.

    let handle = function() {
      oThis.stopPickingUpNewTasks();

      if (oThis.pendingTasksDone()) {
        logger.info(':: No pending tasks. Changing the status ');
        cronProcessHandlerObject.stopProcess(oThis.idToBeKilled).then(function() {
          logger.info('Status and last_ended_at updated in table. Killing process.');

          // Stop the process only after the entry has been updated in the table.
          process.exit(1);
        });
      } else {
        logger.info(':: There are pending tasks. Waiting for completion.');
        setTimeout(handle, 1000);
      }
    };

    process.on('SIGINT', handle);
    process.on('SIGTERM', handle);
  }

  /**
   * Stops consumption upon invocation
   */
  stopPickingUpNewTasks() {
    const oThis = this;

    oThis.stopPickingUpNewWork = true;
    if (oThis.consumerTag) {
      logger.info(':: :: Cancelling consumption on tag=====', oThis.consumerTag);
      process.emit('CANCEL_CONSUME', oThis.consumerTag);
    }
  }

  /**
   * This function provides info whether the process has to exit.
   */
  pendingTasksDone() {
    throw 'pendingTasksDone method should be implemented by the caller for SIGINT handling';
  }
}

module.exports = SigintHandler;
