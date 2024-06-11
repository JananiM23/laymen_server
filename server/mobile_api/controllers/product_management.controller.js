var product_management = require('../../api/models/product_management.model');
var CustomerManagement = require('../../../server/mobile_api/models/customer_management.model');
var MyCart_History = require('../../mobile_api/models/mycart.model');
var OrderManagement = require('../../mobile_api/models/order_management.model');
var NotificationModel = require('../models/notification_management.model');
var mongoose = require('mongoose');
var moment = require('moment');


// Dashboard Product List ----------------------------------------------
exports.ProductManagement_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);

      Promise.all([
         CustomerManagement.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).exec(),
         OrderManagement.OrderSchema.find({ CustomerId: ReceivingData.CustomerId, Order_Type: 'Subscription_From', OrderDelivered: true, Active_Status: true, If_Deleted: false }, {}, {}).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var OrderDetails = Response[1];
         var IfSample = false;
         if (OrderDetails.length !== 0 || CustomerDetails.Request_Sample_Order === true) {
            IfSample = true;
         }
         if (CustomerDetails !== null) {
            product_management.ProductManagementSchema.find({ CompanyId: CustomerDetails.CompanyId, Milk_YesOrNo: false, Active_Status: true, If_Deleted: false }, {}, {sort: {createdAt: -1}}).exec((err_1, result_1) => {
               if (err_1) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Product Details!." });
               } else {
                  var Farm_To_Home = [];
                  var Factory_To_Home = [];
                  var Home_To_Home = [];
                  var Category_Wise = result_1;
                  // Category_Wise      
                  Category_Wise.map(obj => {
                     if (obj.Current_Stock > 0 || obj.Stackable === false) {
                        if (obj.Category === 'Factory_To_Home') {
                           Factory_To_Home.push({
                              "Product_Name": obj.Product_Name,
                              "File_Name": obj.File_Name,
                              "Quantity": obj.BasicUnitQuantity || 0,
                              "Unit": obj.Unit,
                              "Price": obj.Price,
                              "ProductId": obj._id
                           });
                        } else if (obj.Category === 'Farm_To_Home') {
                           Farm_To_Home.push({
                              "Product_Name": obj.Product_Name,
                              "File_Name": obj.File_Name,
                              "Quantity": obj.BasicUnitQuantity || 0,
                              "Unit": obj.Unit,
                              "Price": obj.Price,
                              "ProductId": obj._id
                           });
                        } else if (obj.Category === 'Home_To_Home') {
                           Home_To_Home.push({
                              "Product_Name": obj.Product_Name,
                              "File_Name": obj.File_Name,
                              "Quantity": obj.BasicUnitQuantity || 0,
                              "Unit": obj.Unit,
                              "Price": obj.Price,
                              "ProductId": obj._id
                           });
                        }
                     }
                  });
                  MyCart_History.MyCartSchema.find({ CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false })
                     .exec((err, result_1) => {
                        if (err) {
                           res.status(417).send({ Success: false, Message: "Some error occurred while Find The Notification Details!.", Error: err });
                        } else {
                           var ProCount = 0;
                           result_1.map(obj => {
                              ProCount = ProCount + obj.Quantity;
                           });
                           NotificationModel.NotificationSchema.countDocuments({
                              CustomerID: ReceivingData.CustomerId,
                              $or: [{ Notification_Type: 'CustomerSample_Approve' },
                              { Notification_Type: 'CustomerSample_Reject&OnHold' },
                              { Notification_Type: 'CustomerSubscription_DeActivated' },
                              { Notification_Type: 'CustomerCreate_Order' },
                              { Notification_Type: 'CustomerSupportClosed' },
                              { Notification_Type: 'GeneratePurchase' },
                              { Notification_Type: 'PurchaseRequestCancelled' },
                              { Notification_Type: 'OrderDelivered' },
                              { Notification_Type: 'OrderUnDelivered' },
                              { Notification_Type: 'Recharge_YourWalletMoney' }],
                              Active_Status: true,
                              Message_Viewed: false,
                              If_Deleted: false
                           }).exec((err_3, result_3) => {
                              if (err_3) {
                                 res.status(417).send({ Success: false, Message: "Some error occurred while Find The Notification Details!.", Error: err_3 });
                              } else {
                                 res.status(200).send({
                                    Http_Code: 200, Status: true,
                                    Message: "Product Management List",
                                    Response: [{
                                       Mobile_Number: CustomerDetails.Mobile_Number || null,
                                       Customer_Name: CustomerDetails.Customer_Name,
                                       Notification_Count: result_3,
                                       MyCart_Count: ProCount,
                                       Region: CustomerDetails.Region,
                                       Subscription_Activated: CustomerDetails.Subscription_Activated || false,
                                       SubscriptionPaused: CustomerDetails.SubscriptionPaused || false,
                                       Request_Sample_Order: IfSample,
                                       Customer_Image: CustomerDetails.File_Name,
                                       VilfreshMoney_Limit: Math.round((CustomerDetails.VilfreshMoney_Limit - (parseFloat(CustomerDetails.VilfreshCredit_Limit) - parseFloat(CustomerDetails.AvailableCredit_Limit))) * 100) / 100,
                                       Factory_To_Home: Factory_To_Home,
                                       Farm_To_Home: Farm_To_Home,
                                       Home_To_Home: Home_To_Home
                                    }]
                                 });
                              }
                           });
                        }
                     });
               }
            });
         } else {
            res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details" });
         }
      }).catch(Error => {

      });



   }

};



