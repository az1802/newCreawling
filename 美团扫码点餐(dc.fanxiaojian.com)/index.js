
const fs = require("fs");
const path = require("path");
const requestMenuJson = require("./merchantInfo.json");
let merchantMenuInfo = requestMenuJson.baseInfo;

let shopeInfo = merchantMenuInfo.restaurant
let foodList = merchantMenuInfo.foodList

const { requestUrl,genImgs,genExcel,genExcelAll,genWord,genSpecificationsWord,formatFileName,delDirSync,mkdirSync} = require("../utils/index")


// const exportMode = "keruyun"
const exportMode = "feie"

let menuSetting = { //到处的菜品属性归为规格,备注,加料,做法
  specifications:[],//规格
  practice:[ '煲仔饭',     '喝不喝靓汤',
  '加料',       '选三种肉菜',
  '选两种肉菜', '特色荷叶蒸饭',
  '小吃糖水',   '原味蒸饭',
  '炒菜类',     '时令炖汤'],//做法
  feeding:[],//加料
  remarks: [],//备注
  propsGroupSort: [
    "煲仔饭",
    "选两种肉菜",
    "选三种肉菜",
    "特色荷叶蒸饭",
    "原味蒸饭",
    "炒菜类",
    "加料",
    "小吃糖水",
    "时令炖汤",
    "喝不喝靓汤",
  ],
  propsSort: {
  }
}



const outputDir = path.join(__dirname, "merchantInfos")


// 打印日志到test.json 文件夹
async function logInfo(info,fileName="test") { 
  fs.writeFileSync("./"+fileName+".json",JSON.stringify(info,null,'\t'))
}

// 获取原始数据
async function getMerchantInfo() { 
  // let requestMenuData = await requestUrl(menuRequestUrl);
  let merchantInfo = await handleRequestData(merchantMenuInfo)
  return merchantInfo;
}

let allGroupsName = [];

function formatFoodProps(foodItem) { 
  let propsGroups = foodItem.methodCategories || [];
  let combosList = foodItem.combosList || [];
  
  let propsRes = propsGroups.map(groupItem => { 
    let groupTemp = {}
    groupTemp.name = groupItem.categoryName;
    allGroupsName.indexOf(groupItem.categoryName) == -1 ? (allGroupsName.push(groupTemp.name)) : "";
    console.log(allGroupsName,groupItem.categoryName)
    groupTemp.values = groupItem.methodList.map( methodItem=> { 
      return {
        value: methodItem.name,
        price: methodItem.markupPrice,
        propName:groupTemp.name,
        isMul:true
      }
    })
    return groupTemp
  })
  

  combosList && combosList.forEach(comboItem => {
    let groupTemp = {}
    let basePrice = parseFloat(comboItem.price || 0)
    groupTemp.name = comboItem.groupName;
    allGroupsName.indexOf(groupTemp.name) == -1 ? (allGroupsName.push(groupTemp.name)) : "";

    groupTemp.values = comboItem.cdatList.map( cdatItem=> { 
      return {
        value: cdatItem.name,
        price: parseFloat(cdatItem.price),
        propName:groupTemp.name,
        isMul:false
      }
    })

    propsRes.push(groupTemp)
  })

  return propsRes;
  
}
// 爬取的数据中进行信息提取
async function  handleRequestData(requestMenuData) {

  
  try {
    // 商户信息
    let merchantInfo = {
      shopName: shopeInfo.restaurantName,
      shop_pic: shopeInfo.restaurantUrl,
      categories:[]
    }

    // 菜品目录
    let categories = [], categoriesObjTemp = {}

    foodList.forEach(foodItem => { 
      let categoryId = foodItem.dishesType.dishesTypeId;
      if (categoriesObjTemp[categoryId]) {
        categoriesObjTemp[categoryId].push(JSON.parse(JSON.stringify(foodItem)))
      } else { 
        categoriesObjTemp[categoryId] = [JSON.parse(JSON.stringify(foodItem))]
      } 
    })





    categories = requestMenuData.foodCategories.map(categoryItem => { 
      let categoryData = {
        name: "",
        foods:[]
      };
      categoryData.name = categoryItem.dishesTypeName;
      let categoryId = categoryItem.dishesTypeId;
      // console.log(categoriesObj,categoriesObj[categoryId])
      // (categoriesObjTemp[categoryId]==undefined)&&console.log("categoryId---",categoriesObjTemp[categoryId],categoryId)
      categoryData.foods = categoriesObjTemp[categoryId]&&categoriesObjTemp[categoryId].reduce((res,goodItem) => { 
        if (goodItem&&!goodItem.hide) { 
          let foodData = {
            name:goodItem.dishesName || "",
            picUrl: goodItem.dishesIntroImage || "",
            price:goodItem.dishesPrice || "",
            unit: goodItem.dishesUnit || "份",
            categoryName: categoryItem.dishesTypeName,
            props:[],
          };
          goodItem.categoryName = categoryItem.dishesTypeName;
          foodData.props = formatFoodProps(goodItem)
          res.push(foodData)
        }
        return res;
      },[]) || []
      return categoryData
    })

    merchantInfo.categories = categories
    // await logInfo(merchantInfo)
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
  await logInfo(merchantInfo ,"merchantRes")
  // return;
  let { shopName} = merchantInfo
  let shopDir = path.join(outputDir, formatFileName(shopName));
  // // 重建创建商铺目录
  await mkShopDir(shopDir)


  console.log("所有属性组---",allGroupsName)

  // // mkShopDir(merchantInfo)
  if (exportMode == "keruyun") {
    genImgs(merchantInfo,outputDir);
    genExcel(merchantInfo, outputDir);
    genExcelAll(merchantInfo,outputDir,menuSetting)
  } else {
    genWord(merchantInfo, outputDir)
    genSpecificationsWord(merchantInfo, outputDir,menuSetting)
  }
}


genImgsAndExcel();
