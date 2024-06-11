var VilfreshCredit_management = require('../../api/models/VilfreshCredit_management.model');
var Customer_Management = require('../../mobile_api/models/customer_management.model');
var User_Management = require('../models/user_management.model');
var mongoose = require('mongoose');
var  CollectionModel = require('../../mobile_api/models/deliveryPerson_details.model');

// Add Vilfresh Money ------------------------------------------ 
exports.Add_VilfreshCredit = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.Customer_Name || ReceivingData.Customer_Name === '') {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.Credit_Amount || ReceivingData.Credit_Amount === '') {
      res.status(400).send({ Status: false, Message: "Amount can not be empty" });
   } else if (!ReceivingData.Payment_Type || ReceivingData.Payment_Type === '') {
      res.status(400).send({ Status: false, Message: "Payment Type can not be empty" });
   } else {
      var CustomerId = mongoose.Types.ObjectId(ReceivingData.Customer_Name);
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({ _id: CustomerId, Active_Status: true }, {}, {}).exec(),
         User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}).exec(),
      ]).then(response => {
         var Customer = response[0];
         var User = response[1];
         if (Customer !== null && Customer.IfApprovedBy_User === true) {
            
            var Available_Limit = 0;
            var AssignedAvailable = 0;
            ReceivingData.Credit_Amount = parseFloat(ReceivingData.Credit_Amount);
            Customer.VilfreshCredit_Limit = parseFloat(Customer.VilfreshCredit_Limit);
            Customer.AvailableCredit_Limit = parseFloat(Customer.AvailableCredit_Limit);

            if (ReceivingData.CreditType === 'Added') {
               Available_Limit = (Customer.VilfreshCredit_Limit + ReceivingData.Credit_Amount);
               AssignedAvailable = (ReceivingData.Credit_Amount + Customer.AvailableCredit_Limit);
            } else {
               Available_Limit = (Customer.VilfreshCredit_Limit - ReceivingData.Credit_Amount);
               AssignedAvailable = (Customer.AvailableCredit_Limit - ReceivingData.Credit_Amount);
            }

            if (ReceivingData.CreditType === 'Added') {
               const Create_VilfreshMoneyCredit = new VilfreshCredit_management.VilfreshCreditHistorySchema({
                  Customer: CustomerId,
                  Date: new Date(),
                  Credit_Limit: Available_Limit,
                  Previous_AvailableLimit: Customer.AvailableCredit_Limit,
                  Available_Limit: AssignedAvailable,
                  Added_or_Reduced: "Added",
                  Added_Type: 'Credit',
                  Added_By_User: ReceivingData.User,
                  Added_Approved_Status: true,
                  Added_Reference_Id: "",
                  DateOf_Approved: new Date(),
                  Added_Approved_By: ReceivingData.User,
                  PurposeOf_Reduce: "",
                  Order_Id: null,
                  Order_By: "",
                  Order_By_Person: "",
                  Region: User.Region,
                  Active_Status: true,
                  If_Deleted: false,
               });
               Customer.VilfreshCredit_Limit = Available_Limit;
               Customer.AvailableCredit_Limit = AssignedAvailable;
               Promise.all([
                  Create_VilfreshMoneyCredit.save(),
                  Customer.save()
               ]).then(response_1 => {
                  res.status(200).send({ Http_Code: 200, Status: true, Message: 'Successfully Added' });
               }).catch(error => {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Added the Vilfresh Credit!.", Error: error });
               });
            } else {
               const Create_VilfreshMoneyCredit = new VilfreshCredit_management.VilfreshCreditHistorySchema({
                  Customer: CustomerId,
                  Date: new Date(),
                  Credit_Limit: Available_Limit,
                  Previous_AvailableLimit: Customer.AvailableCredit_Limit,
                  Available_Limit: AssignedAvailable,
                  Added_or_Reduced: "Reduced",
                  Added_Type: '',
                  Added_By_User: ReceivingData.User,
                  Added_Approved_Status: true,
                  Added_Reference_Id: "",
                  DateOf_Approved: new Date(),
                  Added_Approved_By: ReceivingData.User,
                  PurposeOf_Reduce: "By Admin",
                  Order_Id: null,
                  Order_By: "",
                  Order_By_Person: "",
                  Region: User.Region,
                  Active_Status: true,
                  If_Deleted: false,
               });
               Customer.VilfreshCredit_Limit = Available_Limit;
               Customer.AvailableCredit_Limit = AssignedAvailable;
               Promise.all([
                  Create_VilfreshMoneyCredit.save(),
                  Customer.save()
               ]).then(response_1 => {
                  res.status(200).send({ Http_Code: 200, Status: true, Message: 'Successfully Reduced' });
               }).catch(error => {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Reduced the Vilfresh Credit!.", Error: error });
               });
            }
         } else {
            res.status(200).send({ Http_Code: 400, Status: false, Message: "Unable to update Credit for Deactivated Customer !" });
         }
      }).catch(error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while updated the Vilfresh credit!.", Error: error });
      });
   }
};

