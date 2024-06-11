var OrderManagement = require('../models/order_management.model');
var MyCart_History = require('../../mobile_api/models/mycart.model');
var Customer_Management = require('../../mobile_api/models/customer_management.model');
var VilfreshMoney_management = require('../models/VilfreshMoney_management.model');
var VilfreshCredit_Limit = require('../../api/models/VilfreshCredit_management.model');
var ProductManagement = require('../../api/models/product_management.model');
var InvoiceModel = require('../../api/models/Invoice_pdf.models');
var NotificationModel = require('../../mobile_api/models/notification_management.model');
var ReferralManagement = require('../models/ReferralManagement.model');
var ReferralPayment = require('./../../Referral_Payment');
var mongoose = require('mongoose');
var moment = require('moment');

var FCM_App = require('../../../Config/fcm_config').DeliveryBoyNotify;

var options = {
   priority: 'high',
   timeToLive: 60 * 60 * 24
};


// Order Management system -----------------------------------------------------------
exports.OrderManagement_Create = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.PaymentMode || ReceivingData.PaymentMode !== 'Wallet_Reduce') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Payment Mode can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.Date = moment(ReceivingData.Date, "YYYY-MM-DD").toDate();
      Promise.all([
         MyCart_History.MyCartSchema.find({ CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).populate({ path: "ProductId" }).exec(),
         Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).exec(),
         OrderManagement.OrderSchema.findOne({ Active_Status: true, If_Deleted: false }, {}, { sort: { Order_Unique: -1 } }).exec(),
      ]).then(response => {
         var CartList = JSON.parse(JSON.stringify(response[0]));
         var Customer = response[1];
         var LastOrder = response[2];
         var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
         if (Customer !== null && Customer.IfApprovedBy_User === true) {
            if (CartList.length !== 0) {
               var LastOrder_Reference = LastOrder !== null ? (LastOrder.Order_Unique + 1) : 1;
               var ValidCartList = [];
               CartList.map(obj => {
                  if (obj.ProductId.Stackable === false || obj.ProductId.Current_Stock >= (obj.Quantity * obj.ProductId.BasicUnitQuantity)) {
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

                     if (DeliveryDateExceed === false) {
                        ValidCartList.push(obj);
                     }
                  }
               });
               var TotalPayableAmount = 0;
               ValidCartList.map(obj => {
                  TotalPayableAmount = TotalPayableAmount + (obj.Quantity * obj.ProductId.Price);
               });
               if (TotalPayableAmount <= Customer.VilfreshMoney_Limit) {
                  var ArrayDate = [];
                  var CartListGroup = [];
                  ValidCartList.map(obj => {
                     obj.Date = new Date(obj.Date);
                     ArrayDate.push(obj.Date.valueOf());
                  });
                  ArrayDate = ArrayDate.filter((obj, index) => ArrayDate.indexOf(obj) === index);
                  ArrayDate.map(obj => {
                     const Arr = ValidCartList.filter(obj_1 => new Date(obj_1.Date).valueOf() === obj);
                     const NewObj = {
                        DeliveryDate: new Date(obj),
                        Products: Arr
                     };
                     CartListGroup.push(NewObj);
                  });

                  var MonyHistorySchema = [];
                  var StockHistorySchema = [];
                  var LastAvailableLimit = Customer.VilfreshMoney_Limit;
                  var CurrentStackUpdate = [];
                  var NotificationArray = [{
                     Status: 'CustomerCreate_Order',
							Title: 'Customer Create Order',
                     Message: 'Order Create to Customer Name: ' + Customer.Customer_Name + ', Mobile No: ' + Customer.Mobile_Number + ' & Order date:' + moment(new Date()).format("DD-MM-YYYY")
                  }, {
                     Status: 'CustomerGenerator_Order',
							Title: 'Customer Generator Order',
                     Message: 'Order generator to Customer Name: ' + Customer.Customer_Name + ', Mobile No: ' + Customer.Mobile_Number + ' & Order date:' + moment(new Date()).format("DD-MM-YYYY")
                  }];

                  var NewOrdersSchema = [];
                  if (CartListGroup.length > 0) {
                     CartListGroup.map(obj => {
                        const NewId = mongoose.Types.ObjectId();
                        const ItemsArr = [];
                        var Payable_Amount = 0;

                        obj.Products.map(obj_1 => {
                           Payable_Amount = Payable_Amount + (obj_1.ProductId.Price * obj_1.Quantity);
                           const Product = {
                              ProductId: mongoose.Types.ObjectId(obj_1.ProductId._id),
                              FromCart: obj_1._id,
                              Quantity: obj_1.Quantity,
                              BasicUnitQuantity: obj_1.ProductId.BasicUnitQuantity,
                              Unit_Price: obj_1.ProductId.Price,
                              Total_Amount: (obj_1.ProductId.Price * obj_1.Quantity),
                           };
                           ItemsArr.push(Product);
                           if (obj_1.ProductId.Stackable) {
                              const Create_StockHistory = new ProductManagement.StockHistoryManagementSchema({
                                 ProductId: Product.ProductId,
                                 OdooId: obj_1.ProductId.OdooId,
                                 Previous_Stock: obj_1.ProductId.Current_Stock,
                                 Current_Stock: obj_1.ProductId.Current_Stock - (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                                 Total_Stock: obj_1.ProductId.Total_Stock,
                                 ChangeType: 'Reduce_By_Order',
                                 Quantity: (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                                 If_orderedId: NewId,
                                 Active_Status: true,
                                 If_Deleted: false
                              });
                              CurrentStackUpdate.push({
                                 ProductId: Product.ProductId,
                                 Previous_Stock: obj_1.ProductId.Current_Stock,
                                 Current_Stock: obj_1.ProductId.Current_Stock - (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                              });
                              StockHistorySchema.push(Create_StockHistory);
                           }
                        });
                        const Create_Order = new OrderManagement.OrderSchema({
                           _id: NewId,
                           CustomerId: ReceivingData.CustomerId,
                           // FromCart: obj._id,
                           FromBasket: null,
                           Order_Reference: 'Ord-' + LastOrder_Reference.toString().padStart(9, '0'),
                           Order_Unique: LastOrder_Reference,
                           Order_Type: 'From_Order',
                           Item_Details: ItemsArr,
                           Item_Counts: ItemsArr.length,
                           Payable_Amount: Payable_Amount,
                           Payment_Status: 'Paid', // Paid , UnPaid
                           Payment_Type: 'Wallet', // Wallet, Online, Credit, Partial_WalletOnline, Partial_WalletCredit
                           If_Partial: false,
                           ReduceFrom_Wallet: TotalPayableAmount,
                           ReduceFrom_Online: 0,
                           ReduceFrom_Credit: 0,
                           DeliveryDate: obj.DeliveryDate,
                           Region: Customer.Region,
                           OrderConfirmed: false,
                           OrderConfirmedBy: null,
                           DeliveredSession: '',
                           OrderDelivered: false,
                           DeliveredDateTime: null,
                           DeliveryNotes: '',
                           OrderUnDelivered: false,
                           DeliveryPerson: null,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        LastOrder_Reference = LastOrder_Reference + 1;
                        NewOrdersSchema.push(Create_Order);
                        const AvailableLimit = LastAvailableLimit - Payable_Amount;
                        const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                           Customer: ReceivingData.CustomerId,
                           Amount: Payable_Amount,
                           Date: new Date(),
                           Previous_Limit: LastAvailableLimit,
                           Available_Limit: AvailableLimit,
                           Added_or_Reduced: "Reduced",
                           Added_Type: "",
                           Added_Reference_Id: null,
                           Added_By_User: null,
                           CashFrom_DeliveryPerson: null,
                           Added_Approved_Status: null,
                           DateOf_Approved: new Date(),
                           Added_Approved_By: null,
                           PurposeOf_Reduce: "By_Order",
                           Order_Id: NewId,
                           Order_By: "Customer",
                           Order_By_Person: "",
                           Region: Customer.Region,
                           Active_Status: true,
                           If_Deleted: false,
                        });
                        LastAvailableLimit = AvailableLimit;
                        MonyHistorySchema.push(Create_VilfreshMoneyHistory);
                     });
                  }

                  Promise.all([
                     NewOrdersSchema.map(obj => obj.save()),
                     StockHistorySchema.map(obj => obj.save()),
                     MonyHistorySchema.map(obj => obj.save()),
                     CurrentStackUpdate.map(obj => ProductManagement.ProductManagementSchema
                        .updateOne(
                           { _id: obj.ProductId },
                           { $set: { Current_Stock: obj.Current_Stock } }).exec()),
                     ValidCartList.map(obj => MyCart_History.MyCartSchema.updateOne({ _id: obj._id }, { $set: { Active_Status: false } }).exec()),
                     Customer_Management.CustomerManagementSchema.updateOne({ _id: Customer._id }, { $set: { VilfreshMoney_Limit: LastAvailableLimit } }).exec()
                  ]).then(response_1 => {
                     NotificationArray.map(Obj => {
                        const Notification = new NotificationModel.NotificationSchema({
                           User: mongoose.Types.ObjectId(Customer.ApprovedBy_User),
                           CustomerID: Customer._id,
                           DeliveryBoyID: null,
                           Notification_Type: Obj.Status,
                           MessageTitle: Obj.Title,
									Message: Obj.Message,
                           Message_Received: false,
                           Message_Viewed: false,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        Notification.save();
                     });
                     res.status(200).send({ Http_Code: 200, Status: true, Message: "Success!" });
                  }).catch(error_1 => {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error_1 });
                  });
               } else {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "This Order Payable Amount is less than your Wallet Balance, Please Increase your limit before proceeding this Order." });
               }
            } else {
               res.status(200).send({ Http_Code: 400, Status: true, Message: "MyCart Details Empty!" });
            }
         } else {
            res.status(417).send({ Http_Code: 200, Status: true, Message: "Your APP access UnAvailable...Please Contact our Vilfresh Team!!." });
         }
      }).catch(error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
      });
   }
};


