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
const DishMatchUrl = "https://test.shilai.zhiyi.cn/staff_assist/merchant/dish/fuzzy_match?dishName="


async function sleep() {
  return new Promise((resolve, reject) => {
    setTimeout(resolve,3000)
  })
}


// 获取目录下的文件
async function getFiles(dirName) { 
  var dirs = [];
  return new Promise((resolve, reject) => { 
    fs.readdir(dirName, function (err, files) {
      resolve(err ? files : [])
    }).catch(err => { 
      resolve([])
    });
  })
}

//获取filePath路径下的文件
async function getFileJson(filePath){ 
  if (fs.existsSync(filePath)) { 
    let menuJson = fs.readFileSync(filePath, "utf-8");
    menuJson = JSON.parse(menuJson)
    return menuJson
  }
  return false
}

// 请求url数据信息
async function requestUrl(url,) { 
  return new Promise((resolve, reject) => {
    request.get({
      url: url,
    }, (err, res, body) => { 
        resolve(err ? {} : JSON.parse(body))
    })
  })
}

async function requestPostUrl(url,data) { 
  return new Promise((resolve, reject) => {
    request({
      method:"POST",
      url: url,
      json: true,
      headers: {
        "content-type": "application/json",
    },
    body: JSON.stringify(data)
    }, (err, res, body) => { 
        console.log("body---",body)
        resolve(err ? {} : JSON.parse(body))
    })
  })
}



// 删除目录
async function delDirSync(path) {
  // if (fs.existsSync(path)) {
  //   fs.rmdirSync(path);
  // }
  let files = [];
    if(fs.existsSync(path)){
        files = fs.readdirSync(path);
        files.forEach((file, index) => {
            let curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()){
              delDirSync(curPath); //递归删除文件夹
            } else {
              fs.unlinkSync(curPath); //删除文件
            }
        });
        fs.rmdirSync(path);
    }
}

// 创建目录
function mkdirSync(path) {
  if (!fs.existsSync(path)) { 
    fs.mkdirSync(path);
  }
}

