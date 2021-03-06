const BigNumber = require("bignumber.js");
const keythereum = require("keythereum");


var Chain3 = require('chain3');
var myJson = require('../config.json');

var vnodeDatadir = myJson.vnodeDatadir; //moacnode目录，根据实际修改
var vnodeRpcAddr = myJson.vnodeRpcAddr; //vnode rpc addr & port, commonly is "http://localhost:8545"
var chain3 = new Chain3(new Chain3.providers.HttpProvider(vnodeRpcAddr));

var fromAddress = myJson.fromAddress;
var password = myJson.password;  // 账号密码，根据实际修改
var keyObject = keythereum.importFromFile(fromAddress, vnodeDatadir);
var fromSecret = keythereum.recover(password, keyObject);        //输出私钥
//console.log(fromSecret.toString("hex"));

const factor = new BigNumber(10).exponentiatedBy(18); // decimal for moac

module.exports.sendTx = async (amount, toAddress) => {
  var txcount = chain3.mc.getTransactionCount(fromAddress);
  console.log("Get tx account", txcount);

  var gasPrice = 25000000000;
  if (gasPrice < chain3.mc.gasPrice * 1.1) {
    gasPrice = chain3.mc.gasPrice * 1.1; //最小设定为gasPrice的1.1倍
  }
  var gasLimit = 100000;
  var value = chain3.toSha(amount, 'mc');
  var gasTotal = gasPrice * gasLimit + Number(value);
  console.log(gasPrice, gasLimit, value, chain3.fromSha(gasTotal, 'mc'));


  var rawTx = {
    from: fromAddress,
    to: toAddress,
    nonce: chain3.intToHex(txcount),
    gasPrice: chain3.intToHex(gasPrice),
    gasLimit: chain3.intToHex(gasLimit),
    value: chain3.intToHex(value),
    shardingFlag: 0,
    chainId: chain3.version.network
  };

  var signedTx = chain3.signTransaction(rawTx, fromSecret);

  /** traditional use
  const sendMoac = async signedTx => {
    chain3.mc.sendRawTransaction(signedTx, function (err, hash) {
      if (!err) {
        console.log("succeed: ", hash);
      } else {
        console.log("error:", err.message);
      }
    });
  };  **/

  const sendMoac = async signedTx => {
    return new Promise(function(resolve, reject) {
      chain3.mc.sendRawTransaction(signedTx, function (err, hash) {
        if (!err) {
          console.log("succeed: ", hash);
          resolve(hash);
          return hash;
        } else {
          console.log("error found:", err.message);
          return reject(err);
        }
      });
    }).catch(err => {
      return Promise.reject(err);
    });
  };

  return await sendMoac(signedTx);
};

module.exports.address = fromAddress;

module.exports.getBalance = async address => {
  const result = await chain3.mc.getBalance(address);
  return (result / factor).toFixed(2); //保留2位小数
};

module.exports.verifyAccount = address => {
  return chain3.isAddress(address);
};