// Farm To Home List -----------------------------------------
exports.Farm_To_Home_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var DateRestriction = ReceivingData.Date !== undefined && ReceivingData.Date !== '' && ReceivingData.Date !== null ? moment(ReceivingData.Date, "YYYY-MM-DD").toDate() : null;
      Promise.all([
         CustomerManagement.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {})
            .populate({ path: "Delivery_Line", select: 'Session' }).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var CurrentDate = new Date(new Date().setHours(0, 0, 0, 0));

         Promise.all([
            product_management.ProductManagementSchema
               .aggregate([
                  { $match: { CompanyId: CustomerDetails.CompanyId, Active_Status: true, Milk_YesOrNo: false, Category: "Farm_To_Home", $or: [{ Current_Stock: { $gt: 0 } }, { Stackable: { $eq: false } }] } },
                  {
                     $lookup: {
                        from: "MyCartManagement",
                        let: { id: "$_id", customer: ReceivingData.CustomerId },
                        pipeline: [
                           {
                              $match: {
                                 $expr: {
                                    $and: [
                                       { $eq: ["$$id", "$ProductId"] },
                                       { $eq: ["$$customer", "$CustomerId"] },
                                       { $eq: [true, "$Active_Status"] },
                                       { $eq: [false, "$If_Deleted"] }
                                    ]
                                 }
                              }
                           },
                           { $project: { "ProductId": 1, "CustomerId": 1, "Date": 1, "Quantity": 1, "Active_Status": 1 } }
                        ],
                        as: 'Cart'
                     }
                  },
                  { $project: { Product_Name: 1, Schedule: 1, File_Name: 1, Unit: 1, BasicUnitQuantity: 1, Stackable: 1, Current_Stock: 1, Price: 1, Description: 1, Cart: 1, createdAt: 1 } },
                  { $sort: {createdAt: -1}}
               ]).exec(),
            OrderManagement.GeneratedOrdersSchema.findOne({ DeliveryLine: CustomerDetails.Delivery_Line, Date: CurrentDate, Session: 'Evening' }, {}, {}).exec()
         ]).then(response => {
            var Products = response[0];
            var TodayAvailability = response[1];
            var Farm_To_Home = [];
            Products.map(product => {
               var Days = [];
               const Static_day = new Date(new Date().setDate(new Date().getDate() + 1));
               var Current_Days = new Date(Static_day.setHours(11, 0, 0, 0)).valueOf();
					if (product.Stackable) {
                  Current_Days = new Date(Static_day.setHours(20, 0, 0, 0)).valueOf();
               }
               var curr = new Date(new Date().setDate(new Date().getDate() + 1));
               var curr_1 = new Date(new Date().setDate(new Date().getDate() + 1));

               if (CustomerDetails.Delivery_Line !== null) {
                  if (CustomerDetails.Delivery_Line.Session !== 'Morning' && Current_Days > new Date(curr).valueOf() && Current_Days > new Date(curr_1).valueOf() && TodayAvailability === null) {
                     curr.setHours(0, 0, 0, 0);
                     curr = new Date(curr.setDate(curr.getDate()));
                     curr_1.setHours(0, 0, 0, 0);
                     curr_1 = new Date(curr_1.setDate(curr_1.getDate()));
                  } else {
                     curr.setHours(0, 0, 0, 0);
                     curr = new Date(curr.setDate(curr.getDate() + 1));
                     curr_1.setHours(0, 0, 0, 0);
                     curr_1 = new Date(curr_1.setDate(curr_1.getDate() + 1));
                  }
               }

               var Dates = [];

               Object.keys(product.Schedule).map((obj, i) => { if (product.Schedule[obj]) { Days.push(i); } });
               var StartDate = new Date(curr_1.setDate(curr.getDate() - curr.getDay()));
               for (let i = 0; i <= 10; i++) {
                  const TempDate = new Date(StartDate);
                  TempDate.setHours(0, 0, 0, 0);
                  TempDate.setDate(StartDate.getDate() + (i * 7));
                  Days.map(obj => {
                     const newTempDate = new Date(TempDate);
                     newTempDate.setDate(TempDate.getDate() + obj);
                     if (newTempDate.valueOf() === curr.valueOf()) {
                        const checkDate = new Date(curr).setHours(16);
                        if (new Date().valueOf() < checkDate.valueOf()) {
                           Dates.push(moment(newTempDate).format("YYYY-MM-DD"));
                        }
                     } else if (newTempDate.valueOf() >= curr.valueOf()) {
                        Dates.push(moment(newTempDate).format("YYYY-MM-DD"));
                     }
                  });
                  if (Dates.length > 6) {
                     break;
                  }
               }
               Dates = Dates.slice(0, 7);
               product = JSON.parse(JSON.stringify(product));
               product.Ordered_Quantity = 0;
               product.DeliveryDate = '';
               if (product.Cart.length > 0) {
                  product.Cart = product.Cart.sort(function(a, b) {
                     var c = new Date(a.Date);
                     var d = new Date(b.Date);
                     return d-c;
                 });
                  // var CurrentDate = new Date().valueOf();
                  // var validationDate = new Date(new Date(product.Cart[0].Date).setHours(11, 0, 0, 0)).valueOf();
                  // if (CurrentDate < validationDate) {
                     product.Ordered_Quantity = product.Cart[0].Quantity;
                     product.DeliveryDate = moment(product.Cart[0].Date).format("YYYY-MM-DD");
                  // }
               }

               delete product.Cart;
               delete product.Schedule;
               product.Available_Dates = Dates;

               var ReturnObj = {
                  "ProductId": product._id,
                  "Product_Name": product.Product_Name,
                  "Price": product.Price,
                  "Unit": product.Unit,
                  "Stackable": product.Stackable,
                  "Current_Stock": product.Current_Stock,
                  "Description": product.Description,
                  "File_Name": product.File_Name,
                  "Quantity": product.BasicUnitQuantity || 0,
                  "Ordered_Quantity": product.Ordered_Quantity,
                  "Available_Dates": product.Available_Dates,
                  "DeliveryDate": product.DeliveryDate
               };
               Farm_To_Home.push(ReturnObj);
            });
            if (DateRestriction !== null) {
               Farm_To_Home = Farm_To_Home.filter(obj => {
                  const DateStr = moment(DateRestriction).format("YYYY-MM-DD");
                  if (obj.Available_Dates.includes(DateStr)) {
                     return true;
                  } else {
                     return false;
                  }
               });
            }
            res.status(200).send({ Http_Code: 200, Status: true, Message: 'Success', Response: Farm_To_Home });
         }).catch(error => {
            console.log(error);
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
         });
      }).catch(error => {
         res.status(200).send({ Http_Code: 400, Status: false, Message: 'Some Occurred Error' });
      });

   }
};


