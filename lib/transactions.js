var util = require('./util.js');

/*
This function creates the generation transaction that accepts the reward for
successfully mining a new block.
For some (probably outdated and incorrect) documentation about whats kinda going on here,
see: https://en.bitcoin.it/wiki/Protocol_specification#tx
 */

var generateOutputTransactions = function(poolRecipient, recipients, rpcData){

    let reward = rpcData.coinbasevalue;
    let rewardToPool = reward;

    let txOutputBuffers = [];


    if (rpcData.payee) {
        let payeeReward =  rpcData.payee_amount || Math.ceil(reward / 5);

        reward -= payeeReward;
        rewardToPool -= payeeReward;

        let payeeScript = util.addressToScript(rpcData.payee);
        txOutputBuffers.push(Buffer.concat([
            util.packInt64LE(payeeReward),
            util.varIntBuffer(payeeScript.length),
            payeeScript
        ]));
    } else if (rpcData.masternode_payments_enforced === true && rpcData.masternode) {
      let masternodeReward = rpcData.masternode.amount;
      reward -= masternodeReward;
      rewardToPool -= masternodeReward;

      let masternodeScript = util.addressToScript(rpcData.masternode.payee);
      txOutputBuffers.push(Buffer.concat([
        util.packInt64LE(masternodeReward),
        util.varIntBuffer(masternodeScript.length),
        masternodeScript
      ]))
    }

    // Zcoin znodes
    if (rpcData.znode) {

        let znode = rpcData.znode;

        let testnet = false;

        //Zcoin founders mainnet
        let founders = {
            "aCAgTPgtYcA4EysU4UKC86EQd5cTtHtCcr" : 1,
            "aHu897ivzmeFuLNB6956X6gyGeVNHUBRgD" : 1,
            "aQ18FBVFtnueucZKeVg4srhmzbpAeb1KoN" : 1,
            "a1HwTdCmQV3NspP2QqCGpehoFpi8NY4Zg3": 3,
            "a1kCCGddf5pMXSipLVD9hBG2MGGVNaJ15U" : 1
        };

        //Zcoin founders testnet
        let testnetFounders = {
            "TDk19wPKYq91i18qmY6U9FeTdTxwPeSveo" : 1,
            "TWZZcDGkNixTAMtRBqzZkkMHbq1G6vUTk5" : 1,
            "TRZTFdNCKCKbLMQV8cZDkQN9Vwuuq4gDzT" : 1,
            "TG2ruj59E5b1u9G3F7HQVs6pCcVDBxrQve": 3,
            "TCsTzQZKVn4fao8jDmB9zQBk9YQNEZ3XfS" : 1
        };

        // UNCOMMENT THIS IF YOU WANT TO TEST ZCOIN IN TEST NETWORK
        /*
            testnet = true;

            if (testnet) {
                founders = testnetFounders;
            }
        */

        //satoshis in 1 coin (100000000 = 1 BTC f.e.)
        let denomination = 100000000;

        Object.keys(founders).forEach((founderAddress)=> {
            let founderReward = founders[founderAddress] * denomination;

            let rewardScript = util.addressToScript(founderAddress);
            txOutputBuffers.push(Buffer.concat([
                util.packInt64LE(founderReward),
                util.varIntBuffer(rewardScript.length),
                rewardScript
            ]));
        });

        if (znode.payee) {
            let payeeReward = znode.amount;
            let payeeScript = util.addressToScript(znode.payee);

            txOutputBuffers.push(Buffer.concat([
                util.packInt64LE(payeeReward),
                util.varIntBuffer(payeeScript.length),
                payeeScript
            ]));
        }

    }

    for (let i = 0; i < recipients.length; i++){
        let recipientReward = Math.floor(recipients[i].percent * reward);
        rewardToPool -= recipientReward;

        txOutputBuffers.push(Buffer.concat([
            util.packInt64LE(recipientReward),
            util.varIntBuffer(recipients[i].script.length),
            recipients[i].script
        ]));
    }


    txOutputBuffers.unshift(Buffer.concat([
        util.packInt64LE(rewardToPool),
        util.varIntBuffer(poolRecipient.length),
        poolRecipient
    ]));

    if (rpcData.default_witness_commitment !== undefined){
        witness_commitment = Buffer.from(rpcData.default_witness_commitment, 'hex');
        txOutputBuffers.unshift(Buffer.concat([
            util.packInt64LE(0),
            util.varIntBuffer(witness_commitment.length),
            witness_commitment
        ]));
    }

    return Buffer.concat([
        util.varIntBuffer(txOutputBuffers.length),
        Buffer.concat(txOutputBuffers)
    ]);

};


exports.CreateGeneration = function(rpcData, publicKey, extraNoncePlaceholder, reward, txMessages, recipients){
    var txInputsCount = 1;

    var txOutputsCount = 1;
    var txVersion = txMessages === true ? 2 : 1;
    var txLockTime = 0;

    var txInPrevOutHash = 0;
    var txInPrevOutIndex = Math.pow(2, 32) - 1;
    var txInSequence = 0;

    //Only required for POS coins
    var txTimestamp = reward === 'POS' ?
        util.packUInt32LE(rpcData.curtime) : Buffer.from([]);

    //For coins that support/require transaction comments
    var txComment = txMessages === true ?
        util.serializeString('https://github.com/zone117x/node-stratum') :
        Buffer.from([]);


    var scriptSigPart1 = Buffer.concat([
        util.serializeNumber(rpcData.height),
        Buffer.from(rpcData.coinbaseaux.flags, 'hex'),
        util.serializeNumber(Date.now() / 1000 | 0),
        Buffer.from([extraNoncePlaceholder.length])
    ]);

    var scriptSigPart2 = util.serializeString('/nodeStratum/');

    var p1 = Buffer.concat([
        util.packUInt32LE(txVersion),
        txTimestamp,

        //transaction input
        util.varIntBuffer(txInputsCount),
        util.uint256BufferFromHash(txInPrevOutHash),
        util.packUInt32LE(txInPrevOutIndex),
        util.varIntBuffer(scriptSigPart1.length + extraNoncePlaceholder.length + scriptSigPart2.length),
        scriptSigPart1
    ]);


    /*
    The generation transaction must be split at the extranonce (which located in the transaction input
    scriptSig). Miners send us unique extranonces that we use to join the two parts in attempt to create
    a valid share and/or block.
     */


    var outputTransactions = generateOutputTransactions(publicKey, recipients, rpcData);

    var p2 = Buffer.concat([
        scriptSigPart2,
        util.packUInt32LE(txInSequence),
        //end transaction input

        //transaction output
        outputTransactions,
        //end transaction ouput

        util.packUInt32LE(txLockTime),
        txComment
    ]);

    return [p1, p2];

};
