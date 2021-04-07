
// 获取目录下的文件

var path = require("path");
const request = require('request')
var fs = require("fs");
const { resolve } = require("path");
var xlsx = require('node-xlsx');
const JSZIP = require('jszip');
var officegen = require('officegen');
var docx = officegen('docx');//word
const axios = require("axios")


const { requestPostUrl} = require("./utils/index")


const shopRequestUrl = `https://scte.fuioupay.com/getTermInfo.action`


async function test() { 
  let res = await requestPostUrl(shopRequestUrl, {
    "mchntCd": "0002900F3608906",
    "termId": "62159391"
  });
  console.log(res);
}


// test();

console.log(encodeURI("https://cdn.fuioupay.com/sys/scte/0002900F3608906/红烧鸡块.jpg"))
request({
  method: "GET",
  url: encodeURI("https://cdn.fuioupay.com/sys/scte/0002900F3608906/红烧鸡块.jpg"),
  encoding:null
}).pipe(fs.createWriteStream(path.join(__dirname, "_testImgs", "a.jpg")))