// Order Management system -----------------------------------------------------------
exports.OnlinePayment_Order = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.PaymentMode || ReceivingData.PaymentMode !== 'Online_Payment') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Payment Mode can not be empty" });
   } else if (!ReceivingData.PaymentAmount) {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Payment Amount can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.Date = moment(ReceivingData.Date, "YYYY-MM-DD").toDate();
      Promise.all([
         MyCart_History.MyCartSchema.find({ CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).populate({ path: "ProductId" }).exec(),
         Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).exec(),
         OrderManagement.OrderSchema.findOne({ Active_Status: true, If_Deleted: false }, {}, { sort: { Order_Unique: -1 } }).exec(),
         ReferralManagement.ReferralManagementSchema.findOne({ Nominated: ReceivingData.CustomerId, RewardCompleted: false }).exec(),
      ]).then(response => {
         ReceivingData.PaymentAmount = Number(ReceivingData.PaymentAmount);
         var CartList = JSON.parse(JSON.stringify(response[0]));
         var Customer = response[1];
         var LastOrder = response[2];
         var Referral = response[3];
         var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
         if (Customer !== null && Customer.IfApprovedBy_User === true) {
            if (CartList.length !== 0) {
               var LastOrder_Reference = LastOrder !== null ? (LastOrder.Order_Unique + 1) : 1;
               var ValidCartList = [];
               CartList.map(obj => {
                  if (obj.ProductId.Stackable === false || obj.ProductId.Current_Stock >= (obj.Quantity * obj.ProductId.BasicUnitQuantity)) {
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

                     if (DeliveryDateExceed === false) {
                        ValidCartList.push(obj);
                     }
                  }
               });
               var TotalPayableAmount = 0;
               ValidCartList.map(obj => {
                  TotalPayableAmount = TotalPayableAmount + (obj.Quantity * obj.ProductId.Price);
               });
               if (TotalPayableAmount <= ReceivingData.PaymentAmount) {
                  var ArrayDate = [];
                  var CartListGroup = [];
                  ValidCartList.map(obj => {
                     obj.Date = new Date(obj.Date);
                     ArrayDate.push(obj.Date.valueOf());
                  });
                  ArrayDate = ArrayDate.filter((obj, index) => ArrayDate.indexOf(obj) === index);
                  ArrayDate.map(obj => {
                     const Arr = ValidCartList.filter(obj_1 => new Date(obj_1.Date).valueOf() === obj);
                     const NewObj = {
                        DeliveryDate: new Date(obj),
                        Products: Arr
                     };
                     CartListGroup.push(NewObj);
                  });


                  var StockHistorySchema = [];
                  var CurrentStackUpdate = [];
                  var NotificationArray = [{
                     Status: 'CustomerCreate_Order',
							Title: 'Customer Create Order',
                     Message: 'Order Create to Customer Name: ' + Customer.Customer_Name + ', Mobile No: ' + Customer.Mobile_Number + ' & Order date:' + moment(new Date()).format("DD-MM-YYYY")
                  }, {
                     Status: 'CustomerGenerator_Order',
							Title: 'Customer Generator Order',
                     Message: 'Order generator to Customer Name: ' + Customer.Customer_Name + ', Mobile No: ' + Customer.Mobile_Number + ' & Order date:' + moment(new Date()).format("DD-MM-YYYY")
                  }];

                  var NewOrdersSchema = [];
                  if (CartListGroup.length > 0) {
                     CartListGroup.map(obj => {
                        const NewId = mongoose.Types.ObjectId();
                        const ItemsArr = [];
                        var Payable_Amount = 0;

                        obj.Products.map(obj_1 => {
                           Payable_Amount = Payable_Amount + (obj_1.ProductId.Price * obj_1.Quantity);
                           const Product = {
                              ProductId: mongoose.Types.ObjectId(obj_1.ProductId._id),
                              FromCart: obj_1._id,
                              Quantity: obj_1.Quantity,
                              BasicUnitQuantity: obj_1.ProductId.BasicUnitQuantity,
                              Unit_Price: obj_1.ProductId.Price,
                              Total_Amount: (obj_1.ProductId.Price * obj_1.Quantity),
                           };
                           ItemsArr.push(Product);
                           if (obj_1.ProductId.Stackable) {
                              const Create_StockHistory = new ProductManagement.StockHistoryManagementSchema({
                                 ProductId: Product.ProductId,
                                 OdooId: obj_1.ProductId.OdooId,
                                 Previous_Stock: obj_1.ProductId.Current_Stock,
                                 Current_Stock: obj_1.ProductId.Current_Stock - (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                                 Total_Stock: obj_1.ProductId.Total_Stock,
                                 ChangeType: 'Reduce_By_Order',
                                 Quantity: (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                                 If_orderedId: NewId,
                                 Active_Status: true,
                                 If_Deleted: false
                              });
                              CurrentStackUpdate.push({
                                 ProductId: Product.ProductId,
                                 Previous_Stock: obj_1.ProductId.Current_Stock,
                                 Current_Stock: obj_1.ProductId.Current_Stock - (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                              });
                              StockHistorySchema.push(Create_StockHistory);
                           }
                        });

                        const Create_Order = new OrderManagement.OrderSchema({
                           _id: NewId,
                           CustomerId: ReceivingData.CustomerId,
                           // FromCart: obj._id,
                           FromBasket: null,
                           Order_Reference: 'Ord-' + LastOrder_Reference.toString().padStart(9, '0'),
                           Order_Unique: LastOrder_Reference,
                           Order_Type: 'From_Order',
                           Item_Details: ItemsArr,
                           Item_Counts: ItemsArr.length,
                           Payable_Amount: Payable_Amount,
                           Payment_Status: 'Paid', // Paid , UnPaid
                           Payment_Type: 'Online', // Wallet, Online, Credit, Partial_WalletOnline, Partial_WalletCredit
                           If_Partial: false,
                           ReduceFrom_Wallet: 0,
                           ReduceFrom_Online: ReceivingData.PaymentAmount,
                           ReduceFrom_Credit: 0,
                           DeliveryDate: obj.DeliveryDate,
                           Region: Customer.Region,
                           OrderConfirmed: false,
                           DeliveredSession: '',
                           OrderConfirmedBy: null,
                           OrderDelivered: false,
                           DeliveredDateTime: null,
                           DeliveryNotes: '',
                           OrderUnDelivered: false,
                           DeliveryPerson: null,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        LastOrder_Reference = LastOrder_Reference + 1;
                        NewOrdersSchema.push(Create_Order);
                     });
                  }

                  Promise.all([
                     NewOrdersSchema.map(obj => obj.save()),
                     StockHistorySchema.map(obj => obj.save()),
                     CurrentStackUpdate.map(obj => ProductManagement.ProductManagementSchema
                        .updateOne(
                           { _id: obj.ProductId },
                           { $set: { Current_Stock: obj.Current_Stock } }).exec()),
                     ValidCartList.map(obj => MyCart_History.MyCartSchema.updateOne({ _id: obj._id }, { $set: { Active_Status: false } }).exec()),
                  ]).then(response_1 => {
                     if (Referral !== null) {
                        ReferralPayment.ReferralPayment(Referral._id, return_response => { });
                     }
                     NotificationArray.map(Obj => {
                        const Notification = new NotificationModel.NotificationSchema({
                           User: mongoose.Types.ObjectId(Customer.ApprovedBy_User),
                           CustomerID: Customer._id,
                           DeliveryBoyID: null,
                           Notification_Type: Obj.Status,
									MessageTitle: Obj.Title,
                           Message: Obj.Message,
                           Message_Received: false,
                           Message_Viewed: false,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        Notification.save();
                     });
                     res.status(200).send({ Http_Code: 200, Status: true, Message: "Success!" });
                  }).catch(error_1 => {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error_1 });
                  });
               } else {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "This Order Payable Amount is less than your Wallet Balance, Please Increase your limit before proceeding this Order." });
               }
            } else {
               res.status(200).send({ Http_Code: 400, Status: true, Message: "MyCart Details Empty!" });
            }
         } else {
            res.status(417).send({ Http_Code: 200, Status: true, Message: "Your App access Unavailable... Please Contact to Vilfresh Team!!." });
         }

      }).catch(error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
      });
   }
};


// Credit Limit & Reduce -------------------------------------------------------------
exports.CreditLimit_Order = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.PaymentMode || ReceivingData.PaymentMode !== 'CreditLimit_Reduce') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Payment Mode can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.Date = moment(ReceivingData.Date, "YYYY-MM-DD").toDate();
      Promise.all([
         MyCart_History.MyCartSchema.find({ CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).populate({ path: "ProductId" }).exec(),
         Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).exec(),
         OrderManagement.OrderSchema.findOne({ Active_Status: true, If_Deleted: false }, {}, { sort: { Order_Unique: -1 } }).exec(),
      ]).then(response => {
         var CartList = JSON.parse(JSON.stringify(response[0]));
         var Customer = response[1];
         var LastOrder = response[2];
         var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
         if (Customer !== null && Customer.IfApprovedBy_User === true) {
            if (CartList.length !== 0) {
               var LastOrder_Reference = LastOrder !== null ? (LastOrder.Order_Unique + 1) : 1;
               var ValidCartList = [];
               CartList.map(obj => {
                  if (obj.ProductId.Stackable === false || obj.ProductId.Current_Stock >= (obj.Quantity * obj.ProductId.BasicUnitQuantity)) {
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

                     if (DeliveryDateExceed === false) {
                        ValidCartList.push(obj);
                     }
                  }
               });
               var TotalPayableAmount = 0;
               ValidCartList.map(obj => {
                  TotalPayableAmount = TotalPayableAmount + (obj.Quantity * obj.ProductId.Price);
               });
               if (TotalPayableAmount <= Customer.AvailableCredit_Limit) {
                  var ArrayDate = [];
                  var CartListGroup = [];
                  ValidCartList.map(obj => {
                     obj.Date = new Date(obj.Date);
                     ArrayDate.push(obj.Date.valueOf());
                  });
                  ArrayDate = ArrayDate.filter((obj, index) => ArrayDate.indexOf(obj) === index);
                  ArrayDate.map(obj => {
                     const Arr = ValidCartList.filter(obj_1 => new Date(obj_1.Date).valueOf() === obj);
                     const NewObj = {
                        DeliveryDate: new Date(obj),
                        Products: Arr
                     };
                     CartListGroup.push(NewObj);
                  });

                  var CreditHistorySchema = [];
                  var StockHistorySchema = [];
                  var LastAvailableLimit = Customer.AvailableCredit_Limit;
                  var CurrentStackUpdate = [];
                  var NotificationArray = [{
                     Status: 'CustomerCreate_Order',
							Title: 'Customer Create Order',
                     Message: 'Order Create to Customer Name: ' + Customer.Customer_Name + ', Mobile No: ' + Customer.Mobile_Number + ' & Order date:' + moment(new Date()).format("DD-MM-YYYY")
                  }, {
                     Status: 'CustomerGenerator_Order',
							Title: 'Customer Generator Order',
                     Message: 'Order generator to Customer Name: ' + Customer.Customer_Name + ', Mobile No: ' + Customer.Mobile_Number + ' & Order date:' + moment(new Date()).format("DD-MM-YYYY")
                  }];

                  var NewOrdersSchema = [];
                  if (CartListGroup.length > 0) {
                     CartListGroup.map(obj => {
                        const NewId = mongoose.Types.ObjectId();
                        const ItemsArr = [];
                        var Payable_Amount = 0;
                        obj.Products.map(obj_1 => {
                           Payable_Amount = Payable_Amount + (obj_1.ProductId.Price * obj_1.Quantity);
                           const Product = {
                              ProductId: mongoose.Types.ObjectId(obj_1.ProductId._id),
                              FromCart: obj_1._id,
                              Quantity: obj_1.Quantity,
                              BasicUnitQuantity: obj_1.ProductId.BasicUnitQuantity,
                              Unit_Price: obj_1.ProductId.Price,
                              Total_Amount: (obj_1.ProductId.Price * obj_1.Quantity)
                           };
                           ItemsArr.push(Product);
                           if (obj_1.ProductId.Stackable) {
                              const Create_StockHistory = new ProductManagement.StockHistoryManagementSchema({
                                 ProductId: Product.ProductId,
                                 OdooId: obj_1.ProductId.OdooId,
                                 Previous_Stock: obj_1.ProductId.Current_Stock,
                                 Current_Stock: obj_1.ProductId.Current_Stock - (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                                 Total_Stock: obj_1.ProductId.Total_Stock,
                                 ChangeType: 'Reduce_By_Order',
                                 Quantity: (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                                 If_orderedId: NewId,
                                 Active_Status: true,
                                 If_Deleted: false
                              });
                              CurrentStackUpdate.push({
                                 ProductId: Product.ProductId,
                                 Previous_Stock: obj_1.ProductId.Current_Stock,
                                 Current_Stock: obj_1.ProductId.Current_Stock - (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                              });
                              StockHistorySchema.push(Create_StockHistory);
                           }
                        });
                        const Create_Order = new OrderManagement.OrderSchema({
                           _id: NewId,
                           CustomerId: ReceivingData.CustomerId,
                           // FromCart: obj._id,
                           FromBasket: null,
                           Order_Reference: 'Ord-' + LastOrder_Reference.toString().padStart(9, '0'),
                           Order_Unique: LastOrder_Reference,
                           Order_Type: 'From_Order',
                           Item_Details: ItemsArr,
                           Item_Counts: ItemsArr.length,
                           Payable_Amount: Payable_Amount,
                           Payment_Status: 'Paid', // Paid , UnPaid
                           Payment_Type: 'Credit', // Wallet, Online, Credit, Partial_WalletOnline, Partial_WalletCredit
                           If_Partial: false,
                           ReduceFrom_Wallet: 0,
                           ReduceFrom_Online: 0,
                           ReduceFrom_Credit: TotalPayableAmount,
                           DeliveryDate: obj.DeliveryDate,
                           Region: Customer.Region,
                           OrderConfirmed: false,
                           OrderConfirmedBy: null,
                           DeliveredSession: '',
                           OrderDelivered: false,
                           DeliveredDateTime: null,
                           DeliveryNotes: '',
                           OrderUnDelivered: false,
                           DeliveryPerson: null,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        LastOrder_Reference = LastOrder_Reference + 1;
                        NewOrdersSchema.push(Create_Order);
                        const AvailableLimit = LastAvailableLimit - Payable_Amount;
                        const Create_VilfreshCreditHistory = new VilfreshCredit_Limit.VilfreshCreditHistorySchema({
                           Customer: ReceivingData.CustomerId,
                           Date: new Date(),
                           Credit_Limit: Customer.VilfreshCredit_Limit,
                           Previous_AvailableLimit: LastAvailableLimit,
                           Available_Limit: AvailableLimit,
                           Added_or_Reduced: "Reduced",
                           Added_Type: "",
                           Added_Reference_Id: null,
                           Added_By_User: null,
                           Added_Approved_Status: null,
                           DateOf_Approved: new Date(),
                           Added_Approved_By: null,
                           PurposeOf_Reduce: "By_Order",
                           Order_Id: NewId,
                           Order_By: "Customer",
                           Order_By_Person: "",
                           Region: Customer.Region,
                           Active_Status: true,
                           If_Deleted: false,
                        });
                        LastAvailableLimit = AvailableLimit;
                        CreditHistorySchema.push(Create_VilfreshCreditHistory);
                     });
                  }
                  Promise.all([
                     NewOrdersSchema.map(obj => obj.save()),
                     StockHistorySchema.map(obj => obj.save()),
                     CreditHistorySchema.map(obj => obj.save()),
                     CurrentStackUpdate.map(obj => ProductManagement.ProductManagementSchema
                        .updateOne(
                           { _id: obj.ProductId },
                           { $set: { Current_Stock: obj.Current_Stock } }).exec()),
                     ValidCartList.map(obj => MyCart_History.MyCartSchema.updateOne({ _id: obj._id }, { $set: { Active_Status: false } }).exec()),
                     Customer_Management.CustomerManagementSchema.updateOne({ _id: Customer._id }, { $set: { AvailableCredit_Limit: LastAvailableLimit } }).exec()
                  ]).then(response_1 => {
                     NotificationArray.map(Obj => {
                        const Notification = new NotificationModel.NotificationSchema({
                           User: mongoose.Types.ObjectId(Customer.ApprovedBy_User),
                           CustomerID: Customer._id,
                           DeliveryBoyID: null,
                           Notification_Type: Obj.Status,
									MessageTitle: Obj.Title,
                           Message: Obj.Message,
                           Message_Received: false,
                           Message_Viewed: false,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        Notification.save();
                     });
                     res.status(200).send({ Http_Code: 200, Status: true, Message: "Success!" });
                  }).catch(error_1 => {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error_1 });
                  });
               } else {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "This Order Payable Amount is less than your Wallet Balance, Please Increase your Available limit before proceeding this Order." });
               }
            } else {
               res.status(200).send({ Http_Code: 400, Status: true, Message: "MyCart Details Empty!" });
            }
         } else {
            res.status(417).send({ Http_Code: 200, Status: true, Message: "Your App access UnAvailable.... Please Contact to Vilfresh Team!." });
         }
      }).catch(error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
      });
   }
};


