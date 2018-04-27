# Stratum Pool
High performance Stratum poolserver in Node.js for [HDAC Node Open Mining Portal](https://github.com/Hdactech/nomp)

This Stratum Pool is ePoW-based Version Using Open Source

See [Open Source Stratum Pool](https://github.com/foxer666/node-stratum-pool)

## Customizing for ePoW

ePoW를 적용하기 위해서 몇 가지 추가되고 수정된 부분이 있다.

### 1. dataObject.js

ePoW를 적용하는데 있어서 그에 필요한 상태값을 관리할 필요성이 있다.
새로 추가된 dataObject.js는 HDAC NODE로부터 넘어오는 blockWindowSize를 통해서 현재의 block height를 비교해서 ePoW 적용 시점을 정의한다.

```
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
```
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
결과적으로 이 함수들이 호출하게 되면 miningStatus의 상태를 변경하게 되며 ePoW를 적용시켜 Stratum Server에 연결되어 있는 clients의 ip를 등록해서 차단하거나 등록된 ip를 삭제해서 ePoW를 해제하게 된다.
    
```
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
그 외의 ePoW와 관련된 자세한 내용은 stratum.js에 @HADC태그가 달린 comment를 확인하면 알 수 있다.