// Factory To Home List -----------------------------------------
exports.Factory_To_Home_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var DateRestriction = ReceivingData.Date !== undefined && ReceivingData.Date !== '' && ReceivingData.Date !== null ? moment(ReceivingData.Date, "YYYY-MM-DD").toDate() : null;
      Promise.all([
         CustomerManagement.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {})
            .populate({ path: "Delivery_Line", select: 'Session' }).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var CurrentDate = new Date(new Date().setHours(0, 0, 0, 0));

         Promise.all([
            product_management.ProductManagementSchema
               .aggregate([
                  { $match: { CompanyId: CustomerDetails.CompanyId, Active_Status: true, Category: "Factory_To_Home", $or: [{ Current_Stock: { $gt: 0 } }, { Stackable: { $eq: false } }] } },
                  {
                     $lookup: {
                        from: "MyCartManagement",
                        let: { id: "$_id", customer: ReceivingData.CustomerId },
                        pipeline: [
                           {
                              $match: {
                                 $expr: {
                                    $and: [
                                       { $eq: ["$$id", "$ProductId"] },
                                       { $eq: ["$$customer", "$CustomerId"] },
                                       { $eq: [true, "$Active_Status"] },
                                       { $eq: [false, "$If_Deleted"] }
                                    ]
                                 }
                              }
                           },
                           { $project: { "ProductId": 1, "CustomerId": 1, "Date": 1, "Quantity": 1, "Active_Status": 1 } }
                        ],
                        as: 'Cart'
                     }
                  },
                  { $project: { Product_Name: 1, Schedule: 1, File_Name: 1, Unit: 1, BasicUnitQuantity: 1, Current_Stock: 1, Stackable: 1, Price: 1, Description: 1, Cart: 1, createdAt: 1 } },
                  { $sort: {createdAt: -1}}
               ]).exec(),
            OrderManagement.GeneratedOrdersSchema.findOne({ DeliveryLine: CustomerDetails.Delivery_Line, Date: CurrentDate, Session: 'Evening' }, {}, {}).exec()
         ]).then(response => {
            var Products = response[0];
            var TodayAvailability = response[1];
            var FactoryArray = [];
            Products.map(product => {
               var Days = [];

               const Static_day = new Date(new Date().setDate(new Date().getDate() + 1));
               var Current_Days = new Date(Static_day.setHours(11, 0, 0, 0)).valueOf();
					if (product.Stackable) {
                  Current_Days = new Date(Static_day.setHours(20, 0, 0, 0)).valueOf();
               }
               var curr = new Date(new Date().setDate(new Date().getDate() + 1));
               var curr_1 = new Date(new Date().setDate(new Date().getDate() + 1));

               if (CustomerDetails.Delivery_Line !== null) {
                  if (CustomerDetails.Delivery_Line.Session !== 'Morning' && Current_Days > new Date(curr).valueOf() && Current_Days > new Date(curr_1).valueOf() && TodayAvailability === null) {
                     curr.setHours(0, 0, 0, 0);
                     curr = new Date(curr.setDate(curr.getDate()));
                     curr_1.setHours(0, 0, 0, 0);
                     curr_1 = new Date(curr_1.setDate(curr_1.getDate()));
                  } else {
                     curr.setHours(0, 0, 0, 0);
                     curr = new Date(curr.setDate(curr.getDate() + 1));
                     curr_1.setHours(0, 0, 0, 0);
                     curr_1 = new Date(curr_1.setDate(curr_1.getDate() + 1));
                  }
               }
               var Dates = [];
               Object.keys(product.Schedule).map((obj, i) => { if (product.Schedule[obj]) { Days.push(i); } });
               var StartDate = new Date(curr_1.setDate(curr.getDate() - curr.getDay()));
               for (let i = 0; i <= 10; i++) {
                  const TempDate = new Date(StartDate);
                  TempDate.setHours(0, 0, 0, 0);
                  TempDate.setDate(StartDate.getDate() + (i * 7));
                  Days.map(obj => {
                     const newTempDate = new Date(TempDate);
                     newTempDate.setDate(TempDate.getDate() + obj);
                     if (newTempDate.valueOf() === curr.valueOf()) {
                        const checkDate = new Date(curr).setHours(16);
                        if (new Date().valueOf() < checkDate.valueOf()) {
                           Dates.push(moment(newTempDate).format("YYYY-MM-DD"));
                        }
                     } else if (newTempDate.valueOf() >= curr.valueOf()) {
                        Dates.push(moment(newTempDate).format("YYYY-MM-DD"));
                     }
                  });
                  if (Dates.length > 6) {
                     break;
                  }
               }
               Dates = Dates.slice(0, 7);
               product = JSON.parse(JSON.stringify(product));
               product.Ordered_Quantity = 0;
               product.DeliveryDate = '';
               if (product.Cart.length > 0) {
                  product.Cart = product.Cart.sort(function(a, b) {
                     var c = new Date(a.Date);
                     var d = new Date(b.Date);
                     return d-c;
                 });
                  // var CurrentDate = new Date().valueOf();
                  // var validationDate = new Date(new Date(product.Cart[0].Date).setHours(11, 0, 0, 0)).valueOf();
                  // if (CurrentDate < validationDate) {
                     product.Ordered_Quantity = product.Cart[0].Quantity;
                     product.DeliveryDate = moment(product.Cart[0].Date).format("YYYY-MM-DD");
                  // }
               }

               delete product.Cart;
               delete product.Schedule;
               product.Available_Dates = Dates;

               var returnObj = {
                  "ProductId": product._id,
                  "Product_Name": product.Product_Name,
                  "Price": product.Price,
                  "Unit": product.Unit,
                  "Stackable": product.Stackable,
                  "Current_Stock": product.Current_Stock,
                  "Description": product.Description,
                  "File_Name": product.File_Name,
                  "Quantity": product.BasicUnitQuantity || 0,
                  "Ordered_Quantity": product.Ordered_Quantity,
                  "Available_Dates": product.Available_Dates,
                  "DeliveryDate": product.DeliveryDate
               };
               FactoryArray.push(returnObj);
            });
            if (DateRestriction !== null) {
               FactoryArray = FactoryArray.filter(obj => {
                  const DateStr = moment(DateRestriction).format("YYYY-MM-DD");
                  if (obj.Available_Dates.includes(DateStr)) {
                     return true;
                  } else {
                     return false;
                  }
               });
            }
            res.status(200).send({ Http_Code: 200, Status: true, Message: 'Success', Response: FactoryArray });
         }).catch(error => {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
         });
      }).catch(error => {
         res.status(200).send({ Http_Code: 400, Status: false, Message: 'Some Occurred Error' });
      });
   }
};