// 格式化文件名称
function formatFileName(name) { 
  return name.replace(/\//ig, "-")
}

// 生成图片
async function genImgs(merchantInfo,outputDir) { 

  let { categories, shopName, shop_pic } = merchantInfo;
  
  let shopDir = path.join(outputDir, formatFileName(shopName));
  let foodsImgsDir = path.join(shopDir, "imgs");
  let noImgUrls = []
  mkdirSync(foodsImgsDir)
  // 生成菜品图片文件夹 
  categories.forEach((categoryItem) => { 
    // let categoryDir = path.join(foodsImgsDir, formatFileName(categoryItem.name));
    // (categoryItem.foods.length != 0) && mkdirSync(categoryDir);


    let categoryDir = foodsImgsDir;

    let foods = categoryItem.foods
    foods.forEach(foodItem => {
      let imgUrl = foodItem.picUrl;
     
      let imgName = formatFileName(foodItem.name) + ".jpg"
      if (imgUrl) {
        try {
          request(imgUrl).pipe(fs.createWriteStream(path.join(categoryDir, imgName.trim())))
          
        } catch (err) { 
          noImgUrls.push(imgName)
          console.log(imgName,"下载错误")
        }
      } else { 
        noImgUrls.push(imgName)
      }
    })
  })


  fs.writeFileSync(path.join(shopDir, "没有成功爬取的图片.txt"),"没有成功爬取的图片:"+noImgUrls.join(","))
 
  
}

// 生成表格
async function genExcel(merchantInfo, outputDir) { 
  let { categories, shopName } = merchantInfo;
  let shopDir = path.join(outputDir, formatFileName(shopName));
  let title = ["商品名称","一级分类","二级分类","标准单位","品牌定价"];
  
  let excelData = [[]]
  categories.forEach(categoryItem => { 
    categoryItem.foods.forEach(foodItem => { 
      let excelDataTemp = [foodItem.name,"默认",foodItem.categoryName,foodItem.unit,parseFloat(foodItem.price || 0).toFixed(2)]
      foodItem.props.length ==0 ? excelData.unshift(excelDataTemp) :excelData.push(excelDataTemp) 
    })
  })
    
  let buffer = xlsx.build([
    {
        name:'sheet1',
        data:[title].concat(excelData)
    }
  ]);
  fs.writeFileSync(path.join(shopDir,`${shopName}-客如云菜品导入.xlsx`),buffer,{'flag':'w'});
}



// 生成详细数据表格
/*
menuSetting = {
  specifications:[],//规格
  practice:[],
  feeding:[],
  remarks:[],
  propsGroupSort:[]
}
*/



// 飞蛾模式的菜品excel导出
async function genExcelAll(merchantInfo, outputDir,menuSetting) { 
  console.log('%cmerchantInfo: ','color: MidnightBlue; background: Aquamarine; font-size: 20px;',merchantInfo);
  let { categories, shopName } = merchantInfo;



  let shopDir = path.join(outputDir, formatFileName(shopName));
  let title = ["商品名称","一级分类","二级分类","标准单位","规格类别","规格","品牌定价","做法类别","做法","加料","备注"];
  
  let excelData = [[]];
  let allPropObj = {};


  // 调整属性组的顺序
  categories.forEach(categoryItem => {
    categoryItem.foods.forEach(foodItem => {
      handleFoodProps(foodItem,menuSetting)
    })
  })



  categories.forEach(categoryItem => {
    categoryItem.foods.forEach(foodItem => {
      let foodName = foodItem.name,
        foodDefaultCategory = "默认",
        foodCategoryName = foodItem.categoryName,
        foodUnit = foodItem.unit,
        foodSpecificationType = "",
        foodSpecification = "",
        foodPrice = parseFloat(foodItem.price || 0).toFixed(2),
        foodPracticeType = [],
        foodPractice = [],
        foodFeeding = [],
        foodRemarks = [];

      foodItem.props && foodItem.props.forEach(propItem => {
        let propItemName = propItem.name;
        allPropObj[propItemName] = 1;
        let propVales = propItem.values;

        for (key in menuSetting) {
          let val = menuSetting[key]
          if (val.indexOf(propItemName) != -1) {
            if (key == "specifications") {//此属性值处理为规格
              // 规格菜需要导入多个
              foodSpecificationType = propItemName;
              foodSpecification = propVales
            } else if (key == "practice") {//处理做法
              foodPracticeType.push(propItemName);
              foodPractice.push(propVales.map(i => i.value).join("/"))
            } else if (key == "feeding") {//处理加料
              foodFeeding = propVales.map(i => i.value)
            } else if (key == "remarks") {//处理备注
              foodRemarks = propVales.map(i => i.value)
            }
            break;
          }
        }
      })
      
      foodPracticeType = foodPracticeType.join(",");
      foodPractice = foodPractice.join(",");
      foodFeeding = foodFeeding.join(",");
      foodRemarks = foodRemarks.join(",");
      
      let foodExcelData = [
        foodName,
        foodDefaultCategory,
        foodCategoryName,
        foodUnit,
        "",
        "",
        foodPrice || 0,
          foodPracticeType,
          foodPractice,
          foodFeeding,
          foodRemarks,
        ]
  
      
      if (foodSpecificationType) {  //存在规格菜添加多个属性
        foodSpecification.forEach(foodSpecificationItem => {
          let tempExcelData = JSON.parse(JSON.stringify(foodExcelData));
          tempExcelData[4] = foodSpecificationType;
          tempExcelData[5] = foodSpecificationItem.value;
          excelData.push(tempExcelData)
        })
      } else { 
        foodItem.props.length == 0 ? excelData.unshift(foodExcelData) :  excelData.push(foodExcelData)
      }
      



    })
  })
    
  let buffer = xlsx.build([
    {
        name:'sheet1',
        data:[title].concat(excelData)
    }
  ]);
  fs.writeFileSync(path.join(shopDir, `${shopName}-客如云菜品导入(包含规格,属性,加料,备注信息).xlsx`), buffer, { 'flag': 'w' });
  fs.writeFileSync(path.join(shopDir, "所有菜品属性名称.txt"),"所有菜品属性名称:"+Object.keys(allPropObj).join(","))
}


// 生成飞蛾模式的excel 
async function genFeieExcelAll(merchantInfo, outputDir,menuSetting) { 
  let { categories, shopName } = merchantInfo;
  let { propsGroupSort} = menuSetting 
  let shopDir = path.join(outputDir, formatFileName(shopName));
  let title = ["商品名称","菜品分类","标准单位","规格类别","规格","价格","做法类别","做法","加料"];
  let foodsImgsDir = path.join(shopDir, "imgs");
  mkdirSync(foodsImgsDir)
  let excelData = []; //默认添加一套数据作为是否有属性的分割线
  let allPropObj = {};
  let noImgUrls = {};

  // 下载所有菜品的图片,用于菜品的批量单导入
  categories.forEach(async categoryItem => {
    if (!categoryItem) {
      return;
    }
    categoryItem.foods.forEach(async foodItem => {

      let url = foodItem.picUrl
      let imgName= foodItem.name
      if (url) {
        let ext =  url.slice(url.lastIndexOf("."));
        // ext= ".jpg" 
        // ext=".jpeg"
        // ext = ".png"
        // if (bigImage) {//阿里云模式下下载大图
        //   url = url.slice(0, -3) + "2048";a
        // } 
        try {
          await request(url).pipe(fs.createWriteStream(path.join(shopDir, "imgs", String(imgName) + ext)));
        } catch (err) {
          noImgUrls[imgName] = foodItem.name
          console.log("保存图片错误", url)
        }
      } else { 
        noImgUrls[imgName] = foodItem.name
      }
    })
  })

   // 处理没有爬取到的图片
   dishesImgMatch(noImgUrls,shopDir);
   genBeizhuText({noImgUrls, shopDir,mode:"feie"})

  // 调整属性组的顺序
  categories.forEach(categoryItem => {
    if (!categoryItem) { 
      return;
    }
    categoryItem.foods.forEach(foodItem => {
      handleFoodProps(foodItem,menuSetting)
    })
  })


  
  let allPropItemsSort = {} //存放所有属性组内部属性的相对排序
  // 采用插入排序获取所有属性组内部属性的相对顺序,然后放在表格第一位保持顺序的一致
  categories.forEach(categoryItem => {
    if(!categoryItem){
      return;
    }
    categoryItem.foods.forEach(foodItem => {
      foodItem.props.forEach((propItem) => {
        if (!allPropItemsSort[propItem.name]) {
          allPropItemsSort[propItem.name] = propItem.values.map(i => { return i.price&&i.price != 0 ? `${i.value}:${i.price}` : `${i.value}` });
        } else {
          
          let oldSort = allPropItemsSort[propItem.name],appendIndex=0;
          propItem.values.forEach(i => {
            let str = i.price != 0 ? `${i.value}:${i.price}` : `${i.value}`;
            if (oldSort.indexOf(str) == -1) {//不在排序队列中则添加进去,
              oldSort.splice(appendIndex+1,0,str)
            } else {//更新添加顺序
              appendIndex = oldSort.indexOf(str)
            }
          })
        }
      })
    })
  })

  let propSortData = {
    foodName: "属性顺序",
    foodCategoryName: "",
    foodUnit: "",
    foodSpecificationType: "",
    foodSpecification: "",
    foodPrice:"",
    foodPracticeType:[],
    foodPractice: [],
    foodFeeding:""
    
  }

  for (propGroupName in allPropItemsSort) {
    let propItemNames = allPropItemsSort[propGroupName]
    // 根据菜单配置生成不同属性组内部的属性
    for (key in menuSetting) {
      let val = menuSetting[key]
      if (val.indexOf(propGroupName) != -1) {
        if (key == "specifications") {//此属性值处理为规格
          propSortData.foodSpecificationType = propGroupName;
          propSortData.foodSpecification = propItemNames.join("/");
        } else if (key == "practice") {//处理做法
          propSortData.foodPracticeType.push(propGroupName);
          propSortData.foodPractice.push(propItemNames.join("/"))
        } else if (key == "feeding") {//处理加料
          propSortData.foodFeeding = propItemNames.join("/")
        }
        break;
      }
    }
  }
  

  let propGroupSortArr = new Array(propsGroupSort.length),propsSortArr = new Array(propsGroupSort.length);
  if (propsGroupSort && propsGroupSort.length > 0) {
    propSortData.foodPracticeType.forEach((item, itemIndex) => {
      let index = propsGroupSort.indexOf(item);
      if (index != -1) {
        propGroupSortArr[index] = propSortData.foodPracticeType[itemIndex]
        propsSortArr[index] = propSortData.foodPractice[itemIndex]
      }
    })
    propGroupSortArr = propGroupSortArr.filter(item => !!item);
    propsSortArr = propsSortArr.filter(item => !!item);

    propSortData.foodPracticeType = propGroupSortArr.join(",")
    propSortData.foodPractice = propsSortArr.join(",")
  } else {
    propSortData.foodPracticeType = propSortData.foodPracticeType.join(",")
    propSortData.foodPractice =  propSortData.foodPractice.join(",")
  }



  categories.forEach(categoryItem => {
    if (!categoryItem) {
      return;
    }
    categoryItem.foods.forEach(foodItem => {
      let foodName = foodItem.name,
        foodDefaultCategory = "默认",
        foodCategoryName = foodItem.categoryName,
        foodUnit = foodItem.unit,
        foodSpecificationType = "",
        foodSpecification = "",
        foodPrice = parseFloat(foodItem.price || 0).toFixed(2),
        foodPracticeType = [],
        foodPractice = [],
        foodFeeding = [],
        foodRemarks = [];

      foodItem.props && foodItem.props.forEach(propItem => {
        let propItemName = propItem.name;
        allPropObj[propItemName] = 1;
        let propVales = propItem.values;

        for (key in menuSetting) {
          let val = menuSetting[key]
          if (val.indexOf(propItemName) != -1) {
            if (key == "specifications") {//此属性值处理为规格
              // 规格菜需要导入多个
              foodSpecificationType = propItemName;
              foodSpecification = propVales.map(i => {
                return i.price !=0 ? `${i.value}:${i.price}` : `${i.value}`
              }).join("/")
              
            } else if (key == "practice") {//处理做法

              foodPracticeType.push(propItemName);
              foodPractice.push(propVales.map(i => {
                 return i.price !=0 ? `${i.value}:${i.price}` : `${i.value}`
              }).join("/"))

            } else if (key == "feeding") {//处理加料
              foodFeeding = propVales.map(i => {
                if (i.value.indexOf("/")!=-1) {
                  console.error(`${i.propName}组--${i.value}--包含 / 非法字符`);
                  return;
                } 
                return i.price !=0 ? `${i.value}:${i.price}` : `${i.value}`
              })
            }
            break;
          }
        }
      })
      
      foodPracticeType = foodPracticeType.join(",");
      foodPractice = foodPractice.join(",");
      foodFeeding = foodFeeding.join("/");
      
      let foodExcelData = [
        foodName,
        foodCategoryName,
        foodUnit,
        foodSpecificationType,
        foodSpecification,
        foodPrice || 0,
        foodPracticeType,
        foodPractice,
        foodFeeding,
        ]
      
      foodItem.props.length == 0 ? excelData.unshift(foodExcelData) :  excelData.push(foodExcelData)
    })
  })

  excelData.unshift(Object.values(propSortData))
    
  let buffer = xlsx.build([
    {
        name:'sheet1',
        data:[title].concat(excelData)
    }
  ]);
  fs.writeFileSync(path.join(shopDir, `${shopName}-飞鹅模式菜品导入(包含规格,属性,加料,备注信息).xlsx`), buffer, { 'flag': 'w' });
  fs.writeFileSync(path.join(shopDir, "所有菜品属性名称.txt"),"所有菜品属性名称:"+Object.keys(allPropObj).join(","))
}



// 飞蛾模式生成word 
async function genWord(merchantInfo, outputDir) {
  
  let imgIndex = 0;
  let { categories, shopName } = merchantInfo;
  let shopDir = path.join(outputDir, formatFileName(shopName));
  let foodsImgsDir = path.join(shopDir, "imgs");
  mkdirSync(foodsImgsDir)
  let noImgUrls = {}
  for (let i = 0; i < categories.length; i++) {
    let categoryItem = categories[i];
    var pObj = docx.createP({ align: 'left' });
    pObj.addText(`分类：${categoryItem.name}`, { bold: true, font_face: 'Arial', font_size: 18 })

    let foods = categoryItem.foods;
    for (let j = 0; j < foods.length; j++) {
      let foodItem = foods[j];
      // 菜品图片与imgIndex对应生成图片
      let imgName = imgIndex++;
      let url = foodItem.picUrl
      if (url) {
        // let ext = url.slice(0,url.lastIndexOf(".jpeg"));
        let ext=".jpeg"

        try {
          await request( encodeURI(url)).pipe(fs.createWriteStream(path.join(shopDir, "imgs", String(imgName) + ext)))
        } catch (err) {
          noImgUrls[imgName] = foodItem.name
          console.log("保存图片错误", err)
        }
      } else { 
        noImgUrls[imgName] = foodItem.name
      }
      var pObj = docx.createP({ align: 'left' });
      pObj.addText(`菜品：${foodItem.name}，${imgName}，${foodItem.price}`, { bold: false, font_face: 'Arial', font_size: 18 });

      // 处理属性
      let props = foodItem.props;
      for (let k = 0; k < props.length; k++) {
        let propItem = props[k];
        propItem.values.forEach(tempVal => { 
          var pObj = docx.createP({ align: 'left' });
          pObj.addText(`属性：${tempVal.value}，${tempVal.price}，${tempVal.propName}`, { bold: false, font_face: 'Arial', font_size: 18 });
        })
      }
      var pObj_b = docx.createP({ align: 'left' });
      pObj_b.addText("")
      var pObj_c = docx.createP({ align: 'left' });
      pObj_c.addText("")
    }
  }


  // 处理没有爬取到的图片
  dishesImgMatch(noImgUrls,shopDir);
  genBeizhuText({noImgUrls, shopDir,mode:"feie"})
  

  var out = fs.createWriteStream(path.join(shopDir,"菜品.doc"));
  docx.generate(out)
}





// 生成word时按照menuSetting进行排序

let menuSettingDefault = { //到处的菜品属性归为规格,备注,加料,做法
  specifications:[],//规格
  practice:[],//做法
  feeding:[],//加料
  remarks: [],//备注
  propsGroupSort: [
    
  ],
  propsSort: {
   
  }
}


let propsGroupArr = [];//存放所有的属性组
async function handleFoodProps(foodItem, menuSetting = menuSettingDefault) {
  let { propsGroupSort,propsSort} = menuSetting //提取属性组合属性的顺序
  let props = foodItem.props;
  for (let k = 0; k < props.length; k++) {
    let propName = props[k].name,propVals = props[k].values
    if (propsGroupArr.indexOf(propName)==-1) { 
      propsGroupArr.push(propName);
    }

  
    
    if (propsSort&&propsSort[propName]) { //具体某个属性组具体的排序
      let propNameSort = propsSort[propName]
      let tempPropsSort = new Array(propNameSort.length)
      let propValues = propVals;
      for (let i = 0; i < propValues.length;i++) { 
        let propIndex = propNameSort.indexOf(propValues[i].value);//属性不在排序数组里
        if (propIndex == -1) {
          console.error(`${propName}属性排序错误`)
        } else { 
          tempPropsSort[propIndex] = propValues[i];
        }
      }
      tempPropsSort = tempPropsSort.filter(item => !!item);
      props[k].values = tempPropsSort //属性值调整顺序之后替换为新的
    }
  }

  //处理属性组的顺序  
  let tempPropsGroup = new Array(propsGroupSort.length)
  for (let i = 0; i < props.length;i++) { 
    let groupIndex = propsGroupSort.indexOf(props[i].name);
    if (groupIndex == -1) {
      console.error(`${props[i].name}不在所有的属性组中---${foodItem.name}`)
    } else { 
      tempPropsGroup[groupIndex] = props[i];
    }
  }
  tempPropsGroup = tempPropsGroup.filter(item => { 
    return !!item
  })
  foodItem.props = tempPropsGroup;
}


async function genSpecificationsWord(merchantInfo, outputDir,menuSetting=menuSettingDefault) {
  
  let imgIndex = 0;
  let { categories, shopName } = merchantInfo;
  let shopDir = path.join(outputDir, formatFileName(shopName));
  let foodsImgsDir = path.join(shopDir, "imgs");
  let { specifications ,bigImage} = menuSetting
  mkdirSync(foodsImgsDir)
  let noImgUrls = {}
  for (let i = 0; i < categories.length; i++) {
    let categoryItem = categories[i];
    var pObj = docx.createP({ align: 'left' });
    pObj.addText(`分类：${categoryItem.name}`, { bold: true, font_face: 'Arial', font_size: 18 })

    let foods = categoryItem.foods;
    
    //处理菜品的规格,添加多份菜品
    // if (specifications && specifications.length > 0) { 
      for (let k = 0; k < foods.length; k++) { 
        foods[k]._imgIndex = imgIndex++;
        let foodTemp =JSON.parse(JSON.stringify(foods[k]));
        let addFoodNum = 0; 
        
        // 处理菜品属性的顺序
        handleFoodProps(foods[k],menuSetting)

        let props = foods[k].props;
        for (let m = 0; m < props.length; m++) { 
          if (specifications.indexOf(props[m].name) != -1) {//属性中包含规格属性 
            props[m].values.forEach((val) => {
              let addFoodItem = JSON.parse(JSON.stringify(foodTemp))
              let valTemp = JSON.parse(JSON.stringify(val));
              valTemp.type = "SPECIFICATION"
              valTemp.price = 0
              addFoodItem.props[m].values = [valTemp];

              addFoodItem.price = parseFloat(addFoodItem.price) + parseFloat(val.price)
              foods.splice((k + (addFoodNum++)), 0, addFoodItem);
            })
          } else {
            
          }
        }
        if (addFoodNum>0) { 
          foods.splice(k + addFoodNum, 1);
          k = k + addFoodNum - 1;
        }
      }

    
    for (let j = 0; j < foods.length; j++) {
      let foodItem = foods[j];
      // 菜品图片与imgIndex对应生成图片
      let imgName = foodItem._imgIndex;
      let url = foodItem.picUrl
      if (url) {
        // let ext = url.slice(url.lastIndexOf("."));
        let ext=".jpeg"
        if (bigImage) {//阿里云模式下下载大图
          url = url.slice(0, -3) + "2048";
        } 
        try {
          request(url).pipe(fs.createWriteStream(path.join(shopDir, "imgs", String(imgName) + ext)))
        } catch (err) {
          noImgUrls[imgName] = foodItem.name
          console.log("保存图片错误", url)
        }
      } else { 
        noImgUrls[imgName] = foodItem.name
      }

      var pObj = docx.createP({ align: 'left' });
      pObj.addText(`菜品：${foodItem.name}，${url?imgName:-1}，${foodItem.price}`, { bold: false, font_face: 'Arial', font_size: 18 });

      // 处理属性
      let props = foodItem.props;
      for (let k = 0; k < props.length; k++) {
        let propItem = props[k];
        propItem.values.forEach(tempVal => { 
          var pObj = docx.createP({ align: 'left' });
          pObj.addText(`${tempVal.type=="supplyCondiment" ? "配料" : "属性"}：${tempVal.value}，${tempVal.price}，${tempVal.propName}，${tempVal.type=="SPECIFICATION" ? "SPECIFICATION" : "TASTE"}`, { bold: false, font_face: 'Arial', font_size: 18 });
        })
      }
      var pObj_b = docx.createP({ align: 'left' });
      pObj_b.addText("")
      var pObj_c = docx.createP({ align: 'left' });
      pObj_c.addText("")
    }
  }
  // 处理没有爬取到的图片
  // dishesImgMatch(noImgUrls,shopDir);
  genBeizhuText({noImgUrls, shopDir,mode:"feie"})
  var out = fs.createWriteStream(path.join(shopDir,"菜品(已处理规格菜).doc"));
  docx.generate(out)
}




async function genBeizhuText({ noImgUrls, shopDir, mode }) {

  if (mode = "feie") {
    fs.writeFileSync(path.join(shopDir, "备注.txt"), "没有成功爬取的菜品编号" + Object.keys(noImgUrls).join(","));
    fs.appendFileSync(path.join(shopDir, "备注.txt"), "没有成功爬取的菜品图片名称:" + Object.values(noImgUrls).join(","), {});
  } else { 
    fs.writeFileSync(path.join(shopDir, "备注.txt"), "没有成功爬取的菜品图片名称:" + Object.values(noImgUrls).join(","))
  }

} 

async function dishesImgMatch(noImgUrls,shopDir) { 
  // 根据菜品名称生成匹配的图片文件
  let matchDir = path.join(shopDir, "匹配的图片") 
  let matchImgsDir = path.join(shopDir, "备选图片库") 
  mkdirSync(matchDir);
  mkdirSync(matchImgsDir)

  for (let key in noImgUrls) {
    if ( noImgUrls[key]) { 
     await dishMatch(noImgUrls[key], matchDir, matchImgsDir);
    }
  }
}


// 根据菜品名称匹配图片
async function dishMatch(dishName, matchDir, matchImgsDir) {
  let res = await request(encodeURI(DishMatchUrl + dishName), (err, res, body) => {
    if (err) {
      console.log(`${dishName}菜品图片匹配出错`)
    }
    let imgList = body.data || [];

    // 取前5张图片作为备选图片
    for (let i = 0; i < imgList.length && i < 5; i++) {
      let dishItem = imgList[i].dish;
      if (i == 0) {
        request(dishItem.image_url).pipe(fs.createWriteStream(path.join(matchDir, `${dishName}_${i}` + ext)));
      }
      request(dishItem.image_url).pipe(fs.createWriteStream(path.join(matchImgsDir, `${dishName}_${i}` + ext)));
    }

  })

}


function addPropsGroupArr(propsGroupArr,name) {
  if (propsGroupArr.indexOf(name) == -1) {
    propsGroupArr.push(name)
  } 
}


module.exports = {
  getFiles,
  getFileJson,
  requestUrl,
  delDirSync,
  mkdirSync,
  formatFileName,
  genExcel,
  genExcelAll,
  genFeieExcelAll,
  genImgs,
  genWord,
  genSpecificationsWord,
  dishMatch,
  requestPostUrl,
  addPropsGroupArr
  // genZip,
}