// Vilfresh Credit Transfer History
exports.VilfreshCredit_TransferHistory = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(417).send({ Http_Code: 417, Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(417).send({ Http_Code: 417, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Error Occurred while find the User!" });
         } else {
            if (result !== null) {

               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;

               var ShortOrder = { createdAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
               }
               var FindQuery = { Region: result.Region, Customer: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false };

               if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                  ReceivingData.FilterQuery.map(obj => {
                     if (obj.Type === 'String') {
                        FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                     }
                     if (obj.Type === 'Select') {
                        FindQuery[obj.DBName] = obj.Value;
                     }
                     if (obj.Type === 'Object') {
                        FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                     }
                     if (obj.Type === 'Date') {
                        if (FindQuery[obj.DBName] === undefined) {
                           FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                        } else {
                           const DBName = obj.DBName;
                           const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                        }
                     }
                  });
               }

               Promise.all([
                  VilfreshCredit_management.VilfreshCreditHistorySchema
                     .aggregate([
                        { $match: FindQuery },
                        {
                           $lookup: {
                              from: "Customer_Managements",
                              let: { "customer": "$Customer" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                                 { $project: { "Customer_Name": 1, 'Mobile_Number': 1 } }
                              ],
                              as: 'Customer'
                           }
                        },
                        { $unwind: { path: "$Customer", preserveNullAndEmptyArrays: true } },
                        { $addFields: { CustomerSort: { $ifNull: ["$Customer.Customer_Name", null] } } },
                        { $addFields: { AddedTypeSort: { $ifNull: ["$Added_Type", null] } } },
                        { $addFields: { CustomerSort: { $toLower: "$CustomerSort" } } },
                        { $addFields: { Credit_Limit: { $toLower: "$Credit_Limit" } } },
                        { $project: { Customer: 1, Previous_AvailableLimit:1, CustomerSort: 1, Credit_Limit: 1, Added_Reference_Id: 1, Added_Type: 1, Previous_Limit: 1, PurposeOf_Reduce: 1, Available_Limit: 1, Amount: 1, Date: 1, Added_or_Reduced: 1, createdAt: 1 } },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                  VilfreshCredit_management.VilfreshCreditHistorySchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(err => {
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The VilFresh Credit History!." });
               });
            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid User Details!" });
            }
         }
      });
   }
};



exports.DailyCollection_List = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(417).send({ Http_Code: 417, Status: false, Message: "User Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      User_Management.UserManagementSchema.findOne({ _id: ReceivingData.User, Active_Status: true, If_Deleted: false }, {}, {}).exec((err, result) => {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some Error Occurred while find the User!" });
         } else {
            if (result !== null) {

               const Skip_Count = parseInt(ReceivingData.Skip_Count, 0) || 0;
               const Limit_Count = parseInt(ReceivingData.Limit_Count, 0) || 5;

               var ShortOrder = { createdAt: -1 };
               var ShortKey = ReceivingData.ShortKey;
               var ShortCondition = ReceivingData.ShortCondition;
               if (ShortKey && ShortKey !== null && ShortKey !== '' && ShortCondition && ShortCondition !== null && ShortCondition !== '') {
                  ShortOrder = {};
                  ShortOrder[ShortKey] = ShortCondition === 'Ascending' ? 1 : -1;
               }
               var FindQuery = { Region: result.Region, Customer: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false };

               if (ReceivingData.FilterQuery && typeof ReceivingData.FilterQuery === 'object' && ReceivingData.FilterQuery !== null && ReceivingData.FilterQuery.length > 0) {
                  ReceivingData.FilterQuery.map(obj => {
                     if (obj.Type === 'String') {
                        FindQuery[obj.DBName] = { $regex: new RegExp(".*" + obj.Value + ".*", "i") };
                     }
                     if (obj.Type === 'Select') {
                        FindQuery[obj.DBName] = obj.Value;
                     }
                     if (obj.Type === 'Object') {
                        FindQuery[obj.DBName] = mongoose.Types.ObjectId(obj.Value._id);
                     }
                     if (obj.Type === 'Date') {
                        if (FindQuery[obj.DBName] === undefined) {
                           FindQuery[obj.DBName] = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                        } else {
                           const DBName = obj.DBName;
                           const AndQuery = obj.Option === 'LTE' ? { $lt: new Date(new Date(obj.Value).setDate(new Date(obj.Value).getDate() + 1)) } : obj.Option === 'GTE' ? { $gte: new Date(obj.Value) } : new Date(obj.Value);
                           FindQuery['$and'] = [{ [DBName]: FindQuery[obj.DBName] }, { [DBName]: AndQuery }];
                        }
                     }
                  });
               }

               Promise.all([
                  CollectionModel.CollectionSchema
                     .aggregate([
                        { $match: FindQuery },
                        {
                           $lookup: {
                              from: "Delivery_Line",
                              let: { "deliveryline": "$DeliveryLine" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$deliveryline", "$_id"] } } },
                                 { $project: { "Deliveryline_Name": 1, "Session": 1 } }
                              ],
                              as: 'DeliverylineInfo'
                           }
                        },
                        { $unwind: { path: "$DeliverylineInfo", preserveNullAndEmptyArrays: true } },
                        {
                           $lookup: {
                              from: "Customer_Managements",
                              let: { "customer": "$CustomerID" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                                 { $project: { "Customer_Name": 1, "VilfreshMoney_Limit": 1,  "VilfreshCredit_Limit" : 1, "AvailableCredit_Limit" : 1 } }
                              ],
                              as: 'CustomerInfo'
                           }
                        },
                        { $unwind: { path: "$CustomerInfo", preserveNullAndEmptyArrays: true } },

                        {
                           $lookup: {
                              from: "DeliveryPerson_Managements",
                              let: { "deliveryboy": "$AddedBy_User" },
                              pipeline: [
                                 { $match: { $expr: { $eq: ["$$deliveryboy", "$_id"] } } },
                                 { $project: { "DeliveryPerson_Name": 1, } }
                              ],
                              as: 'DeliveryInfo'
                           }
                        },
                        { $unwind: { path: "$DeliveryInfo", preserveNullAndEmptyArrays: true } },

                        { $addFields: { CustomerSort: { $ifNull: ["$Customer.Customer_Name", null] } } },
                        { $addFields: { CustomerSort: { $toLower: "$CustomerSort" } } },
                        { $addFields: { Credit_Limit: { $toLower: "$Credit_Limit" } } },
                        { $project: { CustomerInfo: 1, DeliverylineInfo:1, DeliveryInfo: 1, Collection_Amount: 1, Collection_Status: 1, Active_Status: 1, createdAt: 1 } },
                        { $sort: ShortOrder },
                        { $skip: Skip_Count },
                        { $limit: Limit_Count }
                     ]).exec(),
                     CollectionModel.CollectionSchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(err => {
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The Collection amount list!." });
               });
            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid User Details!" });
            }
         }
      });
   }
};
