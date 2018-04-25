var bignum = require('bignum');
var multiHashing = require('multi-hashing');
var util = require('./util.js');

var diff1 = global.diff1 = 0x00000000ffff0000000000000000000000000000000000000000000000000000;

var algos = module.exports = global.algos = {
    sha256: {
        hash: function(){
            return function(){
                return util.sha256d.apply(this, arguments);
            }
        }
    },
    'scrypt': {
        multiplier: Math.pow(2, 16),
        hash: function(coinConfig){
            var nValue = coinConfig.nValue || 1024;
            var rValue = coinConfig.rValue || 1;
            return function(data){
                return multiHashing.scrypt(data,nValue,rValue);
            }
        }
    },
    'scrypt-jane': {
        multiplier: Math.pow(2, 16),
        hash: function(coinConfig){
            var nTimestamp = coinConfig.chainStartTime || 1367991200;
            var nMin = coinConfig.nMin || 4;
            var nMax = coinConfig.nMax || 30;
            return function(data, nTime){
                return multiHashing.scryptjane(data, nTime, nTimestamp, nMin, nMax);
            }
        }
    },
    'scrypt-n': {
        multiplier: Math.pow(2, 16),
        hash: function(coinConfig){

            var timeTable = coinConfig.timeTable || {
                "2048": 1389306217, "4096": 1456415081, "8192": 1506746729, "16384": 1557078377, "32768": 1657741673,
                "65536": 1859068265, "131072": 2060394857, "262144": 1722307603, "524288": 1769642992
            };

            var nFactor = (function(){
                var n = Object.keys(timeTable).sort().reverse().filter(function(nKey){
                    return Date.now() / 1000 > timeTable[nKey];
                })[0];

                var nInt = parseInt(n);
                return Math.log(nInt) / Math.log(2);
            })();

            return function(data) {
                return multiHashing.scryptn(data, nFactor);
            }
        }
    },
    'scrypt-og': {
        multiplier: Math.pow(2, 16),
        hash: function(coinConfig){
            var nValue = coinConfig.nValue || 64;
            var rValue = coinConfig.rValue || 1;
            return function(data){
                return multiHashing.scrypt(data,nValue,rValue);
            }
        }
    },

    x11: {
        hash: function(){
            return function(){
                return multiHashing.x11.apply(this, arguments);
            }
        }
    },
    x13: {
        hash: function(){
            return function(){
                return multiHashing.x13.apply(this, arguments);
            }
        }
    },
    x14: {
        hash: function(){
            return function(){
                return multiHashing.x14.apply(this, arguments);
            }
        }
    },
    x15: {
        hash: function(){
            return function(){
                return multiHashing.x15.apply(this, arguments);
            }
        }
    },

    lyra2re: {
        multiplier: Math.pow(2, 7),
        hash: function(){
            return function(){
                return multiHashing.lyra2re.apply(this, arguments);
            }
        }
    },
    lyra2re2: {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.lyra2re2.apply(this, arguments);
            }
        }
    },
    lyra2rev2: {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.lyra2rev2.apply(this, arguments);
            }
        }
    },
    lyra2z: {
        multiplier: Math.pow(2, 7),
        hash: function(){
            return function(){
                return multiHashing.lyra2z.apply(this, arguments);
            }
        }
    },

    blake: {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.blake.apply(this, arguments);
            }
        }
    },
    blake2s: {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.blake2s.apply(this, arguments);
            }
        }
    },
    cryptonight: {
        hash: function(){
            return function(){
                return multiHashing.cryptonight.apply(this, arguments);
            }
        }
    },
    dcrypt: {
        hash: function(){
            return function(){
                return multiHashing.dcrypt.apply(this, arguments);
            }
        }
    },
    decred: {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.decred.apply(this, arguments);
            }
        }
    },
    fresh: {
        hash: function(){
            return function(){
                return multiHashing.fresh.apply(this, arguments);
            }
        }
    },
    fugue: {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.fugue.apply(this, arguments);
            }
        }
    },
    groestl: {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.groestl.apply(this, arguments);
            }
        }
    },
    groestlmyriad: {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.groestlmyriad.apply(this, arguments);
            }
        }
    },
    qubit: {
        hash: function(){
            return function(){
                return multiHashing.qubit.apply(this, arguments);
            }
        }
    },
    quark: {
        hash: function(){
            return function(){
                return multiHashing.quark.apply(this, arguments);
            }
        }
    },
    hefty1: {
        hash: function(){
            return function(){
                return multiHashing.hefty1.apply(this, arguments);
            }
        }
    },
    keccak: {
        multiplier: Math.pow(2, 8),
        hash: function(coinConfig){
            if (coinConfig.normalHashing === true) {
                return function (data, nTimeInt) {
                    return multiHashing.keccak(multiHashing.keccak(Buffer.concat([data, new Buffer(nTimeInt.toString(16), 'hex')])));
                };
            }
            else {
                return function () {
                    return multiHashing.keccak.apply(this, arguments);
                }
            }
        }
    },
    lbry: {
        multiplier: Math.pow(2, 8),
        hash: function(){
            return function(){
                return multiHashing.lbry.apply(this, arguments);
            }
        }
    },
    neoscrypt: {
        multiplier: Math.pow(2, 16),
        hash: function(){
            return function(){
                return multiHashing.neoscrypt.apply(this, arguments);
            }
        }
    },
    nist5: {
        hash: function(){
            return function(){
                return multiHashing.nist5.apply(this, arguments);
            }
        }
    },
    s3: {
        hash: function(){
            return function(){
                return multiHashing.s3.apply(this, arguments);
            }
        }
    },
    sha1: {
        hash: function(){
            return function(){
                return multiHashing.sha1.apply(this, arguments);
            }
        }
    },
    shavite3: {
        hash: function(){
            return function(){
                return multiHashing.shavite3.apply(this, arguments);
            }
        }
    },
    skein: {
        hash: function(){
            return function(){
                return multiHashing.skein.apply(this, arguments);
            }
        }
    },
    yescrypt: {
        multiplier: Math.pow(2, 16),
        hash: function(){
            return function(){
                return multiHashing.yescrypt.apply(this, arguments);
            }
        }
    },
    zr5: {
        hash: function(){
            return function(){
                return multiHashing.zr5.apply(this, arguments);
            }
        }
    },
    ziftr: {
        hash: function(){
            return function(){
                return multiHashing.zr5.apply(this, arguments);
            }
        }
    }
};


for (var algo in algos){ // multialgo coins check
    if (!algos[algo].multiplier)
        algos[algo].multiplier = 1;
}