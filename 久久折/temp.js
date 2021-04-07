
const fs = require("fs");
const path = require("path");


const { requestUrl,genImgs,genExcel,genExcelAll,genWord,genSpecificationsWord,formatFileName,delDirSync,mkdirSync} = require("../utils/index")




const exportMode = "keruyun"


let requestShopData = require("./shopData.json");
let requestMenuDataAll = require("./shopData.json");
let categories = requestMenuDataAll.categories
const { isRegExp } = require("util");



const outputDir = path.join(__dirname, "merchantInfos")

let menuSetting = { //到处的菜品属性归为规格,备注,加料,做法
  specifications:[],//规格
  practice:[],//做法
  feeding:[],//加料Å
  remarks: [],//备注
  propsGroupSort: [
   
  ],
}

let propsGroupArr = [];


// 打印日志到test.json 文件夹
async function logInfo(info,fileName="test.json") { 
  fs.writeFileSync(`./${fileName}.json`,JSON.stringify(info,null,'\t'))
}


let categoryObj = {};
async function handleCategories() {
  categories.forEach(item => { 
    categoryObj[item.id] = item.name
  })

}

//读取dataJson下的所有文件取出 food菜品
async function genMenuFoods() {
  await handleCategories();
  let allFoods = {};
  for (let i = 0; i < 11; i++) { 
    let filePath = path.join(__dirname, "dataJson", "find" + i);
    let records = JSON.parse(fs.readFileSync(filePath, "utf-8")).data.records;
    // console.log(records)
    records.forEach(record => {
      if (record.item.category_id) {
        if (!allFoods[record.item.category_id]) {
          allFoods[record.item.category_id] = {
            name : categoryObj[record.item.category_id],
            foods:[]
          }
        }
        let foodTemp = {
          id: record.item.id,
          name: record.item.name,
          picUrl: record.item.photo_url || defaultImgUrl,
          categoryName: categoryObj[record.item.category_id],
          price: parseFloat(record.item.price/100),
          unit: record.item.name.unit ||  "份",
          props: [],
        }
        if (!allFoods[record.item.category_id].foods.some(food => food.id==foodTemp.id)) {
          allFoods[record.item.category_id].foods.unshift(foodTemp)
        }
      }
    })
  }
  return allFoods;
}


// 获取原始数据
async function getMerchantInfo() {
  

  let menus = await genMenuFoods(requestMenuDataAll.categories);

  let merchantInfo = await handleRequestData(requestShopData, menus)
  await logInfo(merchantInfo, "merchantRes")
  return merchantInfo;
}


// 爬取的数据中进行信息提取
async function  handleRequestData(requestShopData,requestMenuData) {
  // await logInfo(requestMenuData)
  
  try {
    // 商户信息
    let merchantInfo = {
      shopName: requestShopData.name,
      shop_pic: requestShopData.pic_url,
      categories:[]
    }

    // 菜品目录
    let categories = []
   

    for (let key in requestMenuData) {
      categories.push(requestMenuData[key])
    }

    merchantInfo.categories = categories
    return merchantInfo;
  } catch (err) { 
    console.log(err, `格式化转换菜品发生错误`)
  }
}

// 数据转换提取,写入相关文件

async function mkShopDir(shopDir) { 
  delDirSync(shopDir);
  mkdirSync(shopDir)
}

// 生成图片文件夹以及excel文件
async function genImgsAndExcel() { 
  let merchantInfo = await getMerchantInfo();
  let { shopName} = merchantInfo
  let shopDir = path.join(outputDir, formatFileName(shopName));
  // // 重建创建商铺目录
  await mkShopDir(shopDir)

  // // mkShopDir(merchantInfo)
  if (exportMode == "keruyun") {
    genImgs(merchantInfo,outputDir);
    genExcel(merchantInfo, outputDir);
    genExcelAll(merchantInfo,outputDir,menuSetting)
  } else {
    // genWord(merchantInfo, outputDir)
    genSpecificationsWord(merchantInfo,outputDir,menuSetting)
  }

}



genImgsAndExcel();
