
const fs = require("fs");
const path = require("path");
const requestShopInfo = require("./merchantShopInfo.json")
const requestMenuJson = require("./merchantInfo.json");
let merchantMenuInfo = requestMenuJson.data.foodCategories;
let merchantShopInfo = requestShopInfo.data.shopInfo;

let shopInfo = {
  name:merchantShopInfo.shopName,
  logo:merchantShopInfo.imageUrl
}
let categoryList =  merchantMenuInfo

const { requestUrl,genImgs,genExcel,genExcelAll,genFeieExcelAll,genWord,genSpecificationsWord,formatFileName,delDirSync,mkdirSync,addPropsGroupArr} = require("../utils/index")


// const exportMode = "keruyun"
const exportMode = "feie"

let menuSetting = { //到处的菜品属性归为规格,备注,加料,做法
  specifications:[	"规格"],//规格
  practice: [
	"切成2块",
	"切成4块",
	"其他"
  ],//做法
  feeding:[],//加料
  remarks: [],//备注
  propsGroupSort: [
    "规格",
    "切成2块",
    "切成4块",
    "其他"
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

let propsGroupArr=[];

function formatFoodProps(foodItem) { 
 
  let propsRes = [];

  if (foodItem.units.length > 1) { //存在多种规格
    addPropsGroupArr(propsGroupArr,"规格")
    propsRes.push({
      name: "规格",
      values: foodItem.units.map(propValItem => { 
        return {
          value: propValItem.unit,
          price:propValItem.originalPrice ,
          propName:"规格",
          type: "",
          isMul:true
        }
      })
    })
  }

  if (foodItem.foodTastes.length > 0) {

    foodItem.foodTastes.forEach(tastestItem => {
      addPropsGroupArr(propsGroupArr,tastestItem.desc)
      propsRes.push({
        name: tastestItem.desc,
        values: tastestItem.tasteOption.map(propValItem => { 
          return {
            value: propValItem.tasteValue,
            price: propValItem.price,
            propName: tastestItem.desc,
            type: "",
            isMul:tastestItem.multi
          }
        })
      })
    })
  }
    
  return propsRes;
  
}
// 爬取的数据中进行信息提取
async function  handleRequestData(requestMenuData) {

  try {
    // 商户信息
    let merchantInfo = {
      shopName: shopInfo.name,
      shop_pic: shopInfo.logo,
      categories:[]
    }
    let categories = [], categoryObj = {};
    let categoryInfo = categoryList.map(categoryItem => {

      let categoryName = categoryItem.foodCategoryName
      return {
        name:categoryName,
        foods:categoryItem.foods.map(foodItem => {
          return {
            name:foodItem.foodName || "",
            picUrl: foodItem.imagePath || "",
            price:foodItem.originPrice || "",
            unit: "份",
            categoryName: categoryName,
            props:formatFoodProps(foodItem),
          }
        })
      }
    })

    merchantInfo.categories = categoryInfo
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
  await logInfo(merchantInfo, "merchantRes")
  await logInfo(propsGroupArr, "propsGroupArr")
  
  // return;
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
    // genSpecificationsWord(merchantInfo, outputDir, menuSetting)
    genFeieExcelAll(merchantInfo, outputDir, menuSetting)
  }
}


genImgsAndExcel();
