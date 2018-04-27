# Stratum Pool
High performance Stratum poolserver in Node.js for [HDAC Node Open Mining Portal](https://github.com/Hdactech/nomp)

This Stratum Pool is ePoW-based Version Using Open Source

See [About Stratum Pool](https://github.com/zone117x/node-stratum-pool)

## Customizing for ePoW

ePoW를 적용하기 위해서 몇 가지 추가되고 수정된 부분이 있다.

### 1. dataObject.js

ePoW를 적용하는데 있어서 그에 필요한 상태값을 관리할 필요성이 있다.
새로 추가된 dataObject.js는 **`HDAC Node`** 로부터 넘어오는 blockWindowSize를 통해서 현재의 block height를 비교해서 ePoW 적용 시점을 결정한다.

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
조건에 부합되어 ePoW가 적용되면 Stratum Server에서는 NOPM로 연결되는 miner들의 접근을 차단하게 되며 해제시에는 접근을 허용하는 방식이다.    
따라서 그에 해당하는 로직을 구현해야 한다.

다음 추가된 함수는 NOMP의 miningStatus를 보고 ePoW를 계속 유지할지 해제할지를 결정한다.
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

다음 추가된 함수들은 Pool에서 ePoW를 적용하거나 해제할 때 호출하는 함수이다.    
결과적으로 이 함수들이 호출되면 miningStatus의 상태를 변경하게 되며 ePoW를 적용시켜 Stratum Server에 연결되어 있는 clients의 ip를 등록해서 차단하거나 등록된 ip를 삭제해서 ePoW를 해제하게 된다.
    
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
NOMP가 실행되면 poolWorker가 Thread처럼 작동한다. 따라서 Redis의 Pub/Sub기능을 활용해 채널 메세지를 두어 특정 이벤트가 발생시 채널을 통해서 메세지를 주고 받게 되며 그 메세지를 통해 ePoW적용 여부를 결정하게 된다.    

### Redis 구성 및 Block Winodw Size Polling Event 등록
Redis Pub/Sub 채널을 생성하고 NOPM가 시작할 때 활성화 시킨다.

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
Block Window Size Polling 이트는 주기적으로 **`HDAC Node`** 로부터 변경될 소지가 있는 Block Window Size를 가져온다.    
이 때 얻어온 blockWindowSize를 dataObject객체에 담으며 NOMP의 miningStatus의 상태값을 보고 ePoW가 적용되어 있다면 blockWindowSize로 해제 여부를 결정하게 된다.

***
이 외의 ePoW와 관련된 변경 및 추가 로직과 관련된 자세한 부분은 코멘트의 @HDAC 태그를 통해서 좀 더 자세하게 살펴 볼 수 있다.

