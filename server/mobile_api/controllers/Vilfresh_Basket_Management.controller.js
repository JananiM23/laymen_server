var VilfreshBasket_Management = require('../models/Vilfresh_Basket_Management.model');
var product_management = require('../../api/models/product_management.model');
var Customer_Management = require('../models/customer_management.model');
var NotificationModel = require('../../mobile_api/models/notification_management.model');
var mongoose = require('mongoose');
var moment = require('moment');


exports.Vilfresh_BasketList = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var curr = new Date(new Date().setDate(new Date().getDate() + 7));
      var curr_1 = new Date(new Date().setDate(new Date().getDate() + 7));
      var StartDate = new Date(curr.setDate(curr.getDate() - curr.getDay() + 1));
      var EndDate = new Date(curr_1.setDate(StartDate.getDate() + 5));
      StartDate = new Date(StartDate.setHours(0, 0, 0, 0));
      EndDate = new Date(EndDate.setHours(0, 0, 0, 0));

      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({_id: ReceivingData.CustomerId}, {}, {}).exec(),
         VilfreshBasket_Management.VilfreshBasketSchema.findOne({Customer: ReceivingData.CustomerId, FromDate: StartDate, ToDate: EndDate, Purchase_Generated: false}, {}, {}).exec(),
         product_management.ProductManagementSchema.find({Category: 'Vilfresh_Basket', Active_Status: true, If_Deleted: false}, {}, {}).exec()
      ]).then(response => {
         var Customer = response[0];
         var Basket = response[1];
         var Products = response[2];
         Basket = JSON.parse(JSON.stringify(Basket));
         var DateArray = [];
         var Basket_Skips = [];
         for (let i = 0; i <= 5; i++) {
            const TempDate = new Date(StartDate);
            TempDate.setHours(0, 0, 0, 0);
            TempDate.setDate(StartDate.getDate() + i);
            DateArray.push(TempDate);
            const NewObject = { Date: TempDate, Status: false };
            Basket_Skips.push(NewObject);
         }
         var Basket_Products = [];
         Products.map(obj => {
            obj = JSON.parse(JSON.stringify(obj));
            const NewObject = { Product: { _id: obj._id, Product_Name: obj.Product_Name }, Quantity: 0, Status: false };
            Basket_Products.push(NewObject);
         });
         if (Basket !== null) {
            if (Basket.SkipDates.length > 0) {
               var DbSkipDates = Basket.SkipDates;
               Basket_Skips = Basket_Skips.map(obj => {
                  var MatchIdx = DbSkipDates.findIndex(obj1 => new Date(obj1.Date).valueOf() === new Date(obj.Date).valueOf());
                  if (MatchIdx >= 0) {
                     obj.Status = DbSkipDates[MatchIdx].Status;
                  }
                  return obj;
               });
            }

            if (Basket.Products.length > 0) {
               var DbProducts = Basket.Products;
               DbProducts = JSON.parse(JSON.stringify(DbProducts));
               Basket_Products = Basket_Products.map(obj => {
                  var MatchIdx = DbProducts.findIndex(obj1 => obj1.Product === obj.Product._id);
                  if (MatchIdx >= 0) {
                     obj.Quantity = DbProducts[MatchIdx].Quantity;
                     obj.Status = DbProducts[MatchIdx].Status;
                  }
                  return obj;
               });
            }
         }
         Basket_Skips = Basket_Skips.map(obj => { obj.Date = moment(obj.Date).format("DD-MM-YYYY"); return obj; });
         res.status(200).send({ Http_Code: 200, Status: true, Response: {Products: Basket_Products, SkipDates: Basket_Skips } });
      }).catch( error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred!', Error: error });
      });
   }
};

exports.Vilfresh_Basket_Create = function (req, res) {
   var ReceivingData = req.body;
   
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.Products || typeof ReceivingData.Products !== 'object' || ReceivingData.Products.length === 0 ) {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Products can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var curr = new Date(new Date().setDate(new Date().getDate() + 7));
      var curr_1 = new Date(new Date().setDate(new Date().getDate() + 7));
      var StartDate = new Date(curr.setDate(curr.getDate() - curr.getDay() + 1));
      var EndDate = new Date(curr_1.setDate(StartDate.getDate() + 5));
      StartDate = new Date(StartDate.setHours(0, 0, 0, 0));
      EndDate = new Date(EndDate.setHours(0, 0, 0, 0));

      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({_id: ReceivingData.CustomerId}, {}, {}).exec(),
         VilfreshBasket_Management.VilfreshBasketSchema.findOne({Customer: ReceivingData.CustomerId, FromDate: StartDate, ToDate: EndDate, Purchase_Generated: false}, {}, {}).exec(),
      ]).then(response => {
         var Customer = response[0];
         var Basket = response[1];
         if (Basket !== null) {
            ReceivingData.SkipDates = ReceivingData.SkipDates.map(obj => {
                                       obj.Date = moment(obj.Date, "DD-MM-YYYY").toDate(); 
                                       return obj;
                                    });
            Basket.Products = ReceivingData.Products || [];
            Basket.SkipDates = ReceivingData.SkipDates || [];
            Basket.save((err, result) => {
               if (err) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred for Updating Basket Details!', Error: err }); 
               } else {
                  res.status(200).send({ Http_Code: 200, Status: true, Message: 'Basket Successfully Updated!' });
               }
            });
         } else {
            ReceivingData.SkipDates = ReceivingData.SkipDates.map(obj => {
               obj.Date = moment(obj.Date, "DD-MM-YYYY").toDate(); 
               return obj;
            });
            var Create_VilfreshBasket =  new VilfreshBasket_Management.VilfreshBasketSchema({
               Customer: ReceivingData.CustomerId,
               FromDate: StartDate,
               ToDate: EndDate,
               Products: ReceivingData.Products,
               SkipDates: ReceivingData.SkipDates,
               Purchase_Generated: false,
               Generated_Request: [],
               Region: Customer.Region,
               Active_Status: true,
               If_Deleted: false,
            });
            Create_VilfreshBasket.save((err, result) => {
               if (err) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred for Creating Basket Details!', Error: err }); 
               } else {
                  res.status(200).send({ Http_Code: 200, Status: true, Message: 'Vilfresh Basket Successfully Created!' });
               }
            });
         }
      }).catch( error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred!', Error: error });
      });
   }
};



