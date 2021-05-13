<!--
 * @Author: your name
 * @Date: 2021-03-18 17:01:06
 * @LastEditTime: 2021-05-13 13:40:33
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: /crawling/美团扫码点餐(rms.meituan)/merchantInfos/README.md
-->
获取到shopId 进行替换,直接浏览器访问
https://rms.meituan.com/diancan/web/menu?shopId=600235408    //商户的网页版本


https://rms.meituan.com/diancan/api/menuHead?mtShopId=600235408  //全部数据

数据在js文件中查找之后复制到tempData 去除外层包裹之后运行脚本即可