// Home To Home List -----------------------------------------
exports.Home_To_Home_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      var DateRestriction = ReceivingData.Date !== undefined && ReceivingData.Date !== '' && ReceivingData.Date !== null ? moment(ReceivingData.Date, "YYYY-MM-DD").toDate() : null;
      Promise.all([
         CustomerManagement.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {})
            .populate({ path: "Delivery_Line", select: 'Session' }).exec(),
      ]).then(Response => {
         var CustomerDetails = Response[0];
         var CurrentDate = new Date(new Date().setHours(0, 0, 0, 0));

         Promise.all([
            product_management.ProductManagementSchema
               .aggregate([
                  { $match: { CompanyId: CustomerDetails.CompanyId, Active_Status: true, Category: "Home_To_Home", $or: [{ Current_Stock: { $gt: 0 } }, { Stackable: { $eq: false } }] } },
                  {
                     $lookup: {
                        from: "MyCartManagement",
                        let: { id: "$_id", customer: ReceivingData.CustomerId },
                        pipeline: [
                           {
                              $match: {
                                 $expr: {
                                    $and: [
                                       { $eq: ["$$id", "$ProductId"] },
                                       { $eq: ["$$customer", "$CustomerId"] },
                                       { $eq: [true, "$Active_Status"] },
                                       { $eq: [false, "$If_Deleted"] }
                                    ]
                                 }
                              }
                           },
                           { $project: { "ProductId": 1, "CustomerId": 1, "Date": 1, "Quantity": 1, "Active_Status": 1 } }
                        ],
                        as: 'Cart'
                     }
                  },
                  { $project: { Product_Name: 1, Schedule: 1, File_Name: 1, Unit: 1, BasicUnitQuantity: 1, Current_Stock: 1, Price: 1, Description: 1, Stackable: 1, Cart: 1, createdAt: 1 } },
                  { $sort: {createdAt: -1}}
               ]).exec(),
            OrderManagement.GeneratedOrdersSchema.findOne({ DeliveryLine: CustomerDetails.Delivery_Line, Date: CurrentDate, Session: 'Evening' }, {}, {}).exec()
         ]).then(response => {
            var Products = response[0];
            var TodayAvailability = response[1];
            var HomeToArray = [];
            Products.map(product => {
               var Days = [];

               const Static_day = new Date(new Date().setDate(new Date().getDate() + 2));
               var Current_Days = new Date(Static_day.setHours(20, 0, 0, 0)).valueOf();
               var curr = new Date(new Date().setDate(new Date().getDate() + 2));
               var curr_1 = new Date(new Date().setDate(new Date().getDate() + 2));

               if (CustomerDetails.Delivery_Line !== null) {
                  if (CustomerDetails.Delivery_Line.Session !== 'Morning' && Current_Days > new Date(curr).valueOf() && Current_Days > new Date(curr_1).valueOf() && TodayAvailability === null) {
                     curr.setHours(0, 0, 0, 0);
                     curr = new Date(curr.setDate(curr.getDate()));
                     curr_1.setHours(0, 0, 0, 0);
                     curr_1 = new Date(curr_1.setDate(curr_1.getDate()));
                  } else {
                     curr.setHours(0, 0, 0, 0);
                     curr = new Date(curr.setDate(curr.getDate() + 1));
                     curr_1.setHours(0, 0, 0, 0);
                     curr_1 = new Date(curr_1.setDate(curr_1.getDate() + 1));
                  }
               }
               var Dates = [];

               Object.keys(product.Schedule).map((obj, i) => { if (product.Schedule[obj]) { Days.push(i); } });
               var StartDate = new Date(curr_1.setDate(curr.getDate() - curr.getDay()));
               for (let i = 0; i <= 10; i++) {
                  const TempDate = new Date(StartDate);
                  TempDate.setHours(0, 0, 0, 0);
                  TempDate.setDate(StartDate.getDate() + (i * 7));
                  Days.map(obj => {
                     const newTempDate = new Date(TempDate);
                     newTempDate.setDate(TempDate.getDate() + obj);
                     if (newTempDate.valueOf() === curr.valueOf()) {
                        const checkDate = new Date(curr).setHours(16);
                        if (new Date().valueOf() < checkDate.valueOf()) {
                           Dates.push(moment(newTempDate).format("YYYY-MM-DD"));
                        }
                     } else if (newTempDate.valueOf() >= curr.valueOf()) {
                        Dates.push(moment(newTempDate).format("YYYY-MM-DD"));
                     }
                  });
                  if (Dates.length > 6) {
                     break;
                  }
               }
               Dates = Dates.slice(0, 7);
               product = JSON.parse(JSON.stringify(product));
               product.Ordered_Quantity = 0;
               product.DeliveryDate = '';
               if (product.Cart.length > 0) {
                  product.Cart = product.Cart.sort(function(a, b) {
                     var c = new Date(a.Date);
                     var d = new Date(b.Date);
                     return d-c;
                 });
                  // var CurrentDate = new Date().valueOf();
                  // var validationDate = new Date(new Date(product.Cart[0].Date).setHours(11, 0, 0, 0)).valueOf();
                  // if (CurrentDate < validationDate) {
                     product.Ordered_Quantity = product.Cart[0].Quantity;
                     product.DeliveryDate = moment(product.Cart[0].Date).format("YYYY-MM-DD");
                  // }
               }
               delete product.Cart;
               delete product.Schedule;
               product.Available_Dates = Dates;

               var ReturnObj = {
                  "ProductId": product._id,
                  "Product_Name": product.Product_Name,
                  "Price": product.Price,
                  "Unit": product.Unit,
                  "Stackable": product.Stackable,
                  "Current_Stock": product.Current_Stock,
                  "Description": product.Description,
                  "File_Name": product.File_Name,
                  "Quantity": product.BasicUnitQuantity || 0,
                  "Ordered_Quantity": product.Ordered_Quantity,
                  "Available_Dates": product.Available_Dates,
                  "DeliveryDate": product.DeliveryDate
               };

               HomeToArray.push(ReturnObj);
            });
            if (DateRestriction !== null) {
               HomeToArray = HomeToArray.filter(obj => {
                  const DateStr = moment(DateRestriction).format("YYYY-MM-DD");
                  if (obj.Available_Dates.includes(DateStr)) {
                     return true;
                  } else {
                     return false;
                  }
               });
            }
            res.status(200).send({ Http_Code: 200, Status: true, Message: 'Success', Response: HomeToArray });
         }).catch(error => {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
         });
      }).catch(error => {
         res.status(200).send({ Http_Code: 400, Status: false, Message: 'Some Occurred Error' });
      });
   }
};