// Config Product List
exports.Config_Product_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Status: false, Http_Code: 400, Message: "Customer Details can not be empty" }); 
   } else {

      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var StartDate = new Date(new Date().setDate(new Date().getDate() + 1));
      var EndDate = new Date(new Date().setDate(new Date().getDate() + 8));
      StartDate = new Date(StartDate.setHours(0, 0, 0, 0));
      EndDate = new Date(EndDate.setHours(23, 59, 59, 999));
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, { }, {}).exec( (err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Customer Details!." });  
         } else {
            Promise.all([
               VilfreshBasket_Management.BasketProductConfigSchema
               .find({ Region: result.Region, PO_Requested: false, $and: [{Config_Date: {$gte: StartDate }}, {Config_Date: {$lte: EndDate }}] }, {Config_Date: 1, Products: 1}, {sort: { Config_Date: 1 }})
               .populate({ path: 'Products.Product', select: ['Product_Name', 'Unit', 'BasicUnitQuantity']})
               .exec(),
               VilfreshBasket_Management.BasketCustomerRequestsSchema
               .find({ Customer: ReceivingData.CustomerId, Purchase_Generated: false, $and: [{Config_Date: {$gte: StartDate }}, {Config_Date: {$lte: EndDate }}] }, {}, {sort: { Config_Date: 1 }})
               .exec(),
            ]).then( response => {
               var ProductsLists = JSON.parse(JSON.stringify(response[0]));
               var Requests = JSON.parse(JSON.stringify(response[1]));
               var ReturnList = [];
               ProductsLists.map(obj => {
                  obj.Products = obj.Products.map(obj1 => {
                     obj1.ProductId = obj1.Product._id;
                     obj1.Product_Name = obj1.Product.Product_Name;
                     obj1.Unit = obj1.Product.Unit;
                     obj1.BasicUnitQuantity = obj1.Product.BasicUnitQuantity;
                     obj1.Quantity = 0;
                     delete obj1.Product;
                     delete obj1.Confirmed_Quantity;
                     delete obj1.Fixed_Price;
                     return obj1;
                  });            
                  const ExistingArr = Requests.filter(obj1 => new Date(obj1.Config_Date).valueOf() === new Date(obj.Config_Date).valueOf());
                  if (ExistingArr.length > 0) {
                     var ExistingObj = ExistingArr[0];
                     obj.Products = obj.Products.map(obj1 => {
                        const ExQuantity = ExistingObj.Products.filter(obj2 => obj2.Product === obj1.ProductId);
                        if (ExQuantity.length > 0) {
                           obj1.Quantity = ExQuantity[0].Quantity;
                        }
                        return obj1;
                     });
                  }
                  obj.Visibility = new Date(obj.Config_Date).valueOf() === StartDate.valueOf() && new Date().getHours() >= 11 ? false : true;
                  obj.Config_Date = moment(obj.Config_Date).format("DD-MM-YYYY");
                  ReturnList.push(obj);
               });
               StartDate = moment(StartDate).format("DD-MM-YYYY");
               EndDate = moment(EndDate).format("DD-MM-YYYY");
               res.status(200).send({ Http_Code: 200, Status: true, Response: ReturnList, StartDate: StartDate, EndDate: EndDate });
            }).catch( error => {
               res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred will find Product Config Details!', Error: error }); 
            });
         }
      });
   }
};

