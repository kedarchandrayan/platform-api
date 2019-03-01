# AUX CHAIN SETUP

## Seed config strategy

* AUX Configs Seed
```bash
    source set_env_vars.sh
    ./devops/exec/configStrategy.js --add-aux-configs

    # Note: For staging and production follow help
```

* Activate AUX Configs
```bash
    source set_env_vars.sh
    ./devops/exec/configStrategy.js --activate-configs --chain-id 2000 --group-id 1
```

## Setup AUX Block Scanner and SAAS DDB

* Create all SAAS Owned DDB Tables
```bash
    source set_env_vars.sh
    node executables/setup/aux/saasDdb.js --auxChainId 2000 --userShardNoStr 1,2 --deviceShardNoStr 1,2 --sessionShardNoStr 1,2 --balanceShardNoStr 1,2 --recoveryOwnerAddressShardNoStr 1,2
```
    * All the parameters are mandatory parameters.

* Create Aux DDB Tables (Run the addChain service and pass all the necessary parameters):
```bash
    source set_env_vars.sh
    node executables/setup/blockScanner/initialSetup.js --chainId 2000
    node executables/setup/blockScanner/addChain.js --chainId 2000 --networkId 2000 --blockShardCount 1 --transactionShardCount 1 --economyShardCount 2 --economyAddressShardCount 2
```
    * Mandatory parameters: chainId, networkId
    * Optional parameters (defaults to 1): blockShardCount, economyShardCount, economyAddressShardCount, transactionShardCount


## Auxiliary Chain Setup

* Generate AUX addresses and Fund.
```bash
    source set_env_vars.sh
    node devops/exec/chainSetup.js --generate-aux-addresses --chain-id 2000
```

* [Only Development] Setup Aux GETH and necessary addresses.
```bash
    source set_env_vars.sh
    node tools/localSetup/aux/setupGeth.js --originChainId 1000 --auxChainId 2000
```

* [Only Development] Start AUX GETH (with Zero Gas Price) with this script.
```bash
    sh ~/openst-setup/bin/aux-2000/aux-chain-zeroGas-2000.sh
```