// Credit Limit & Wallet Money with Reduce -------------------------------------------------------------
exports.PartialOrder_Wallet_And_Credit_Reduce = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.PaymentMode || ReceivingData.PaymentMode !== 'WalletAndCredit_Reduce') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Payment Mode can not be empty" });
   } else if (!ReceivingData.If_Partial || ReceivingData.If_Partial !== true) {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "If Partial details can not be empty" });
   } else if (!ReceivingData.ReduceFrom_Credit && !ReceivingData.ReduceFrom_Wallet) {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "If Partial amount details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.Date = moment(ReceivingData.Date, "YYYY-MM-DD").toDate();
      Promise.all([
         MyCart_History.MyCartSchema.find({ CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).populate({ path: "ProductId" }).exec(),
         Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).exec(),
         OrderManagement.OrderSchema.findOne({ Active_Status: true, If_Deleted: false }, {}, { sort: { Order_Unique: -1 } }).exec(),
      ]).then(response => {
         var CartList = JSON.parse(JSON.stringify(response[0]));
         var Customer = response[1];
         var LastOrder = response[2];
         ReceivingData.ReduceFrom_Credit = Number(ReceivingData.ReduceFrom_Credit);
         ReceivingData.ReduceFrom_Wallet = Number(ReceivingData.ReduceFrom_Wallet);
         var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
         if (Customer !== null && Customer.IfApprovedBy_User === true) {
            var Partial_TotalAmount = (ReceivingData.ReduceFrom_Wallet + ReceivingData.ReduceFrom_Credit);
            if (CartList.length !== 0) {
               var LastOrder_Reference = LastOrder !== null ? (LastOrder.Order_Unique + 1) : 1;
               var ValidCartList = [];
               CartList.map(obj => {
                  if (obj.ProductId.Stackable === false || obj.ProductId.Current_Stock >= (obj.Quantity * obj.ProductId.BasicUnitQuantity)) {
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

                     if (DeliveryDateExceed === false) {
                        ValidCartList.push(obj);
                     }
                  }
               });
               var TotalPayableAmount = 0;
               ValidCartList.map(obj => {
                  TotalPayableAmount = TotalPayableAmount + (obj.Quantity * obj.ProductId.Price);
               });
               if (TotalPayableAmount <= Partial_TotalAmount) {
                  var ArrayDate = [];
                  var CartListGroup = [];
                  ValidCartList.map(obj => {
                     obj.Date = new Date(obj.Date);
                     ArrayDate.push(obj.Date.valueOf());
                  });
                  ArrayDate = ArrayDate.filter((obj, index) => ArrayDate.indexOf(obj) === index);
                  ArrayDate.map(obj => {
                     const Arr = ValidCartList.filter(obj_1 => new Date(obj_1.Date).valueOf() === obj);
                     const NewObj = {
                        DeliveryDate: new Date(obj),
                        Products: Arr
                     };
                     CartListGroup.push(NewObj);
                  });

                  var MonyHistorySchema = [];
                  var StockHistorySchema = [];
                  var CreditHistorySchema = [];
                  var LastCreditLimit = Customer.AvailableCredit_Limit;
                  var LastWalletLimit = Customer.VilfreshMoney_Limit;
                  var CurrentStackUpdate = [];
                  var NotificationArray = [{
                     Status: 'CustomerCreate_Order',
							Title: 'Customer Create Order',
                     Message: 'Order Create to Customer Name: ' + Customer.Customer_Name + ', Mobile No: ' + Customer.Mobile_Number + ' & Order date:' + moment(new Date()).format("DD-MM-YYYY")
                  }, {
                     Status: 'CustomerGenerator_Order',
							Title: 'Customer Generator Order',
                     Message: 'Order generator to Customer Name: ' + Customer.Customer_Name + ', Mobile No: ' + Customer.Mobile_Number + ' & Order date:' + moment(new Date()).format("DD-MM-YYYY")
                  }];

                  var NewOrdersSchema = [];
                  if (CartListGroup.length > 0) {
                     CartListGroup.map(obj => {
                        const NewId = mongoose.Types.ObjectId();
                        const ItemsArr = [];
                        var Payable_Amount = 0;

                        obj.Products.map(obj_1 => {
                           Payable_Amount = Payable_Amount + (obj_1.ProductId.Price * obj_1.Quantity);
                           const Product = {
                              ProductId: mongoose.Types.ObjectId(obj_1.ProductId._id),
                              FromCart: obj_1._id,
                              Quantity: obj_1.Quantity,
                              BasicUnitQuantity: obj_1.ProductId.BasicUnitQuantity,
                              Unit_Price: obj_1.ProductId.Price,
                              Total_Amount: (obj_1.ProductId.Price * obj_1.Quantity),
                           };
                           ItemsArr.push(Product);
                           if (obj_1.ProductId.Stackable) {
                              const Create_StockHistory = new ProductManagement.StockHistoryManagementSchema({
                                 ProductId: Product.ProductId,
                                 OdooId: obj_1.ProductId.OdooId,
                                 Previous_Stock: obj_1.ProductId.Current_Stock,
                                 Current_Stock: obj_1.ProductId.Current_Stock - (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                                 Total_Stock: obj_1.ProductId.Total_Stock,
                                 ChangeType: 'Reduce_By_Order',
                                 Quantity: (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                                 If_orderedId: NewId,
                                 Active_Status: true,
                                 If_Deleted: false
                              });
                              CurrentStackUpdate.push({
                                 ProductId: Product.ProductId,
                                 Previous_Stock: obj_1.ProductId.Current_Stock,
                                 Current_Stock: obj_1.ProductId.Current_Stock - (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                              });
                              StockHistorySchema.push(Create_StockHistory);
                           }
                        });

                        var PayType = 'Partial_WalletCredit';
                        var Wallet = 0;
                        var Credit = 0;

                        if (Payable_Amount <= ReceivingData.ReduceFrom_Wallet) {
                           PayType = 'Wallet';
                           Wallet = Payable_Amount;
                           ReceivingData.ReduceFrom_Wallet = ReceivingData.ReduceFrom_Wallet - Payable_Amount;
                           Credit = 0;
                        } else if (ReceivingData.ReduceFrom_Wallet > 0) {
                           PayType = 'Partial_WalletCredit';
                           Wallet = ReceivingData.ReduceFrom_Wallet;
                           ReceivingData.ReduceFrom_Wallet = 0;
                           Credit = Payable_Amount - Wallet;
                           ReceivingData.ReduceFrom_Credit = ReceivingData.ReduceFrom_Credit - Credit;
                        } else {
                           PayType = 'Credit';
                           Wallet = 0;
                           Credit = Payable_Amount;
                           ReceivingData.ReduceFrom_Credit = ReceivingData.ReduceFrom_Credit - Payable_Amount;
                        }

                        const Create_Order = new OrderManagement.OrderSchema({
                           _id: NewId,
                           CustomerId: ReceivingData.CustomerId,
                           // FromCart: obj._id,
                           FromBasket: null,
                           Order_Reference: 'Ord-' + LastOrder_Reference.toString().padStart(9, '0'),
                           Order_Unique: LastOrder_Reference,
                           Order_Type: 'From_Order',
                           Item_Details: ItemsArr,
                           Item_Counts: ItemsArr.length,
                           Payable_Amount: Payable_Amount,
                           Payment_Status: 'Paid',
                           Payment_Type: PayType,
                           If_Partial: (PayType === 'Partial_WalletCredit' ? true : false),
                           ReduceFrom_Wallet: Wallet,
                           ReduceFrom_Online: 0,
                           ReduceFrom_Credit: Credit,
                           DeliveryDate: obj.DeliveryDate,
                           Region: Customer.Region,
                           OrderConfirmed: false,
                           OrderConfirmedBy: null,
                           DeliveredSession: '',
                           OrderDelivered: false,
                           DeliveredDateTime: null,
                           DeliveryNotes: '',
                           OrderUnDelivered: false,
                           DeliveryPerson: null,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        NewOrdersSchema.push(Create_Order);
                        LastOrder_Reference = LastOrder_Reference + 1;

                        if (Wallet > 0) {
                           const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                              Customer: ReceivingData.CustomerId,
                              Amount: Wallet,
                              Date: new Date(),
                              Previous_Limit: LastWalletLimit,
                              Available_Limit: LastWalletLimit - Wallet,
                              Added_or_Reduced: "Reduced",
                              Added_Type: "",
                              Added_Reference_Id: null,
                              Added_By_User: null,
                              CashFrom_DeliveryPerson: null,
                              Added_Approved_Status: null,
                              DateOf_Approved: new Date(),
                              Added_Approved_By: null,
                              PurposeOf_Reduce: "By_Order",
                              Order_Id: NewId,
                              Order_By: "Customer",
                              Order_By_Person: "",
                              Region: Customer.Region,
                              Active_Status: true,
                              If_Deleted: false,
                           });
                           LastWalletLimit = LastWalletLimit - Wallet;
                           MonyHistorySchema.push(Create_VilfreshMoneyHistory);
                        }
                        if (Credit > 0) {
                           const Create_VilfreshCreditHistory = new VilfreshCredit_Limit.VilfreshCreditHistorySchema({
                              Customer: ReceivingData.CustomerId,
                              Date: new Date(),
                              Credit_Limit: Customer.VilfreshCredit_Limit,
                              Previous_AvailableLimit: LastCreditLimit,
                              Available_Limit: LastCreditLimit - Credit,
                              Added_or_Reduced: "Reduced",
                              Added_Type: "",
                              Added_Reference_Id: null,
                              Added_By_User: null,
                              Added_Approved_Status: null,
                              DateOf_Approved: new Date(),
                              Added_Approved_By: null,
                              PurposeOf_Reduce: "By_Order",
                              Order_Id: NewId,
                              Order_By: "Customer",
                              Order_By_Person: "",
                              Region: Customer.Region,
                              Active_Status: true,
                              If_Deleted: false,
                           });
                           LastCreditLimit = LastCreditLimit - Credit;
                           CreditHistorySchema.push(Create_VilfreshCreditHistory);
                        }
                     });
                  }
                  Promise.all([
                     NewOrdersSchema.map(obj => obj.save()),
                     StockHistorySchema.map(obj => obj.save()),
                     MonyHistorySchema.map(obj => obj.save()),
                     CreditHistorySchema.map(obj => obj.save()),
                     CurrentStackUpdate.map(obj => ProductManagement.ProductManagementSchema
                        .updateOne(
                           { _id: obj.ProductId },
                           { $set: { Current_Stock: obj.Current_Stock } }).exec()),
                     ValidCartList.map(obj => MyCart_History.MyCartSchema.updateOne({ _id: obj._id }, { $set: { Active_Status: false } }).exec()),
                     Customer_Management.CustomerManagementSchema.updateOne({ _id: Customer._id }, { $set: { VilfreshMoney_Limit: LastWalletLimit, AvailableCredit_Limit: LastCreditLimit } }).exec()
                  ]).then(response_1 => {
                     NotificationArray.map(Obj => {
                        const Notification = new NotificationModel.NotificationSchema({
                           User: mongoose.Types.ObjectId(Customer.ApprovedBy_User),
                           CustomerID: Customer._id,
                           DeliveryBoyID: null,
                           Notification_Type: Obj.Status,
									MessageTitle: Obj.Title,
                           Message: Obj.Message,
                           Message_Received: false,
                           Message_Viewed: false,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        Notification.save();
                     });
                     res.status(200).send({ Http_Code: 200, Status: true, Message: "Success!" });
                  }).catch(error_1 => {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error_1 });
                  });
               } else {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "This Order Payable Amount is less than your Wallet Balance, Please Increase your Available limit before proceeding this Order." });
               }
            } else {
               res.status(200).send({ Http_Code: 400, Status: true, Message: "MyCart Details Empty!" });
            }
         } else {
            res.status(200).send({ Http_Code: 200, Status: true, Message: "Your App access UnAvailable...Please Contact to Vilfresh Team!" });
         }
      }).catch(error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
      });
   }
};