// Product added to MyCart , Update to MyCart & Clear to MyCart-------------------------------------
exports.Products_Added_to_MyCart = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.ProductId || ReceivingData.ProductId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Product ID can not be empty" });
   } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer can not be empty" });
   } else if (!ReceivingData.Product_Key || ReceivingData.Product_Key === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Product Key can not be empty" });
   } else {
      ReceivingData.ProductId = mongoose.Types.ObjectId(ReceivingData.ProductId);
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.Date = moment(ReceivingData.Date, "YYYY-MM-DD").toDate();

      if (ReceivingData.Product_Key === 'Added_To_MyCart') {
         var MyCartCreate = new MyCart_History.MyCartSchema({
            ProductId: ReceivingData.ProductId,
            CustomerId: ReceivingData.CustomerId,
            Date: ReceivingData.Date,
            Quantity: ReceivingData.Quantity,
            Active_Status: true,
            If_Deleted: false,
         });

         MyCartCreate.save(function (err_1, result_1) {
            if (err_1) {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the MyCart Management!.", Error: err_1 });
            } else {
               res.status(200).send({ Http_Code: 200, Status: true, Message: 'Added to MyCart', Response: result_1 });
            }
         });
      } else if (ReceivingData.Product_Key === 'Update_To_MyCart') {

         MyCart_History.MyCartSchema.find({ ProductId: ReceivingData.ProductId, CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {sort: {Date: -1}}).exec((err_5, result) => {
            if (err_5) {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The MyCart Details!.", Error: err_5 });
            } else {
               if (result[0] !== null) {
                  result[0].Date = ReceivingData.Date;
                  result[0].Quantity = ReceivingData.Quantity;
                  result[0].save(function (err_1, result_1) {
                     if (err_1) {
                        res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the MyCart Management!.", Error: err_1 });
                     } else {
                        res.status(200).send({ Http_Code: 200, Status: true, Message: 'Update to MyCart', Response: result[0] });
                     }
                  });
               } else {
                  res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid MyCart Details!" });
               }
            }
         });
      } else {
         MyCart_History.MyCartSchema.updateOne({
            ProductId: ReceivingData.ProductId,
            CustomerId: ReceivingData.CustomerId,
            Active_Status: true,
            If_Deleted: false
         }, { $set: { If_Deleted: true, Quantity: 0 } })
            .exec(function (err, result) {
               if (err) {
                  res.status(200).send({ Http_Code: 417, Success: false, Message: "Some error occurred while Find The MyCart Details!.", Error: err });
               } else {
                  res.status(200).send({ Http_Code: 200, Success: true, Message: 'MyCart Detail Deleted' });
               }
            });
      }

   }
};