* Add sealer address.  
  NOTE: Use MyEtherWallet to export private key from keystore file. 
  Visit the following link [MyEtherWallet](https://www.myetherwallet.com/#view-wallet-info) and select the `Keystore / JSON File` option. 
  Upload the keystore file from `~/openst-setup/geth/aux-2000/keystore` folder. The unlock password is 
  `testtest`. Pass the address and privateKey (including 0x) in the command below.

And add it to tables using following script.
```bash
    source set_env_vars.sh
    node executables/setup/aux/addSealerAddress.js --auxChainId 2000 --sealerAddress '0xaFd5AAa702CcBD6698679853a38FAE03Bf9B1d0C' --sealerPrivateKey '611c164d961c839fc1b8b4bb1ac02463db77d2b7b18db7d657f12415081dc515'
```

* Setup Aux Contracts
```bash
    source set_env_vars.sh
    node executables/setup/aux/contracts.js --originChainId 1000 --auxChainId 2000
```

* Verifier script for auxiliary chain setup
    - You can verify local chain setup and contract deployment using following script.
```bash
    source set_env_vars.sh
    node tools/verifiers/auxChainSetup.js --auxChainId 2000
```

* [Only Development] Seed the cron processes which are associated to the aux chain using this script.
```bash
    source set_env_vars.sh
    node tools/localSetup/auxChainSpecificCronSeeder.js
```
   
## Run block-scanner crons and aggregator

* Run Aggregator
```bash
    source set_env_vars.sh
    node executables/blockScanner/aggregator.js --cronProcessId 11
```

* Run Auxiliary Transaction Finalizer
```bash
    source set_env_vars.sh
    node executables/blockScanner/balanceSettler.js --cronProcessId 22
```

* Run Auxiliary Transaction Parser
```bash
    source set_env_vars.sh
    node executables/blockScanner/transactionParser.js --cronProcessId 9
```

* Run Auxiliary Block Parser
```bash
    source set_env_vars.sh
    node executables/blockScanner/blockParser.js --cronProcessId 8
```

* Run Auxiliary Block Finalizer
```bash
    source set_env_vars.sh
    node executables/blockScanner/finalizer.js --cronProcessId 10
```


## ST Prime Stake and Mint in Zero Gas

//TODO: change amountToStake to amountToStakeInWei
```bash
    source set_env_vars.sh
    > node
        // beneficiary -> masterInternalFunderKind
        // facilitator -> masterInternalFunderKind
        // stakerAddress -> masterInternalFunderKind
        // firstTimeMint -> set this to 'true' if you are minting st prime for the first time [optional]
        
        params = {
                stepKind: 'stPrimeStakeAndMintInit',
                taskStatus: 'taskReadyToStart',
                clientId: 0,
                chainId: 1000,
                topic: 'workflow.stPrimeStakeAndMint',
                requestParams: {
                    stakerAddress: '0xf5f8f91830fba42229478838e73ef35d3b98e0da', 
                    originChainId: 1000, 
                    auxChainId: 2000, 
                    sourceChainId: 1000,
                    destinationChainId: 2000,
                    facilitator: '0xf5f8f91830fba42229478838e73ef35d3b98e0da', 
                    amountToStake: '1000000000000000000000000', 
                    beneficiary: '0xf5f8f91830fba42229478838e73ef35d3b98e0da',
                    firstTimeMint: true //[optional]
                }
        }
        stPrimeRouterK = require('./lib/workflow/stakeAndMint/stPrime/Router')
        stPrimeRouter = new stPrimeRouterK(params)
   
        stPrimeRouter.perform().then(console.log).catch(function(err){console.log('err', err)})
```
* [HELP ONLY TO KNOW HOW TO START THE STUCK WORKFLOW]
```js
        params = {
              stepKind: '', //step kind of row from where it need to restart
              taskStatus: 'taskReadyToStart',
              clientId: 0,
              chainId: 1000,
              topic: 'workflow.stPrimeStakeAndMint',
              workflowId: , //Workflow id
              currentStepId: //Id of table from where it need to restart
          }
```

* Stop geth running at zero gas price & Start AUX GETH (With Non Zero Gas Price) with this script.
```bash
    sh ~/openst-setup/bin/aux-2000/aux-chain-2000.sh
```

## Run Aggregator
```bash
  source set_env_vars.sh
  node executables/blockScanner/aggregator.js --cronProcessId 11
```

### Funding crons

* Fund by sealer aux chain specific
```bash
    source set_env_vars.sh
    node executables/funding/bySealer/auxChainSpecific.js --cronProcessId 13
```

* Fund by master internal funder aux chain specific chain addresses
```bash
    source set_env_vars.sh
    node executables/funding/byMasterInternalFunder/auxChainSpecific/chainAddresses.js --cronProcessId 12
```

* Fund by master internal funder aux chain specific token funder addresses
```bash
    source set_env_vars.sh
    node executables/funding/byMasterInternalFunder/auxChainSpecific/tokenFunderAddresses.js --cronProcessId 16
```

* Fund by master internal funder aux chain specific inter chain facilitator addresses on origin chain.
```bash
    source set_env_vars.sh
    node executables/funding/byMasterInternalFunder/auxChainSpecific/interChainFacilitatorAddresses.js --cronProcessId 17
```

* Fund by token aux funder aux chain specific
```bash
    source set_env_vars.sh
    node executables/funding/byTokenAuxFunder/auxChainSpecific.js --cronProcessId 14
```

### Update price points.
```bash
    source set_env_vars.sh
    node executables/updatePricePoints.js --cronProcessId 15
```

### Start Crons
* Start Aux Workflow router factory
```bash
    source set_env_vars.sh
    node executables/auxWorkflowFactory.js --cronProcessId 20
```
* Start execute transaction cron process
```bash
    source set_env_vars.sh
    node executables/executeTransaction.js --cronProcessId 18
```

###### ALWAYS AT THE END
### Open up config group for allocation
```js
let ConfigGroupModel = require('./app/models/mysql/ConfigGroup');
let auxChainId = 2000;
let auxGroupId = 1;

ConfigGroupModel.markAsAvailableForAllocation(auxChainId, auxGroupId).then(console.log);
```