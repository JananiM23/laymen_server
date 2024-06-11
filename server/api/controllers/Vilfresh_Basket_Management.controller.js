var VilfreshBasket_Management = require('../../mobile_api/models/Vilfresh_Basket_Management.model');
var User_Management = require('../models/user_management.model');
var Product_Management = require('../models/product_management.model');
var Purchase_Management = require('../../mobile_api/models/purchaseOrder.model');
var VilfreshCredit_Management = require('../../api/models/VilfreshCredit_management.model');
var VilfreshMoney_Management = require('../../mobile_api/models/VilfreshMoney_management.model');
var Order_Management = require('../../mobile_api/models/order_management.model');
var Customer_Management = require('../../mobile_api/models/customer_management.model');
var NotificationModel = require('../../mobile_api/models/notification_management.model');

var axios = require('axios');
var FCM_App = require('../../../Config/fcm_config').CustomerNotify;

var options = {
   priority: 'high',
   timeToLive: 60 * 60 * 24
};
var mongoose = require('mongoose');
var moment = require('moment');


// Basket Product Configuration Create
exports.Vilfresh_Product_Config = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "User can not be empty" });
   } else if (!ReceivingData.DatesArray || typeof ReceivingData.DatesArray !== 'object' || ReceivingData.DatesArray.length === 0) {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Data Detected!" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);

      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred for Find the User Details!', Error: err });
         } else {
            if (result !== null) {
               VilfreshBasket_Management.BasketProductConfigSchema.findOne({}, {}, { 'sort': { Config_Date: -1 } }, function (err_1, resultNew) {
                  if (err_1) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find the Product Config!.", Error: err_1 });
                  } else {
                     // var MaxDate = resultNew.Config_Date;
                     var DatesArr = ReceivingData.DatesArray;
                     var SchemaArray = [];
                     DatesArr.map(obj => {
                        const ProductsArr = obj.ProductsArray.map(obj_1 => {
                           const NewPro = {
                              Product: mongoose.Types.ObjectId(obj_1.Product),
                              Price_From: parseFloat(obj_1.Price_From),
                              Price_To: parseFloat(obj_1.Price_To),
                              Confirmed_Quantity: 0,
                              Fixed_Price: 0
                           };
                           return NewPro;
                        });
                        var Config_Date = new Date(new Date(obj.Date).setHours(0, 0, 0, 0));
                        const Create_Config = new VilfreshBasket_Management.BasketProductConfigSchema({
                           Config_Date: Config_Date,
                           Products: ProductsArr,
                           Confirmed_Date: null,
                           PO_Requested: false,
                           Added_By_User: ReceivingData.User,
                           Confirmed_By_User: null,
                           Region: result.Region || null,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        SchemaArray.push(Create_Config);
                     });
                     Promise.all([
                        SchemaArray.map(obj => obj.save())
                     ]).then(response => {
                        res.status(200).send({ Status: true, Response: response });
                     }).catch(error => {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Configuring the Products!.", Error: error });
                     });
                  }
               });
            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid User Details!" });
            }
         }
      });
   }
};

// Product Config List for web 
exports.Config_Product_List = function (req, res) {
   var ReceivingData = req.body;
   ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
   User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }).exec((error, response) => {
      if (error) {
         res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The User Details!." });
      } else {
         if (response !== null) {
            var Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
            var Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;
            var ShortOrder = { Config_Date: -1 };
            var ShortKey = ReceivingData.ShortKey;
            var ShortCondition = ReceivingData.ShortCondition;
            var FindQuery = { 'If_Deleted': false, Region: response.Region };
            if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
               ShortOrder = {};
               ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
            }
            if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
               ReceivingData.FilterQuery.map(obj => {
                  if (obj.Type === 'String') {
                     FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                  }
                  if (obj.Type === 'Number') {
                     FindQuery[obj.DBName] = parseInt(obj.Value, 10);
                  }
                  if (obj.Type === 'Boolean') {
                     FindQuery[obj.DBName] = obj.Value;
                  }
                  if (obj.Type === 'Date') {
                     if (FindQuery[obj.DBName] === undefined) {
                        FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                     } else {
                        var DBName = obj.DBName;
                        var AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                        FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                     }
                  }
               });
            }
            Promise.all([
               VilfreshBasket_Management.BasketProductConfigSchema
                  .aggregate([
                     { $match: FindQuery },
                     {
                        $lookup: {
                           from: "User_Managements",
                           let: { "user": "$Added_By_User" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$user", "$_id"] } } },
                              { $project: { "Name": 1 } }
                           ],
                           as: 'user'
                        }
                     },
                     { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
                     {
                        $lookup: {
                           from: "User_Managements",
                           let: { "user": "$Confirmed_By_User" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$user", "$_id"] } } },
                              { $project: { "Name": 1 } }
                           ],
                           as: 'userNew'
                        }
                     },
                     { $unwind: { path: "$userNew", preserveNullAndEmptyArrays: true } },
                     { $unwind: { path: "$Products", preserveNullAndEmptyArrays: true } },
                     {
                        $lookup: {
                           from: "Products_Management",
                           let: { "product": "$Products.Product" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$product", "$_id"] } } },
                              { $project: { "Product_Name": 1, } }
                           ],
                           as: 'Products.Product'
                        }
                     },
                     { $unwind: { path: "$Products.Product", preserveNullAndEmptyArrays: true } },
                     {
                        $group: {
                           _id: "$_id",
                           Config_Date: { "$first": '$Config_Date' },
                           Products: {
                              $push: {
                                 _id: '$Products._id',
                                 Product: '$Products.Product',
                                 Price_From: '$Products.Price_From',
                                 Price_To: '$Products.Price_To',
                                 Confirmed_Quantity: '$Products.Confirmed_Quantity',
                                 Fixed_Price: '$Products.Fixed_Price',
                              }
                           },
                           Confirmed_Date: { "$first": '$Confirmed_Date' },
                           PO_Requested: { "$first": '$PO_Requested' },
                           Added_By_User: { "$first": '$user' },
                           Confirmed_By_User: { "$first": '$userNew' },
                           createdAt: { "$first": '$createdAt' },
                           updatedAt: { "$first": '$updatedAt' }
                        }
                     },
                     { $addFields: { "ProductsLength": { $size: "$Products" } } },
                     { $project: { Config_Date: 1, Products: 1, Confirmed_Date: 1, PO_Requested: 1, Added_By_User: 1, ProductsLength: 1, Confirmed_By_User: 1, createdAt: 1, updatedAt: 1 } },
                     { $sort: ShortOrder },
                     { $skip: Skip_Count },
                     { $limit: Limit_Count }
                  ]).exec(),
               VilfreshBasket_Management.BasketProductConfigSchema.countDocuments(FindQuery).exec()
            ]).then(result => {
               var CurrentDate = new Date();
               CurrentDate.setDate(CurrentDate.getDate() + 2);
               CurrentDate.setHours(0, 0, 0, 0);
               result[0].map(Obj => {
                  if (Obj.Config_Date.valueOf() === CurrentDate.valueOf() || Obj.Config_Date > CurrentDate) {
                     Obj.Config_Enable = true;
                  } else {
                     Obj.Config_Enable = false;
                  }
                  return Obj;
               });
               res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
            }).catch(err => {
               res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Product list!." });
            });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid User Details" });
         }
      }
   });

};

