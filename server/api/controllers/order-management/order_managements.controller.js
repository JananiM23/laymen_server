var mongoose = require('mongoose');
var OrderManagement = require('../../../mobile_api/models/order_management.model');
var ProductManagement = require('../../../api/models/product_management.model');
var UserManagement = require('../../../api/models/user_management.model');
var CustomerManagement = require('../../../mobile_api/models/customer_management.model');
var DeliveryPersonManagement = require('../../../mobile_api/models/deliveryPerson_details.model');
var DeliveryPersonAttendanceManagement = require('../../../api/models/attendance_management.model');
var VilfreshMoney_management = require('../../../mobile_api/models/VilfreshMoney_management.model');
var VilfreshCredit_Limit = require('../../../api/models/VilfreshCredit_management.model');
const axios = require('axios');
var moment = require('moment');


exports.Today_Orders = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.DeliveryLine || ReceivingData.DeliveryLine === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      ReceivingData.DeliveryLine = mongoose.Types.ObjectId(ReceivingData.DeliveryLine);
      UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred whilef Find The User Details!.", Error: err });
            } else {
               if (result !== null) {
                  var currentDate = new Date();
                  var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
                  var endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));
                  var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';

                  Promise.all([
                     // Sample Customers
                     CustomerManagement.CustomerManagementSchema
                        .find(
                           {
                              If_Deleted: false,
                              Region: result.Region,
                              Delivery_Line: ReceivingData.DeliveryLine,
                              Request_Sample_Order: true,
                              Active_Status: true,
                              $or: [{ Customer_Status: 'Subscription_Activated' },
                                    { Customer_Status: 'WaitingFor_Subscription' },
                                    { Customer_Status: 'Sample_Approved' }], 
                              Choose_The_Session: CurrentSession,
                              $and: [{ Choose_The_Sample_Date: { $gte: startOfDay } }, { Choose_The_Sample_Date: { $lte: endOfDay } }]
                           },
                           {
                              Mobile_Number: 1, Customer_Name: 1, Address: 1, Pincode: 1, Delivery_Line_Queue: 1, City: 1, Delivery_Line: 1, Request_Sample_Order: 1,
                              Choose_The_Sample_Date: 1, Choose_The_Session: 1
                           }, {})
                        .exec(),
                     // Active Subscription Customers
                     CustomerManagement.CustomerManagementSchema
                        .find(
                           {
                              If_Deleted: false,
                              Region: result.Region,
                              Delivery_Line: ReceivingData.DeliveryLine,
                              Active_Status: true,
                              Customer_Status: 'Subscription_Activated',                          
                              Subscription_Activated: true
                           },
                           {
                              Mobile_Number: 1, Customer_Name: 1, Address: 1, Pincode: 1, Delivery_Line_Queue: 1, City: 1, Morning: 1, Evening: 1, Delivery_Line: 1,
                              VilfreshMoney_Limit: 1, AvailableCredit_Limit: 1
                           }, {})
                        .populate({ path: 'Morning.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .populate({ path: 'Evening.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .exec(),
                     // Subscription Changes List
                     CustomerManagement.Subscription_ManagementSchema
                        .find(
                           {
                              Active_Status: true,
                              If_Deleted: false,
                              Region: result.Region,
                              $and: [{ SubscriptionDate: { $gte: startOfDay } }, { SubscriptionDate: { $lte: endOfDay } }]
                           }, {}, {})
                        .populate({ path: 'Morning.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .populate({ path: 'Evening.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .exec(),
                     // Milk Product
                     ProductManagement.ProductManagementSchema
                        .findOne(
                           { Milk_YesOrNo: true, Type: "A1", Active_Status: true },
                           { Product_Name: 1, BasicUnitQuantity: 1, Price: 1, Unit: 1 },
                           {})
                        .exec(),
                     // Orders List
                     OrderManagement.OrderSchema
                        .find(
                           {
                              Region: result.Region,
                              OrderConfirmed: false,
                              $and: [{ DeliveryDate: { $gte: startOfDay } }, { DeliveryDate: { $lte: endOfDay } }]
                           },
                           {
                              CustomerId: 1, Order_Reference: 1, Order_Type: 1, Item_Details: 1, Item_Counts: 1, Payable_Amount: 1, Payment_Status: 1,
                              Payment_Type: 1, If_Partial: 1, ReduceFrom_Wallet: 1, ReduceFrom_Online: 1, ReduceFrom_Credit: 1, createdAt: 1
                           }, {})
                        .populate({ path: 'Item_Details.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .populate({ path: 'CustomerId', select: ['Mobile_Number', 'Customer_Name', 'Delivery_Line_Queue', 'Address', 'Pincode',  'City', 'Morning', 'Evening', 'Delivery_Line', 'VilfreshMoney_Limit', 'AvailableCredit_Limit', 'Customer_Status'] })
                        .exec(),
                     DeliveryPersonManagement.DeliveryPersonSchema
                     .aggregate([
                        { $match: { DeliveryLine: ReceivingData.DeliveryLine, DeliveryPerson_Status: 'Approval', $or: [{Session: CurrentSession}, {Session: 'Both'}], Active_Status: true, If_Deleted: false } },
                        {
                           $lookup: {
                              from: "DeliveryPerson_Attendance",
                              let: { "deliveryPerson": "$_id" },
                              pipeline: [
                                 { $match: { Date: startOfDay, Session: CurrentSession, $expr: { $eq: ["$$deliveryPerson", "$DeliveryPersonId"] } } },
                                 { $project: { "Date": 1, "DeliveryLineSession": 1, "CurrentSession": 1, "Morning": 1, "Evening": 1 } }
                              ],
                              as: 'DeliveryPersonAttendance'
                           }
                        },
                        { $unwind: { path: "$DeliveryPersonAttendance", preserveNullAndEmptyArrays: true } }
                     ]).allowDiskUse(true).exec()
                  ]).then(response => {
                     var Samples = JSON.parse(JSON.stringify(response[0]));
                     var Subscriptions = JSON.parse(JSON.stringify(response[1]));
                     var SubscriptionChanges = JSON.parse(JSON.stringify(response[2]));
                     var SampleMilk = JSON.parse(JSON.stringify(response[3]));
                     var Orders = JSON.parse(JSON.stringify(response[4]));
                     var DeliveryPerson = JSON.parse(JSON.stringify(response[5]));
                                          
                     var SampleOrders = [];
                     var CustomerOrders = [];
                     Samples.map(Sample => {
                        Sample.Milk = SampleMilk;
                        SampleOrders.push(Sample);
                     });
                     Orders = Orders.filter(obj => JSON.parse(JSON.stringify(obj.CustomerId.Delivery_Line)) === JSON.parse(JSON.stringify(ReceivingData.DeliveryLine)) && obj.CustomerId.Customer_Status !== 'InActivated' );
                     Orders.map(obj => {
                        const Idx = Subscriptions.findIndex(objNew => objNew._id === obj.CustomerId._id);
                        const CusIdx = CustomerOrders.findIndex(objNew => objNew._id === obj.CustomerId._id);
                        if (Idx < 0) {
                           if (CusIdx < 0) {
                              var NewObj = obj.CustomerId;
                              delete obj.CustomerId;
                              NewObj.ValidSubscription = true;
                              NewObj.Orders = [obj];
                              CustomerOrders.push(NewObj);
                           } else {
                              delete obj.CustomerId;
                              CustomerOrders[CusIdx].Orders.push(obj);
                           }
                        }
                     });
                      Orders = Orders.filter(obj => {
                        return obj.CustomerId === undefined ? false : true;
                     });
                     Subscriptions.map(Subscription => {
                        const ChangesArr = SubscriptionChanges.filter(obj => obj.Customer === Subscription._id);
                        if (ChangesArr.length > 0) {
                           Subscription.Morning = ChangesArr[0].Morning;
                           Subscription.Evening = ChangesArr[0].Evening;
                        }
                        var SubscriptionValue = 0;
                        var OItems = [];
                        if (CurrentSession === 'Morning') {
                           Subscription.Morning.map(obj => {
                              if (obj.Liter > 0 && (obj.Status === undefined || obj.Status === true)) {
                                 const ItemValue = (parseFloat(obj.Liter) / parseFloat(obj.ProductId.BasicUnitQuantity)) * parseFloat(obj.ProductId.Price);
                                 SubscriptionValue = SubscriptionValue + ItemValue;
                                 OItems.push({
                                    ProductId: obj.ProductId,
                                    Quantity: obj.Liter,
                                    Unit_Price: parseFloat(obj.ProductId.Price),
                                    Total_Amount: ItemValue
                                 });
                              }
                           });
                        }
                        if (CurrentSession === 'Evening') {
                           Subscription.Evening.map(obj => {
                              if (obj.Liter > 0 && (obj.Status === undefined || obj.Status === true)) {
                                 const ItemValue = ((parseFloat(obj.Liter) / parseFloat(obj.ProductId.BasicUnitQuantity)) * parseFloat(obj.ProductId.Price));
                                 SubscriptionValue = SubscriptionValue + ItemValue;
                                 OItems.push({
                                    ProductId: obj.ProductId,
                                    Quantity: obj.Liter,
                                    Unit_Price: parseFloat(obj.ProductId.Price),
                                    Total_Amount: ItemValue
                                 });
                              }
                           });
                        }
                        var LimitAvailable = false;
                        var OType = '';
                        var OWallet = 0;
                        var OCredit = 0;
                        if (Subscription.VilfreshMoney_Limit >= SubscriptionValue) {
                           LimitAvailable = true;
                           OType = 'Wallet';
                           OWallet = SubscriptionValue;
                        } else if (Subscription.VilfreshMoney_Limit > 0 && Subscription.VilfreshMoney_Limit + Subscription.AvailableCredit_Limit >= SubscriptionValue) {
                           LimitAvailable = true;
                           OType = 'Partial_WalletCredit';
                           OWallet = SubscriptionValue - Subscription.VilfreshMoney_Limit;
                           OCredit = SubscriptionValue - OWallet;
                        } else if (Subscription.AvailableCredit_Limit >= SubscriptionValue) {
                           LimitAvailable = true;
                           OType = 'Credit';
                           OWallet = SubscriptionValue - Subscription.VilfreshMoney_Limit;
                           OCredit = SubscriptionValue - OWallet;
                        }
                        delete Subscription.Morning;
                        delete Subscription.Evening;
                        Subscription.ValidSubscription = LimitAvailable;
                        Subscription.Orders = [];
                        Subscription.Orders = Orders.filter(obj => obj.CustomerId._id === Subscription._id);
                        if (OItems.length > 0) {
                           Subscription.Orders.push({
                              Order_Type: 'Subscription_From',
                              Item_Details: OItems,
                              Item_Counts: OItems.length,
                              Payable_Amount: SubscriptionValue,
                              Payment_Status: 'UnPaid',
                              Payment_Type: OType,
                              If_Partial: OType === 'Partial_WalletCredit' ? true : false,
                              ReduceFrom_Wallet: OWallet,
                              ReduceFrom_Online: 0,
                              ReduceFrom_Credit: OCredit,
                              DeliveryDate: startOfDay
                           });
                        }
                        
                        if (Subscription.Orders.length > 0) {
                           CustomerOrders.push(Subscription);
                        }
                     });
                     CustomerOrders = CustomerOrders.sort(function (Obj1, Obj2) { return Obj1.Customer_Name.localeCompare(Obj2.Customer_Name); });
                     SampleOrders = SampleOrders.sort(function (Obj1, Obj2) { return Obj1.Customer_Name.localeCompare(Obj2.Customer_Name); });
                     DeliveryPerson = DeliveryPerson.length > 0 ? DeliveryPerson[0] : null;
                     var UnQueue = CustomerOrders.filter(obj => !obj.Delivery_Line_Queue || obj.Delivery_Line_Queue === undefined || obj.Delivery_Line_Queue === null);
                     var Queue = CustomerOrders.filter(obj => typeof obj.Delivery_Line_Queue === 'number' && obj.Delivery_Line_Queue > 0 );
                     var QueueSort = Queue.sort((a, b) => parseFloat(a.Delivery_Line_Queue) - parseFloat(b.Delivery_Line_Queue));
                     var ReturnRes = QueueSort.concat(UnQueue);
                     res.status(200).send({ Status: true, Response: ReturnRes, SampleOrders: SampleOrders, DeliveryPerson: DeliveryPerson });
                  }).catch(error => {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find The Today Orders!.", Error: error });
                  });
               }
            }
         });
   }
};


