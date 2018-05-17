# Stratum Pool
High performance Stratum poolserver in Node.js for [HDAC Node Open Mining Portal](https://github.com/Hdactech/nomp)

This Stratum Pool is ePoW-based Version Using Open Source

See [About Stratum Pool](https://github.com/zone117x/node-stratum-pool)

## Customizing for ePoW

There are some added and modified parts to apply ePOW.

### 1. dataObject.js

There is a need to manage the state values necessary for applying ePOW.    
The newly added dataObject.js determine when to apply ePOW, compares the current block height with the blockWindowSize passed from the **`HDAC Node`**.

```javascript
/**
 * @HDAC
 * This is an Object for checking the status of NOMP mining
 */
var dataObject = module.exports = function dataObject(){

    var _this = this;
	
	// setting blockWindowSize
	this.blockWindowSize = 0;
		this.setBlockWindowSize = function(blockWindowSize) {
			_this.blockWindowSize = blockWindowSize;
		};
		
		this.getBlockWindowSize = function() {
			return _this.blockWindowSize;
		};
	
	// setting nextBlocks
	// Condition to release when applying ePoW Pre-calculated block size. Calculate nextBlocks by passing the block size found	
	this.nextBlocks = 0;	
		this.setNextBlocks = function(findBlocks) {
			_this.nextBlocks = findBlocks + _this.getBlockWindowSize();
		};
		
		this.getNextBlocks = function() {
			return _this.nextBlocks;
		};
		
	// rpc current block height
	// currentHeight is the block size to look for.
	this.currentHeight = 0;	
		this.setCurrentHeight = function(currentHeight) {
			_this.currentHeight = currentHeight;
		};
		
		this.getCurrentHeight = function() {
			return _this.currentHeight;
		};	

	// callback function required
	this.decise = function(callback) {
		// Checks whether the current height meets the conditions compared to nextBlocks.
		if( _this.getCurrentHeight() == _this.getNextBlocks() || _this.getCurrentHeight() > _this.getNextBlocks() ) {
			callback(true);
		} else {
			callback(false);
		}
	};	
		
};

```

## 2. stratum.js
If ePoW is applied in accordance with the condition, Stratum Server will block access to miners connected to NOMP and allow access when it is released.       
Therefore, you have to implement the corresponding logic.

The following added function will look at NOMP's miningStatus to determine whether to keep ePoW on or off.    
```javascript
/* 
     * @HDAC
     * Logic to check whether to want to keep the applied ePoW.
     */
    var considerEpow = function(){
        if (!miningStatus) {
	        _this.emit('keepOnEpow');
	        _this.socket.destroy();
	        return true;
        } else {
        	_this.emit('releaseEpow');
        }
        return false;
    };
```

The following functions are called when applying or releasing ePOW in Pool.      
As a result, when these functions are called, the state of miningStatus is changed.    
ePoW is applied to register clients of the clients connected to the stratum server and block or delete the registered ip to release ePoW.    
    
```javascript
 /**
     * @HDAC
     * The function that release ePoW.
     */
    this.releaseEpow = function() {
    	miningStatus = true;
    	for (var clientId in stratumClients) {
            var client = stratumClients[clientId];
        }
    }
    
    /**
     * @HDAC
     * The function that apply ePoW.
     */
    this.applyEpow = function(findBlocks) {
    	sharedData.setNextBlocks(findBlocks);
    	miningStatus = false;
    	for (var clientId in stratumClients) {
            var client = stratumClients[clientId];
	    	// Set miningStauts to false.
	    	client.emit("applyEpow");
    	}
    }
```

## 3. pool.js
When NOMP is running, poolWorker behaves like a Thread.    
Therefore, using Pub/Sub function of Redis, a channel message is placed to send & receive a message through a channel when a specific event occurs, and the ePoW application is determined through the message.     

### Redis configuration and Block Winodw Size Polling Event registration
 Create a Redis Pub/Sub channel and activate it when NOMP starts.

```javascript
/*
     * @HADC
     * blockWindowSize polling interval id
     * pub/sub channel name of Redis
     */
    var blockWindowSizePollingIntervalId;
    var redisChannels = ["applyEPOW", "releaseEPOW"];

    var emitLog        = function(text) { _this.emit('log', 'debug'  , text); };
    var emitWarningLog = function(text) { _this.emit('log', 'warning', text); };
    var emitErrorLog   = function(text) { _this.emit('log', 'error'  , text); };
    var emitSpecialLog = function(text) { _this.emit('log', 'special', text); };
    var publisher = redis.createClient(options.redis.port, options.redis.host);
    var subscriber = redis.createClient(options.redis.port, options.redis.host);

    if (!(options.coin.algorithm in algos)){
        emitErrorLog('The ' + options.coin.algorithm + ' hashing algorithm is not supported.');
        throw new Error();
    }

    this.start = function(){
        SetupVarDiff();
        SetupApi();
        SetupDaemonInterface(function(){
            DetectCoinData(function(){
                SetupRecipients();
                SetupJobManager();
                OnBlockchainSynced(function(){
                    GetFirstJob(function(){
                        SetupBlockPolling();
                        /*
                         * @HDAC
                         * Check blockWindowSize from the Hdac core.
                         * If 'reward' key value of coin.json is ePoW, apply SetupBlockWindowSize and RedisSubscriberConfig.
                         */
                        if(options.coin.reward == "ePoW") {
                        	SetupBlockWindowSize();
                        	RedisSubscriberConfig();
                        }
                        SetupPeer();
                        StartStratumServer(function(){
                            OutputPoolInfo();
                            _this.emit('started');
                        });
                    });
                });
            });
        });
    };

    /**
     * @HDAC
     * Register the channel of redis' Subscribe and operate logic to apply or release ePoW according to the channel name.
     */
    function RedisSubscriberConfig() {
    	subscriber.on("message", function(channel, message) {
    		emitLog("receive From Channel '" + channel + "', message is "+message);
    		if (_this.stratumServer) {
    			if(channel == redisChannels[0]) {
    				var findBlocks = parseInt(message);
    				sharedData.setNextBlocks(findBlocks);
    				miningStatus = false;
    				_this.stratumServer.applyEpow(findBlocks);
    			} else {
    				miningStatus = true;
    				_this.stratumServer.releaseEpow();
    			}
    		}
    		  
		});

		subscriber.subscribe(redisChannels);
    }

	/**
     * @HDAC
     * A function that periodically flushes getblockwindowsize to the Hdac core for blockWindowSize values needed for ePoW application
     */
    function SetupBlockWindowSize(){
        if (typeof options.blockWindowSizeRefreshInterval !== "number" || options.blockWindowSizeRefreshInterval <= 0){
            emitLog('BlockWindowSize polling has been disabled');
            return;
        }

        var pollingInterval = options.blockWindowSizeRefreshInterval;

        blockWindowSizePollingIntervalId = setInterval(function () {
            GetBlockWindowSize(function(result){
            	var isSuccess = !result[0].error;
        		if(isSuccess) {
        			// When miningStatus is true, it sets the information received from the Hdac core.
        			var findBlocks = result[0].response.blocks;
        			var blockWindowSize = result[0].response.blockwindowsize;
        			if(miningStatus) {
        				//sharedData.setBlockWindowSize(blockWindowSize);
	        			sharedData.setBlockWindowSize(10);
	        			emitLog('getblockwindowsize call and update blockWindowSize successfully');
        			} else {
        				// When miningStatus is false, you must decide whether to release the ePoW by comparing the values of the blocks of received information with the currentHeight set in the current sharedData.
	        			//sharedData.setBlockWindowSize(blockWindowSize);
        				sharedData.setBlockWindowSize(10);
	        			sharedData.decise(function(result){
	        				// After decise function verify, and decide whether to apply pub/sub according to the result value.
	        				// If result is true, ePoW is released.
	        				if(result) {
	        					// Publish to following channel through Redis.
	        					publisher.publish(redisChannels[1], redisChannels[1]);
	        				}
	        			});
        			}
        		} else {
        			emitLog(result[0].error);
        		}
            	
            });
   
        }, pollingInterval);
    }

    /**
     * @HDAC
     * SetupBlockWindowSize function is the function that is called.
     * After send command 'getblockwindowsize' on Hdac core, and get information
     */
    function GetBlockWindowSize(callback){
        _this.daemon.cmd('getblockwindowsize',
            [],
            function(result){
        		callback(result)
            }
        );
    }	
```
Block Window Size Polling event periodically retrieves Block Window Size that can be changed from H**`HDAC Node`**.    
The blockWindowSize obtained in this case is stored in the dataObject object, and the state of the miningStatus of NOMP is displayed. If ePoW is applied, it is decided to be released to blockWindowSize.    

***
More details about other changes and additional logic related to ePoW can be found in the **`@HDAC`** tag of the comments in more detail.