// Product Config List
exports.ExtraProductList = function (req, res) {
   var ReceivingData = req.body;
   ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.Config_Date || ReceivingData.Config_Date === '') {
      res.status(400).send({ Status: false, Message: "Config Date can not be empty" });
   } else {
      var currentDate = new Date(ReceivingData.Config_Date);
      var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
      var endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));
      Promise.all([
         User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, { Region: 1, CompanyId: 1 }, {}).exec(),
         VilfreshBasket_Management.BasketProductConfigSchema.findOne({ Added_By_User: ReceivingData.User, $and: [{ Config_Date: { $gte: startOfDay } }, { Config_Date: { $lte: endOfDay } }] }, {}, {}).exec(),
      ]).then(Response => {
         var UserDetails = Response[0];
         var BasketDetails = Response[1];
         if (UserDetails !== null && BasketDetails !== null) {
            var ExistingIds = [];
            BasketDetails.Products.map(Obj => {
               ExistingIds.push(mongoose.Types.ObjectId(Obj.Product));
            });
            ExistingIds = ExistingIds.filter((obj, index) => ExistingIds.indexOf(obj) === index);
            Product_Management.ProductManagementSchema
               .find({ _id: { $nin: ExistingIds }, CompanyId: UserDetails.CompanyId, Active_Status: true, Category: 'Vilfresh_Basket', If_Deleted: false }, { Product_Name: 1 }, { sort: { createdAt: -1 } })
               .exec((err, result) => {
                  if (err) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find the Product list !.", Error: err });
                  } else {
                     if (result.length === 0) {
                        res.status(200).send({ Http_Code: 200, Status: false, Message: 'Product Details Empty', Response: result });
                     } else {
                        res.status(200).send({ Http_Code: 200, Status: true, Response: result });
                     }
                  } 
               });
         } else {
            res.status(400).send({ Status: false, Message: "Invalid User Details!." });
         }
      }).catch(Error => {
         res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: Error });
      });
   }
};

// Product Config Add
exports.ExtraProductAdd = function (req, res) {
   var ReceivingData = req.body;
   ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.ConfigDate || ReceivingData.ConfigDate === '') {
      res.status(400).send({ Status: false, Message: "Config Date can not be empty" });
   } else if (!ReceivingData.Product || ReceivingData.Product === '') {
      res.status(400).send({ Status: false, Message: "Product can not be empty" });
   } else if (!ReceivingData.Price_From || ReceivingData.Price_From === '') {
      res.status(400).send({ Status: false, Message: "Price From can not be empty" });
   } else if (!ReceivingData.Price_To || ReceivingData.Price_To === '') {
      res.status(400).send({ Status: false, Message: "Price To can not be empty" });
   } else {
      var currentDate = new Date(ReceivingData.ConfigDate);
      var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
      var endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));

      User_Management.UserManagementSchema
         .findOne({ _id: ReceivingData.User }, { Region: 1, CompanyId: 1 })
         .exec((err, result) => {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find the Product list !.", Error: err });
            } else {
               if (result !== null) {
                  Promise.all([
                     VilfreshBasket_Management.BasketProductConfigSchema.findOne({ Region: result.Region, $and: [{ Config_Date: { $gte: startOfDay } }, { Config_Date: { $lte: endOfDay } }] }, {}, {}).exec(),
                  ]).then(Response => {
                     var BasketDetails = Response[0];
                     if (BasketDetails !== null) {
                        var StoreProducts = BasketDetails.Products;
                        if (StoreProducts.length !== 0) {
                           StoreProducts.push({
                              Product: mongoose.Types.ObjectId(ReceivingData.Product),
                              Price_From: parseFloat(ReceivingData.Price_From),
                              Price_To: parseFloat(ReceivingData.Price_To),
                              Confirmed_Quantity: 0,
                              Fixed_Price: 0
                           });
                        }
                        BasketDetails.Products = [];
                        BasketDetails.Products = StoreProducts;
                        BasketDetails.save((err_1, result_1) => {
                           if (err_1) {
                              res.status(417).send({ Status: false, Message: "Some Error Occurred!." });
                           } else {
                              VilfreshBasket_Management.BasketProductConfigSchema.findOne({_id: result_1._id }, {}, {}).populate({path: 'Products.Product', select: 'Product_Name'}).exec((err_2, result_2) => {
                                 if (err_2) {
                                    res.status(417).send({ Status: false, Message: "Some Error Occurred!." });
                                 } else {
                                    const Data = {
                                       _id: result_2._id,
                                       Config_Date: result_2.Config_Date,
                                       Products: result_2.Products,
                                       Confirmed_Date: result_2.Confirmed_Date,
                                       PO_Requested: result_2.PO_Requested,
                                       Added_By_User: result_2.Added_By_User,
                                       Confirmed_By_User: result_2.Confirmed_By_User,
                                       Region: result_2.Region,
                                       Active_Status: result_2.Active_Status,
                                       If_Deleted: result_2.If_Deleted,
                                       createdAt: result_2.createdAt,
                                       updatedAt: result_2.updatedAt,
                                       Config_Enable: true
                                    };
      
                                    res.status(200).send({ Status: true, Message: "Extra Product Configuration SuccessFully!.", Response: Data });
                                  }
                              });                              
                           }
                        });
                     } else {
                        res.status(400).send({ Status: false, Message: "Invalid User Details!." });
                     }
                  }).catch(Error => {
                     res.status(417).send({ Status: false, Message: "Some error occurred!.", Error: Error });
                  });
               } else {
                  res.status(400).send({ Status: false, Message: "Invalid User Details!." });
               }
            }
         });
   }
};