exports.Order_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {
                  const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                  const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;

                  var ShortOrder = { DeliveryDate: -1, lastOrderedRef: 1 };
                  var ShortKey = ReceivingData.ShortKey;
                  var ShortCondition = ReceivingData.ShortCondition;
                  if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                     if (ShortKey !== 'DeliveryDate') {
                        ShortOrder = {};
                     }
                     ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                  }

                  var FindQuery = { 'If_Deleted': false, Region: result.Region };

                  var AdvancedFindQuery = { };
						var CustomerFindQuery = { };
						var QueryArr = [];
						var CheckArchive = false;

                  if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                     ReceivingData.FilterQuery.map(obj => {
                        if (obj.Type === 'Date') {
                           if (FindQuery[obj.DBName] === undefined) {
                              FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           } else {
                              const DBName = obj.DBName;
                              const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                              FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                           }
                        }
                        if (obj.Type === 'Object' && obj.DBName === 'Customer_Name') {
                           CustomerFindQuery['_id'] = mongoose.Types.ObjectId(obj.Value._id);
                        }
                        if (obj.Type === 'String' && obj.DBName === 'Mobile_Number') {
                           CustomerFindQuery['Mobile_Number'] = obj.Value;
                        }
                        if (obj.Type === 'Object' && obj.DBName === 'Delivery_Line') {
                           CustomerFindQuery['Delivery_Line'] = mongoose.Types.ObjectId(obj.Value._id);
                        }
                        if (obj.Type === 'Select' && obj.DBName === 'OrderStatus') {
                           AdvancedFindQuery['OrderStatus'] = obj.Value;
                        }
								if (obj.Type === 'Boolean' && obj.DBName === 'CheckArchive') {
                           CheckArchive = true;
                        }
                     });
                  }

						new Promise((resolve, reject) => {
							if (Object.keys(CustomerFindQuery).length > 0) {
								CustomerManagement.CustomerManagementSchema.find(CustomerFindQuery, {_id: 1}).exec((err, customers) => {
									if (err) {
										reject(err);
									} else {
										const customersList = customers.map(x => x._id);
										FindQuery['CustomerId'] = { '$in' : customersList };
										resolve('');
									}
								});
							} else {
								resolve('');
							}
						}).then(success => {
							
							var Query = [
								{ $match: FindQuery },
								{
									$lookup: {
										from: "Customer_Managements",
										let: { "customer": "$CustomerId" },
										pipeline: [
											{ $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
											{ $project: { "Customer_Name": 1, "Mobile_Number": 1, "Address": 1, "Pincode": 1, "Delivery_Line": 1, "Request_Sample_Order": 1, "Customer_Status": 1 } }
										],
										as: 'CustomerInfo'
									}
								},
								{ $unwind: { path: "$CustomerInfo", preserveNullAndEmptyArrays: true } },
								{ $match:  { $expr: { $or: [ {$ne: [ "$CustomerInfo.Customer_Status", "InActivated" ]}, {$ne: ["$OrderConfirmed", false]} ] } } },
								{
									$lookup: {
										from: "Delivery_Line",
										let: { "deliveryline": "$CustomerInfo.Delivery_Line" },
										pipeline: [
											{ $match: { $expr: { $eq: ["$$deliveryline", "$_id"] } } },
											{ $project: { "Deliveryline_Name": 1, "Deliveryline_Code": 1, } }
										],
										as: 'DeliveryInfo'
									}

								},
								{ $unwind: { path: "$DeliveryInfo", preserveNullAndEmptyArrays: true } },
								{ $unwind: { path: "$Item_Details", preserveNullAndEmptyArrays: true } },
								{
									$lookup: {
										from: "Products_Management",
										let: { "product": "$Item_Details.ProductId" },
										pipeline: [
											{ $match: { $expr: { $eq: ["$$product", "$_id"] } } },
											{ $project: { "Product_Name": 1, "BasicUnitQuantity": 1, "Price": 1, "Unit": 1 } }
										],
										as: 'Item_Details.ProductId'
									}
								},
								{ $unwind: { path: "$Item_Details.ProductId", preserveNullAndEmptyArrays: true } },
								{ $addFields: { DeliveredSession: { $ifNull: ["$DeliveredSession", null] } } },
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
										Item_Details: {
											$push: {
												_id: '$Item_Details._id',
												ProductId: '$Item_Details.ProductId',
												Quantity: '$Item_Details.Quantity',
												Unit_Price: '$Item_Details.Unit_Price',
												Total_Amount: '$Item_Details.Total_Amount',
											}
										},
										OrderConfirmed: { "$first": '$OrderConfirmed' },
										OrderDelivered: { "$first": '$OrderDelivered' },
										DeliveredSession: { "$first": '$DeliveredSession'},
										OrderUnDelivered: { "$first": '$OrderUnDelivered' },
										Active_Status: { "$first": '$Active_Status' },
										If_Deleted: { "$first": '$If_Deleted' },
										createdAt: { "$first": '$createdAt' },
									}
								},
								{
									$group: {
										_id: {
											CustomerId: "$CustomerId",
											DeliveryDate: "$DeliveryDate",
											CustomerInfo: "$CustomerInfo",
											DeliveryInfo: "$DeliveryInfo",
											DeliveredSession: "$DeliveredSession"
										},
										TotalOrderConfirmed: { $sum: { $cond: { if: {$eq:["$OrderConfirmed", true]}, then: 1, else: 0 } } },
										TotalDelivered: { $sum: { $cond: { if: {$eq:["$OrderDelivered", true]}, then: 1, else: 0 } } },
										TotalUnDelivered: { $sum: { $cond: { if: {$eq:["$OrderUnDelivered", true]}, then: 1, else: 0 } } },
										TotalPayment: { $sum: "$Payable_Amount" },
										Orders: { $push: "$$ROOT" },
										lastOrderedRef: { $max: "$Order_Reference" }
									}
								},
								{
									$addFields: { 
										OrderStatus: {
											$cond: {
												if: { $lte: [ "$TotalOrderConfirmed", 0 ] },
												then: 'Non-Generated',
												else: {
													$cond: {
														if: { $and: [ {$lte: [ "$TotalDelivered", 0 ]}, {$lte: [ "$TotalUnDelivered", 0 ]}] },
														then: 'Generated',
														else: {
															$cond: {
																if: { $gt: [ "$TotalDelivered", 0 ] },
																then: 'Delivered',
																else: {
																	$cond: {
																		if: { $gt: [ "$TotalUnDelivered", 0 ] },
																		then: 'Un-Delivered',
																		else: 'Un-Predictable'
																	}
																}
															}
														}
													}
												}
											}
										},
									}
								},
								{
									$project: {
										_id: 0,
										DeliveryDate: "$_id.DeliveryDate",
										CustomerInfo: '$_id.CustomerInfo',
										DeliveryInfo: '$_id.DeliveryInfo',
										DeliveredSession: '$_id.DeliveredSession',
										OrderStatus: '$OrderStatus',
										TotalPayment: '$TotalPayment',
										Orders: "$Orders",
										lastOrderedRef: "$lastOrderedRef",
									}
								},
								{ $match: AdvancedFindQuery },
								{ $addFields: { Deliveryline_NameSort: { $toLower: "$DeliveryInfo.Deliveryline_Name" } } },
								{ $addFields: { Customer_NameSort: { $toLower: "$CustomerInfo.Customer_Name" } } },
								{ $addFields: { Customer_Mobile: { $toLower: "$CustomerInfo.Mobile_Number" } } },
								{ $addFields: { OrdersLength: { $size: "$Orders" } } },
							];

							QueryArr.push(
								OrderManagement.OrderSchema.aggregate(Query).allowDiskUse(true).exec()
							);

							if (CheckArchive) {
								QueryArr.push(
									OrderManagement.OrderArchiveSchema.aggregate(Query).allowDiskUse(true).exec()
								);
							}

							Promise.all(QueryArr).then(response => {
								var aggResultOne = JSON.parse(JSON.stringify(response[0]));
								var aggResultTwo = [];
								if (CheckArchive) {
									aggResultTwo = JSON.parse(JSON.stringify(response[1]));
								}
								var aggResult = [...aggResultOne, ...aggResultTwo];
								const SubResponse = aggResult.length;

								Object.keys(ShortOrder).map(x => {
									if (ShortOrder[x] === 1) {
										aggResult = aggResult.sort((a, b) => a[x] > b[x] ? 1 : -1);
									} else {
										aggResult = aggResult.sort((a, b) => a[x] < b[x] ? 1 : -1);
									}
								});
								
								returnData = aggResult.splice(Skip_Count, Limit_Count);
								res.status(200).send({ Status: true, Response: returnData, SubResponse: SubResponse });
							}).catch(error => {
								console.log(error);
								res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Orders list!." });
							});
						}).catch(error => {
							res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Orders Filter!." });
						});
               } else {
                  res.status(417).send({ Status: false, Message: 'Invalid User Details' });
               }
            }
         });
   }
};


