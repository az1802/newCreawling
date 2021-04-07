
const fs = require("fs");
const path = require("path");


const { requestUrl,genImgs,genExcel,genExcelAll,genWord,genSpecificationsWord,formatFileName,delDirSync,mkdirSync} = require("../utils/index")




const shopId = 1000429
// const exportMode = "keruyun"
const exportMode = "feie"
const shopRequestUrl = `https://m.diandianwaimai.com/dd_wx_applet/sitdownrts/getShopInfo?shop_id=${shopId}`
const menuRequestUrl = `https://m.huanxiongdd.com/dd_wx_applet/sitdownrts/ajax_getProductDetail.action?shop_id=${shopId}`

let requestShopData = require("./tempInfo/shopData.json");
let requestMenuData = require("./tempInfo/menuData.json");
const { isRegExp } = require("util");




const outputDir = path.join(__dirname, "merchantInfos")

let menuSetting = { //到处的菜品属性归为规格,备注,加料,做法
  specifications:[],//规格
  practice:[],//做法
  feeding:[],//加料
  remarks: [],//备注
  propsGroupSort: [
   
  ],
}

let propsGroupArr = [];


// 打印日志到test.json 文件夹
async function logInfo(info,fileName="test.json") { 
  fs.writeFileSync(`./${fileName}.json`,JSON.stringify(info,null,'\t'))
}

// 获取原始数据
async function getMerchantInfo() { 
  // let requestShopData = await requestUrl(shopRequestUrl);
  // logInfo(requestShopData,"shopData")
  // let requestMenuData = await requestUrl(menuRequestUrl);
  // logInfo(requestShopData, "menuData")
  let merchantInfo = await handleRequestData(requestShopData, requestMenuData)
  await logInfo(merchantInfo, "merchantRes")
  return merchantInfo;
}

function formatFoodProps(foodItem,flag) { 

  return flag ? [
    {
      "name": "辣度",
      "values": [
        {
          "value": "不辣",
          "price": "0",
          "propName": "辣度",
          "isMul": 0
        },
        {
          "value": "中辣",
          "price": "0",
          "propName": "辣度",
          "isMul": 0
        }, {
          "value": "大辣",
          "price": "0",
          "propName": "辣度",
          "isMul": 0
        },
      ]
    }] : [];

}
// 爬取的数据中进行信息提取
async function  handleRequestData(requestShopData,requestMenuData) {
  // await logInfo(requestMenuData)
  
  try {
    // 商户信息
    let merchantInfo = {
      shopName: requestShopData.shopName,
      shop_pic: requestShopData.pic_url,
      categories:[]
    }

    // 菜品目录
    let categories = []

   

    categories = requestMenuData.category.map(categoryItem => { 
      let categoryData = {
        name: "",
        foods:[]
      };
      categoryData.name = categoryItem.typeName;
      categoryData.foods = categoryItem.goods.reduce((res,foodItem) => { 
        if (foodItem) { 
          let foodData = {
            name:foodItem.goodsName || "",
            picUrl: foodItem.goodsLogo || foodItem.goodsPicture || "",
            price:foodItem.memberPrice || "",
            unit: foodItem.unitName || "份",
            categoryName: categoryItem.typeName,
            props:[],
          };
          foodData.props = formatFoodProps(foodItem,categoryItem.typeName!=="酒水饮品")
          res.push(foodData)
        }
        return res;
      },[])
      
      return categoryData
    })

    merchantInfo.categories = categories
    return merchantInfo;
  } catch (err) { 
    console.log(err, `格式化转换菜品发生错误${menuRequestUrl}`)
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
    genWord(merchantInfo, outputDir)
    // genSpecificationsWord(merchantInfo,outputDir,menuSetting)
  }

  

}



genImgsAndExcel();
