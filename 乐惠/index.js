
const fs = require("fs");
const path = require("path");
const requestMenuJson = require("./menu.json");
let merchantMenuInfo = requestMenuJson.data;
let shopeInfo = merchantMenuInfo.merchant
let goods =  merchantMenuInfo.goods
let subGroups = merchantMenuInfo.subGroups
let specifications = merchantMenuInfo.specifications
let categoryGoods = merchantMenuInfo.categoryGoods

const { requestUrl,genImgs,genExcel,genWord,formatFileName,delDirSync,mkdirSync,genSpecificationsWord} = require("../utils/index")




const shopId = 'PwJ28'
// const shopId = 1001500
// const exportMode = "keruyun"
const exportMode = "feie"
const menuRequestUrl = `https://m-diancan.lehuipay.com/api/v1/q/=${shopId}`


const outputDir = path.join(__dirname, "merchantInfos")


// 打印日志到test.json 文件夹
async function logInfo(info,fileName="test") { 
  fs.writeFileSync(`./${fileName}.json`,JSON.stringify(info,null,'\t'))
}

// 获取原始数据
async function getMerchantInfo() { 
  // let requestMenuData = await requestUrl(menuRequestUrl);
  let merchantInfo = await handleRequestData(merchantMenuInfo)
  return merchantInfo;
}


function formatFoodProps(foodItem) { 
  let propsGroups = foodItem.sub_goods_group || [];
  
    let propsRes = propsGroups.map(groupItem => { 
      let groupTemp = {}
      let subGroupsItem = subGroups[groupItem.group_id];
      let specificationIds = groupItem.specifications;

      if (!subGroupsItem) { 
        console.log("groupItem---", groupItem);
      }
      groupTemp.name = subGroupsItem.name;
      let maxSelect = groupItem.maxSelect
      groupTemp.values = specificationIds.map(specificationId => { 
        let specificationItem = specifications[specificationId];
        return {
          value: specificationItem.name,
          price: parseFloat(specificationItem.price/100).toFixed(2),
          propName:groupTemp.name,
          isMul:maxSelect>1
        }
      })
      
    return groupTemp
    })
  if (foodItem.categoryName != "加料区") {
    propsRes.unshift({
      "name": "打包",
      "values": [
        {
          "value": "不加钱",
          "price": 0,
          "propName": "打包",
          "isMul": true
        },
      ]
    })
   }
  

  
  // let res = new Array(100)
  // 针对属性组的顺序进行排序
  // for (let i = 0; i < propsRes.length; i++) { 
  //   let sortIndex = attrsSort.indexOf(propsRes[i].name)
  //   if (sortIndex!=-1) {
  //     res[sortIndex] = propsRes[i];
  //   } else { 
  //     res.push(propsRes[i])
  //   }
  // }

  return propsRes;
}
// 爬取的数据中进行信息提取
async function  handleRequestData(requestMenuData) {
  
  try {
    // 商户信息
    let merchantInfo = {
      shopName: shopeInfo.name,
      shop_pic: "",
      categories:[]
    }

    // 菜品目录
    let categories = []

    categories = requestMenuData.categories.map(categoryItem => { 
      let categoryData = {
        name: "",
        foods:[]
      };
      categoryData.name = categoryItem.name;
      let categoryId = categoryItem.id
      categoryData.foods = categoryGoods[categoryId].reduce((res,goodId) => { 
        let goodItem = goods[goodId];
        if (goodItem) { 
          let foodData = {
            name:goodItem.name || "",
            picUrl: goodItem.icon || "",
            price:(parseFloat(goodItem.price)/100).toFixed(2) || "",
            unit: goodItem.unit || "份",
            categoryName: categoryItem.name,
            props:[],
          };
          foodData.props = formatFoodProps(goodItem)
          res.push(foodData)
        }
        return res;
      },[])
      return categoryData
    })

    merchantInfo.categories = categories
    // await logInfo(merchantInfo)
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
  await logInfo(merchantInfo,"merchantRes")
  let { shopName} = merchantInfo
  let shopDir = path.join(outputDir, formatFileName(shopName));
  // // // 重建创建商铺目录
  await mkShopDir(shopDir)

  // // // mkShopDir(merchantInfo)
  if (exportMode == "keruyun") {
    genImgs(merchantInfo,outputDir);
    genExcel(merchantInfo, outputDir);
  } else {
    genSpecificationsWord(merchantInfo, outputDir)
  }
}


genImgsAndExcel();