exports.OrderedProduct_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {
                  const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
                  const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;

                  var ShortOrder = { DeliveryDate: -1 };
                  var ShortKey = ReceivingData.ShortKey;
                  var ShortCondition = ReceivingData.ShortCondition;
                  if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                     ShortOrder = {};
                     ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                  }

                  var FindQuery = { 'If_Deleted': false, Region: result.Region };

                  var AdvancedFindQuery = { 'Product.Milk_YesOrNo': false };

                  const minDate = new Date(new Date().setHours(0, 0, 0, 0));
                  const minDateFilter = ReceivingData.FilterQuery.filter(obj => obj.Key === 'DeliveryFrom');
                  if (minDateFilter.length === 0) {
                     var newFilterQuery =  { "Active": true, "Key": "DeliveryFrom", "Value": minDate, "DisplayName": "Delivery From", "DBName": "DeliveryDate", "Type": "Date", "Option": "GTE" };
                     ReceivingData.FilterQuery.push(newFilterQuery);
                  }

                  if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                     ReceivingData.FilterQuery.map(obj => {
                        if (obj.Type === 'Date') {
                           if (FindQuery[obj.DBName] === undefined) {
                              FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           } else {
                              const DBName = obj.DBName;
                              const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                              FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                           }
                        }
                        if (obj.Type === 'Object' && obj.DBName === 'Delivery_Line') {
                           const DeliveryIds = obj.Value.map( objNew =>  mongoose.Types.ObjectId(objNew._id));
                           AdvancedFindQuery['DeliveryInfo._id'] = { $in: DeliveryIds};
                        }
                     });
                  }
                  
                  Promise.all([
                     OrderManagement.OrderSchema
                        .aggregate([
                           { $match: FindQuery },
                           {
                              $lookup: {
                                 from: "Customer_Managements",
                                 let: { "customer": "$CustomerId" },
                                 pipeline: [
                                    { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                                    { $project: { "Customer_Name": 1, "Address": 1, "Pincode": 1, "Delivery_Line": 1 } }
                                 ],
                                 as: 'CustomerInfo'
                              }
                           },
                           { $unwind: { path: "$CustomerInfo", preserveNullAndEmptyArrays: true } },
                           { $match:  { $expr: { $or: [ {$ne: [ "$CustomerInfo.Customer_Status", "InActivated" ]}, {$ne: ["$OrderConfirmed", false]} ] } } },
                           {
                              $lookup: {
                                 from: "Delivery_Line",
                                 let: { "deliveryline": "$CustomerInfo.Delivery_Line" },
                                 pipeline: [
                                    { $match: { $expr: { $eq: ["$$deliveryline", "$_id"] } } },
                                    { $project: { "Deliveryline_Name": 1, "Deliveryline_Code": 1, } }
                                 ],
                                 as: 'DeliveryInfo'
                              }

                           },
                           { $unwind: { path: "$DeliveryInfo", preserveNullAndEmptyArrays: true } },
                           { $unwind: { path: "$Item_Details", preserveNullAndEmptyArrays: true } },
                           {
                              $lookup: {
                                 from: "Products_Management",
                                 let: { "product": "$Item_Details.ProductId" },
                                 pipeline: [
                                    { $match: { $expr: { $eq: ["$$product", "$_id"] } } },
                                    { $project: { "Product_Name": 1, "BasicUnitQuantity": 1, "Price": 1, "Unit": 1, "Milk_YesOrNo": 1} }
                                 ],
                                 as: 'Item_Details.ProductId'
                              }
                           },
                           { $unwind: { path: "$Item_Details.ProductId", preserveNullAndEmptyArrays: true } },
                           {
                              $project: {
                                 CustomerInfo: "$CustomerInfo",
                                 DeliveryInfo: "$DeliveryInfo",
                                 Order_Reference: "$Order_Reference",
                                 Product: "$Item_Details.ProductId",
											Order_Quantity: {
												"$cond": {
													"if": { $or: [ { $eq: [ "$Order_Type", "Subscription_From" ] }, { $eq: [ "$Order_Type", "Sample_From" ] } ]},
													"then": {  $multiply: [ { $divide: [ "$Item_Details.Quantity", "$Item_Details.BasicUnitQuantity" ] }, "$Item_Details.BasicUnitQuantity" ] },
													"else": { $multiply: [ "$Item_Details.Quantity", "$Item_Details.BasicUnitQuantity" ] }
												}
											},
                                 Order_Items: '$Item_Details.Quantity',
                                 Total_Amount: '$Item_Details.Total_Amount',
                                 DeliveryDate: '$DeliveryDate'
                              }
                           },
                           { $match: AdvancedFindQuery },
                           {
                              $group: {
                                 _id: {
                                    Product: "$Product",
                                 },
                                 TotalOrders: { $sum: "$Order_Items" },
                                 TotalOrdersQuantity: { $sum: "$Order_Quantity" },
                                 TotalOrdersAmount: { $sum: "$Total_Amount" },
                                 More: {
                                    $push: {
                                       CustomerInfo: '$CustomerInfo',
                                       DeliveryInfo: '$DeliveryInfo',
                                       Order_Reference: '$Order_Reference',
                                       Order_Quantity:  '$Order_Quantity',
                                       Order_Items: '$Order_Items',
                                       Total_Amount: '$Total_Amount',
                                       DeliveryDate: '$DeliveryDate'
                                    }
                                 },
                              }
                           },
                           {
                              $project: {
                                 _id: 0,
                                 Product: "$_id.Product",
                                 TotalOrders: "$TotalOrders",
                                 TotalOrdersQuantity: "$TotalOrdersQuantity",
                                 TotalOrdersAmount: "$TotalOrdersAmount",
                                 More: "$More",
                              }
                           },
                           { $addFields: { Product_NameSort: { $toLower: "$Product.Product_Name" } } },
                           { $addFields: { OrdersLength: { $size: "$More" } } },
                           { $sort: ShortOrder },
                           { $skip: Skip_Count },
                           { $limit: Limit_Count }
                        ]).allowDiskUse(true).exec(),
                     OrderManagement.OrderSchema.aggregate([
                        { $match: FindQuery },
								{
									$lookup: {
										from: "Customer_Managements",
										let: { "customer": "$CustomerId" },
										pipeline: [
											{ $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
											{ $project: { "Customer_Name": 1, "Address": 1, "Pincode": 1, "Delivery_Line": 1 } }
										],
										as: 'CustomerInfo'
									}
								},
								{ $unwind: { path: "$CustomerInfo", preserveNullAndEmptyArrays: true } },
								{ $match:  { $expr: { $or: [ {$ne: [ "$CustomerInfo.Customer_Status", "InActivated" ]}, {$ne: ["$OrderConfirmed", false]} ] } } },
								{
									$lookup: {
										from: "Delivery_Line",
										let: { "deliveryline": "$CustomerInfo.Delivery_Line" },
										pipeline: [
											{ $match: { $expr: { $eq: ["$$deliveryline", "$_id"] } } },
											{ $project: { "Deliveryline_Name": 1, "Deliveryline_Code": 1, } }
										],
										as: 'DeliveryInfo'
									}

								},
								{ $unwind: { path: "$DeliveryInfo", preserveNullAndEmptyArrays: true } },
								{ $unwind: { path: "$Item_Details", preserveNullAndEmptyArrays: true } },
								{
									$lookup: {
										from: "Products_Management",
										let: { "product": "$Item_Details.ProductId" },
										pipeline: [
											{ $match: { $expr: { $eq: ["$$product", "$_id"] } } },
											{ $project: { "Product_Name": 1, "BasicUnitQuantity": 1, "Price": 1, "Unit": 1, "Milk_YesOrNo": 1} }
										],
										as: 'Item_Details.ProductId'
									}
								},
								{ $unwind: { path: "$Item_Details.ProductId", preserveNullAndEmptyArrays: true } },
								{
									$project: {
										CustomerInfo: "$CustomerInfo",
										DeliveryInfo: "$DeliveryInfo",
										Order_Reference: "$Order_Reference",
										Product: "$Item_Details.ProductId",
										Order_Quantity: {
											"$cond": {
												"if": { $or: [ { $eq: [ "$Order_Type", "Subscription_From" ] }, { $eq: [ "$Order_Type", "Sample_From" ] } ]},
												"then": {  $multiply: [ { $divide: [ "$Item_Details.Quantity", "$Item_Details.BasicUnitQuantity" ] }, "$Item_Details.BasicUnitQuantity" ] },
												"else": { $multiply: [ "$Item_Details.Quantity", "$Item_Details.BasicUnitQuantity" ] }
											}
										},
										Order_Items: '$Item_Details.Quantity',
										Total_Amount: '$Item_Details.Total_Amount',
										DeliveryDate: '$DeliveryDate'
									}
								},
								{ $match: AdvancedFindQuery },
								{
									$group: {
										_id: {
											Product: "$Product",
										},
										TotalOrders: { $sum: "$Order_Items" },
										TotalOrdersQuantity: { $sum: "$Order_Quantity" },
										TotalOrdersAmount: { $sum: "$Total_Amount" },
										More: {
											$push: {
												CustomerInfo: '$CustomerInfo',
												DeliveryInfo: '$DeliveryInfo',
												Order_Reference: '$Order_Reference',
												Order_Quantity:  '$Order_Quantity',
												Order_Items: '$Order_Items',
												Total_Amount: '$Total_Amount',
												DeliveryDate: '$DeliveryDate'
											}
										},
									}
								},
								{
									$project: {
										_id: 0,
										Product: "$_id.Product",
										TotalOrders: "$TotalOrders",
										TotalOrdersQuantity: "$TotalOrdersQuantity",
										TotalOrdersAmount: "$TotalOrdersAmount",
										More: "$More",
									}
								}
                     ]).allowDiskUse(true).exec()
                  ]).then(response => {
                     response[0] = response[0].map(obj => {
                        obj.TotalOrdersAmount = obj.TotalOrdersAmount.toFixed(2);
                        obj.TotalOrdersQuantity = obj.TotalOrdersQuantity.toFixed(2);
                        return obj;
                     });
                     res.status(200).send({ Status: true, Response: response[0], SubResponse: response[1].length });
                  }).catch(error => {
                     console.log(error);
                     res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Orders list!." });
                  });
               } else {
                  res.status(417).send({ Status: false, Message: 'Invalid User Details' });
               }
            }
         });
   }
};

exports.AllOrderedProduct_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {

                  var ShortOrder = { DeliveryDate: -1 };
                  var ShortKey = ReceivingData.ShortKey;
                  var ShortCondition = ReceivingData.ShortCondition;
                  if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                     ShortOrder = {};
                     ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                  }

                  var FindQuery = { 'If_Deleted': false, Region: result.Region };

                  var AdvancedFindQuery = { 'Product.Milk_YesOrNo': false };

                  const minDate = new Date(new Date().setHours(0, 0, 0, 0));
                  const minDateFilter = ReceivingData.FilterQuery.filter(obj => obj.Key === 'DeliveryFrom');
                  if (minDateFilter.length === 0) {
                     var newFilterQuery =  { "Active": true, "Key": "DeliveryFrom", "Value": minDate, "DisplayName": "Delivery From", "DBName": "DeliveryDate", "Type": "Date", "Option": "GTE" };
                     ReceivingData.FilterQuery.push(newFilterQuery);
                  }

                  if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                     ReceivingData.FilterQuery.map(obj => {
                        if (obj.Type === 'Date') {
                           if (FindQuery[obj.DBName] === undefined) {
                              FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           } else {
                              const DBName = obj.DBName;
                              const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                              FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                           }
                        }
                        if (obj.Type === 'Object' && obj.DBName === 'Delivery_Line') {
                           const DeliveryIds = obj.Value.map( objNew =>  mongoose.Types.ObjectId(objNew._id));
                           AdvancedFindQuery['DeliveryInfo._id'] = { $in: DeliveryIds};
                        }
                     });
                  }
                  
                  Promise.all([
                     OrderManagement.OrderSchema
                        .aggregate([
                           { $match: FindQuery },
                           {
                              $lookup: {
                                 from: "Customer_Managements",
                                 let: { "customer": "$CustomerId" },
                                 pipeline: [
                                    { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                                    { $project: { "Customer_Name": 1, "Address": 1, "Pincode": 1, "Delivery_Line": 1 } }
                                 ],
                                 as: 'CustomerInfo'
                              }
                           },
                           { $unwind: { path: "$CustomerInfo", preserveNullAndEmptyArrays: true } },
                           { $match:  { $expr: { $or: [ {$ne: [ "$CustomerInfo.Customer_Status", "InActivated" ]}, {$ne: ["$OrderConfirmed", false]} ] } } },
                           {
                              $lookup: {
                                 from: "Delivery_Line",
                                 let: { "deliveryline": "$CustomerInfo.Delivery_Line" },
                                 pipeline: [
                                    { $match: { $expr: { $eq: ["$$deliveryline", "$_id"] } } },
                                    { $project: { "Deliveryline_Name": 1, "Deliveryline_Code": 1, } }
                                 ],
                                 as: 'DeliveryInfo'
                              }

                           },
                           { $unwind: { path: "$DeliveryInfo", preserveNullAndEmptyArrays: true } },
                           { $unwind: { path: "$Item_Details", preserveNullAndEmptyArrays: true } },
                           {
                              $lookup: {
                                 from: "Products_Management",
                                 let: { "product": "$Item_Details.ProductId" },
                                 pipeline: [
                                    { $match: { $expr: { $eq: ["$$product", "$_id"] } } },
                                    { $project: { "Product_Name": 1, "BasicUnitQuantity": 1, "Price": 1, "Unit": 1, "Milk_YesOrNo": 1 } }
                                 ],
                                 as: 'Item_Details.ProductId'
                              }
                           },
                           { $unwind: { path: "$Item_Details.ProductId", preserveNullAndEmptyArrays: true } },
                           {
                              $project: {
                                 CustomerInfo: "$CustomerInfo",
                                 DeliveryInfo: "$DeliveryInfo",
                                 Order_Reference: "$Order_Reference",
                                 Product: "$Item_Details.ProductId",
                                 Order_Quantity: { $multiply: [ "$Item_Details.Quantity", "$Item_Details.BasicUnitQuantity" ] } ,
                                 Order_Items: '$Item_Details.Quantity',
                                 Total_Amount: '$Item_Details.Total_Amount',
                                 DeliveryDate: '$DeliveryDate'
                              }
                           },
                           { $match: AdvancedFindQuery },
                           {
                              $group: {
                                 _id: {
                                    Product: "$Product",
                                 },
                                 TotalOrders: { $sum: "$Order_Items" },
                                 TotalOrdersQuantity: { $sum: "$Order_Quantity" },
                                 TotalOrdersAmount: { $sum: "$Total_Amount" },
                                 More: {
                                    $push: {
                                       CustomerInfo: '$CustomerInfo',
                                       DeliveryInfo: '$DeliveryInfo',
                                       Order_Reference: '$Order_Reference',
                                       Order_Quantity:  '$Order_Quantity',
                                       Order_Items: '$Order_Items',
                                       Total_Amount: '$Total_Amount',
                                       DeliveryDate: '$DeliveryDate'
                                    }
                                 },
                              }
                           },
                           {
                              $project: {
                                 _id: 0,
                                 Product: "$_id.Product",
                                 TotalOrders: "$TotalOrders",
                                 TotalOrdersQuantity: "$TotalOrdersQuantity",
                                 TotalOrdersAmount: "$TotalOrdersAmount",
                                 More: "$More",
                              }
                           },
                           { $addFields: { Product_NameSort: { $toLower: "$Product.Product_Name" } } },
                           { $addFields: { OrdersLength: { $size: "$More" } } },
                           { $sort: ShortOrder },
                        ]).allowDiskUse(true).exec()
                  ]).then(response => {
                     response[0] = response[0].map(obj => {
                        obj.TotalOrdersAmount = obj.TotalOrdersAmount.toFixed(2);
                        obj.TotalOrdersQuantity = obj.TotalOrdersQuantity.toFixed(2);
                        return obj;
                     });
                     res.status(200).send({ Status: true, Response: response[0] });
                  }).catch(error => {
                     console.log(error);
                     res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Orders list!." });
                  });
               } else {
                  res.status(417).send({ Status: false, Message: 'Invalid User Details' });
               }
            }
         });
   }
};