// Customer Basket Requests On Date
exports.CustomerBasket_Requests_OnDate = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.Date || ReceivingData.Date === '') {
      res.status(400).send({ Status: false, Message: "Date can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, { Region: 1 }, {}).exec((err_1, result_1) => {
         if (err_1) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the User!.", Error: err_1 });
         } else {
            if (result_1 !== null) {
               var Region = result_1.Region;
               var OnDate = new Date(ReceivingData.Date);
               OnDate = new Date(OnDate.setHours(0, 0, 0, 0));
               Promise.all([
                  VilfreshBasket_Management.BasketProductConfigSchema
                     .findOne({ Config_Date: OnDate, Region: Region }, {}, {})
                     .populate({ path: 'Products.Product', select: ['Product_Name', 'Unit', 'BasicUnitQuantity'] })
                     .exec(),
                  VilfreshBasket_Management.BasketCustomerRequestsSchema
                     .find({ Region: Region, Config_Date: OnDate, Purchase_Generated: false, Delivered: false }, {}, {})
                     .populate({ path: 'Customer', select: 'Customer_Name' })
                     .exec(),
               ]).then(response => {
                  var ProductConfig = JSON.parse(JSON.stringify(response[0]));
                  var Request = JSON.parse(JSON.stringify(response[1]));
                  var ReturnResponse = [];
                  if (ProductConfig !== null) {
                     ProductConfig.Products.map(obj => {
                        var CustomerArr = [];
                        var TotalQuantity = 0;
                        var TotalCustomers = 0;
                        Request.map(obj_1 => {
                           var ProMatch = obj_1.Products.filter(obj_2 => obj_2.Product === obj.Product._id);
                           if (ProMatch.length > 0) {
                              const ProObj = ProMatch[0];
                              TotalQuantity = TotalQuantity + ProObj.Quantity;
                              TotalCustomers = TotalCustomers + 1;
                              const NewObj = {
                                 Customer: obj_1.Customer,
                                 Quantity: ProObj.Quantity,
                                 updatedAt: obj_1.updatedAt
                              };
                              CustomerArr.push(NewObj);
                           }
                        });
                        const ReturnObj = {
                           Product: obj.Product,
                           Price_From: obj.Price_From,
                           Price_To: obj.Price_To,
                           TotalCustomers: TotalCustomers,
                           TotalQuantity: TotalQuantity,
                           Customers: CustomerArr
                        };
                        ReturnResponse.push(ReturnObj);
                     });
                     res.status(200).send({ Status: true, Response: ReturnResponse });
                  } else {
                     res.status(400).send({ Status: false, Message: "Invalid Config Details" });
                  }
               }).catch(error => {
                  res.status(417).send({ Status: false, Message: "Some error occurred while find the Customer Requests!.", Error: error });
               });
            } else {
               res.status(400).send({ Status: false, Message: "Invalid User Details" });
            }
         }
      });
   }
};

// Max Date On Config_Date
exports.Config_Dates = function (req, res) {
   var ReceivingData = req.body;
   ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, { Region: 1 }, {}).exec((err_1, result_1) => {
         if (err_1) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the the User!.", Error: err_1 });
         } else {
            Region = mongoose.Types.ObjectId(result_1.Region);
            VilfreshBasket_Management.BasketProductConfigSchema
               .find({ Active_Status: true, If_Deleted: false, Region: Region }, { Config_Date: 1 }, { sort: { Config_Date: -1 }, limit: 30 })
               .exec((err, result) => {
                  if (err) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find the Product list !.", Error: err });
                  } else {
                     res.status(200).send({ Http_Code: 200, Status: true, Response: result });
                  }
               });
         }
      });
   }
};

// Customer Order Wallet Balance Validation
exports.VBasketPOGenerate_Validate = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.Date || ReceivingData.Date === '') {
      res.status(400).send({ Status: false, Message: "Date can not be empty" });
   } else if (!ReceivingData.Products || typeof ReceivingData.Products !== 'object' || ReceivingData.Products.length === 0) {
      res.status(400).send({ Status: false, Message: "Products Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, { Region: 1 }, {}).exec((err_1, result_1) => {
         if (err_1) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the User!.", Error: err_1 });
         } else {
            if (result_1 !== null) {
               var Region = result_1.Region;
               var OnDate = new Date(ReceivingData.Date);
               OnDate = new Date(OnDate.setHours(0, 0, 0, 0));
               VilfreshBasket_Management.BasketCustomerRequestsSchema
                  .find({ Region: Region, Config_Date: OnDate, Purchase_Generated: false, Delivered: false }, {}, {})
                  .populate({ path: 'Customer', select: ['Customer_Name', 'VilfreshMoney_Limit', 'AvailableCredit_Limit'] })
                  .exec((err_2, result_2) => {
                     if (err_2) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Find the Customer Requests!.", Error: err_2 });
                     } else {
                        result_2 = JSON.parse(JSON.stringify(result_2));
                        var WalletCustomers = [];
                        var CreditCustomers = [];
                        var NoLimitCustomers = [];
                        result_2 = result_2.map(cusObj => {
                           cusObj.TotalUtilize = 0;
                           cusObj.Products = cusObj.Products.map(proObj => {
                              var PriceArrFilter = ReceivingData.Products.filter(obj1 => obj1.ProductId === proObj.Product);
                              if (PriceArrFilter.length > 0) {
                                 proObj.UnitPrice = PriceArrFilter[0].UnitPrice;
                                 proObj.TotalAmount = parseFloat(PriceArrFilter[0].UnitPrice) * parseFloat(proObj.Quantity);
                                 cusObj.TotalUtilize = cusObj.TotalUtilize + proObj.TotalAmount;
                              }
                              return proObj;
                           });
                           var CusWallet = cusObj.Customer.VilfreshMoney_Limit !== undefined ? parseFloat(cusObj.Customer.VilfreshMoney_Limit) : 0;
                           var CusCredit = cusObj.Customer.AvailableCredit_Limit !== undefined ? parseFloat(cusObj.Customer.AvailableCredit_Limit) : 0;
                           cusObj.Customer.TotalUtilize = cusObj.TotalUtilize;
                           if (cusObj.TotalUtilize <= CusWallet) {
                              WalletCustomers.push(cusObj.Customer);
                           } else if (cusObj.TotalUtilize <= (CusWallet + CusCredit)) {
                              CreditCustomers.push(cusObj.Customer);
                           } else {
                              NoLimitCustomers.push(cusObj.Customer);
                           }
                           return cusObj;
                        });
                        var ReturnData = {
                           WalletCustomers: WalletCustomers,
                           CreditCustomers: CreditCustomers,
                           NoLimitCustomers: NoLimitCustomers
                        };
                        res.status(200).send({ Status: true, Response: ReturnData });
                     }
                  });
            } else {
               res.status(400).send({ Status: false, Message: "Invalid User Details" });
            }
         }
      });
   }
};