// ALL MyCart List-------------------------------------
exports.All_MyCart_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Promise.all([
         MyCart_History.MyCartSchema.find({ CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {})
            .populate({ path: "ProductId" }).populate({ path: 'CustomerId', select: 'AvailableCredit_Limit' }).exec(),
         CustomerManagement.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).exec()
      ]).then(response => {
         var CartList = response[0];
         var Customer = response[1];
         if (Customer !== null) {
            var MyCartDetails = [];
            CartList.map(obj => {
               var Stock_Available = false;
               if (obj.ProductId.Stackable === false || obj.ProductId.Current_Stock >= (obj.Quantity * obj.ProductId.BasicUnitQuantity)) {
                  Stock_Available = true;
               }
					var CurrentDate = new Date(new Date().setHours(0, 0, 0, 0));
					var validationDate = new Date(new Date(CurrentDate).setDate(new Date().getDate() + 1)).valueOf();
					var DeliveryDateExceed = false;
					const ReqDate = new Date(obj.Date).valueOf();
					if (obj.ProductId.Category === "Home_To_Home") {
						validationDate = new Date(new Date(CurrentDate).setDate(new Date().getDate() + 2)).valueOf();
					}

					if (ReqDate === validationDate) {
						if (obj.ProductId.Category === "Home_To_Home") {
							DeliveryDateExceed = new Date().getHours() < 20 ? false : true ;
						} else {
							if (obj.ProductId.Stackable) {
								DeliveryDateExceed = new Date().getHours() < 20 ? false : true ;
							} else {
								DeliveryDateExceed = new Date().getHours() < 11 ? false : true ;
							}
						}
					} else if (ReqDate < validationDate) {
						DeliveryDateExceed = true;
					}

               MyCartDetails.push({
                  ProductId: obj.ProductId._id,
                  MyCartId: obj._id,
                  Category: obj.ProductId.Category,
                  Product_Name: obj.ProductId.Product_Name,
                  Image: obj.ProductId.File_Name,
                  Date: moment(obj.Date).format("YYYY-MM-DD"),
                  DeliveryDateExceed: DeliveryDateExceed,
                  Price: obj.ProductId.Price,
                  BasicUnitQuantity: obj.ProductId.BasicUnitQuantity || 0,
                  Unit: obj.ProductId.Unit,
                  Stackable: obj.ProductId.Stackable,
                  Current_Stock: obj.ProductId.Current_Stock,
                  Quantity: obj.Quantity,
                  Stock_Available: Stock_Available
               });
            });
            res.status(200).send({
               Http_Code: 200,
               Status: true,
               Message: "MyCart List Details!",
               AvailableCredit_Limit: Customer.AvailableCredit_Limit || 0,
               Response: MyCartDetails
            });
         } else {
            res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!" });
         }
      }).catch(error => {
         res.status(200).send({ Http_Code: 417, Success: false, Message: "Some error occurred while Find The MyCart Details!.", Error: err });
      });
   }
};