exports.Subscription_Orders = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.FromDate || ReceivingData.FromDate === '') {
      res.status(400).send({ Status: false, Message: "Subscription From Date can not be empty" });
   } else if (!ReceivingData.ToDate || ReceivingData.ToDate === '') {
      res.status(400).send({ Status: false, Message: "Subscription To Date can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {

                  var FromDate = new Date(ReceivingData.FromDate);
                  var ToDate = new Date(ReceivingData.ToDate);
                  var diffDays = parseInt((ToDate - FromDate) / (1000 * 60 * 60 * 24), 10);
                  let LengthArray = Array.apply(null, Array(diffDays + 1)).map((val, idx) => idx);
                  var DatesArr = [];
                  LengthArray.map(Obj => {
                     const newDate = new Date(ReceivingData.FromDate);
                     const returnDate = new Date(newDate.setDate(newDate.getDate() + Obj));
                     DatesArr.push(returnDate);
                  });
                  var DeliveryLineArr = [];
                  if (ReceivingData.DeliveryLine !== null && typeof ReceivingData.DeliveryLine === 'object' && ReceivingData.DeliveryLine.length !== undefined && ReceivingData.DeliveryLine.length > 0) {
                     ReceivingData.DeliveryLine.map(obj => {
                        if (obj._id !== undefined) {
                           DeliveryLineArr.push(obj._id);
                        }
                     });
                  }

                  Promise.all([
                     // Sample Customers
                     CustomerManagement.CustomerManagementSchema
                        .find(
                           {
                              If_Deleted: false,
                              Region: result.Region,
                              Request_Sample_Order: true,
                              Active_Status: true,
                              $or: [{ Customer_Status: 'Subscription_Activated' },
                                    { Customer_Status: 'WaitingFor_Subscription' },
                                    { Customer_Status: 'Sample_Approved' }], 
                              $and: [{ Choose_The_Sample_Date: { $gte: FromDate } }, { Choose_The_Sample_Date: { $lte: ToDate } }]
                           },
                           {
                              Mobile_Number: 1, Customer_Name: 1, Address: 1, Pincode: 1, City: 1, Delivery_Line: 1, Request_Sample_Order: 1,
                              Choose_The_Sample_Date: 1, Choose_The_Session: 1
                           }, {})
                        .populate({ path: 'Delivery_Line', select: ['Deliveryline_Name'] })
                        .exec(),
                     // Active Subscription Customers
                     CustomerManagement.CustomerManagementSchema
                        .find(
                           {
                              If_Deleted: false,
                              Region: result.Region,
                              Active_Status: true,
                              Customer_Status: 'Subscription_Activated',                          
                              Subscription_Activated: true
                           },
                           {
                              Mobile_Number: 1, Customer_Name: 1, Address: 1, Pincode: 1, City: 1, Morning: 1, Evening: 1, Delivery_Line: 1,
                              VilfreshMoney_Limit: 1, AvailableCredit_Limit: 1
                           }, {})
                        .populate({ path: 'Morning.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .populate({ path: 'Evening.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .populate({ path: 'Delivery_Line', select: ['Deliveryline_Name'] })
                        .exec(),
                     // Subscription Changes List
                     CustomerManagement.Subscription_ManagementSchema
                        .find(
                           {
                              Active_Status: true,
                              If_Deleted: false,
                              Region: result.Region,
                              $and: [{ SubscriptionDate: { $gte: FromDate } }, { SubscriptionDate: { $lte: ToDate } }]
                           }, {}, {})
                        .populate({ path: 'Morning.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .populate({ path: 'Evening.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .exec(),
                     // Milk Product
                     ProductManagement.ProductManagementSchema
                        .find(
                           { CompanyId: result.CompanyId, Milk_YesOrNo: true, Active_Status: true },
                           { Product_Name: 1, BasicUnitQuantity: 1, Price: 1, Unit: 1 },
                           {})
                        .exec(),
                  ]).then(response => {
                     var Samples = JSON.parse(JSON.stringify(response[0]));
                     var Subscriptions = JSON.parse(JSON.stringify(response[1]));
                     var SubscriptionChanges = JSON.parse(JSON.stringify(response[2]));
                     var Products = JSON.parse(JSON.stringify(response[3]));

                     var AllSubscriptions = [];
                     DatesArr.map(Obj => {
                        Subscriptions.map(Subscription => {
                           if (DeliveryLineArr.length === 0 || DeliveryLineArr.includes(JSON.parse(JSON.stringify(Subscription.Delivery_Line._id)))) {
                              const NewSubscription = Object.assign({}, Subscription);
                              NewSubscription.SubscriptionDate = Obj;
                              const ChangesArr = SubscriptionChanges.filter(objOne => objOne.Customer === NewSubscription._id);
                              if (ChangesArr.length > 0) {
                                 NewSubscription.Morning = ChangesArr[0].Morning;
                                 NewSubscription.Evening = ChangesArr[0].Evening;
                              }
                              AllSubscriptions.push(NewSubscription);
                           }
                        });
                     });

                     var FinalProductData = [];

                     Products.map(obj => {
                        var newProductData = {
                           Product: obj,
                           TotalQuantity: 0,
                           TotalMorningQuantity: 0,
                           TotalEveningQuantity: 0,
                           TotalCustomers: 0,
                           Customers: []
                        };
                        AllSubscriptions.map(subscription => {
                           var newCustomerData = {
                              Customer_Name: subscription.Customer_Name,
                              Mobile_Number: subscription.Mobile_Number,
                              Delivery_Line: subscription.Delivery_Line,
                              VilfreshMoney_Limit: subscription.VilfreshMoney_Limit,
                              AvailableCredit_LimitL: subscription.AvailableCredit_LimitL,
                              SubscriptionDate: subscription.SubscriptionDate,
                              TotalQuantity: 0,
                              TotalMorningQuantity: 0,
                              TotalEveningQuantity: 0,
                           };
                           subscription.Morning.map(morning => {
                              if (morning.Liter > 0 && morning.ProductId._id === obj._id && (morning.Status === undefined || morning.Status === true) ) {
                                 newProductData.TotalMorningQuantity = newProductData.TotalMorningQuantity + morning.Liter;
                                 newCustomerData.TotalMorningQuantity = newCustomerData.TotalMorningQuantity + morning.Liter;
                              }
                           });
                           subscription.Evening.map(evening => {
                              if (evening.Liter > 0 && evening.ProductId._id === obj._id && (evening.Status === undefined || evening.Status === true)) {
                                 newProductData.TotalEveningQuantity = newProductData.TotalEveningQuantity + evening.Liter;
                                 newCustomerData.TotalEveningQuantity = newCustomerData.TotalEveningQuantity + evening.Liter;
                              }
                           });
                           newCustomerData.TotalQuantity = newCustomerData.TotalMorningQuantity + newCustomerData.TotalEveningQuantity;
                           if (newCustomerData.TotalQuantity > 0) {
                              newProductData.Customers.push(newCustomerData);
                           }
                        });
                        newProductData.TotalQuantity = newProductData.TotalMorningQuantity + newProductData.TotalEveningQuantity;
                        FinalProductData.push(newProductData);
                     });
                     res.status(200).send({ Status: true, Response: FinalProductData });
                  }).catch(error => {
                     console.log(error);
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find The Subscription Orders!.", Error: error });
                  });
               }
            }
         });
   }
};

exports.AllCustomersOrder_List = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {

                  var ShortOrder = { DeliveryDate: -1 };
                  var ShortKey = ReceivingData.ShortKey;
                  var ShortCondition = ReceivingData.ShortCondition;
                  if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                     ShortOrder = {};
                     ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
                  }

                  var FindQuery = { 'If_Deleted': false, Region: result.Region };

                  var AdvancedFindQuery = { };

                  const minDate = new Date(new Date().setHours(0, 0, 0, 0));
                  const minDateFilter = ReceivingData.FilterQuery.filter(obj => obj.Key === 'DeliveryFrom');
                  if (minDateFilter.length === 0) {
                     var newFilterQuery =  { "Active": true, "Key": "DeliveryFrom", "Value": minDate, "DisplayName": "Delivery From", "DBName": "DeliveryDate", "Type": "Date", "Option": "GTE" };
                     ReceivingData.FilterQuery.push(newFilterQuery);
                  }

                  if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                     ReceivingData.FilterQuery.map(obj => {
                        if (obj.Type === 'Date') {
                           if (FindQuery[obj.DBName] === undefined) {
                              FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           } else {
                              const DBName = obj.DBName;
                              const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                              FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                           }
                        }
                        if (obj.Type === 'Object' && obj.DBName === 'Delivery_Line') {
                           const DeliveryIds = obj.Value.map( objNew =>  mongoose.Types.ObjectId(objNew._id));
                           AdvancedFindQuery['DeliveryInfo._id'] = { $in: DeliveryIds};
                        }
                     });
                  }
                  
                  Promise.all([
                     OrderManagement.OrderSchema
                        .aggregate([
                           { $match: FindQuery },
                           {
                              $lookup: {
                                 from: "Customer_Managements",
                                 let: { "customer": "$CustomerId" },
                                 pipeline: [
                                    { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                                    { $project: { "Customer_Name": 1, "Address": 1, "Mobile_Number": 1, "Pincode": 1, "Delivery_Line": 1 } }
                                 ],
                                 as: 'CustomerInfo'
                              }
                           },
                           { $unwind: { path: "$CustomerInfo", preserveNullAndEmptyArrays: true } },
                           { $match:  { $expr: { $or: [ {$ne: [ "$CustomerInfo.Customer_Status", "InActivated" ]}, {$ne: ["$OrderConfirmed", false]} ] } } },
                           {
                              $lookup: {
                                 from: "Delivery_Line",
                                 let: { "deliveryline": "$CustomerInfo.Delivery_Line" },
                                 pipeline: [
                                    { $match: { $expr: { $eq: ["$$deliveryline", "$_id"] } } },
                                    { $project: { "Deliveryline_Name": 1, "Deliveryline_Code": 1, } }
                                 ],
                                 as: 'DeliveryInfo'
                              }

                           },
                           { $unwind: { path: "$DeliveryInfo", preserveNullAndEmptyArrays: true } },
                           { $unwind: { path: "$Item_Details", preserveNullAndEmptyArrays: true } },
                           {
                              $lookup: {
                                 from: "Products_Management",
                                 let: { "product": "$Item_Details.ProductId" },
                                 pipeline: [
                                    { $match: { $expr: { $eq: ["$$product", "$_id"] } } },
                                    { $project: { "Product_Name": 1, "BasicUnitQuantity": 1, "Price": 1, "Unit": 1 } }
                                 ],
                                 as: 'Item_Details.ProductId'
                              }
                           },
                           { $unwind: { path: "$Item_Details.ProductId", preserveNullAndEmptyArrays: true } },
                           {
                              $project: {
                                 CustomerInfo: "$CustomerInfo",
                                 DeliveryInfo: "$DeliveryInfo",
                                 Order_Reference: "$Order_Reference",
                                 Ordered_Date: '$createdAt',
                                 Product: "$Item_Details.ProductId",
											Order_Quantity: {
												"$cond": {
													"if": { $or: [ { $eq: [ "$Order_Type", "Subscription_From" ] }, { $eq: [ "$Order_Type", "Sample_From" ] } ]},
													"then": {  $multiply: [ { $divide: [ "$Item_Details.Quantity", "$Item_Details.BasicUnitQuantity" ] }, "$Item_Details.BasicUnitQuantity" ] },
													"else": { $multiply: [ "$Item_Details.Quantity", "$Item_Details.BasicUnitQuantity" ] }
												}
											},
											Order_Items: '$Item_Details.Quantity',
                                 Total_Amount: '$Item_Details.Total_Amount',
                                 DeliveryDate: '$DeliveryDate',
                              }
                           },
                           { $match: AdvancedFindQuery },
                           { $sort: ShortOrder },
                        ]).allowDiskUse(true).exec()
                  ]).then(response => {
                     res.status(200).send({ Status: true, Response: response[0] });
                  }).catch(error => {
                     console.log(error);
                     res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Orders list!." });
                  });
               } else {
                  res.status(417).send({ Status: false, Message: 'Invalid User Details' });
               }
            }
         });
   }
};