// Online Payment & Wallet Money with Reduce -------------------------------------------------------------
exports.PartialOrder_Wallet_And_Online_Reduce = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.PaymentMode || ReceivingData.PaymentMode !== 'WalletAndOnline_Reduce') {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "Payment Mode can not be empty" });
   } else if (!ReceivingData.If_Partial || ReceivingData.If_Partial !== true) {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "If Partial details can not be empty" });
   } else if (!ReceivingData.ReduceFrom_Online && !ReceivingData.ReduceFrom_Wallet) {
      res.status(200).send({ Http_Code: 400, Status: false, Message: "If Partial amount details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.Date = moment(ReceivingData.Date, "YYYY-MM-DD").toDate();
      Promise.all([
         MyCart_History.MyCartSchema.find({ CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }).populate({ path: "ProductId" }).exec(),
         Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).exec(),
         OrderManagement.OrderSchema.findOne({ Active_Status: true, If_Deleted: false }, {}, { sort: { Order_Unique: -1 } }).exec(),
         ReferralManagement.ReferralManagementSchema.findOne({ Nominated: ReceivingData.CustomerId, RewardCompleted: false }).exec(),
      ]).then(response => {
         var CartList = JSON.parse(JSON.stringify(response[0]));
         var Customer = response[1];
         var LastOrder = response[2];
         var Referral = response[3];
         var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
         ReceivingData.ReduceFrom_Wallet = Number(ReceivingData.ReduceFrom_Wallet);
         ReceivingData.ReduceFrom_Online = Number(ReceivingData.ReduceFrom_Online);
         var Partial_TotalAmount = (ReceivingData.ReduceFrom_Wallet + ReceivingData.ReduceFrom_Online);
         if (Customer !== null && Customer.IfApprovedBy_User === true) {
            if (CartList.length !== 0) {
               var LastOrder_Reference = LastOrder !== null ? (LastOrder.Order_Unique + 1) : 1;
               var ValidCartList = [];
               CartList.map(obj => {
                  if (obj.ProductId.Stackable === false || obj.ProductId.Current_Stock >= (obj.Quantity * obj.ProductId.BasicUnitQuantity)) {
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

                     if (DeliveryDateExceed === false) {
                        ValidCartList.push(obj);
                     }
                  }
               });
               var TotalPayableAmount = 0;
               ValidCartList.map(obj => {
                  TotalPayableAmount = TotalPayableAmount + (obj.Quantity * obj.ProductId.Price);
               });
               if (TotalPayableAmount <= Partial_TotalAmount) {
                  var ArrayDate = [];
                  var CartListGroup = [];
                  ValidCartList.map(obj => {
                     obj.Date = new Date(obj.Date);
                     ArrayDate.push(obj.Date.valueOf());
                  });
                  ArrayDate = ArrayDate.filter((obj, index) => ArrayDate.indexOf(obj) === index);
                  ArrayDate.map(obj => {
                     const Arr = ValidCartList.filter(obj_1 => new Date(obj_1.Date).valueOf() === obj);
                     const NewObj = {
                        DeliveryDate: new Date(obj),
                        Products: Arr
                     };
                     CartListGroup.push(NewObj);
                  });

                  var MonyHistorySchema = [];
                  var StockHistorySchema = [];
                  var LastWalletLimit = Customer.VilfreshMoney_Limit;
                  var CurrentStackUpdate = [];
                  var NotificationArray = [{
                     Status: 'CustomerCreate_Order',
							Title: 'Customer Create Order',
                     Message: 'Order Create to Customer Name: ' + Customer.Customer_Name + ', Mobile No: ' + Customer.Mobile_Number + ' & Order date:' + moment(new Date()).format("DD-MM-YYYY")
                  }, {
                     Status: 'CustomerGenerator_Order',
							Title: 'Customer Generator Order',
                     Message: 'Order generator to Customer Name: ' + Customer.Customer_Name + ', Mobile No: ' + Customer.Mobile_Number + ' & Order date:' + moment(new Date()).format("DD-MM-YYYY")
                  }];

                  var NewOrdersSchema = [];
                  if (CartListGroup.length > 0) {
                     CartListGroup.map(obj => {
                        const NewId = mongoose.Types.ObjectId();
                        const ItemsArr = [];
                        var Payable_Amount = 0;

                        obj.Products.map(obj_1 => {
                           Payable_Amount = Payable_Amount + (obj_1.ProductId.Price * obj_1.Quantity);
                           const Product = {
                              ProductId: mongoose.Types.ObjectId(obj_1.ProductId._id),
                              FromCart: obj_1._id,
                              Quantity: obj_1.Quantity,
                              BasicUnitQuantity: obj_1.ProductId.BasicUnitQuantity,
                              Unit_Price: obj_1.ProductId.Price,
                              Total_Amount: (obj_1.ProductId.Price * obj_1.Quantity),
                           };
                           ItemsArr.push(Product);
                           if (obj_1.ProductId.Stackable) {
                              const Create_StockHistory = new ProductManagement.StockHistoryManagementSchema({
                                 ProductId: Product.ProductId,
                                 OdooId: obj_1.ProductId.OdooId,
                                 Previous_Stock: obj_1.ProductId.Current_Stock,
                                 Current_Stock: obj_1.ProductId.Current_Stock - (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                                 Total_Stock: obj_1.ProductId.Total_Stock,
                                 ChangeType: 'Reduce_By_Order',
                                 Quantity: (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                                 If_orderedId: NewId,
                                 Active_Status: true,
                                 If_Deleted: false
                              });
                              CurrentStackUpdate.push({
                                 ProductId: Product.ProductId,
                                 Previous_Stock: obj_1.ProductId.Current_Stock,
                                 Current_Stock: obj_1.ProductId.Current_Stock - (obj_1.Quantity * obj_1.ProductId.BasicUnitQuantity),
                              });
                              StockHistorySchema.push(Create_StockHistory);
                           }
                        });

                        var PayType = 'Partial_WalletOnline';
                        var Wallet = 0;
                        var Online = 0;

                        if (Payable_Amount <= ReceivingData.ReduceFrom_Wallet) {
                           PayType = 'Wallet';
                           Wallet = Payable_Amount;
                           ReceivingData.ReduceFrom_Wallet = ReceivingData.ReduceFrom_Wallet - Payable_Amount;
                           Online = 0;
                        } else if (ReceivingData.ReduceFrom_Wallet > 0) {
                           PayType = 'Partial_WalletOnline';
                           Wallet = ReceivingData.ReduceFrom_Wallet;
                           ReceivingData.ReduceFrom_Wallet = 0;
                           Online = Payable_Amount - Wallet;
                           ReceivingData.ReduceFrom_Online = ReceivingData.ReduceFrom_Online - Online;
                        } else {
                           PayType = 'Online';
                           Wallet = 0;
                           Online = Payable_Amount;
                           ReceivingData.ReduceFrom_Online = ReceivingData.ReduceFrom_Online - Payable_Amount;
                        }

                        const Create_Order = new OrderManagement.OrderSchema({
                           _id: NewId,
                           CustomerId: ReceivingData.CustomerId,
                           FromCart: obj._id,
                           FromBasket: null,
                           Order_Reference: 'Ord-' + LastOrder_Reference.toString().padStart(9, '0'),
                           Order_Unique: LastOrder_Reference,
                           Order_Type: 'From_Order',
                           Item_Details: ItemsArr,
                           Item_Counts: ItemsArr.length,
                           Payable_Amount: Payable_Amount,
                           Payment_Status: 'Paid',
                           Payment_Type: PayType,
                           If_Partial: (PayType === 'Partial_WalletOnline' ? true : false),
                           ReduceFrom_Wallet: Wallet,
                           ReduceFrom_Online: Online,
                           ReduceFrom_Credit: 0,
                           DeliveryDate: obj.DeliveryDate,
                           Region: Customer.Region,
                           OrderConfirmed: false,
                           OrderConfirmedBy: null,
                           DeliveredSession: '',
                           OrderDelivered: false,
                           DeliveredDateTime: null,
                           DeliveryNotes: '',
                           OrderUnDelivered: false,
                           DeliveryPerson: null,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        NewOrdersSchema.push(Create_Order);
                        LastOrder_Reference = LastOrder_Reference + 1;

                        if (Wallet > 0) {
                           const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                              Customer: ReceivingData.CustomerId,
                              Amount: Wallet,
                              Date: new Date(),
                              Previous_Limit: LastWalletLimit,
                              Available_Limit: LastWalletLimit - Wallet,
                              Added_or_Reduced: "Reduced",
                              Added_Type: "",
                              Added_Reference_Id: null,
                              Added_By_User: null,
                              CashFrom_DeliveryPerson: null,
                              Added_Approved_Status: null,
                              DateOf_Approved: new Date(),
                              Added_Approved_By: null,
                              PurposeOf_Reduce: "By_Order",
                              Order_Id: NewId,
                              Order_By: "Customer",
                              Order_By_Person: "",
                              Region: Customer.Region,
                              Active_Status: true,
                              If_Deleted: false,
                           });
                           LastWalletLimit = LastWalletLimit - Wallet;
                           MonyHistorySchema.push(Create_VilfreshMoneyHistory);
                        }
                     });
                  }

                  Promise.all([
                     NewOrdersSchema.map(obj => obj.save()),
                     StockHistorySchema.map(obj => obj.save()),
                     MonyHistorySchema.map(obj => obj.save()),
                     CurrentStackUpdate.map(obj => ProductManagement.ProductManagementSchema
                        .updateOne(
                           { _id: obj.ProductId },
                           { $set: { Current_Stock: obj.Current_Stock } }).exec()),
                     ValidCartList.map(obj => MyCart_History.MyCartSchema.updateOne({ _id: obj._id }, { $set: { Active_Status: false } }).exec()),
                     Customer_Management.CustomerManagementSchema.updateOne({ _id: Customer._id }, { $set: { VilfreshMoney_Limit: LastWalletLimit } }).exec()
                  ]).then(response_1 => {
                     if (Referral !== null) {
                        ReferralPayment.ReferralPayment(Referral._id, return_response => { });
                     }
                     NotificationArray.map(Obj => {
                        const Notification = new NotificationModel.NotificationSchema({
                           User: mongoose.Types.ObjectId(Customer.ApprovedBy_User),
                           CustomerID: Customer._id,
                           DeliveryBoyID: null,
                           Notification_Type: Obj.Status,
									MessageTitle: Obj.Title,
                           Message: Obj.Message,
                           Message_Received: false,
                           Message_Viewed: false,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        Notification.save();
                     });
                     res.status(200).send({ Http_Code: 200, Status: true, Message: "Success!" });
                  }).catch(error_1 => {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error_1 });
                  });
               } else {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "This Order Payable Amount is less than your Wallet Balance, Please Increase your Available limit before proceeding this Order." });
               }
            } else {
               res.status(200).send({ Http_Code: 400, Status: true, Message: "MyCart Details Empty!" });
            }
         } else {
            res.status(200).send({ Http_Code: 200, Status: true, Message: "Your App access UnAvailable...Please Contact To Vilfresh Team!" });
         }
      }).catch(error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
      });
   }
};


