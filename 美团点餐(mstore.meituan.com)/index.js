
const fs = require("fs");
const path = require("path");
const menuJson = require('./menu.json')

const { requestUrl,genImgs,genExcel,genWord,genSpecificationsWord,formatFileName,delDirSync,mkdirSync,addPropsGroupArr,genExcelAll,genFeieExcelAll} = require("../utils/index")

const exportMode = "feie"

let menuSetting = { //到处的菜品属性归为规格,备注,加料,做法
  specifications:[],//规格
  practice: [
    "口味",
    "年糕",
    "酱料",
    "小吃",
    "配餐",
    "汤饮"

  ],//做法
  feeding:[    ],//加料
  remarks: [],//备注
  propsGroupSort: [
    "口味",
    "年糕",
    "酱料",
    "小吃",
    "配餐",
    "汤饮"

  ],
  propsSort: {
    // "口味":["不辣","微辣","中辣","特辣","麻辣"]
  }
}

const attrsSort = [

]



const outputDir = path.join(__dirname, "merchantInfos")
let propsGroupArr = [];

// 打印日志到test.json 文件夹
async function logInfo(info,fileName="test") { 
  fs.writeFileSync(`./${fileName}.json`,JSON.stringify(info,null,'\t'))
}

// 获取原始数据
async function getMerchantInfo() { 
  let shopData = {
    name:"吉星屋紫菜包饭"
  }
  let menuData = menuJson.data
  let merchantInfo = await handleRequestData(shopData,menuData)
  return merchantInfo;
}


/**
 * 
 *  { value: propValItem.p_value,
          price: propsPriceObj[`#${props[k].p_name_id}_${propValItem.p_value_id}#`],
          propName: props[k].p_name,
          type: "",
          isMul:props[k].is_multiple} foodItem 
 */
function formatFoodProps(foodItem) { 
  
  let propsRes = [],tasteList = foodItem.tasteList;
  
  tasteList.forEach(groupItem=>{
    propsRes.push({
      name:groupItem.group.name,
      values:groupItem.attrValues.map(item=>{
        return {
          value:item.name,
          price: 0,
          propName:groupItem.group.name,
          type: "",
          isMul:false
        }
      })
    })
  })

  return propsRes
}
// 爬取的数据中进行信息提取
async function  handleRequestData(requestShopData,requestMenuData) {

  
  try {
    // 商户信息
    let merchantInfo = {
      shopName: requestShopData.name,
      shop_pic: "",
      categories:[]
    }

    // 菜品目录
    let categories = requestMenuData.categoryList.map(categoryItem=>{
      return {
        name: categoryItem.name,
        id:categoryItem.id,
        foods:[]
      }
    })

    console.log('%ccategories: ','color: MidnightBlue; background: Aquamarine; font-size: 20px;',categories);

    let allFooods = requestMenuData.dishList;

    allFooods.forEach(foodItem=>{
      let categoryItemIndex =  categories.findIndex(item=>item.id==foodItem.categoryId);
      if(categoryItemIndex==-1){
        return ;
      }
      let categoryItem = categories[categoryItemIndex];
      categoryItem.foods.push({
        name:foodItem.name || "",
        picUrl: foodItem.detailImgUrls[0] || foodItem.img || "",
        price:parseFloat(Number(foodItem.skuList[0]&&foodItem.skuList[0].price || 0)/100) || "",
        unit: foodItem.unitName || "份",
        categoryName: categoryItem.name,
        props:formatFoodProps(foodItem),
      })

    })

    merchantInfo.categories = categories
    await logInfo(merchantInfo)
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
  await logInfo(merchantInfo,"merchantRes")
  let { shopName} = merchantInfo
  let shopDir = path.join(outputDir, formatFileName(shopName));
  // // 重建创建商铺目录
  await mkShopDir(shopDir)

  logInfo(propsGroupArr,"allPropGroups")
  // // mkShopDir(merchantInfo)
  if (exportMode == "feie") {
    genFeieExcelAll(merchantInfo, outputDir, menuSetting)

  } else {
  }
}



genImgsAndExcel();

      
