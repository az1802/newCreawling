
const fs = require("fs");
const path = require("path");
const requestMenuJson = require("./merchantInfo.json");
let merchantMenuInfo = requestMenuJson.result;

let shopInfo = {
  name: "晋麦王",
  logo:""
}
let tcClassList = merchantMenuInfo.tcClassList
let categoryList =  merchantMenuInfo.itemClassList

const { requestUrl,genImgs,genExcel,genExcelAll,genFeieExcelAll,genWord,genSpecificationsWord,formatFileName,delDirSync,mkdirSync,addPropsGroupArr} = require("../utils/index")


const exportMode = "keruyun"
// const exportMode = "feie"

let menuSetting = { //到处的菜品属性归为规格,备注,加料,做法
  specifications:[],//规格
  practice: [
   
  ],//做法
  feeding:[],//加料
  remarks: [],//备注
  propsGroupSort: [
   
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
    let categories = [];
    categories =categoryList.map(categoryItem => { 
      let categoryData = {
        name: "",
        foods:[]
      };
      categoryData.name = categoryItem.itemClassName;
      categoryData.foods =categoryItem.itemList.reduce((res, goodItem) => {
        if (goodItem) { 
          let foodData = {
            name:goodItem.itemName || "",
            picUrl: goodItem.taFileName || "",
            price:goodItem.stdPrice || "",
            unit: goodItem.unitname || "份",
            categoryName: categoryData.name,
            props:[],
          };
          goodItem.categoryName = categoryData.name;
          foodData.props = formatFoodProps(goodItem)
          res.push(foodData)
        }
        return res;
      },[]) || []
      return categoryData
    })

    merchantInfo.categories = categories

    let tcClass = tcClassList.map(categoryItem => { 
      let categoryData = {
        name: "",
        foods:[]
      };
      categoryData.name = categoryItem.tcClassName;
      categoryData.foods =categoryItem.tcItemList.reduce((res, goodItem) => {
        if (goodItem) { 
          let foodData = {
            name:goodItem.tcName || "",
            picUrl: goodItem.taFileName || "",
            price:goodItem.stdPrice || "",
            unit: goodItem.unitname || "份",
            categoryName: categoryData.name,
            props:[],
          };
          goodItem.categoryName = categoryData.name;
          foodData.props = formatFoodProps(goodItem)
          res.push(foodData)
        }
        return res;
      }, []) || []
      
     

      return categoryData
    })

    merchantInfo.categories.push(...tcClass);


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
    genSpecificationsWord(merchantInfo, outputDir, menuSetting)
    // genFeieExcelAll(merchantInfo, outputDir, menuSetting)
  }
}


genImgsAndExcel();