// Order List Details ------------------------------------
exports.OrderManagement_Details = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      const CurrentDate = new Date(new Date().setHours(0, 0, 0, 0));
      const CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
      Promise.all([
         OrderManagement.OrderSchema.find({ CustomerId: ReceivingData.CustomerId, OrderDelivered: false, OrderUnDelivered: false, Active_Status: true, If_Deleted: false }, {}, { sort: { DeliveryDate: -1 } })
            .populate({ path: 'Item_Details.ProductId', select: ["BasicUnitQuantity", "Unit", "File_Name", "Category", "Price", "Product_Name"] }).exec(),
         OrderManagement.OrderSchema.find({ CustomerId: ReceivingData.CustomerId, DeliveryDate: CurrentDate, OrderConfirmed: true, OrderDelivered: false, OrderUnDelivered: false, Active_Status: true, If_Deleted: false }, {}, { sort: { DeliveryDate: -1 } }).exec()
      ]).then(response => {
         var OrdersList = response[0];
         var TodayOrders = response[1];
         var DeliveryTimeCompleted = false;
         const ExistingHr = CurrentSession === 'Morning' ? 8 : 20;
         if ((new Date().getHours() > ExistingHr || (new Date().getHours() === ExistingHr && new Date().getMinutes() >= 30)) && TodayOrders.length > 0) {
            DeliveryTimeCompleted = true;
         }
			// Temporarily hide this option
			DeliveryTimeCompleted = false;
         if (OrdersList.length !== 0) {
            var Order_Details = [];
            OrdersList.map(Obj => {
               Obj.Item_Details.map(obj_1 => {
                  Order_Details.push({
                     ProductId: obj_1.ProductId._id,
                     Product_Name: obj_1.ProductId.Product_Name,
                     Category: obj_1.ProductId.Category,
                     Price: obj_1.Unit_Price,
                     BasicUnitQuantity: obj_1.ProductId.BasicUnitQuantity || 0,
                     Unit: obj_1.ProductId.Unit,
                     Date: moment(obj_1.DeliveryDate).format("DD-MM-YYYY"),
                     Quantity: obj_1.Quantity,
                     Order_Date: Obj.Date,
                     OrderConfirmed: Obj.OrderConfirmed,
                     DeliveryDate: moment(Obj.DeliveryDate).format("DD-MM-YYYY"),
                     File_Name: obj_1.ProductId.File_Name
                  });
               });
            });
            res.status(200).send({ Http_Code: 200, Status: true, Message: "Order Details List!", Response: Order_Details, DeliveryTimeCompleted: DeliveryTimeCompleted });
         } else {
            res.status(200).send({ Http_Code: 400, Status: false, Message: "Order Details Is Empty!" });
         }
      }).catch(error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find The Orders List!.", Error: err_5 });
      });
   }
};