exports.Confirm_TodayOrders = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.DeliveryLine || ReceivingData.DeliveryLine === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      ReceivingData.DeliveryLine = mongoose.Types.ObjectId(ReceivingData.DeliveryLine);
            
      UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {
                  var currentDate = new Date();
                  var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
                  var endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));
                  var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';

                  Promise.all([
                     // Sample Customers
                     CustomerManagement.CustomerManagementSchema
                        .find(
                           {
                              If_Deleted: false,
                              Region: result.Region,
                              Delivery_Line: ReceivingData.DeliveryLine,
                              Active_Status: true,
                              Request_Sample_Order : true,                              
                              $or: [{ Customer_Status: 'Sample_Approved' },
                                    { Customer_Status: 'WaitingFor_Subscription' },
                                    { Customer_Status: 'Subscription_Activated' }],
                              Choose_The_Session: CurrentSession,
                              $and: [{ Choose_The_Sample_Date: { $gte: startOfDay } }, { Choose_The_Sample_Date: { $lte: endOfDay } }]
                           },
                           {
                              Mobile_Number: 1, Customer_Name: 1, Address: 1, Pincode: 1, City: 1, Delivery_Line: 1, Request_Sample_Order: 1,
                              Choose_The_Sample_Date: 1, Choose_The_Session: 1
                           }, {})
                        .exec(),
                     // Active Subscription Customers
                     CustomerManagement.CustomerManagementSchema
                        .find(
                           {
                              If_Deleted: false,
                              Region: result.Region,
                              Delivery_Line: ReceivingData.DeliveryLine,
                              Active_Status: true,
                              Customer_Status: 'Subscription_Activated',                          
                              Subscription_Activated: true
                           },
                           {
                              Mobile_Number: 1, Customer_Name: 1, Address: 1, Pincode: 1, City: 1, Morning: 1, Evening: 1, Delivery_Line: 1,
                              VilfreshMoney_Limit: 1, AvailableCredit_Limit: 1, VilfreshCredit_Limit: 1
                           }, {})
                        .populate({ path: 'Morning.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .populate({ path: 'Evening.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .exec(),
                     // Subscription Changes List
                     CustomerManagement.Subscription_ManagementSchema
                        .find(
                           {
                              Active_Status: true,
                              If_Deleted: false,
                              Region: result.Region,
                              $and: [{ SubscriptionDate: { $gte: startOfDay } }, { SubscriptionDate: { $lte: endOfDay } }]
                           }, {}, {})
                        .populate({ path: 'Morning.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .populate({ path: 'Evening.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .exec(),
                     // Milk Product
                     ProductManagement.ProductManagementSchema
                        .findOne(
                           { Milk_YesOrNo: true, Type: "A1", Active_Status: true },
                           { Product_Name: 1, BasicUnitQuantity: 1, Price: 1, Unit: 1 },
                           {})
                        .exec(),
                     // Orders List
                     OrderManagement.OrderSchema
                        .find(
                           {
                              Region: result.Region,
                              OrderConfirmed: false,
                              $and: [{ DeliveryDate: { $gte: startOfDay } }, { DeliveryDate: { $lte: endOfDay } }]
                           },
                           {
                              CustomerId: 1, Order_Reference: 1, Order_Type: 1, Item_Details: 1, Item_Counts: 1, Payable_Amount: 1, Payment_Status: 1,
                              Payment_Type: 1, If_Partial: 1, ReduceFrom_Wallet: 1, ReduceFrom_Online: 1, ReduceFrom_Credit: 1, createdAt: 1
                           }, {})
                        .populate({ path: 'Item_Details.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .populate({ path: 'CustomerId', select: ['Delivery_Line', 'Region', 'VilfreshMoney_Limit', 'VilfreshCredit_Limit', 'AvailableCredit_Limit', 'Customer_Status'] })
                        .exec(),
                     OrderManagement.OrderSchema.findOne({ Active_Status: true, If_Deleted: false }, {}, { sort: { Order_Unique: -1 } }).exec(),
                     DeliveryPersonManagement.DeliveryPersonSchema.findOne({ DeliveryLine: ReceivingData.DeliveryLine, $or: [{Session: CurrentSession}, {Session: 'Both'}], Active_Status: true, If_Deleted: false }, {}, {}).exec()
                  ]).then(response => {
                     var Samples = JSON.parse(JSON.stringify(response[0]));
                     var Subscriptions = JSON.parse(JSON.stringify(response[1]));
                     var SubscriptionChanges = JSON.parse(JSON.stringify(response[2]));
                     var SampleMilk = JSON.parse(JSON.stringify(response[3]));
                     var Orders = JSON.parse(JSON.stringify(response[4]));
                     var LastOrder = JSON.parse(JSON.stringify(response[5]));
                     var DeliveryPerson = JSON.parse(JSON.stringify(response[6]));

                     var UndeliveredOrders = Orders.filter(obj =>  JSON.parse(JSON.stringify(obj.CustomerId.Delivery_Line)) === JSON.parse(JSON.stringify(ReceivingData.DeliveryLine)) && obj.CustomerId.Customer_Status === 'InActivated' );
                     var UnDeliverOrderIds = UndeliveredOrders.map(obj => mongoose.Types.ObjectId(obj._id));
                     Orders = Orders.filter(obj => JSON.parse(JSON.stringify(obj.CustomerId.Delivery_Line)) === JSON.parse(JSON.stringify(ReceivingData.DeliveryLine)) && obj.CustomerId.Customer_Status !== 'InActivated' );

                     var CustomerUndeliveredOrders = [];
                     UndeliveredOrders.map(obj => {
                        
                        
                        const CusIdx = CustomerUndeliveredOrders.findIndex(objNew => objNew._id === obj.CustomerId._id);
                        if (CusIdx < 0) {
                           var NewObj = obj.CustomerId;
                           delete obj.CustomerId;
                           NewObj.Orders = [obj];
                           CustomerUndeliveredOrders.push(NewObj);
                        } else {
                           delete obj.CustomerId;
                           CustomerUndeliveredOrders[CusIdx].Orders.push(obj);
                        }
                     });

                     CustomerUndeliveredOrders = CustomerUndeliveredOrders.map(obj => {
                        var TotalReturnAmount = 0;
                        obj.Orders.map(ObjOne => {
                           TotalReturnAmount = TotalReturnAmount + ObjOne.Payable_Amount;
                        });
                        
                        obj.VilfreshMoney_Limit = parseFloat(obj.VilfreshMoney_Limit);
                        obj.VilfreshCredit_Limit = parseFloat(obj.VilfreshCredit_Limit);           
                       obj.AvailableCredit_Limit = parseFloat(obj.AvailableCredit_Limit);
                        
                        var NewCreditAvailable = obj.AvailableCredit_Limit;
                        var NewWalletAmount = obj.VilfreshMoney_Limit;
                        var CreditPaidAmount = obj.VilfreshCredit_Limit - obj.AvailableCredit_Limit;
            
                        if (TotalReturnAmount >= CreditPaidAmount) {
                           NewWalletAmount = NewWalletAmount + (TotalReturnAmount - CreditPaidAmount); 
                           NewCreditAvailable = NewCreditAvailable + CreditPaidAmount;
                        } else if (TotalReturnAmount < CreditPaidAmount) {
                           NewCreditAvailable = NewCreditAvailable + TotalReturnAmount;
                        }
                        if (NewWalletAmount > obj.VilfreshMoney_Limit) {                           
                           const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                              Customer: obj._id,
                              Amount: NewWalletAmount - obj.VilfreshMoney_Limit,
                              Date: new Date(),
                              Previous_Limit: obj.VilfreshMoney_Limit,
                              Available_Limit: NewWalletAmount,
                              Added_or_Reduced: "Added",
                              Added_Type: "Order_UnDeliver",
                              Added_Reference_Id: "",
                              Added_By_User: null,
                              CashFrom_DeliveryPerson: null,
                              Added_Approved_Status: true,
                              DateOf_Approved: new Date(),
                              Added_Approved_By: null,
                              PurposeOf_Reduce: "",
                              Order_Id: null,
                              Order_By: "",
                              Order_By_Person: "",
                              Region: obj.Region,
                              Active_Status: true,
                              If_Deleted: false,
                           });
                           Create_VilfreshMoneyHistory.save();                              
                        }
                        if (NewCreditAvailable > obj.AvailableCredit_Limit) {
                           const Create_VilfreshCreditHistory = new VilfreshCredit_Limit.VilfreshCreditHistorySchema({
                              Customer: obj._id,
                              Date: new Date(),
                              Credit_Limit: obj.VilfreshCredit_Limit,
                              Previous_AvailableLimit: obj.AvailableCredit_Limit,
                              Available_Limit: NewCreditAvailable,
                              Added_or_Reduced: 'Added',
                              Added_Type: "Order_UnDeliver",
                              Added_By_User: null,   
                              Added_Approved_Status: true,
                              DateOf_Approved: new Date(),
                              Added_Approved_By: null,
                              PurposeOf_Reduce: '',
                              Order_Id: null,
                              Order_By: '',
                              Order_By_Person: '',
                              Region: obj.Region,
                              Active_Status: true,
                              If_Deleted: false,
                           });
                           Create_VilfreshCreditHistory.save();
                        }
                        obj.VilfreshMoney_Limit = NewWalletAmount;
                        obj.AvailableCredit_Limit = NewCreditAvailable;
                        return obj;
                     });

                     // Orders = Orders.filter(obj => {
                     //    const Idx = Subscriptions.findIndex(objNew => objNew._id === obj.CustomerId);
                     //    return Idx >= 0 ? true : false;
                     // });
                     
                     var SampleOrders = [];
                     var CustomerOrders = [];
                     var MonyHistorySchema = [];
                     var CreditHistorySchema = [];
                     var LastOrder_Reference = LastOrder !== null ? (LastOrder.Order_Unique + 1) : 1;
                     var OrderIds = Orders.map(obj => mongoose.Types.ObjectId(obj._id));
                     var CustomerUpdate = [];
                     Samples.map(Sample => {
                        const NewId = mongoose.Types.ObjectId();
                        const Product = {
                           ProductId: mongoose.Types.ObjectId(SampleMilk._id),
                           FromCart: null,
                           Quantity: 0.5,
                           BasicUnitQuantity: SampleMilk.BasicUnitQuantity,
                           Unit_Price: SampleMilk.Price,
                           Total_Amount: SampleMilk.Price * 0.5,
                        };
                        const Create_Order = new OrderManagement.OrderSchema({
                           _id: NewId,
                           CustomerId: mongoose.Types.ObjectId(Sample._id),
                           FromBasket: null,
                           Order_Reference: 'Ord-' + LastOrder_Reference.toString().padStart(9, '0'),
                           Order_Unique: LastOrder_Reference,
                           Order_Type: 'Sample_From',
                           Item_Details: [Product],
                           Item_Counts: 1,
                           Payable_Amount: 0,
                           Payment_Status: 'Paid', // Paid , UnPaid
                           Payment_Type: 'Wallet', // Wallet, Online, Credit, Partial_WalletOnline, Partial_WalletCredit
                           If_Partial: false,
                           ReduceFrom_Wallet: 0,
                           ReduceFrom_Online: 0,
                           ReduceFrom_Credit: 0,
                           DeliveryDate: startOfDay,
                           Region: result.Region,
                           OrderConfirmed: true,
                           OrderConfirmedBy: ReceivingData.User,
                           DeliveredSession: CurrentSession,
                           OrderDelivered: false,
                           DeliveryPerson: DeliveryPerson !== null ? mongoose.Types.ObjectId(DeliveryPerson._id) : null,
                           DeliveryDateTime: null,
                           DeliveryNotes: '',
                           OrderUnDelivered: false,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        LastOrder_Reference = LastOrder_Reference + 1;
                        SampleOrders.push(Create_Order);
                     });
                     
                     Subscriptions.map(Subscription => {
                        const ChangesArr = SubscriptionChanges.filter(obj => obj.Customer === Subscription._id);
                        if (ChangesArr.length > 0) {
                           Subscription.Morning = ChangesArr[0].Morning;
                           Subscription.Evening = ChangesArr[0].Evening;
                        }
                        var SubscriptionValue = 0;
                        var OItems = [];
                        if (CurrentSession === 'Morning') {
                           Subscription.Morning.map(obj => {
                              if (obj.Liter > 0 && (obj.Status === undefined || obj.Status === true)) {
                                 const ItemValue = (parseFloat(obj.Liter) / parseFloat(obj.ProductId.BasicUnitQuantity)) * parseFloat(obj.ProductId.Price);
                                 SubscriptionValue = SubscriptionValue + ItemValue;
                                 OItems.push({
                                    ProductId: mongoose.Types.ObjectId(obj.ProductId._id),
                                    FromCart: null,
                                    Quantity: obj.Liter,
                                    BasicUnitQuantity: parseFloat(obj.ProductId.BasicUnitQuantity),
                                    Unit_Price: parseFloat(obj.ProductId.Price),
                                    Total_Amount: ItemValue
                                 });
                              }
                           });
                        }
                        if (CurrentSession === 'Evening') {
                           Subscription.Evening.map(obj => {
                              if (obj.Liter > 0 && (obj.Status === undefined || obj.Status === true)) {
                                 const ItemValue = ((parseFloat(obj.Liter) / parseFloat(obj.ProductId.BasicUnitQuantity)) * parseFloat(obj.ProductId.Price));
                                 SubscriptionValue = SubscriptionValue + ItemValue;
                                 OItems.push({
                                    ProductId: mongoose.Types.ObjectId(obj.ProductId._id),
                                    FromCart: null,
                                    Quantity: obj.Liter,
                                    BasicUnitQuantity: parseFloat(obj.ProductId.BasicUnitQuantity),
                                    Unit_Price: parseFloat(obj.ProductId.Price),
                                    Total_Amount: ItemValue
                                 });
                              }
                           });
                        }
                        var LimitAvailable = false;
                        var OType = '';
                        var OWallet = 0;
                        var OCredit = 0;
                        if (Subscription.VilfreshMoney_Limit >= SubscriptionValue) {
                           LimitAvailable = true;
                           OType = 'Wallet';
                           OWallet = SubscriptionValue;
                           Subscription.VilfreshMoney_Limit = Subscription.VilfreshMoney_Limit - OWallet;
                        } else if (Subscription.VilfreshMoney_Limit > 0 && Subscription.VilfreshMoney_Limit + Subscription.AvailableCredit_Limit >= SubscriptionValue) {
                           LimitAvailable = true;
                           OType = 'Partial_WalletCredit';
                           OWallet = Subscription.VilfreshMoney_Limit;
                           OCredit = SubscriptionValue - OWallet;
                           Subscription.VilfreshMoney_Limit = 0;
                           Subscription.AvailableCredit_Limit = Subscription.AvailableCredit_Limit - OCredit;
                        } else if (Subscription.AvailableCredit_Limit >= SubscriptionValue) {
                           LimitAvailable = true;
                           OType = 'Credit';
                           OCredit = SubscriptionValue;
                           Subscription.AvailableCredit_Limit = Subscription.AvailableCredit_Limit - OCredit;
                        }
                        if (LimitAvailable && OItems.length > 0) {
                           const NewId = mongoose.Types.ObjectId();
                           const Create_Order = new OrderManagement.OrderSchema({
                              _id: NewId,
                              CustomerId: mongoose.Types.ObjectId(Subscription._id),
                              FromBasket: null,
                              Order_Reference: 'Ord-' + LastOrder_Reference.toString().padStart(9, '0'),
                              Order_Unique: LastOrder_Reference,
                              Order_Type: 'Subscription_From',
                              Item_Details: OItems,
                              Item_Counts: OItems.length,
                              Payable_Amount: SubscriptionValue,
                              Payment_Status: 'Paid',
                              Payment_Type: OType,
                              If_Partial: OType === 'Partial_WalletCredit' ? true : false,
                              ReduceFrom_Wallet: OWallet,
                              ReduceFrom_Online: 0,
                              ReduceFrom_Credit: OCredit,
                              DeliveryDate: startOfDay,
                              Region: result.Region,
                              OrderConfirmed: true,
                              OrderConfirmedBy: ReceivingData.User,
                              DeliveredSession : CurrentSession,
                              OrderDelivered: false,
                              DeliveryPerson: DeliveryPerson !== null ? mongoose.Types.ObjectId(DeliveryPerson._id) : null,
                              DeliveryDateTime: null,
                              DeliveryNotes: '',
                              OrderUnDelivered: false,
                              Active_Status: true,
                              If_Deleted: false
                           });
                           LastOrder_Reference = LastOrder_Reference + 1;
                           CustomerOrders.push(Create_Order);
                           CustomerUpdate.push({
                              _id: mongoose.Types.ObjectId(Subscription._id),
                              VilfreshMoney_Limit: Subscription.VilfreshMoney_Limit,
                              AvailableCredit_Limit: Subscription.AvailableCredit_Limit
                           });
                           if (OWallet > 0) {
                              const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                                 Customer: mongoose.Types.ObjectId(Subscription._id),
                                 Amount: OWallet,
                                 Date: new Date(),
                                 Previous_Limit: Subscription.VilfreshMoney_Limit + OWallet,
                                 Available_Limit: Subscription.VilfreshMoney_Limit,
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
                                 Region: result.Region,
                                 Active_Status: true,
                                 If_Deleted: false,
                              });
                              MonyHistorySchema.push(Create_VilfreshMoneyHistory);
                           }
                           if (OCredit > 0) {
                              const Create_VilfreshCreditHistory = new VilfreshCredit_Limit.VilfreshCreditHistorySchema({
                                 Customer: mongoose.Types.ObjectId(Subscription._id),
                                 Date: new Date(),
                                 Credit_Limit: Subscription.VilfreshCredit_Limit,
                                 Previous_AvailableLimit: Subscription.AvailableCredit_Limit + OCredit,
                                 Available_Limit: Subscription.AvailableCredit_Limit,
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
                                 Region: result.Region,
                                 Active_Status: true,
                                 If_Deleted: false,
                              });
                              CreditHistorySchema.push(Create_VilfreshCreditHistory);
                           }
                        }
                     });

                     var Create_GeneratedOrders = new OrderManagement.GeneratedOrdersSchema({
                        Session: CurrentSession,
                        Date: startOfDay,
                        Region: result.Region,
                        DeliveryLine: ReceivingData.DeliveryLine,
                        DeliveryPersons: DeliveryPerson !== null ? mongoose.Types.ObjectId(DeliveryPerson._id) : null,
                        GeneratedBy: ReceivingData.User,
                        Active_Status: true,
                        If_Deleted: false
                     });
                     var DeliveryPersonId = DeliveryPerson !== null ? mongoose.Types.ObjectId(DeliveryPerson._id) : null;
                     Promise.all([
                        SampleOrders.map(obj => obj.save()),
                        CustomerOrders.map(obj => obj.save()),
                        Create_GeneratedOrders.save(),
                        CreditHistorySchema.map(obj => obj.save()),
                        MonyHistorySchema.map(obj => obj.save()),
                        OrderManagement.OrderSchema.updateMany({ _id: { $in: OrderIds } }, { $set: { OrderConfirmed: true, OrderConfirmedBy: ReceivingData.User,  DeliveredSession: CurrentSession, DeliveryPerson: DeliveryPersonId } }).exec(),
                        OrderManagement.OrderSchema.updateMany({ _id: { $in: UnDeliverOrderIds } }, { $set: { OrderConfirmed: true, OrderConfirmedBy: ReceivingData.User,  DeliveredSession: CurrentSession, OrderUnDelivered: true, DeliveryNotes: 'Order Canceled due to Customer Inactive' } }).exec(),
                        CustomerUpdate.map(obj =>
                           CustomerManagement.CustomerManagementSchema
                              .updateOne({ _id: obj._id }, { $set: { VilfreshMoney_Limit: obj.VilfreshMoney_Limit, AvailableCredit_Limit: obj.AvailableCredit_Limit } })
                              .exec()),
                        CustomerUndeliveredOrders.map(obj => 
                           CustomerManagement.CustomerManagementSchema
                              .updateOne({ _id: obj._id }, { $set: { VilfreshMoney_Limit: obj.VilfreshMoney_Limit, AvailableCredit_Limit: obj.AvailableCredit_Limit } })
                              .exec())
                     ]).then(response_1 => {
                        res.status(200).send({ Status: true, Message: 'Orders Successfully Generated' });
                     }).catch(error_1 => {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Update The Today Orders!.", Error: error_1 });
                     });
                    // res.status(200).send({ Status: true, Message: 'Orders Successfully Generated' });

                  }).catch(error => {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find The Today Orders!.", Error: error });
                  });
               }
            }
         });
   }
};