// PO Generate
exports.VBasket_POGenerate = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.Date || ReceivingData.Date === '') {
      res.status(400).send({ Status: false, Message: "Date can not be empty" });
   } else if (!ReceivingData.Products || typeof ReceivingData.Products !== 'object' || ReceivingData.Products.length === 0) {
      res.status(400).send({ Status: false, Message: "Products Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, { Region: 1 }, {}).exec((err_1, result_1) => {
         if (err_1) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the User!.", Error: err_1 });
         } else {
            if (result_1 !== null) {
               var Region = result_1.Region;
               var OnDate = new Date(ReceivingData.Date);
               OnDate = new Date(OnDate.setHours(0, 0, 0, 0));
               var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
               Promise.all([
                  VilfreshBasket_Management.BasketCustomerRequestsSchema
                     .find({ Region: Region, Config_Date: OnDate, Purchase_Generated: false, Delivered: false }, {}, {})
                     .populate({ path: 'Customer', select: ['Customer_Name', 'ApprovedBy_User', 'VilfreshMoney_Limit', 'VilfreshCredit_Limit', 'AvailableCredit_Limit', 'Firebase_Token'] })
                     .populate({ path: 'Products.Product', select: ['BasicUnitQuantity', 'Price', 'Unit'] })
                     .exec(),
                  Order_Management.OrderSchema.findOne({ Active_Status: true, If_Deleted: false }, {}, { sort: { createdAt: -1 } }).exec()
               ]).then(response => {
                  result_2 = JSON.parse(JSON.stringify(response[0]));
                  var LastOrder = response[1];
                  var LastOrder_Unique = LastOrder !== null ? LastOrder.Order_Unique : 1;
                  var CustomerStatus = [];
                  var OrdersSchema = [];
                  var WalletsHistorySchema = [];
                  var CreditHistorySchema = [];
                  result_2 = result_2.map(cusObj => {
							const Pros = [];
							cusObj.Products.map(Obj1 => {
								if (Obj1.Quantity > 0) {
									Pros.push(Obj1);
								}
							});
							cusObj.Products = Pros;
							return cusObj;
						});

                  result_2 = result_2.map(cusObj => {
                     LastOrder_Unique = LastOrder_Unique + 1;
                     const OrderId = mongoose.Types.ObjectId();
                     const Item_Details = [];
                     cusObj.TotalUtilize = 0;
                     cusObj.Products = cusObj.Products.map(proObj => {
                        var PriceArrFilter = ReceivingData.Products.filter(obj1 => obj1.ProductId === proObj.Product._id);
                        if (PriceArrFilter.length > 0) {
                           proObj.UnitPrice = PriceArrFilter[0].UnitPrice;
                           proObj.TotalAmount = parseFloat(PriceArrFilter[0].UnitPrice) * parseFloat(proObj.Quantity);
                           cusObj.TotalUtilize = cusObj.TotalUtilize + proObj.TotalAmount;
                        }
                        Item_Details.push({
                           ProductId: mongoose.Types.ObjectId(proObj.Product._id),
                           FromCart: null,
                           Quantity: parseFloat(proObj.Quantity),
                           BasicUnitQuantity: parseFloat(proObj.Product.BasicUnitQuantity),
                           Unit_Price: parseFloat(proObj.UnitPrice),
                           Total_Amount: proObj.TotalAmount,
                        });
                        return proObj;
                     });
                     var CusWallet = cusObj.Customer.VilfreshMoney_Limit !== undefined ? parseFloat(cusObj.Customer.VilfreshMoney_Limit) : 0;
                     var CusCredit = cusObj.Customer.AvailableCredit_Limit !== undefined ? parseFloat(cusObj.Customer.AvailableCredit_Limit) : 0;

                     const ModeOfPayment = cusObj.TotalUtilize <= CusWallet ? 'Wallet' :
                        CusWallet > 0 && cusObj.TotalUtilize <= (CusWallet + CusCredit) ? 'Partial_WalletCredit' :
                           CusWallet <= 0 && cusObj.TotalUtilize <= (CusWallet + CusCredit) ? 'Credit' : '';

                     const CheckPartial = CusWallet > 0 && cusObj.TotalUtilize > CusWallet && cusObj.TotalUtilize <= (CusWallet + CusCredit) ? true : false;

                     const ReduceFrom_Wallet = cusObj.TotalUtilize <= CusWallet ? cusObj.TotalUtilize :
                        CusWallet > 0 && cusObj.TotalUtilize <= (CusWallet + CusCredit) ? CusWallet : 0;

                     const ReduceFrom_Credit = CusWallet <= 0 && cusObj.TotalUtilize <= CusCredit ? cusObj.TotalUtilize :
                        CusWallet > 0 && cusObj.TotalUtilize > CusWallet && cusObj.TotalUtilize <= (CusWallet + CusCredit) ? (cusObj.TotalUtilize - CusWallet) : 0;

                     if (ModeOfPayment !== '') {
                        var Order_Create = new Order_Management.OrderSchema({
                           _id: OrderId,
                           CustomerId: mongoose.Types.ObjectId(cusObj.Customer._id),
                           // FromCart: null,
                           FromBasket: mongoose.Types.ObjectId(cusObj._id),
                           Order_Reference: 'Ord-' + LastOrder_Unique.toString().padStart(9, '0'),
                           Order_Unique: LastOrder_Unique,
                           Order_Type: 'From_Basket',
                           Item_Details: Item_Details,
                           Item_Counts: Item_Details.length,
                           Payable_Amount: cusObj.TotalUtilize,
                           Payment_Status: 'Paid',
                           Payment_Type: ModeOfPayment,
                           If_Partial: CheckPartial,
                           ReduceFrom_Wallet: ReduceFrom_Wallet,
                           ReduceFrom_Online: 0,
                           ReduceFrom_Credit: ReduceFrom_Credit,
                           DeliveryDate: OnDate,
                           Region: Region,
                           OrderConfirmed: false,
                           OrderConfirmedBy: null,
                           DeliveredSession: '',
                           OrderDelivered: false,
                           DeliveryPerson: null,
                           DeliveryDateTime: null,
                           DeliveryNotes: '',
                           OrderUnDelivered: false,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        OrdersSchema.push(Order_Create);
                        var NewAvail_Limit = CusWallet;
                        var NewAvail_Credit = CusCredit;
                        if (ReduceFrom_Wallet > 0) {
                           NewAvail_Limit = CusWallet - ReduceFrom_Wallet;
                        }
                        if (ReduceFrom_Credit > 0) {
                           NewAvail_Credit = CusCredit - ReduceFrom_Credit;
                        }
                        CustomerStatus.push({
                           Status: 'Approved',
                           VilfreshMoney_Limit: NewAvail_Limit,
                           AvailableCredit_Limit: NewAvail_Credit,
                           Customer: cusObj.Customer._id,
                           Firebase_Token: cusObj.Customer.Firebase_Token
                        });
                     } else {
                        CustomerStatus.push({
                           Status: 'Rejected',
                           VilfreshMoney_Limit: CusWallet,
                           AvailableCredit_Limit: CusCredit,
                           Customer: cusObj.Customer._id,
                           Firebase_Token: cusObj.Customer.Firebase_Token
                        });
                     }
                     if (ReduceFrom_Wallet > 0) {
                        var Create_WallerReduce = new VilfreshMoney_Management.VilfreshMoneyHistorySchema({
                           Customer: mongoose.Types.ObjectId(cusObj.Customer._id),
                           Amount: ReduceFrom_Wallet,
                           Date: new Date(),
                           Previous_Limit: CusWallet,
                           Available_Limit: CusWallet - ReduceFrom_Wallet,
                           Added_or_Reduced: 'Reduced',
                           Added_Type: '',
                           Added_Reference_Id: null,
                           Added_By_User: null,
                           CashFrom_DeliveryPerson: null,
                           Added_Approved_Status: null,
                           DateOf_Approved: new Date(),
                           Added_Approved_By: null,
                           PurposeOf_Reduce: "By_BasketOrder",
                           Order_Id: OrderId,
                           Order_By: 'User',
                           Order_By_Person: ReceivingData.User,
                           Region: Region,
                           Active_Status: true,
                           If_Deleted: false,
                        });
                        WalletsHistorySchema.push(Create_WallerReduce);
                     }
                     if (ReduceFrom_Credit > 0) {
                        var Create_CreditReduce = new VilfreshCredit_Management.VilfreshCreditHistorySchema({
                           Customer: mongoose.Types.ObjectId(cusObj.Customer._id),
                           Date: new Date(),
                           Credit_Limit: cusObj.Customer.VilfreshCredit_Limit !== undefined ? parseFloat(cusObj.Customer.VilfreshCredit_Limit) : 0,
                           Previous_AvailableLimit: CusCredit,
                           Available_Limit: CusCredit - ReduceFrom_Credit,
                           Added_or_Reduced: 'Reduced',
                           Added_Type: '',
                           Added_By_User: null,
                           Added_Approved_Status: null,
                           DateOf_Approved: new Date(),
                           Added_Approved_By: null,
                           PurposeOf_Reduce: 'By_BasketOrder',
                           Order_Id: OrderId,
                           Order_By: 'User',
                           Order_By_Person: ReceivingData.User,
                           Region: Region,
                           Active_Status: true,
                           If_Deleted: false,
                        });
                        CreditHistorySchema.push(Create_CreditReduce);
                     }
                     return cusObj;
                  });
                  var Purchase_Details = [];
                  ReceivingData.Products.map(obj_1 => {
                     Purchase_Details.push({
                        ProductId: mongoose.Types.ObjectId(obj_1.ProductId),
                        Quantity: obj_1.TotalQuantity,
                        UnitPrice: obj_1.UnitPrice,
                        TotalAmount: parseFloat(obj_1.TotalQuantity) * parseFloat(obj_1.UnitPrice)
                     });
                  });
                  var Create_Purchase = new Purchase_Management.PurchaseSchema({
                     Region: Region,
                     Config_Date: OnDate,
                     Purchase_Details: Purchase_Details,
                     Active_Status: true,
                     If_Deleted: false
                  });
                  // Customer Request Update
                  Promise.all([
                     ReceivingData.Products.map(obj => {
                        VilfreshBasket_Management.BasketCustomerRequestsSchema
                           .updateMany(
                              { Region: Region, Config_Date: OnDate, Delivered: false, "Products.Product": mongoose.Types.ObjectId(obj.ProductId) },
                              { $set: { "Products.$.UnitPrice": parseFloat(obj.UnitPrice) } }
                           ).exec();
                     }),
                     ReceivingData.Products.map(obj => {
                        VilfreshBasket_Management.BasketProductConfigSchema
                           .updateMany(
                              { Config_Date: OnDate, "Products.Product": mongoose.Types.ObjectId(obj.ProductId) },
                              { $set: { "Products.$.Fixed_Price": parseFloat(obj.UnitPrice), Confirmed_Date: new Date(), PO_Requested: true, Confirmed_By_User: result_1._id } }
                           ).exec();
                     }),
                     CustomerStatus.map(obj => {
                        VilfreshBasket_Management.BasketCustomerRequestsSchema
                           .updateMany(
                              { Customer: mongoose.Types.ObjectId(obj.Customer), Region: Region, Config_Date: OnDate },
                              { $set: { PO_Status: obj.Status, Purchase_Generated: true } }
                           ).exec();
                     }),
                     CustomerStatus.map(obj => {
                        Customer_Management.CustomerManagementSchema
                           .updateMany(
                              { _id: mongoose.Types.ObjectId(obj.Customer), Region: Region },
                              { $set: { VilfreshMoney_Limit: obj.VilfreshMoney_Limit, AvailableCredit_Limit: obj.AvailableCredit_Limit } }
                           ).exec();
                     }),
                     OrdersSchema.map(obj => obj.save()),
                     CreditHistorySchema.map(obj => obj.save()),
                     WalletsHistorySchema.map(obj => obj.save()),
                     Create_Purchase.save()
                  ]).then(response_1 => {
                     CustomerStatus.map(obj2 => {
                        if (obj2.Status === "Approved") {
                           var payload = {
                              notification: {
                                 title: 'Vilfresh-Team',
                                 body: "Your Vilfresh Basket Request is Confirmed the order will be delivered on " + moment(OnDate).format('DD/MM/YYYY') + " , Check your basket and get more info.",
                                 sound: 'notify_tone.mp3'
                              },
                              data: {
                                 Customer: JSON.parse(JSON.stringify(obj2.Customer)),
                                 notification_type: 'GeneratePurchase',
                                 click_action: 'FCM_PLUGIN_ACTIVITY',
                              }
                           };
                           const Notification = new NotificationModel.NotificationSchema({
                              User: ReceivingData.User,
                              CustomerID: obj2.Customer,
                              DeliveryBoyID: null,
                              Notification_Type: 'GeneratePurchase',
                              Message: "Your Vilfresh Basket Request is Confirmed the order will be delivered on " + moment(OnDate).format('DD/MM/YYYY') + " , Check your basket and get more info.",
                              Message_Received: false,
                              Message_Viewed: false,
                              Active_Status: true,
                              If_Deleted: false
                           });
                           Notification.save();
									if (obj2.Firebase_Token !== '') {
										FCM_App.messaging().sendToDevice(obj2.Firebase_Token, payload, options).then((NotifyRes) => { });
									}
                        } else {
                           var payload = {
                              notification: {
                                 title: 'Vilfresh-Team',
                                 body: "Your Vilfresh Basket Request is Cancelled due to Low Balance, Your  Vilfresh  Basket requested date on " + moment(OnDate).format('DD/MM/YYYY'),
                                 sound: 'notify_tone.mp3'
                              },
                              data: {
                                 Customer: JSON.parse(JSON.stringify(obj2.Customer)),
                                 notification_type: 'PurchaseRequestCancelled',
                                 click_action: 'FCM_PLUGIN_ACTIVITY',
                              }
                           };
                           const Notification = new NotificationModel.NotificationSchema({
                              User: ReceivingData.User,
                              CustomerID: obj2.Customer,
                              DeliveryBoyID: null,
                              Notification_Type: 'PurchaseRequestCancelled',
                              Message: "Your Vilfresh Basket Request is Cancelled due to Low Balance, Your  Vilfresh  Basket requested date on " + moment(OnDate).format('DD/MM/YYYY'),
                              Message_Received: false,
                              Message_Viewed: false,
                              Active_Status: true,
                              If_Deleted: false
                           });
                           Notification.save();
									if (obj2.Firebase_Token !== '') {
										FCM_App.messaging().sendToDevice(obj2.Firebase_Token, payload, options).then((NotifyRes) => { });
									}
                        }
                     });
                     res.status(200).send({ Status: true, CreditHistorySchema: CreditHistorySchema, WalletsHistorySchema: WalletsHistorySchema, OrdersSchema: OrdersSchema, CustomerStatus: CustomerStatus, Create_Purchase: Create_Purchase });
                  }).catch(error_1 => {
                     res.status(417).send({ Status: false, Error: error_1 });
                  });
               }).catch(error => {
                  res.status(417).send({ Status: false, Message: "Some error occurred while Find the Customer Requests!.", Error: error });
               });
            } else {
               res.status(400).send({ Status: false, Message: "Invalid User Details" });
            }
         }
      });
   }
};

