// Delivery Delay Notification ------------------------------------
exports.DeliveryDelay_Notify = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      const CurrentDate = new Date(new Date().setHours(0, 0, 0, 0));
      const CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';
      Promise.all([
         OrderManagement.OrderSchema.findOne({ CustomerId: ReceivingData.CustomerId, DeliveryDate: CurrentDate, OrderConfirmed: true, OrderDelivered: false, OrderUnDelivered: false, Active_Status: true, If_Deleted: false }, {}, { sort: { DeliveryDate: 1 } })
            .populate({ path: 'DeliveryPerson', select: 'Firebase_Token' }).exec(),
         Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).exec()
      ]).then(response => {
         var Order = response[0];
         var Customer = response[1];
         if (Customer !== null) {
            if (Order !== null) {
            if (Order.DeliveryPerson !== undefined && Order.DeliveryPerson !== null && Order.DeliveryPerson.Firebase_Token !== undefined && Order.DeliveryPerson.Firebase_Token !== '') {
               var payload = {
                  notification: {
                      title: 'Delivery Delay',
                      body: 'The Customer ' + Customer.Customer_Name + ' Orders have been Delayed on the Current Session.',
                      sound: 'notify_tone.mp3'
                  },
                  data: {
                      Customer: JSON.parse(JSON.stringify(ReceivingData.CustomerId)),
                      notification_type: 'OrderDeliveryDelay',
                      click_action: 'FCM_PLUGIN_ACTIVITY',
                  }
              };
              FCM_App.messaging().sendToDevice(Order.DeliveryPerson.Firebase_Token, payload).then((NotifyRes) => { });
            }
         }
            const Notification = new NotificationModel.NotificationSchema({
               User: mongoose.Types.ObjectId(Customer.ApprovedBy_User),
               CustomerID: Customer._id,
               DeliveryBoyID: null,
               Notification_Type: 'Order_Delay',
					MessageTitle: 'Order Delay',
               Message: 'Vilfresh Group my today order has not been delivered yet please follow up and update to me.',
               Message_Received: false,
               Message_Viewed: false,
               Active_Status: true,
               If_Deleted: false
            });
            Notification.save((err_1, result_1) => {
               if (err_1) {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Occurred Error!", Error: err_1 });
               } else {
                  res.status(200).send({ Http_Code: 200, Status: true, Message: "Message send Success!" });
               }
            });
         } else {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Invalid Customer details!"});
         }
      }).catch(error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Occurred Error!", Error: error });
      });
   }
};