exports.OrderUnDelivered_DeliveryPerson_Tracking = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {
                  var FindQuery = { 'If_Deleted': false, Region: result.Region };
                  var currentDate = new Date();
                  var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
                  var endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));
                  Promise.all([
                     DeliveryPersonManagement.DeliveryPersonSchema
                        .aggregate([
                           { $match: FindQuery },
                           {
                              $lookup: {
                                 from: "OrderManagement",
                                 let: { "person": "$_id" },
                                 pipeline: [
                                    {
                                       $match: {
                                          $expr: { $eq: ["$$person", "$DeliveryPerson"] },
                                          $and: [{ DeliveryDate: { $gte: startOfDay } },
                                          { DeliveryDate: { $lte: endOfDay } }],
                                          OrderDelivered: false,
                                          OrderUnDelivered: false
                                       }
                                    },
                                    { $project: { "OrderUnDelivered": 1, "CustomerId": 1 } }
                                 ],
                                 as: 'OrderInfo'
                              }
                           },
                           { $addFields: { OrderInfoLength: { $size: "$OrderInfo" } } },
                           { $match: { $expr: { $gte: ["$OrderInfoLength", 1] } } }
                        ]).allowDiskUse(true).exec(),
                     OrderManagement.OrderSchema.find({
                        $and: [{ DeliveryDate: { $gte: startOfDay } },
                        { DeliveryDate: { $lte: endOfDay } }],
                        OrderConfirmed: true,
                         OrderDelivered: false,
                        OrderUnDelivered: false,
                        Active_Status: true,
                        If_Deleted: false
                     })
                        .populate({ path: "CustomerId", select: ['Mobile_Number', 'Customer_Name', 'Address', 'Pincode', 'Latitude', 'Longitude'] })
                        .populate({ path: "DeliveryPerson", select: ['Mobile_Number', 'DeliveryPerson_Name', 'Address', 'Latitude', 'Longitude'] })
                        .exec(),
                  ]).then(response => {
                     var DeliveryPerson = JSON.parse(JSON.stringify(response[0]));
                     var OrderDetails = JSON.parse(JSON.stringify(response[1]));
                     var VerifiedArr = [];
                     DeliveryPerson.map(person => {
                        const OrdersArr = OrderDetails.filter(obj1 => obj1.DeliveryPerson !== null && obj1.DeliveryPerson._id === person._id);
                        const Customers = [];
                        OrdersArr.map(order => {
                           const Idx = Customers.findIndex(obj2 => obj2.CustomerId === order.CustomerId._id);
                           if (Idx < 0) {
                              const Cus = {
                                 CustomerId: order.CustomerId._id,
                                 Customer_Name: order.CustomerId.Customer_Name,
                                 Mobile_Number: order.CustomerId.Mobile_Number,
                                 Address: order.CustomerId.Address,
                                 Pincode: order.CustomerId.Pincode || '',
                                 Latitude: order.CustomerId.Latitude,
                                 Longitude: order.CustomerId.Longitude
                              };
                              Customers.push(Cus);
                           }
                        });
                        const Static = {
                           DeliveryPersonId: person._id,
                           DeliveryPerson_Name: person.DeliveryPerson_Name,
                           Mobile_Number: person.Mobile_Number,
                           Address: person.Address,
                           Latitude: person.Latitude,
                           Longitude: person.Longitude,
                           CustomerInfo: Customers
                        };
                        VerifiedArr.push(Static);
                     });
                     res.status(200).send({ Status: true, Response: VerifiedArr });
                  }).catch(error => {
                     res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Orders list!.", Error: error });
                  });
               } else {
                  res.status(400).send({ Status: false, Message: "Invalid User Details!" });
               }
            }
         });
   }
};