exports.Vilfresh_ProductList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User }, { CompanyId: 1 }, {}).exec((err_1, result_1) => {
         if (err_1) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the the User!.", Error: err_1 });
         } else {
            Product_Management.ProductManagementSchema
               .find({ CompanyId: result_1.CompanyId, Active_Status: true, Category: 'Vilfresh_Basket', If_Deleted: false }, { Product_Name: 1 }, { sort: { createdAt: -1 } })
               .exec((err, result) => {
                  if (err) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find the Product list !.", Error: err });
                  } else {
                     res.status(200).send({ Http_Code: 200, Status: true, Response: result });
                  }
               });
         }
      });
   }
};


exports.Vilfresh_BasketList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "User can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      var curr = new Date(new Date().setDate(new Date().getDate() + 7));
      var curr_1 = new Date(new Date().setDate(new Date().getDate() + 7));
      var StartDate = new Date(curr.setDate(curr.getDate() - curr.getDay() + 1));
      var EndDate = new Date(curr_1.setDate(StartDate.getDate() + 5));
      StartDate = new Date(StartDate.setHours(0, 0, 0, 0));
      EndDate = new Date(EndDate.setHours(0, 0, 0, 0));

      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Error Occurred while find the User!" });
         } else {
            if (result !== null) {
               Promise.all([
                  Product_Management.ProductManagementSchema.find({ CompanyId: result_1.CompanyId, Category: 'Vilfresh_Basket', Active_Status: true, If_Deleted: false }).exec(),
                  VilfreshBasket_Management.VilfreshBasketSchema
                     .aggregate([
                        { $match: { FromDate: StartDate, ToDate: EndDate, Purchase_Generated: false, Region: result.Region } },
                        { $unwind: "$Products" },
                        {
                           $lookup: {
                              from: "Products_Management",
                              let: { id: "$Products.Product" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$id", "$_id"] } } },
                                 { $project: { "Product_Name": 1 } }
                              ],
                              as: 'Products.Product'
                           }
                        },
                        {
                           $lookup: {
                              from: "Customer_Managements",
                              let: { id: "$Customer" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$id", "$_id"] } } },
                                 { $project: { "Customer_Name": 1 } }
                              ],
                              as: 'Customer'
                           }
                        },
                        { $unwind: "$Customer" },
                     ]).exec()
               ]).then(response => {
                  var Products = JSON.parse(JSON.stringify(response[0]));
                  var CustomerVsProduct = JSON.parse(JSON.stringify(response[1]));
                  var ProductsArray = [];
                  CustomerVsProduct.map(obj => {
                     ProductsArray.push({
                        Customer: obj.Customer,
                        Product: obj.Products.Product[0],
                        Quantity: obj.Products.Quantity
                     });
                  });
                  var ReturnData = [];
                  Products.map(obj => {
                     var Group = ProductsArray.filter(obj_1 => obj_1.Product._id === obj._id);
                     var TotalQuantity = 0;
                     Group = Group.map(obj_1 => {
                        var ReturnObj = { Customer: obj_1.Customer, Quantity: obj_1.Quantity };
                        TotalQuantity = TotalQuantity + obj_1.Quantity;
                        return ReturnObj;
                     });
                     ReturnData.push({
                        ProductId: obj._id,
                        Product_Name: obj.Product_Name,
                        TotalQuantity: TotalQuantity,
                        TotalCustomers: Group.length,
                        CustomerGroup: Group
                     });
                  });
                  var Sub = { FromDate: StartDate, ToDate: EndDate };
                  ReturnData = ReturnData.filter(obj => obj.TotalQuantity > 0);
                  res.status(200).send({ Http_Code: 200, Status: true, Response: ReturnData, SubResponse: Sub });
               }).catch(error => {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Error Occurred while find the Vilfresh Basket!", Error: error });
               });
            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid User Details!" });
            }
         }
      });
   }
};