// Orders History
exports.OrdersHistory = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.Date || ReceivingData.Date === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Order Date Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.Date = new Date(ReceivingData.Date);
      var StartDate = new Date(ReceivingData.Date.setHours(0, 0, 0, 0));
      var EndDate = new Date(ReceivingData.Date.setHours(23, 59, 59, 999));
		var LastSunday = new Date(new Date(new Date().setDate(new Date().getDate() - (new Date().getDay() || 7))).setHours(0, 0, 0, 0)).valueOf();
		var UnArchiveStartDate = new Date(new Date(LastSunday).setMonth(new Date(LastSunday).getMonth() - 3));

		var Query = {
			CustomerId: ReceivingData.CustomerId,
			OrderDelivered: true,
			$and: [{ DeliveryDate: { $gte: StartDate } }, { DeliveryDate: { $lte: EndDate } }],
			Active_Status: true,
			If_Deleted: false
		};
		var PopulateCond = {
			path: "Item_Details.ProductId",
			select: ['Product_Name', 'Category', 'BasicUnitQuantity', 'File_Name', 'Unit', 'Price']
		};
		var QueryArr = [];
		if (StartDate.valueOf() < UnArchiveStartDate.valueOf()) {
			QueryArr.push(OrderManagement.OrderArchiveSchema.find(Query, {}, { sort: { DeliveryDate: -1 } }).populate(PopulateCond).exec());
		} else {
			QueryArr.push(OrderManagement.OrderSchema.find(Query, {}, { sort: { DeliveryDate: -1 } }).populate(PopulateCond).exec());
		}
      Promise.all(QueryArr)
		.then(Response => {
         var OrderDetails = Response[0];
         var OrderHistory = [];

         if (OrderDetails.length !== 0) {
            OrderDetails.map(Obj => {
               Obj.Item_Details.map(ObjItem => {
                  OrderHistory.push({
                     "ProductId": ObjItem.ProductId._id,
                     "Product_Name": ObjItem.ProductId.Product_Name,
                     "Category": ObjItem.ProductId.Category,
                     "BasicUnitQuantity": ObjItem.ProductId.BasicUnitQuantity,
                     "File_Name": ObjItem.ProductId.File_Name,
                     "Unit": ObjItem.ProductId.Unit,
                     "Price": ObjItem.Unit_Price,
                     "Quantity": ObjItem.Quantity,
                     "OrderedDate": moment(new Date(Obj.createdAt)).format("DD-MM-YYYY")
                  });
               });
            });
            res.status(200).send({ Http_Code: 200, Status: true, Message: "Order History!", Response: OrderHistory });
         } else {
            res.status(200).send({ Http_Code: 400, Status: false, Message: "Your Orders Empty!" });
         }
      }).catch(errorRes => {
         res.status(200).send({ Http_Code: 400, Status: false, Message: "Some Occurred Error!" });
      });
   }
};


// Monthly Invoices ---------------------------
exports.Monthly_Invoices = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {})
         .exec((err, result) => {
            if (err) {
               res.status(417).send({ Http_Code: 417, Status: true, Message: "Some Occurred Error!", Error: err });
            } else {
               const InvoiceFrom = new Date(new Date(new Date(result.createdAt).setHours(0, 0, 0, 0)).setDate(1));
               const InvoiceTo = new Date(new Date(new Date().setDate(0)).setHours(23, 59, 59, 999));
               let NoOfMonths = InvoiceTo.getMonth() - InvoiceFrom.getMonth() + ((InvoiceTo.getFullYear() - InvoiceFrom.getFullYear()) * 12);
               NoOfMonths = NoOfMonths >= 0 ? NoOfMonths + 1 : 0;
               const MonthsArr = new Array(NoOfMonths).fill(undefined).map((val, idx) => {
                  const NewObj = {
                     From: new Date(new Date(InvoiceFrom).setMonth(new Date(InvoiceFrom).getMonth() + idx)),
                     To: new Date(new Date(new Date(new Date(InvoiceFrom).setMonth(new Date(InvoiceFrom).getMonth() + idx + 1)).setDate(0)).setHours(23, 59, 59, 999))
                  };
                  return NewObj;
               });
               Promise.all([
                  OrderManagement.OrderSchema
                     .find({ CustomerId: ReceivingData.CustomerId, OrderDelivered: true, $and: [{ DeliveryDate: { $gte: InvoiceFrom } }, { DeliveryDate: { $lte: InvoiceTo } }], Active_Status: true, If_Deleted: false })
                     .populate({ path: 'Item_Details.ProductId', select: ["BasicUnitQuantity", "Category", "Price"] })
                     .exec(),
                  InvoiceModel.InvoicePDFSchema
                     .find({ CustomerId: ReceivingData.CustomerId, $and: [{ MonthlyDate: { $gte: InvoiceFrom } }, { MonthlyDate: { $lte: InvoiceTo } }], Active_Status: true, If_Deleted: false }, {}, {})
                     .exec()
               ]).then(response => {
                  var OrdersList = JSON.parse(JSON.stringify(response[0]));
                  var InvoiceList = JSON.parse(JSON.stringify(response[1]));
                  const MonthlyReport = [];
                  MonthsArr.map(month => {
                     const Orders = OrdersList.filter(order => {
                        const OrdDate = new Date(order.DeliveryDate).valueOf();
                        const FromDate = new Date(month.From).valueOf();
                        const ToDate = new Date(month.To).valueOf();
                        return OrdDate >= FromDate && OrdDate <= ToDate ? true : false;
                     });
                     const Invoice = InvoiceList.filter(invoice => {
                        const InsDate = new Date(invoice.MonthlyDate).valueOf();
                        const FromDate = new Date(month.From).valueOf();
                        const ToDate = new Date(month.To).valueOf();
                        return InsDate >= FromDate && InsDate <= ToDate ? true : false;
                     });
                     let MonthlyTotalSpend = 0;
                     let FormToHomeSpend = 0;
                     let FactoryToHomeSpend = 0;
                     let HomeToHomeSpend = 0;
                     let VilfreshBasketSpend = 0;
                     Orders.map(order => {
                        MonthlyTotalSpend = MonthlyTotalSpend + parseFloat(order.Payable_Amount);
                        order.Item_Details.map(Item => {
                           if (Item.ProductId.Category === 'Farm_To_Home') {
                              FormToHomeSpend = FormToHomeSpend + parseFloat(Item.Total_Amount);
                           }
                           if (Item.ProductId.Category === 'Factory_To_Home') {
                              FactoryToHomeSpend = FactoryToHomeSpend + parseFloat(Item.Total_Amount);
                           }
                           if (Item.ProductId.Category === 'Home_To_Home') {
                              HomeToHomeSpend = HomeToHomeSpend + parseFloat(Item.Total_Amount);
                           }
                           if (Item.ProductId.Category === 'Vilfresh_Basket') {
                              VilfreshBasketSpend = VilfreshBasketSpend + parseFloat(Item.Total_Amount);
                           }
                        });
                     });
                     month.InvoiceKey = Invoice.length > 0 ? Invoice[0].Invoice_Reference : 'Invoice-000000000';
                     month.PDFAvailable = Invoice.length > 0 ? true : false;
                     month.PDFId = Invoice.length > 0 ? Invoice[0]._id : null;
                     month.MonthStart = moment(month.From).format("DD-MM-YYYY");
                     month.MonthString = moment(month.From).format("MMMM-YYYY");
                     month.MonthlyTotalSpend = MonthlyTotalSpend;
                     month.FormToHomeSpend = FormToHomeSpend;
                     month.FactoryToHomeSpend = FactoryToHomeSpend;
                     month.HomeToHomeSpend = HomeToHomeSpend;
                     month.VilfreshBasketSpend = VilfreshBasketSpend;
                     delete month.From;
                     delete month.To;
                     MonthlyReport.push(month);
                  });
                  res.status(200).send({ Http_Code: 200, Status: true, Message: "Monthly Report!", Response: MonthlyReport });
               }).catch(error => {
                  res.status(417).send({ Http_Code: 417, Status: true, Message: "Some Occurred Error!", Error: error });
               });
            }
         });
   }
};