exports.Confirm_TodayOrders_WithAssign = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.DeliveryLine || ReceivingData.DeliveryLine === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.AssignedArray || typeof ReceivingData.AssignedArray !== 'object' || ReceivingData.AssignedArray.length === 0 ) {
      res.status(400).send({ Status: false, Message: "Orders Assigned Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      ReceivingData.DeliveryLine = mongoose.Types.ObjectId(ReceivingData.DeliveryLine);
      UserManagement.UserManagementSchema.findOne({ _id: ReceivingData.User }, {}, {})
         .exec(function (err, result) {
            if (err) {
               res.status(417).send({ Status: false, Message: "Some error occurred while Find The User Details!.", Error: err });
            } else {
               if (result !== null) {
                  var currentDate = new Date();
                  var startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
                  var endOfDay = new Date(currentDate.setHours(23, 59, 59, 999));
                  var CurrentSession = new Date().getHours() < 12 ? 'Morning' : 'Evening';

                  Promise.all([
                     // Sample Customers
                     CustomerManagement.CustomerManagementSchema
                        .find(
                           {
                              If_Deleted: false,
                              Region: result.Region,
                              Delivery_Line: ReceivingData.DeliveryLine,
                              Active_Status: true,
                              Request_Sample_Order : true,
                              $or: [{ Customer_Status: 'Subscription_Activated' },{ Customer_Status: 'WaitingFor_Subscription' }, {Customer_Status: 'Sample_Approved'} ],
                              Choose_The_Session: CurrentSession,
                              $and: [{ Choose_The_Sample_Date: { $gte: startOfDay } }, { Choose_The_Sample_Date: { $lte: endOfDay } }]
                           },
                           {
                              Mobile_Number: 1, Customer_Name: 1, Address: 1, Pincode: 1, City: 1, Delivery_Line: 1, Request_Sample_Order: 1,
                              Choose_The_Sample_Date: 1, Choose_The_Session: 1
                           }, {})
                        .exec(),
                     // Active Subscription Customers
                     CustomerManagement.CustomerManagementSchema
                        .find(
                           {
                              If_Deleted: false,
                              Region: result.Region,
                              Delivery_Line: ReceivingData.DeliveryLine,
                              Active_Status: true,
                              Customer_Status: 'Subscription_Activated',
                              Subscription_Activated: true
                           },
                           {
                              Mobile_Number: 1, Customer_Name: 1, Address: 1, Pincode: 1, City: 1, Morning: 1, Evening: 1, Delivery_Line: 1,
                              VilfreshMoney_Limit: 1, AvailableCredit_Limit: 1, VilfreshCredit_Limit: 1
                           }, {})
                        .populate({ path: 'Morning.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .populate({ path: 'Evening.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .exec(),
                     // Subscription Changes List
                     CustomerManagement.Subscription_ManagementSchema
                        .find(
                           {
                              Active_Status: true,
                              If_Deleted: false,
                              Region: result.Region,
                              $and: [{ SubscriptionDate: { $gte: startOfDay } }, { SubscriptionDate: { $lte: endOfDay } }]
                           }, {}, {})
                        .populate({ path: 'Morning.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .populate({ path: 'Evening.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .exec(),
                     // Milk Product
                     ProductManagement.ProductManagementSchema
                        .findOne(
                           { Milk_YesOrNo: true, Type: "A1", Active_Status: true },
                           { Product_Name: 1, BasicUnitQuantity: 1, Price: 1, Unit: 1 },
                           {})
                        .exec(),
                     // Orders List
                     OrderManagement.OrderSchema
                        .find(
                           {
                              Region: result.Region,
                              OrderConfirmed: false,
                              $and: [{ DeliveryDate: { $gte: startOfDay } }, { DeliveryDate: { $lte: endOfDay } }]
                           },
                           {
                              CustomerId: 1, Order_Reference: 1, Order_Type: 1, Item_Details: 1, Item_Counts: 1, Payable_Amount: 1, Payment_Status: 1,
                              Payment_Type: 1, If_Partial: 1, ReduceFrom_Wallet: 1, ReduceFrom_Online: 1, ReduceFrom_Credit: 1, createdAt: 1
                           }, {})
                        .populate({ path: 'Item_Details.ProductId', select: ['Product_Name', 'BasicUnitQuantity', 'Price', 'Unit'] })
                        .populate({ path: 'CustomerId', select: ['Delivery_Line', 'Region', 'VilfreshMoney_Limit', 'VilfreshCredit_Limit', 'AvailableCredit_Limit', 'Customer_Status'] })
                        .exec(),
                     OrderManagement.OrderSchema.findOne({ Active_Status: true, If_Deleted: false }, {}, { sort: { Order_Unique: -1 } }).exec(),
                     DeliveryPersonManagement.DeliveryPersonSchema.findOne({ DeliveryLine: ReceivingData.DeliveryLine, $or: [{Session: CurrentSession}, {Session: 'Both'}], Active_Status: true, If_Deleted: false }, {}, {}).exec()
                  ]).then(response => {
                     var Samples = JSON.parse(JSON.stringify(response[0]));
                     var Subscriptions = JSON.parse(JSON.stringify(response[1]));
                     var SubscriptionChanges = JSON.parse(JSON.stringify(response[2]));
                     var SampleMilk = JSON.parse(JSON.stringify(response[3]));
                     var Orders = JSON.parse(JSON.stringify(response[4]));
                     var LastOrder = JSON.parse(JSON.stringify(response[5]));
                     var DeliveryPerson = JSON.parse(JSON.stringify(response[6]));

                     var UndeliveredOrders = Orders.filter(obj =>  JSON.parse(JSON.stringify(obj.CustomerId.Delivery_Line)) === JSON.parse(JSON.stringify(ReceivingData.DeliveryLine)) && obj.CustomerId.Customer_Status === 'InActivated' );
                     var UnDeliverOrderIds = UndeliveredOrders.map(obj => mongoose.Types.ObjectId(obj._id));
                     Orders = Orders.filter(obj => JSON.parse(JSON.stringify(obj.CustomerId.Delivery_Line)) === JSON.parse(JSON.stringify(ReceivingData.DeliveryLine)) && obj.CustomerId.Customer_Status !== 'InActivated' );

                     var CustomerUndeliveredOrders = [];
                     UndeliveredOrders.map(obj => {
                        const CusIdx = CustomerUndeliveredOrders.findIndex(objNew => objNew._id === obj.CustomerId._id);
                        if (CusIdx < 0) {
                           var NewObj = obj.CustomerId;
                           delete obj.CustomerId;
                           NewObj.Orders = [obj];
                           CustomerUndeliveredOrders.push(NewObj);
                        } else {
                           delete obj.CustomerId;
                           CustomerUndeliveredOrders[CusIdx].Orders.push(obj);
                        }
                     });

                     CustomerUndeliveredOrders = CustomerUndeliveredOrders.map(obj => {
                        var TotalReturnAmount = 0;
                        obj.Orders.map(ObjOne => {
                           TotalReturnAmount = TotalReturnAmount + ObjOne.Payable_Amount;
                        });
                        obj.VilfreshMoney_Limit = parseFloat(obj.VilfreshMoney_Limit);
                        obj.VilfreshCredit_Limit = parseFloat(obj.VilfreshCredit_Limit);           
                        obj.AvailableCredit_Limit = parseFloat(obj.AvailableCredit_Limit);
            
                        var NewCreditAvailable = obj.AvailableCredit_Limit;
                        var NewWalletAmount = obj.VilfreshMoney_Limit;
                        var CreditPaidAmount = obj.VilfreshCredit_Limit - obj.AvailableCredit_Limit;
            
                        if (TotalReturnAmount >= CreditPaidAmount) {
                           NewWalletAmount = NewWalletAmount + (TotalReturnAmount - CreditPaidAmount); 
                           NewCreditAvailable = NewCreditAvailable + CreditPaidAmount;
                        } else if (TotalReturnAmount < CreditPaidAmount) {
                           NewCreditAvailable = NewCreditAvailable + TotalReturnAmount;
                        }
                        if (NewWalletAmount > obj.VilfreshMoney_Limit) {
                           const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                              Customer: obj._id,
                              Amount: NewWalletAmount - obj.VilfreshMoney_Limit,
                              Date: new Date(),
                              Previous_Limit: obj.VilfreshMoney_Limit,
                              Available_Limit: NewWalletAmount,
                              Added_or_Reduced: "Added",
                              Added_Type: "Order_UnDeliver",
                              Added_Reference_Id: "",
                              Added_By_User: null,
                              CashFrom_DeliveryPerson: null,
                              Added_Approved_Status: true,
                              DateOf_Approved: new Date(),
                              Added_Approved_By: null,
                              PurposeOf_Reduce: "",
                              Order_Id: null,
                              Order_By: "",
                              Order_By_Person: "",
                              Region: obj.Region,
                              Active_Status: true,
                              If_Deleted: false,
                           });
                           Create_VilfreshMoneyHistory.save();
                        }
                        if (NewCreditAvailable > obj.AvailableCredit_Limit) {
                           const Create_VilfreshCreditHistory = new VilfreshCredit_Limit.VilfreshCreditHistorySchema({
                              Customer: obj._id,
                              Date: new Date(),
                              Credit_Limit: obj.VilfreshCredit_Limit,
                              Previous_AvailableLimit: obj.AvailableCredit_Limit,
                              Available_Limit: NewCreditAvailable,
                              Added_or_Reduced: 'Added',
                              Added_Type: "Order_UnDeliver",
                              Added_By_User: null,   
                              Added_Approved_Status: true,
                              DateOf_Approved: new Date(),
                              Added_Approved_By: null,
                              PurposeOf_Reduce: '',
                              Order_Id: null,
                              Order_By: '',
                              Order_By_Person: '',
                              Region: obj.Region,
                              Active_Status: true,
                              If_Deleted: false,
                           });
                           Create_VilfreshCreditHistory.save();
                        }
                        obj.VilfreshMoney_Limit = NewWalletAmount;
                        obj.AvailableCredit_Limit = NewCreditAvailable;
                        return obj;
                     });

                     // Orders = Orders.filter(obj => {
                     //    const Idx = Subscriptions.findIndex(objNew => objNew._id === obj.CustomerId);
                     //    return Idx >= 0 ? true : false;
                     // });
                     var AssignedArray = ReceivingData.AssignedArray;
                     var SampleOrders = [];
                     var CustomerOrders = [];
                     var MonyHistorySchema = [];
                     var CreditHistorySchema = [];
                     var LastOrder_Reference = LastOrder !== null ? (LastOrder.Order_Unique + 1) : 1;
                     var OrderUpdates = [];
                     Orders.map(order => {
                        let DeliveryPersonId = null;
                        AssignedArray.map(obj => {
                           if (obj._id === order.CustomerId._id) {
                              DeliveryPersonId = mongoose.Types.ObjectId(obj.DeliverPerson._id);
                           }
                        });
                        OrderUpdates.push({
                           _id: mongoose.Types.ObjectId(order._id),
                           DeliveryPersonId:  DeliveryPersonId
                        });
                     });
                     var CustomerUpdate = [];
                     Samples.map(Sample => {
                        const NewId = mongoose.Types.ObjectId();
                        const Product = {
                           ProductId: mongoose.Types.ObjectId(SampleMilk._id),
                           FromCart: null,
                           Quantity: 0.5,
                           BasicUnitQuantity: SampleMilk.BasicUnitQuantity,
                           Unit_Price: SampleMilk.Price,
                           Total_Amount: SampleMilk.Price * 0.5,
                        };
                        var DeliveryPersonId = null;
                        AssignedArray.map(obj => {
                           if (obj._id === Sample._id) {
                              DeliveryPersonId = mongoose.Types.ObjectId(obj.DeliverPerson._id);
                           }
                        });
                        const Create_Order = new OrderManagement.OrderSchema({
                           _id: NewId,
                           CustomerId: mongoose.Types.ObjectId(Sample._id),
                           FromBasket: null,
                           Order_Reference: 'Ord-' + LastOrder_Reference.toString().padStart(9, '0'),
                           Order_Unique: LastOrder_Reference,
                           Order_Type: 'Sample_From',
                           Item_Details: [Product],
                           Item_Counts: 1,
                           Payable_Amount: 0,
                           Payment_Status: 'Paid', // Paid , UnPaid
                           Payment_Type: 'Wallet', // Wallet, Online, Credit, Partial_WalletOnline, Partial_WalletCredit
                           If_Partial: false,
                           ReduceFrom_Wallet: 0,
                           ReduceFrom_Online: 0,
                           ReduceFrom_Credit: 0,
                           DeliveryDate: startOfDay,
                           Region: result.Region,
                           OrderConfirmed: true,
                           OrderConfirmedBy: ReceivingData.User,
                           DeliveredSession: CurrentSession,
                           OrderDelivered: false,
                           DeliveryPerson: DeliveryPersonId,
                           DeliveryDateTime: null,
                           DeliveryNotes: '',
                           OrderUnDelivered: false,
                           Active_Status: true,
                           If_Deleted: false
                        });
                        LastOrder_Reference = LastOrder_Reference + 1;
                        SampleOrders.push(Create_Order);
                     });

                     Subscriptions.map(Subscription => {
                        const ChangesArr = SubscriptionChanges.filter(obj => obj.Customer === Subscription._id);
                        if (ChangesArr.length > 0) {
                           Subscription.Morning = ChangesArr[0].Morning;
                           Subscription.Evening = ChangesArr[0].Evening;
                        }
                        var SubscriptionValue = 0;
                        var OItems = [];
                        if (CurrentSession === 'Morning') {
                           Subscription.Morning.map(obj => {
                              if (obj.Liter > 0 && (obj.Status === undefined || obj.Status === true)) {
                                 const ItemValue = (parseFloat(obj.Liter) / parseFloat(obj.ProductId.BasicUnitQuantity)) * parseFloat(obj.ProductId.Price);
                                 SubscriptionValue = SubscriptionValue + ItemValue;
                                 OItems.push({
                                    ProductId: mongoose.Types.ObjectId(obj.ProductId._id),
                                    FromCart: null,
                                    Quantity: obj.Liter,
                                    BasicUnitQuantity: parseFloat(obj.ProductId.BasicUnitQuantity),
                                    Unit_Price: parseFloat(obj.ProductId.Price),
                                    Total_Amount: ItemValue
                                 });
                              }
                           });
                        }
                        if (CurrentSession === 'Evening') {
                           Subscription.Evening.map(obj => {
                              if (obj.Liter > 0 && (obj.Status === undefined || obj.Status === true)) {
                                 const ItemValue = ((parseFloat(obj.Liter) / parseFloat(obj.ProductId.BasicUnitQuantity)) * parseFloat(obj.ProductId.Price));
                                 SubscriptionValue = SubscriptionValue + ItemValue;
                                 OItems.push({
                                    ProductId: mongoose.Types.ObjectId(obj.ProductId._id),
                                    FromCart: null,
                                    Quantity: obj.Liter,
                                    BasicUnitQuantity: parseFloat(obj.ProductId.BasicUnitQuantity),
                                    Unit_Price: parseFloat(obj.ProductId.Price),
                                    Total_Amount: ItemValue
                                 });
                              }
                           });
                        }
                        var LimitAvailable = false;
                        var OType = '';
                        var OWallet = 0;
                        var OCredit = 0;
                        if (Subscription.VilfreshMoney_Limit >= SubscriptionValue) {
                           LimitAvailable = true;
                           OType = 'Wallet';
                           OWallet = SubscriptionValue;
                           Subscription.VilfreshMoney_Limit = Subscription.VilfreshMoney_Limit - OWallet;
                        } else if (Subscription.VilfreshMoney_Limit > 0 && Subscription.VilfreshMoney_Limit + Subscription.AvailableCredit_Limit >= SubscriptionValue) {
                           LimitAvailable = true;
                           OType = 'Partial_WalletCredit';
                           OWallet = Subscription.VilfreshMoney_Limit;
                           OCredit = SubscriptionValue - OWallet;
                           Subscription.VilfreshMoney_Limit = 0;
                           Subscription.AvailableCredit_Limit = Subscription.AvailableCredit_Limit - OCredit;
                        } else if (Subscription.AvailableCredit_Limit >= SubscriptionValue) {
                           LimitAvailable = true;
                           OType = 'Credit';
                           OCredit = SubscriptionValue;
                           Subscription.AvailableCredit_Limit = Subscription.AvailableCredit_Limit - OCredit;
                        }
                        if (LimitAvailable && OItems.length > 0) {
                           var DeliveryPersonId = null;
                           AssignedArray.map(obj => {
                              if (obj._id === Subscription._id) {
                                 DeliveryPersonId = mongoose.Types.ObjectId(obj.DeliverPerson._id);
                              }
                           });
                           const NewId = mongoose.Types.ObjectId();
                           const Create_Order = new OrderManagement.OrderSchema({
                              _id: NewId,
                              CustomerId: mongoose.Types.ObjectId(Subscription._id),
                              FromBasket: null,
                              Order_Reference: 'Ord-' + LastOrder_Reference.toString().padStart(9, '0'),
                              Order_Unique: LastOrder_Reference,
                              Order_Type: 'Subscription_From',
                              Item_Details: OItems,
                              Item_Counts: OItems.length,
                              Payable_Amount: SubscriptionValue,
                              Payment_Status: 'Paid',
                              Payment_Type: OType,
                              If_Partial: OType === 'Partial_WalletCredit' ? true : false,
                              ReduceFrom_Wallet: OWallet,
                              ReduceFrom_Online: 0,
                              ReduceFrom_Credit: OCredit,
                              DeliveryDate: startOfDay,
                              Region: result.Region,
                              OrderConfirmed: true,
                              OrderConfirmedBy: ReceivingData.User,
                              DeliveredSession : CurrentSession,
                              OrderDelivered: false,
                              DeliveryPerson: DeliveryPersonId,
                              DeliveryDateTime: null,
                              DeliveryNotes: '',
                              OrderUnDelivered: false,
                              Active_Status: true,
                              If_Deleted: false
                           });
                           LastOrder_Reference = LastOrder_Reference + 1;
                           CustomerOrders.push(Create_Order);
                           CustomerUpdate.push({
                              _id: mongoose.Types.ObjectId(Subscription._id),
                              VilfreshMoney_Limit: Subscription.VilfreshMoney_Limit,
                              AvailableCredit_Limit: Subscription.AvailableCredit_Limit
                           });
                           if (OWallet > 0) {
                              const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                                 Customer: mongoose.Types.ObjectId(Subscription._id),
                                 Amount: OWallet,
                                 Date: new Date(),
                                 Previous_Limit: Subscription.VilfreshMoney_Limit + OWallet,
                                 Available_Limit: Subscription.VilfreshMoney_Limit,
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
                                 Region: result.Region,
                                 Active_Status: true,
                                 If_Deleted: false,
                              });
                              MonyHistorySchema.push(Create_VilfreshMoneyHistory);
                           }
                           if (OCredit > 0) {
                              const Create_VilfreshCreditHistory = new VilfreshCredit_Limit.VilfreshCreditHistorySchema({
                                 Customer: mongoose.Types.ObjectId(Subscription._id),
                                 Date: new Date(),
                                 Credit_Limit: Subscription.VilfreshCredit_Limit,
                                 Previous_AvailableLimit: Subscription.AvailableCredit_Limit + OCredit,
                                 Available_Limit: Subscription.AvailableCredit_Limit,
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
                                 Region: result.Region,
                                 Active_Status: true,
                                 If_Deleted: false,
                              });
                              CreditHistorySchema.push(Create_VilfreshCreditHistory);
                           }
                        }
                     });
                     var DeliveryPersonArr = [];
                     ReceivingData.DeliverPersons.map(obj => {
                        DeliveryPersonArr.push(mongoose.Types.ObjectId(obj._id));
                     });
                     var Create_GeneratedOrders = new OrderManagement.GeneratedOrdersSchema({
                        Session: CurrentSession,
                        Date: startOfDay,
                        Region: result.Region,
                        DeliveryLine: ReceivingData.DeliveryLine,
                        DeliveryPersons: DeliveryPersonArr,
                        GeneratedBy: ReceivingData.User,
                        Active_Status: true,
                        If_Deleted: false
                     });
                     Promise.all([
                        SampleOrders.map(obj => obj.save()),
                        CustomerOrders.map(obj => obj.save()),
                        Create_GeneratedOrders.save(),
                        CreditHistorySchema.map(obj => obj.save()),
                        MonyHistorySchema.map(obj => obj.save()),
                        OrderUpdates.map(obj => {
                           OrderManagement.OrderSchema
                           .updateOne({ _id: obj._id }, { $set: { OrderConfirmed: true, OrderConfirmedBy: ReceivingData.User,  DeliveredSession: CurrentSession, DeliveryPerson: obj.DeliveryPersonId } })
                           .exec();
                        }),
                        OrderManagement.OrderSchema.updateMany({ _id: { $in: UnDeliverOrderIds } }, { $set: { OrderConfirmed: true, OrderConfirmedBy: ReceivingData.User,  DeliveredSession: CurrentSession, OrderUnDelivered: true, DeliveryNotes: 'Order Canceled due to Customer Inactive' } }).exec(),
                        CustomerUpdate.map(obj =>
                           CustomerManagement.CustomerManagementSchema
                              .updateOne({ _id: obj._id }, { $set: { VilfreshMoney_Limit: obj.VilfreshMoney_Limit, AvailableCredit_Limit: obj.AvailableCredit_Limit } })
                              .exec()),
                        CustomerUndeliveredOrders.map(obj => 
                           CustomerManagement.CustomerManagementSchema
                              .updateOne({ _id: obj._id }, { $set: { VilfreshMoney_Limit: obj.VilfreshMoney_Limit, AvailableCredit_Limit: obj.AvailableCredit_Limit } })
                              .exec())
                     ]).then(response_1 => {
                        res.status(200).send({ Status: true, Message: 'Orders Successfully Generated' });
                     }).catch(error_1 => {
                        res.status(417).send({ Status: false, Message: "Some error occurred while Update The Today Orders!.", Error: error_1 });
                     });
                     // res.status(200).send({ Status: true, Message: 'Orders Successfully Generated' });

                  }).catch(error => {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find The Today Orders!.", Error: error });
                  });
               }
            }
         });
   }
};


exports.DeliveryPerson_TodayOrders = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.DeliveryPersonId || ReceivingData.DeliveryPersonId === '') {
       res.status(400).send({ Http_Code: 400, Status: false, Message: "Delivery person details can not be empty" });
   } else {
       ReceivingData.DeliveryPersonId = mongoose.Types.ObjectId(ReceivingData.DeliveryPersonId);
       var DeliveryDate = new Date();
       DeliveryDate = new Date(DeliveryDate.setHours(0, 0, 0, 0));
       Promise.all([
         DeliveryPersonManagement.DeliveryPersonSchema.findOne({ _id: ReceivingData.DeliveryPersonId, Active_Status: true, If_Deleted: false }).
               populate({ path: 'DeliveryLine', select: 'Deliveryline_Name' }).exec(),
           OrderManagement.OrderSchema.find({ DeliveryPerson: ReceivingData.DeliveryPersonId, DeliveryDate: DeliveryDate, OrderDelivered: false, OrderUnDelivered: false, Active_Status: true, If_Deleted: false })
              .populate({ path: "CustomerId", select: ['Mobile_Number', 'Customer_Name', 'Delivery_Line_Queue', 'Address', 'Pincode', 'Delivery_Line'], populate: { path: 'Delivery_Line', select: 'Deliveryline_Name'} })
              .populate({ path: 'Item_Details.ProductId', select: ["Category", "Product_Name", "Unit", "BasicUnitQuantity"] }).exec(),
       ]).then(Response => {

           var DeliveryPersonDetails = Response[0];
           var OrderDetails = JSON.parse(JSON.stringify(Response[1]));
           if (DeliveryPersonDetails !== null) {
               var DeliveryDetails = [];

               OrderDetails.map(res => {
                   var order = {
                       "CustomerId": res.CustomerId._id,
                       "Customer_Name": res.CustomerId.Customer_Name,
                       "Mobile_Number": res.CustomerId.Mobile_Number,
                       "Address": res.CustomerId.Address,
                       "Pincode": res.CustomerId.Pincode || '',
                       "Delivery_Line": res.CustomerId.Delivery_Line,
                       "Delivery_Line_Queue": res.CustomerId.Delivery_Line_Queue,
                       "Items_Details": []
                   };
                   const Index = DeliveryDetails.findIndex(obj => obj.CustomerId === res.CustomerId._id);
                   if (Index >= 0) {
                    res.Item_Details.map(resOrder => {
                       const Quantity = res.Order_Type === 'Subscription_From' ? resOrder.Quantity / resOrder.BasicUnitQuantity * resOrder.BasicUnitQuantity :  resOrder.Quantity * resOrder.BasicUnitQuantity;
                       DeliveryDetails[Index].Items_Details.push({
                          "Product_Name": resOrder.ProductId.Product_Name,
                          "Unit":  resOrder.ProductId.Unit,
                          "Quantity": Quantity
                       });
                    });
                    DeliveryDetails[Index].OrderedDate = moment(res.createdAt).format("DD-MM-YYYY");
                   } else {
                       res.Item_Details.map(resOrder => {
                        const Quantity = res.Order_Type === 'Subscription_From' ? resOrder.Quantity / resOrder.BasicUnitQuantity * resOrder.BasicUnitQuantity :  resOrder.Quantity * resOrder.BasicUnitQuantity;
                          order.Items_Details.push({
                             "Product_Name": resOrder.ProductId.Product_Name,
                             "Unit":  resOrder.ProductId.Unit,
                             "Quantity": Quantity
                          });
                       });
                       DeliveryDetails.push(order);
                   }
               });

               var UnQueue = DeliveryDetails.filter(obj => !obj.Delivery_Line_Queue || obj.Delivery_Line_Queue === undefined || obj.Delivery_Line_Queue === null);
               var Queue = DeliveryDetails.filter(obj => typeof obj.Delivery_Line_Queue === 'number' && obj.Delivery_Line_Queue > 0 );
               var QueueSort = Queue.sort((a, b) => parseFloat(a.Delivery_Line_Queue) - parseFloat(b.Delivery_Line_Queue));
               var ReturnRes = QueueSort.concat(UnQueue);
               
               res.status(200).send({
                   Http_Code: 200,
                   Status: true,
                   Message: "Your Orders Details!",
                   DeliveryPersonDetails: {
                       DeliveryPersonName: DeliveryPersonDetails.DeliveryPerson_Name,
                       DeliveryLine: DeliveryPersonDetails.DeliveryLine,
                       Mobile_Number: DeliveryPersonDetails.Mobile_Number
                   },
                   Response: ReturnRes
               });
           } else {
               res.status(200).send({ Http_Code: 400, Status: false, Message: "Invalid DeliveryPerson Details!" });
           }
       }).catch(error => {
           res.status(200).send({ Http_Code: 417, Status: false, Message: "Some error occurred!.", Error: error });
       });

   }
};