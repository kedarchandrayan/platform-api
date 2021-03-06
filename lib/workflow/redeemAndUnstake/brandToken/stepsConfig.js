'use strict';

const rootPrefix = '../../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const btRedeemAndUnstakeStepsConfig = {
  [workflowStepConstants.btRedeemAndUnstakeInit]: {
    kind: workflowStepConstants.btRedeemAndUnstakeInit,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.executeBTRedemption]
  },
  [workflowStepConstants.executeBTRedemption]: {
    kind: workflowStepConstants.executeBTRedemption,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.checkExecuteBTRedemptionStatus]
  },
  [workflowStepConstants.checkExecuteBTRedemptionStatus]: {
    kind: workflowStepConstants.checkExecuteBTRedemptionStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.executeBTRedemption],
    onSuccess: [workflowStepConstants.fetchRedeemIntentMessageHash]
  },
  [workflowStepConstants.fetchRedeemIntentMessageHash]: {
    kind: workflowStepConstants.fetchRedeemIntentMessageHash,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.executeBTRedemption],
    onSuccess: [workflowStepConstants.commitStateRoot]
  },
  [workflowStepConstants.commitStateRoot]: {
    kind: workflowStepConstants.commitStateRoot,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchRedeemIntentMessageHash],
    onSuccess: [workflowStepConstants.updateCommittedStateRootInfo]
  },
  [workflowStepConstants.updateCommittedStateRootInfo]: {
    kind: workflowStepConstants.updateCommittedStateRootInfo,
    readDataFrom: [workflowStepConstants.commitStateRoot],
    onSuccess: [workflowStepConstants.proveCoGatewayOnGateway]
  },
  [workflowStepConstants.proveCoGatewayOnGateway]: {
    kind: workflowStepConstants.proveCoGatewayOnGateway,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [
      workflowStepConstants.fetchRedeemIntentMessageHash,
      workflowStepConstants.updateCommittedStateRootInfo
    ],
    onSuccess: [workflowStepConstants.checkProveCoGatewayStatus]
  },
  [workflowStepConstants.checkProveCoGatewayStatus]: {
    kind: workflowStepConstants.checkProveCoGatewayStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.proveCoGatewayOnGateway],
    onSuccess: [workflowStepConstants.confirmRedeemIntent]
  },
  [workflowStepConstants.confirmRedeemIntent]: {
    kind: workflowStepConstants.confirmRedeemIntent,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [
      workflowStepConstants.fetchRedeemIntentMessageHash,
      workflowStepConstants.executeBTRedemption,
      workflowStepConstants.proveCoGatewayOnGateway
    ],
    onSuccess: [workflowStepConstants.checkConfirmRedeemStatus]
  },
  [workflowStepConstants.checkConfirmRedeemStatus]: {
    kind: workflowStepConstants.checkConfirmRedeemStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchRedeemIntentMessageHash, workflowStepConstants.confirmRedeemIntent],
    onSuccess: [workflowStepConstants.progressRedeem]
  },
  [workflowStepConstants.progressRedeem]: {
    kind: workflowStepConstants.progressRedeem,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchRedeemIntentMessageHash, workflowStepConstants.executeBTRedemption],
    onSuccess: [workflowStepConstants.checkProgressRedeemStatus]
  },
  [workflowStepConstants.checkProgressRedeemStatus]: {
    kind: workflowStepConstants.checkProgressRedeemStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchRedeemIntentMessageHash, workflowStepConstants.progressRedeem],
    onSuccess: [workflowStepConstants.progressUnstake]
  },
  [workflowStepConstants.progressUnstake]: {
    kind: workflowStepConstants.progressUnstake,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchRedeemIntentMessageHash, workflowStepConstants.executeBTRedemption],
    onSuccess: [workflowStepConstants.checkProgressUnstakeStatus]
  },
  [workflowStepConstants.checkProgressUnstakeStatus]: {
    kind: workflowStepConstants.checkProgressUnstakeStatus,
    onFailure: workflowStepConstants.markFailure,
    readDataFrom: [workflowStepConstants.fetchRedeemIntentMessageHash, workflowStepConstants.progressUnstake],
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.markSuccess]: {
    kind: workflowStepConstants.markSuccess,
    onSuccess: []
  },
  [workflowStepConstants.markFailure]: {
    kind: workflowStepConstants.markFailure,
    onSuccess: []
  }
};

module.exports = btRedeemAndUnstakeStepsConfig;