exports.Vilfresh_Basket_Create = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "User can not be empty" });
   } else if (!ReceivingData.Products || typeof ReceivingData.Products !== 'object' || ReceivingData.Products.length === 0) {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Products can not be empty" });
   } else {

      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      var curr = new Date(new Date().setDate(new Date().getDate() + 7));
      var curr_1 = new Date(new Date().setDate(new Date().getDate() + 7));
      var StartDate = new Date(curr.setDate(curr.getDate() - curr.getDay() + 1));
      var EndDate = new Date(curr_1.setDate(StartDate.getDate() + 5));
      StartDate = new Date(StartDate.setHours(0, 0, 0, 0));
      EndDate = new Date(EndDate.setHours(0, 0, 0, 0));

      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred for Find the User Details!', Error: err });
         } else {
            if (result !== null) {
               VilfreshBasket_Management.VilfreshBasketSchema.find({ Region: result.Region, FromDate: StartDate, ToDate: EndDate, Purchase_Generated: false }).exec((err_1, result_1) => {
                  if (err_1) {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred for Find the Basket Details!', Error: err_1 });
                  } else {
                     ReceivingData.Products = ReceivingData.Products.map(obj => {
                        var TotalAmount = parseFloat(obj.TotalQuantity) * parseFloat(obj.UnitPrice);
                        var ReturnObj = {
                           ProductId: mongoose.Types.ObjectId(obj.ProductId),
                           Quantity: obj.TotalQuantity,
                           UnitPrice: obj.UnitPrice,
                           TotalAmount: TotalAmount,
                           PurchaseDate: obj.PurchaseDate
                        };
                        return ReturnObj;
                     });
                     var Create_PurchaseRequest = new Purchase_Management.PurchaseSchema({
                        Region: result.Region,
                        FromDate: StartDate,
                        ToDate: EndDate,
                        Purchase_Details: ReceivingData.Products,
                        Active_Status: true,
                        If_Deleted: false,
                     });
                     Create_PurchaseRequest.save((err_2, result_2) => {
                        if (err_2) {
                           res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred for creating the Purchase request!', Error: err_2 });
                        } else {
                           result_1.map(obj => {
                              var Generated_Request = [];
                              obj.Products.map(obj_1 => {
                                 var Product = JSON.parse(JSON.stringify(obj_1.Product));
                                 var Details = JSON.parse(JSON.stringify(result_2.Purchase_Details));
                                 var Arr = Details.filter(obj_1 => obj_1.ProductId === Product);
                                 if (Arr.length > 0) {
                                    var RetObject = {
                                       Product: obj_1.Product,
                                       Quantity: obj_1.Quantity,
                                       Assigned_Date: Arr[0].PurchaseDate,
                                       UnitPrice: Arr[0].UnitPrice,
                                       TotalAmount: obj_1.Quantity * Arr[0].UnitPrice,
                                       Addon_type: obj_1.Addon_type
                                    };
                                    Generated_Request.push(RetObject);
                                 }
                              });
                              obj.Purchase_Generated = true;
                              obj.Generated_Request = Generated_Request;
                           });

                           // axios({
                           //    method: 'get', url: 'https://www.vilfresh.in/api/purchase_order/create', data: {
                           //      params: {
                           //       "company_id" : result.CompanyId,
                           //       "order_line": [{
                           //                   "product_id": "111",
                           //                   "company_id": result.CompanyId,
                           //                   "quantity": "2.0",
                           //                   "uom_id": "KG",
                           //                   "price_unit": "150"
                           //          }]
                           //      }
                           //    }
                           //  }).then(function (response) {
                           //    result_1.OdooId = response.data.result.customer_id;
                           //    result_1.save();
                           //  }).catch(function (error) {
                           //    console.log('Web Odoo Customer Convert Error');
                           // }); 
                           Promise.all([
                              result_1.map(obj => obj.save())
                           ]).then(response => {
                              res.status(200).send({ Http_Code: 200, Status: true, Message: 'Purchase Request Generated Successfully' });
                           }).catch(error => {
                              res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred for Updating the Vilfresh Basket!', Error: err_2 });
                           });
                        }
                     });
                  }
               });
            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid User Details!" });
            }
         }
      });
   }
};