exports.Customer_ProductRequest = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.Config_Date || ReceivingData.Config_Date === '') {
         res.status(400).send({ Http_Code: 400, Status: false, Message: "Date can not be empty" });
   } else if (!ReceivingData.Products || typeof ReceivingData.Products !== 'object' || ReceivingData.Products.length === 0 ) {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Products can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var Config_Date = moment(ReceivingData.Config_Date, "DD-MM-YYYY").toDate();
      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({_id: ReceivingData.CustomerId}, {}, {}).exec(),
         VilfreshBasket_Management.BasketCustomerRequestsSchema.findOne({Customer: ReceivingData.CustomerId, Config_Date: Config_Date, Purchase_Generated: false, Delivered: false}, {}, {}).exec(),
      ]).then(response => {
         var Customer = response[0];
         var Request = response[1];
         var Products = ReceivingData.Products.map(obj => {
            const NewObj = {
               Product: mongoose.Types.ObjectId(obj.ProductId),
               Quantity: obj.Quantity,
               UnitPrice: 0,
               TotalAmount: 0
            };
            return NewObj;
         });
         if (Request !== null) {
            Request.Products = Products || [];
            Request.save((err, result) => {
               if (err) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred for Updating Basket Details!', Error: err }); 
               } else {
                  res.status(200).send({ Http_Code: 200, Status: true, Message: 'Basket Successfully Updated!' });
               }
            });
         } else {
            var Create_BasketCustomerRequest =  new VilfreshBasket_Management.BasketCustomerRequestsSchema({
               Customer: ReceivingData.CustomerId,
               Config_Date: Config_Date,
               Products: Products,
               PO_Status: 'Pending',
               Purchase_Generated: false,
               Delivered: false,
               Region: Customer.Region,
               Active_Status: true,
               If_Deleted: false,
            });
            Create_BasketCustomerRequest.save((err, result) => {
               if (err) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred for Creating Basket Details!', Error: err }); 
               } else {
                  // const Notification = new NotificationModel.NotificationSchema({
                  //    User: Customer.ApprovedBy_User,
                  //    CustomerID: ReceivingData.CustomerId,
                  //    DeliveryBoyID: null,
                  //    Notification_Type: 'CustomerGeneratePurchaseRequest',
                  //    Message: Customer.Customer_Name + " Purchasing VilFresh Product On "  + moment(new Date()).format('"DD/MM/YYYY"'),
                  //    Message_Received: false,
                  //    Message_Viewed: false,
                  //    Active_Status: true,
                  //    If_Deleted: false
                  // });
                  // Notification.save();
            
                  res.status(200).send({ Http_Code: 200, Status: true, Message: 'Vilfresh Basket Successfully Created!' });
               }
            });
         }
      }).catch( error => {      
         res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred!', Error: error });
      });
   }
};

exports.Cancel_BasketRequest = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.Config_Date || ReceivingData.Config_Date === '') {
         res.status(400).send({ Http_Code: 400, Status: false, Message: "Date can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var Config_Date = moment(ReceivingData.Config_Date, "DD-MM-YYYY").toDate();

      VilfreshBasket_Management.BasketCustomerRequestsSchema
      .findOne({Customer: ReceivingData.CustomerId, Config_Date: Config_Date, Purchase_Generated: false, Delivered: false}, {}, {})
      .exec( (err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred!', Error: err });
         } else {
            if (result !== null) {
               VilfreshBasket_Management.BasketCustomerRequestsSchema
               .deleteOne({Customer: ReceivingData.CustomerId, Config_Date: Config_Date, Purchase_Generated: false, Delivered: false})
               .exec((err1, result1) => {
                  if (err1) {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred!', Error: err1 });
                  } else {
                     res.status(200).send({ Http_Code: 200, Status: true, Message: 'Basket Request successfully canceled' }); 
                  }
               });
            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: 'Invalid Basket cancel Request' }); 
            }
         }
      });
   }
};


exports.CustomerRequest_POStatus = function (req, res) {
   var ReceivingData = req.body;
   
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var StartDate = new Date(); 
      StartDate = new Date(StartDate.setHours(0, 0, 0, 0));
      VilfreshBasket_Management.BasketCustomerRequestsSchema
      .find({Customer:ReceivingData.CustomerId,Purchase_Generated:true,Delivered:false,Config_Date: { $gte: StartDate }, Active_Status:true,If_Deleted:false}, {}, {})
      // .populate({path: 'Customer', select: 'Customer_Name'})
      .populate({ path: 'Products.Product', select: ['Product_Name', 'Unit', 'BasicUnitQuantity']})
      .exec( (err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: 'Some Error Occurred will find Basket Details!', Error: err }); 
         } else {
            result = JSON.parse(JSON.stringify(result));
            result = result.map(obj => {
               obj.Products = obj.Products.map(obj1 => {
                  obj1.Product_Name = obj1.Product.Product_Name;
                  obj1.Unit = obj1.Product.Unit;
                  obj1.BasicUnitQuantity = obj1.Product.BasicUnitQuantity;
                  obj1.TotalQuantity = obj1.BasicUnitQuantity * obj1.Quantity;
                  delete obj1.Product;
                  return obj1;
               });
               return obj;
            });
            if (result.length > 0) {
               result = result.map(obj => { obj.Config_Date = moment(obj.Config_Date).format("DD-MM-YYYY"); return obj; });
            }
            res.status(200).send({ Http_Code: 200, Status: true, Message: '', Response: result });
         }
      });
   }
};
