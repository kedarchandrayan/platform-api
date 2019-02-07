# Saas API
Saas API layer.

## Kit API Setup
* Instructions are published at:  
  https://github.com/OpenSTFoundation/kit-api/blob/master/README.md

## Requirements
* You will need following for development environment setup.
    - [nodejs](https://nodejs.org/) >= 8.0.0
    - [Geth](https://github.com/ethereum/go-ethereum/) >= 1.8.20
    - [Memcached](https://memcached.org/)
    - [DB Browser for SQLite](https://sqlitebrowser.org/)

## Installing Geth
```
git clone https://github.com/ethereum/go-ethereum.git
cd go-ethereum
git checkout tags/v1.8.20
make geth
sudo cp ~/workspace/go-ethereum/build/bin/geth /usr/local/bin
```

## Start RabbitMQ
```
brew services start rabbitmq
```

## Setup
* Install all the packages.
```
npm install
```

* Source all the ENV vars.
```bash
source set_env_vars.sh
```

## Seed config strategy for origin as well as auxiliary chain.

* Clear cache. [Sunil: Why are we keeping memcache in env and database?]
```bash
node  executables/flush/sharedMemcached.js
```

* Config Strategy Seed for Global configurations (for local setup)
```bash

# Add Global Configs
./devops/exec/configStrategy.js --add-global-configs

# Note: For staging and production follow help

```

* Activate configurations
```bash
# Activate Global configurations
./devops/exec/configStrategy.js --activate-configs --chain-id 0 --group-id 0
```

* Config Strategy Seed for Auxiliary configurations (for local setup)
```bash
# Add Auxiliary Configs
./devops/exec/configStrategy.js --add-aux-configs

# Note: For staging and production follow help
```

* Activate configurations
```bash
# Activate Auxiliary Chain configurations
./devops/exec/configStrategy.js --activate-configs --chain-id 2000 --group-id 1
```


## [Only Development] Start Dynamo DB
```bash
rm ~/dynamodb_local_latest/shared-local-instance.db

java -Djava.library.path=~/dynamodb_local_latest/DynamoDBLocal_lib/ -jar ~/dynamodb_local_latest/DynamoDBLocal.jar -sharedDb -dbPath ~/dynamodb_local_latest/
```

### Setup Origin DDB

* Create origin DDB Tables (Run the addChain service and pass all the necessary parameters): 
    ```bash
    source set_env_vars.sh
    # For origin chain [Sunil: Let's move them in executables]
    node tools/localSetup/block-scanner/initialSetup.js --chainId 1000
    # For origin chain [Sunil: Let's move them in executables]
    node tools/localSetup/block-scanner/addChain.js --chainId 1000 --networkId 1000 --blockShardCount 1 --transactionShardCount 1 --economyShardCount 2 --economyAddressShardCount 2 
    ```
    
### Origin Chain Setup

* Generate master internal funder address for this ENV
```bash
  source set_env_vars.sh
  node devops/exec/chainSetup.js --generate-master-internal-address --chain-id 3
  
  # Do not worry about errors having code - l_c_m_i_4. These come due to cache miss.
```

* [Only Development] Setup Origin GETH and fund necessary addresses. [Sunil: Let's move it to local setup folder and rename to setupGeth.js]
```bash
  source set_env_vars.sh
  node executables/setup/origin/gethAndAddresses.js --originChainId 1000
  
  # Do not worry about errors having code - l_c_m_i_4. These come due to cache miss.
```

* [Only DevOps] Fund master internal funder address (EXCEPT PRODUCTION MAIN ENV)
```bash
  source set_env_vars.sh
  node devops/exec/chainSetup.js --fund-master-internal-funder --chain-id 3 --ethOwnerPrivateKey '0x0as..'
  
  # Do not worry about errors having code - l_c_m_i_4. These come due to cache miss.
```

* Create entry in DDB table for highest block on origin chain.

```bash
  source set_env_vars.sh
  node executables/oneTimers/insertInDDBForOriginHighestBlock.js
```

* Generate origin address and fund them
```bash
  source set_env_vars.sh
  node devops/exec/chainSetup.js --generate-origin-addresses --chain-id 3
  
  # Do not worry about errors having code - l_c_m_i_4. These come due to cache miss.
```

* [Only Development] Start Origin GETH with this script.
```bash
  sh ~/openst-setup/bin/origin-1000/origin-chain-1000.sh
```

* Setup Simple Token (EXCEPT PRODUCTION MAIN ENV)
```bash
  source set_env_vars.sh
  node executables/setup/origin/exceptProductionMain.js --originChainId 1000 [Sunil: Do we want to use transferAmountChain.js?]
  
  # Do not worry about errors having code - l_c_m_i_4. These come due to cache miss.
```

Copy the 'Setup Simple Token response' from the script response above and save somewhere offline.

* Use Simple token Owner Private Key obtained from previous step, to run following command [ONLY FOR SANDBOX].
Granter address gets ETH and OST in this step.
```bash
  source set_env_vars.sh
  [Sunil: Create Granter address separately, with sandbox condition. Also add sandbox condition while funding. Also pass --ethOwnerPrivateKey in this script]
  node executables/setup/origin/fundGranterAddress.js --stOwnerPrivateKey '0xabc...'
```

* Save simple token admin and owner addresses in database.
```bash
  source set_env_vars.sh
  node executables/setup/origin/saveSimpleTokenAddresses.js --admin '0xabc...' --owner '0xabc...'
```

* Fund master internal funder with OSTs (EXCEPT PRODUCTION MAIN ENV)
    - For non-development environment, use [MyEtherWallet](https://www.myetherwallet.com/#send-transaction), to fund address with OST.
    - otherwise, run following script to fund chain owner with OSTs (pass ST Owner private key in parameter)
```bash
  source set_env_vars.sh
  node executables/setup/origin/fundChainOwner.js --funderPrivateKey '0xabc...' [Sunil: rename funderPrivateKey to stOwnerPrivateKey]
```

* Setup Origin Contracts
```bash
  source set_env_vars.sh
  node executables/setup/origin/contracts.js --originChainId 1000
  
  # Do not worry about errors having code - l_c_m_i_4. These come due to cache miss.
```

* Verifier script for origin chain setup
    - You can verify local chain setup and contract deployment using following scripts.
```bash
  source set_env_vars.sh
  node tools/verifiers/originChainSetup.js
```
### Setup AUX and SAAS DDB

* Create all SAAS Owned DDB Tables
  ```bash
  source set_env_vars.sh
  node tools/localSetup/ddb.js --auxChainId 2000 --userShardCount 2 --deviceShardCount 2 --sessionShardCount 2 [Sunil: Let's move them in executables]  
  ```
  * Mandatory parameters: auxChainId
  * Optional parameters (defaults to 1): userShardCount, deviceShardCount, sessionShardCount

* Create Aux DDB Tables (Run the addChain service and pass all the necessary parameters):
    ```bash
    source set_env_vars.sh
    # For auxiliary chain [Sunil: Let's move them in executables]
    node tools/localSetup/block-scanner/initialSetup.js --chainId 2000 
    # For auxiliary chain [Sunil: Let's move them in executables]
    node tools/localSetup/block-scanner/addChain.js --chainId 2000 --networkId 2000 --blockShardCount 1 --transactionShardCount 1 --economyShardCount 2 --economyAddressShardCount 2
    ```   
    * Mandatory parameters: chainId, networkId
    * Optional parameters (defaults to 1): blockShardCount, economyShardCount, economyAddressShardCount, transactionShardCount


### Auxiliary Chain Setup

* Generate AUX addresses and Fund.
```bash
  source set_env_vars.sh
  node devops/exec/chainSetup.js --generate-aux-addresses --chain-id 200
```

* [Only Development] Setup Aux GETH and necessary addresses. [Sunil: Let's move it to local setup folder and rename to setupGeth.js]
```bash
  source set_env_vars.sh
  node executables/setup/aux/gethAndAddresses.js --originChainId 1000 --auxChainId 2000
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
  node executables/setup/aux/addSealerAddress.js --auxChainId 2000 --sealerAddress '0xabc...' --sealerPrivateKey '0xabc...'
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

* Seed the [cron_process](https://github.com/OpenSTFoundation/saas-api/blob/master/cronProcessSeed.md) table.
   
### Run block-scanner

* Start Workflow router factory
```bash
  source set_env_vars.sh
  node executables/workflowRouter/factory.js --cronProcessId 5
```

* Run Auxiliary Transaction Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/TransactionParser.js --cronProcessId 2
```

* Run Auxiliary Block Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/BlockParser.js --cronProcessId 1
```

* Run Auxiliary Finalizer
```bash
  source set_env_vars.sh
  node executables/blockScanner/Finalizer.js --cronProcessId 3
```

* Run Origin Transaction Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/TransactionParser.js --cronProcessId 8
```

* Run Origin Block Parser
```bash
  source set_env_vars.sh
  node executables/blockScanner/BlockParser.js --cronProcessId 7
```

* Run Origin Finalizer
```bash
  source set_env_vars.sh
  node executables/blockScanner/Finalizer.js --cronProcessId 6
```

NOTE: Make sure to make `auxChainGasPrice` value to `0x0` in `/lib/globalConstant/contract.js` before starting ST Prime 
Stake and Mint on zero-gas.

//TODO: change amountToStake to amountToStakeInWei
* St' Stake and Mint
```bash
> source set_env_vars.sh
> node

  beneficiary -> masterInternalFunderKind
  facilitator -> masterInternalFunderKind
  stakerAddress -> masterInternalFunderKind
  
   params = {
          stepKind: 'stPrimeStakeAndMintInit',
          taskStatus: 'taskReadyToStart',
          clientId: 0,
          chainId: 1000,
          topic: 'workflow.stPrimeStakeAndMint',
          requestParams: {
            stakerAddress: '0xaf744125930c0ffa3f343761e187c0e222dbf048', 
            originChainId: 1000, 
            auxChainId: 2000, 
            facilitator: '0xaf744125930c0ffa3f343761e187c0e222dbf048', 
            amountToStake: '100000000000000000001', 
            beneficiary: '0xaf744125930c0ffa3f343761e187c0e222dbf048'
          }
      }
   stPrimeRouterK = require('./executables/workflowRouter/stakeAndMint/StPrimeRouter')
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

* Revert the auxChainGasPrice value in file lib/globalConstant/contract.js back to the previous value.


### Run Aggregator
```bash
  source set_env_vars.sh
  node executables/blockScanner/Aggregator.js --cronProcessId 4
```

### Funding crons
* Fund by chain owner origin chain specific
```bash
  source set_env_vars.sh
  node executables/funding/byChainOwner/originChainSpecific --cronProcessId 9
```

* Fund by sealer aux chain specific
```bash
  source set_env_vars.sh
  node executables/funding/bySealer/auxChainSpecific.js --cronProcessId 11
```

* Fund by chain owner aux chain specific chain addresses
```bash
  source set_env_vars.sh
  node executables/funding/byChainOwner/auxChainSpecific/chainAddresses.js --cronProcessId 10
```

* Fund by chain owner aux chain specific token funder addresses
```bash
  source set_env_vars.sh
  node executables/funding/byChainOwner/auxChainSpecific/tokenFunderAddresses.js --cronProcessId 15
```

* Fund by chain owner aux chain specific inter chain facilitator addresses on origin chain.
```bash
  source set_env_vars.sh
  node executables/funding/byChainOwner/auxChainSpecific/interChainFacilitatorAddresses.js --cronProcessId 16
```

* Fund by token aux funder aux chain specific
```bash
  source set_env_vars.sh
  node executables/funding/byTokenAuxFunder/auxChainSpecific.js --cronProcessId 12
```

###### ALWAYS AT THE END
### Open up config group for allocation
```js
let ConfigGroupModel = require('./app/models/mysql/ConfigGroup');
let auxChainId = 2000;
let auxGroupId = 1;

ConfigGroupModel.markAsAvailableForAllocation(auxChainId, auxGroupId).then(console.log);
```