// Month Invoice Report ---------------------------
exports.MonthInvoice_Report = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.Category || ReceivingData.Category === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Product Category can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      const StartDate = moment(ReceivingData.StartDate, "DD-MM-YYYY").toDate();
      const EndDate = new Date(new Date(new Date(new Date(StartDate).setMonth(new Date(StartDate).getMonth() + 1)).setDate(0)).setHours(23, 59, 59, 999));
      const NoOfDates = EndDate.getDate();
      const DatesArr = new Array(NoOfDates).fill(undefined).map((val, idx) => {
         const NewObj = {
            From: new Date(new Date(StartDate).setDate(new Date(StartDate).getDate() + idx)),
            To: new Date(new Date(new Date(StartDate).setDate(new Date(StartDate).getDate() + idx)).setHours(23, 59, 59, 999))
         };
         return NewObj;
      });

      OrderManagement.OrderSchema
         .aggregate([
            { $match: { CustomerId: ReceivingData.CustomerId, OrderDelivered: true, $and: [{ DeliveryDate: { $gte: StartDate } }, { DeliveryDate: { $lte: EndDate } }], Active_Status: true, If_Deleted: false } },
            { $unwind: { path: "$Item_Details", preserveNullAndEmptyArrays: true } },
            {
               $lookup: {
                  from: "Products_Management",
                  let: { "product": "$Item_Details.ProductId" },
                  pipeline: [
                     { $match: { $expr: { $eq: ["$$product", "$_id"] } } },
                     { $project: { "Product_Name": 1, "BasicUnitQuantity": 1, "Price": 1, "Unit": 1, "Category": 1 } }
                  ],
                  as: 'Item_Details.ProductId'
               }
            },
            { $unwind: { path: "$Item_Details.ProductId", preserveNullAndEmptyArrays: true } },
            { $match: { "Item_Details.ProductId.Category": ReceivingData.Category } },
            {
               $group: {
                  _id: "$_id",
                  CustomerId: { "$first": '$CustomerId' },
                  DeliveryDate: { "$first": '$DeliveryDate' },
                  Order_Reference: { "$first": '$Order_Reference' },
                  Order_Type: { "$first": "$Order_Type" },
                  Item_Counts: { "$first": '$Item_Counts' },
                  Payable_Amount: { "$first": '$Payable_Amount' },
                  Payment_Status: { "$first": '$Payment_Status' },
                  Payment_Type: { "$first": '$Payment_Type' },
                  If_Partial: { "$first": '$If_Partial' },
                  ReduceFrom_Wallet: { "$first": '$ReduceFrom_Wallet' },
                  ReduceFrom_Online: { "$first": '$ReduceFrom_Online' },
                  ReduceFrom_Credit: { "$first": '$ReduceFrom_Credit' },
                  CustomerInfo: { "$first": '$CustomerInfo' },
                  DeliveryInfo: { "$first": '$DeliveryInfo' },
                  DeliveredDateTime: { "$first": '$DeliveredDateTime' },
                  Item_Details: {
                     $push: {
                        _id: '$Item_Details._id',
                        ProductId: '$Item_Details.ProductId',
                        Quantity: '$Item_Details.Quantity',
                        Unit_Price: '$Item_Details.Unit_Price',
                        Total_Amount: '$Item_Details.Total_Amount',
                     }
                  },
                  Active_Status: { "$first": '$Active_Status' },
                  If_Deleted: { "$first": '$If_Deleted' },
                  createdAt: { "$first": '$createdAt' },
               }
            },
         ]).exec((err_1, result_1) => {
            if (err_1) {
               res.status(417).send({ Http_Code: 417, Status: true, Message: "Some Occurred Error!", Error: err_1 });
            } else {
               result_1 = JSON.parse(JSON.stringify(result_1));
               var MonthReport = [];
               DatesArr.map(date => {
                  const Orders = result_1.filter(order => {
                     const OrdDate = new Date(order.DeliveryDate).valueOf();
                     const FromDate = new Date(date.From).valueOf();
                     const ToDate = new Date(date.To).valueOf();
                     return OrdDate >= FromDate && OrdDate <= ToDate ? true : false;
                  });
                  date.DateStr = moment(date.From).format("MMMM DD,YYYY");
                  date.Morning = [];
                  date.Evening = [];
                  Orders.map(order => {
                     const CurrentSession = new Date(order.DeliveredDateTime).getHours() < 12 ? 'Morning' : 'Evening';
                     if (CurrentSession === 'Morning') {
                        order.Item_Details.map(Item => {
                           const NewItem = {
                              Product_Name: Item.ProductId.Product_Name,
                              Quantity: (parseFloat(Item.ProductId.BasicUnitQuantity) * parseFloat(Item.Quantity)) + ' ' + Item.ProductId.Unit,
                              Total_Amount: Item.Total_Amount
                           };
                           date.Morning.push(NewItem);
                        });
                     }
                     if (CurrentSession === 'Evening') {
                        order.Item_Details.map(Item => {
                           const NewItem = {
                              Product_Name: Item.ProductId.Product_Name,
                              Quantity: (parseFloat(Item.ProductId.BasicUnitQuantity) * parseFloat(Item.Quantity)) + ' ' + Item.ProductId.Unit,
                              Total_Amount: Item.Total_Amount
                           };
                           date.Evening.push(NewItem);
                        });
                     }
                  });
                  delete date.From;
                  delete date.To;
                  MonthReport.push(date);
               });
               MonthReport = MonthReport.filter(report => report.Morning.length > 0 || report.Evening.length > 0);
               res.status(200).send({ Http_Code: 200, Status: true, Message: "Month Report!", Response: MonthReport });
            }
         });
   }
};


// Invoice PDF ------------------------------------
exports.Invoice_PDF = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.PDFId || ReceivingData.PDFId === '') {
      res.status(400).send({ Http_Code: 400, Status: false, Message: "PDF Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      ReceivingData.PDFId = mongoose.Types.ObjectId(ReceivingData.PDFId);
      InvoiceModel.InvoicePDFSchema
         .find({ _id: ReceivingData.PDFId, CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, { File_PDF: 1 }, {})
         .exec((err, result) => {
            if (err) {
               res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: err });
            } else {
               if (result.length !== 0) {
                  res.status(200).send({ Http_Code: 200, Status: true, Message: "Invoice PDF", Response: result });
               } else {
                  res.status(200).send({ Http_Code: 400, Status: false, Message: "Invoice PDF Is Empty!" });
               }
            }
         });
   }
};