exports.PurchaseOrder_History = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);

      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Error Occurred while find the User!" });
         } else {
            if (result !== null) {

               var Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               var Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;

               var ShortOrder = { updatedAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
               }

               var FindQuery = { Region: result.Region, Active_Status: true, If_Deleted: false };

               if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                  ReceivingData.FilterQuery.map(obj => {
                     if (obj.Type === 'Date') {
                        if (FindQuery[obj.DBName] === undefined) {
                           FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                        } else {
                           var DBName = obj.DBName;
                           var AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                        }
                     }
                  });
               }

               Promise.all([
                  Purchase_Management.PurchaseSchema
                     .aggregate([
                        { $match: FindQuery },
                        { $unwind: { path: "$Purchase_Details", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Products_Management",
                              let: { "product": "$Purchase_Details.ProductId" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$product", "$_id"] } } },
                                 { $project: { "Product_Name": 1, "BasicUnitQuantity": 1, "Unit": 1 } }
                              ],
                              as: 'Purchase_Details.ProductId'
                           }
                        },
                        { $unwind: { path: "$Purchase_Details.ProductId", preserveNullAndEmptyArrays: true } },
                        {
                           $group: {
                              _id: "$_id",
                              Config_Date: { "$first": '$Config_Date' },
                              Active_Status: { "$first": '$Active_Status' },
                              createdAt: { "$first": '$createdAt' },
                              TotalQuantityArray: { $push: '$Purchase_Details.Quantity' },
                              TotalAmountArray: { $push: '$Purchase_Details.TotalAmount' },
                              Purchase_Details: {
                                 $push: {
                                    _id: '$Purchase_Details._id',
                                    UnitPrice: '$Purchase_Details.UnitPrice',
                                    ProductId: '$Purchase_Details.ProductId',
                                    Quantity: '$Purchase_Details.Quantity',
                                    TotalAmount: '$Purchase_Details.TotalAmount',
                                    PurchaseDate: '$Purchase_Details.PurchaseDate',
                                 }
                              },
                           }
                        },
                        { $addFields: { "TotalItems": { $size: "$Purchase_Details" } } },
                        { $addFields: { "TotalQuantity": { $sum: "$TotalQuantityArray" } } },
                        { $addFields: { "TotalAmount": { $sum: "$TotalAmountArray" } } },
                        {
                           $project: {
                              Active_Status: 1, Purchase_Details: 1, createdAt: 1, Config_Date: 1, TotalItems: 1, TotalQuantity: 1, TotalAmount: 1, createdAt: 1
                           }
                        },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  Purchase_Management.PurchaseSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(err => {
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Purchase Orders list!." });
               });
            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid User Details!" });
            }
         }
      });
   }
};

