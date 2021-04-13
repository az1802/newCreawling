const fs = require("fs");
const { resolve } = require("path");
const path = require("path");
const request = require('request')
const { requestUrl,genImgs,genExcel,genWord,formatFileName,delDirSync,mkdirSync,addPropsGroupArr,genExcelAll,genSpecificationsWord} = require("../utils/index")
const defaultImgUrl = "https://shouqianba-customer.oss-cn-hangzhou.aliyuncs.com/jjz/processedPhoto5/ca06311f-796e-4889-8db4-dfb2f1a43ad1"


const exportMode = "feie"
const outputDir = path.join(__dirname, "merchantInfos")

let merchantInfo = require("./shopData.json")
let categories = merchantInfo.categories
let categoryObj = {}
let shopName = merchantInfo.name


async function handleCategories() {
  categories.forEach(item => { 
    categoryObj[item.id] = item.name
  })
}


function handleFoodPropGroup(foodDetail) {
  let specs = foodDetail.specs || {};
  if (Object.keys(specs).length==0) {
    return [];
  }
  let propGroup = {
    name: specs.title,
    values:[]
  }

  addPropsGroupArr(propsGroupArr,propGroup.name)

  propGroup.values = specs.options && specs.options.map(optionItem => {
    return {
      "value": optionItem.name,
      "price": parseFloat(optionItem.price)/100,
      "propName": propGroup.name,
      "isMul": true
    }
  })

  return [propGroup]

}

//读取dataJson下的所有文件取出 food菜品
async function genMenuFoods() { 
  let allFoods = [];
  for (let i = 0; i < 6; i++) { 
    let filePath = path.join(__dirname, "dataJson", "find" + i);
    let records = JSON.parse(fs.readFileSync(filePath, "utf-8")).data.records;
    // console.log(records)
    records.forEach(record => {
      let foodTemp = {
        name: record.item.name,
        imgUrl: record.item.photo_url || defaultImgUrl,
        categoryName: categoryObj[record.item.category_id],
        categoryId:record.item.category_id,
        foodDetail: record,
      }
      allFoods.push(foodTemp)
    })
  }

  let categoryData = {};

  allFoods.forEach(foodItem => {
    let { categoryId, categoryName } = foodItem;
    if (!categoryData[categoryId]) {
      categoryData[categoryId] = {
        id: categoryId,
        name: categoryName,
        foods:[]
      };
    }
    let foods = categoryData[categoryId].foods;

    let foodDetail = foodItem.foodDetail;
    foods.push({
      id: foodDetail.item.id,
      name: foodDetail.item.name,
      picUrl: foodDetail.item.photo_url,
      categoryName: categoryName,
      price: parseFloat(foodDetail.item.price)/100,
      unit: "份",
      props:handleFoodPropGroup(foodDetail),
    })
  })



  let categoryArr = []
  categories.forEach(categoryItem => {
    console.log(categoryData)
    categoryArr.push(categoryData[categoryItem.id])
  })

  return categoryArr;

}

async function exists(pathStr) { 
  // return fs.existsSync(pathStr)
  // return new Promise((resolve, reject) => { 
  //   fs.exists(pathStr, function(exists) {
  //     console.log(exists ? resolve(true): resolve(false));
  //   })
  // })
}



let tempObj = {}




let menuSetting = { //到处的菜品属性归为规格,备注,加料,做法
  specifications:[],//规格
  practice:[
    "杂酱",
    "招牌炒粉",
    "牛腩拌粉",
    "素拌粉",
    "排骨拌粉",
    "肥肠拌粉",
    "酸豆角拌粉",
    "牛杂拌粉"
  ],//做法
  feeding:[],//加料
  remarks: [],//备注
  propsGroupSort:[
    "杂酱",
    "招牌炒粉",
    "牛腩拌粉",
    "素拌粉",
    "排骨拌粉",
    "肥肠拌粉",
    "酸豆角拌粉",
    "牛杂拌粉"
  ],
  propsSort: {
    // "口味":["不辣","微辣","中辣","特辣","麻辣"]
  }
}

let propsGroupArr = [];

// 打印日志到test.json 文件夹
async function logInfo(info,fileName="test") { 
  fs.writeFileSync(`./${fileName}.json`,JSON.stringify(info,null,'\t'))
}


async function mkShopDir(shopDir) { 
  delDirSync(shopDir);
  mkdirSync(shopDir)
}

async function genExcelAndWord(){ 
  await handleCategories();
  let shopDir = path.join(outputDir, formatFileName(shopName));
  // // 重建创建商铺目录
  await mkShopDir(shopDir)

  let categoryArr = await genMenuFoods();

  let merchantInfo = {
    shopName: shopName,
    shop_pic: "",
    categories:categoryArr
  }

  logInfo(merchantInfo,"merchantRes")
  logInfo(propsGroupArr, "allPropGroups")
  
  if (exportMode == "keruyun") {
    genImgs(merchantInfo,outputDir);
    genExcel(merchantInfo, outputDir, menuSetting);
    genExcelAll(merchantInfo, outputDir, menuSetting);
    
  } else {
    genWord(merchantInfo, outputDir, menuSetting)
    genSpecificationsWord(merchantInfo,outputDir,menuSetting)
  }

}



genExcelAndWord();