// MyCart Details Delete --------------------------------------
exports.MyCartDetails_Delete = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.ProductId || ReceivingData.ProductId === '') {
      res.status(400).send({ Http_Code: 400, Success: false, Message: "Product Details can not be empty" });
   } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Success: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.ProductId = mongoose.Types.ObjectId(ReceivingData.ProductId);
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      MyCart_History.MyCartSchema.updateMany({ ProductId: ReceivingData.ProductId, CustomerId: ReceivingData.CustomerId, If_Deleted: false }, { $set: { If_Deleted: true } })
         .exec(function (err, result) {
            if (err) {
               res.status(200).send({ Http_Code: 417, Success: false, Message: "Some error occurred while Find The MyCart Details!.", Error: err });
            } else {
               res.status(200).send({ Http_Code: 200, Success: true, Message: 'MyCart Details Deleted' });
            }
         });
   }
};


// MyCart Total Amount-----------------------------------------
exports.MyCart_TotalAmount = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Success: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      MyCart_History.MyCartSchema.find({ CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false })
         .populate({ path: 'ProductId', select: 'Price' }).exec((err_5, result) => {
            if (err_5) {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The MyCart Details!.", Error: err_5 });
            } else {
               if (result.length !== 0) {
                  var Total_amount = 0;
                  var Quantity_Total = 0;
                  result.map(Obj => {
                     Total_amount = Math.round((Total_amount + Obj.ProductId.Price * Obj.Quantity) * 100) / 100;
                     Quantity_Total = Math.round((Quantity_Total + Obj.Quantity) * 100) / 100;
                  });
                  res.status(200).send({ Http_Code: 200, Success: true, Message: 'MyCart Total Count & Amount', TotalAmount: Total_amount, QuantityTotal: Quantity_Total });
               } else {
                  res.status(200).send({ Http_Code: 404, Success: false, Message: 'Invalid MyCart Details ' });
               }
            }
         });
   }
};