exports.PurchaseDate_Validation = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Data.User || ReceivingData.Data.User === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "User can not be empty" });
   } else if (!ReceivingData.Data.PurchaseDate || ReceivingData.Data.PurchaseDate === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Date can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.Data.User);
      var curr = new Date(new Date().setDate(new Date().getDate() + 7));
      var curr_1 = new Date(new Date().setDate(new Date().getDate() + 7));
      var StartDate = new Date(curr.setDate(curr.getDate() - curr.getDay() + 1));
      var EndDate = new Date(curr_1.setDate(StartDate.getDate() + 5));
      StartDate = new Date(StartDate.setHours(0, 0, 0, 0));
      EndDate = new Date(EndDate.setHours(0, 0, 0, 0));

      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.Data.User, Active_Status: true, If_Deleted: false }, {}, {}).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Error Occurred while find the User!" });
         } else {
            ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
            var curr = new Date(new Date().setDate(new Date().getDate() + 7));
            var curr_1 = new Date(new Date().setDate(new Date().getDate() + 7));
            var StartDate = new Date(curr.setDate(curr.getDate() - curr.getDay() + 1));
            var EndDate = new Date(curr_1.setDate(StartDate.getDate() + 5));
            StartDate = new Date(StartDate.setHours(0, 0, 0, 0));
            EndDate = new Date(EndDate.setHours(0, 0, 0, 0));
            var PurchaseDate = ReceivingData.Data.PurchaseDate;
            var ProductId = ReceivingData.Data.ProductId;
            User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}).exec((err, result) => {
               if (err) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Error Occurred while find the User!" });
               } else {
                  if (result !== null) {
                     Promise.all([
                        Product_Management.ProductManagementSchema.find({ Category: 'Vilfresh_Basket', Active_Status: true, If_Deleted: false }).exec(),
                        VilfreshBasket_Management.VilfreshBasketSchema
                           .aggregate([
                              { $match: { FromDate: StartDate, ToDate: EndDate, Purchase_Generated: false, Region: result.Region } },
                              { $unwind: "$Products" },
                              {
                                 $lookup: {
                                    from: "Products_Management",
                                    let: { id: "$Products.Product" },
                                    pipeline: [
                                       { $match: { $expr: { $eq: ["$$id", "$_id"] } } },
                                       { $project: { "Product_Name": 1 } }
                                    ],
                                    as: 'Products.Product'
                                 }
                              },
                              {
                                 $lookup: {
                                    from: "Customer_Managements",
                                    let: { id: "$Customer" },
                                    pipeline: [
                                       { $match: { $expr: { $eq: ["$$id", "$_id"] } } },
                                       { $project: { "Customer_Name": 1 } }
                                    ],
                                    as: 'Customer'
                                 }
                              },
                              { $unwind: "$Customer" },
                           ]).exec()
                     ]).then(response => {
                        var Products = JSON.parse(JSON.stringify(response[0]));
                        var CustomerVsProduct = JSON.parse(JSON.stringify(response[1]));
                        var ProductsArray = [];
                        var SkipDates = [];

                        CustomerVsProduct.map(obj => {
                           ProductsArray.push({
                              Customer: obj.Customer,
                              Product: obj.Products.Product[0],
                              Quantity: obj.Products.Quantity
                           });
                           obj.SkipDates.map(Obj => {
                              SkipDates.push(Obj);
                              if (Obj.Date === PurchaseDate) {
                                 // Reduce Part
                                 var ReturnData = [];
                                 Products.map(obj => {
                                    var Group = ProductsArray.filter(obj_1 => ProductId === obj._id);
                                    var TotalQuantity = 0;
                                    Group = Group.map(obj_1 => {
                                       var ReturnObj = { Customer: obj_1.Customer, Quantity: obj_1.Quantity, ProductId: obj._id };
                                       TotalQuantity = TotalQuantity - obj_1.Quantity;
                                       return ReturnObj;
                                    });
                                    ReturnData.push({
                                       ProductId: obj._id,
                                       Product_Name: obj.Product_Name,
                                       TotalQuantity: TotalQuantity,
                                       TotalCustomers: Group.length,
                                       CustomerGroup: Group
                                    });
                                 });
                                 var Sub = { FromDate: StartDate, ToDate: EndDate };
                                 ReturnData = ReturnData.filter(obj => obj.TotalQuantity > 0);
                              } else {
                                 // Added Part
                                 var ReturnData = [];
                                 Products.map(obj => {
                                    var Group = ProductsArray.filter(obj_1 => ProductId === obj._id);
                                    var TotalQuantity = 0;
                                    Group = Group.map(obj_1 => {
                                       var ReturnObj = { Customer: obj_1.Customer, Quantity: obj_1.Quantity };
                                       TotalQuantity = TotalQuantity + obj_1.Quantity;
                                       return ReturnObj;
                                    });
                                    ReturnData.push({
                                       ProductId: obj._id,
                                       Product_Name: obj.Product_Name,
                                       TotalQuantity: TotalQuantity,
                                       TotalCustomers: Group.length,
                                       CustomerGroup: Group
                                    });
                                 });
                                 var Sub = { FromDate: StartDate, ToDate: EndDate };
                                 ReturnData = ReturnData.filter(obj => obj.TotalQuantity > 0);
                              }
                           });
                        });
                        var ReturnData = [];
                        Products.map(obj => {
                           var Group = ProductsArray.filter(obj_1 => obj_1.Product._id === obj._id);
                           var TotalQuantity = 0;
                           Group = Group.map(obj_1 => {
                              var ReturnObj = { Customer: obj_1.Customer, Quantity: obj_1.Quantity };
                              TotalQuantity = TotalQuantity + obj_1.Quantity;
                              return ReturnObj;
                           });
                           ReturnData.push({
                              ProductId: obj._id,
                              Product_Name: obj.Product_Name,
                              TotalQuantity: TotalQuantity,
                              TotalCustomers: Group.length,
                              CustomerGroup: Group
                           });
                        });
                        var Sub = { FromDate: StartDate, ToDate: EndDate };
                        ReturnData = ReturnData.filter(obj => obj.TotalQuantity > 0);
                        res.status(200).send({ Http_Code: 200, Status: true, Response: ReturnData, SubResponse: Sub });
                     }).catch(error => {
                        res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Error Occurred while find the Vilfresh Basket!", Error: error });
                     });
                  } else {
                     res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid User Details!" });
                  }
               }
            });
         }
      });
   }
};

