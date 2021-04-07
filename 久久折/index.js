const fs = require("fs");
const { resolve } = require("path");
const path = require("path");
const request = require('request')
const defaultImgUrl = "https://shouqianba-customer.oss-cn-hangzhou.aliyuncs.com/jjz/processedPhoto5/ca06311f-796e-4889-8db4-dfb2f1a43ad1"


let merchantInfo = require("./catrgory.json")
let categories = merchantInfo.categories
let categoryObj = {}
let shopName = merchantInfo.name


async function handleCategories() {
  categories.forEach(item => { 
    categoryObj[item.id] = item.name
  })

}

//读取dataJson下的所有文件取出 food菜品
async function genMenuFoods() { 
  let allFoods = [];
  for (let i = 0; i < 11; i++) { 
    let filePath = path.join(__dirname, "dataJson", "find" + i);
    let records = JSON.parse(fs.readFileSync(filePath, "utf-8")).data.records;
    // console.log(records)
    records.forEach(record => {
      let foodTemp = {
        name: record.item.name,
        imgUrl: record.item.photo_url || defaultImgUrl,
        categoryName:categoryObj[record.item.category_id]
      }
      allFoods.push(foodTemp)
    })
  }
  return allFoods;

}

async function exists(pathStr) { 
  // return fs.existsSync(pathStr)
  // return new Promise((resolve, reject) => { 
  //   fs.exists(pathStr, function(exists) {
  //     console.log(exists ? resolve(true): resolve(false));
  //   })
  // })
}

async function mkdir(pathStr){ 
  // let stat = fs.statSync(pathStr);
  let res = await exists(pathStr)
  if (!res) { 
    fs.mkdirSync(pathStr)
  }
}

let tempObj = {}


async function genImgs(){ 
  await handleCategories();
  await mkdir(path.join(__dirname, shopName));
  
  let allFoods = await genMenuFoods();
  // console.log(allFoods)
  fs.writeFileSync("./test.json",JSON.stringify(allFoods))

  allFoods.forEach(async (food)=> {
    let imgName = food.name + ".jpg";
    let imgDir = food.categoryName;
    let menuDir = path.join(__dirname, shopName, imgDir)
    if (!tempObj[imgDir]) { 
      fs.mkdirSync(menuDir);
      tempObj[imgDir]=true
    }
    request(food.imgUrl).pipe(fs.createWriteStream(path.join(__dirname, shopName, imgDir,imgName)))
  })

  // for (let i = 0; i < 1; i++) { 
  //   let food = allFoods[i]
  //   let imgName = food.name + ".JPG";
  //   let imgDir = food.categoryName;
  //   let menuDir = path.join(__dirname, shopName, imgDir)
  //   if (!tempObj[imgDir]) { 
  //     fs.mkdirSync(menuDir);
  //     tempObj[imgDir]=true
  //   }
  //   // await mkdir(path.join(__dirname, shopName, imgDir));
  //   request(food.imgUrl).pipe(fs.createWriteStream(path.join(__dirname, shopName, imgDir,imgName)))
  // }
}





genImgs();
