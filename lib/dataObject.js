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
