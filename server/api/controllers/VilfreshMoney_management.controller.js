var VilfreshMoney_management = require('../../mobile_api/models/VilfreshMoney_management.model');
var VilfreshCredit_management = require('../../api/models/VilfreshCredit_management.model');
var Customer_Management = require('../../mobile_api/models/customer_management.model');
var ReferralManagement = require('../../mobile_api/models/ReferralManagement.model');
var User_Management = require('../models/user_management.model');
var ReferralPayment = require('./../../Referral_Payment');

var mongoose = require('mongoose');


// Add Vilfresh Money ------------------------------------------ 
exports.Add_VilfreshMoney = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Customer_Name || ReceivingData.Customer_Name === '' ) {
      res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.User || ReceivingData.User === '') {
      res.status(400).send({ Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.Paid_Amount || ReceivingData.Paid_Amount === '') {
       res.status(400).send({ Status: false, Message: "Amount can not be empty" });
   } else if (!ReceivingData.Payment_Type  || ReceivingData.Payment_Type  === '') {
       res.status(400).send({ Status: false, Message: "Payment Type can not be empty" });
   } else {
      var CustomerId = mongoose.Types.ObjectId(ReceivingData.Customer_Name);
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      Promise.all([
         Customer_Management.CustomerManagementSchema.findOne({ _id: CustomerId, Active_Status: true }, {}, {}).exec(),
         ReferralManagement.ReferralManagementSchema.findOne({ Nominated: CustomerId, RewardCompleted: false }).exec(),
      ]).then(response => {
         var Customer = response[0];
         var Referral = response[1];
         ReceivingData.Paid_Amount = parseFloat(ReceivingData.Paid_Amount);

         if (Customer !== null && Customer.IfApprovedBy_User === true) {
            if (ReceivingData.Paid_Amount < Customer.VilfreshMoney_Limit) {
               const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                  Customer: CustomerId,
                  Amount: Customer.VilfreshMoney_Limit - ReceivingData.Paid_Amount,
                  Date: new Date(),
                  Previous_Limit: Customer.VilfreshMoney_Limit,
                  Available_Limit: ReceivingData.Paid_Amount,
                  Added_or_Reduced: "Reduced",
                  Added_Type: ReceivingData.Payment_Type,
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
                  Region: Customer.Region,
                  Active_Status: true,
                  If_Deleted: false,
               });
               Create_VilfreshMoneyHistory.save();

               Customer.VilfreshMoney_Limit = ReceivingData.Paid_Amount;
               Customer.save( (err_2, result_2) => {
                  if (err_2) {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Update the Vilfresh Money!.", Error: err_1 }); 
                  } else {
                     res.status(200).send({ Http_Code: 200, Status: true, Message:'Added Money Successfully'});
                  }
               });
            } else if (ReceivingData.Paid_Amount > Customer.VilfreshMoney_Limit) {
               Customer.VilfreshMoney_Limit = parseFloat(Customer.VilfreshMoney_Limit);
               Customer.VilfreshCredit_Limit = parseFloat(Customer.VilfreshCredit_Limit);           
               Customer.AvailableCredit_Limit = parseFloat(Customer.AvailableCredit_Limit);

               var NewCreditAvailable = Customer.AvailableCredit_Limit;
               var NewWalletAmount = Customer.VilfreshMoney_Limit;
               var CreditPaidAmount = Customer.VilfreshCredit_Limit - Customer.AvailableCredit_Limit;
               ReceivingData.Paid_Amount = ReceivingData.Paid_Amount - Customer.VilfreshMoney_Limit;
               
               if (ReceivingData.Paid_Amount >= CreditPaidAmount) {
                  NewWalletAmount = NewWalletAmount + (ReceivingData.Paid_Amount - CreditPaidAmount); 
                  NewCreditAvailable = NewCreditAvailable + CreditPaidAmount;
               } else if (ReceivingData.Paid_Amount < CreditPaidAmount) {
                  NewCreditAvailable = NewCreditAvailable + ReceivingData.Paid_Amount;
               }

               if (NewWalletAmount > Customer.VilfreshMoney_Limit) {
                  const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                     Customer: CustomerId,
                     Amount: NewWalletAmount - Customer.VilfreshMoney_Limit,
                     Date: new Date(),
                     Previous_Limit: Customer.VilfreshMoney_Limit,
                     Available_Limit: NewWalletAmount,
                     Added_or_Reduced: "Added",
                     Added_Type: ReceivingData.Payment_Type,
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
                     Region: Customer.Region,
                     Active_Status: true,
                     If_Deleted: false,
                  });
                  Create_VilfreshMoneyHistory.save();
               }
               if (NewCreditAvailable > Customer.AvailableCredit_Limit) {
                  const Create_VilfreshCreditHistory = new VilfreshCredit_management.VilfreshCreditHistorySchema({
                     Customer: CustomerId,
                     Date: new Date(),
                     Credit_Limit: Customer.VilfreshCredit_Limit,
                     Previous_AvailableLimit: Customer.AvailableCredit_Limit,
                     Available_Limit: NewCreditAvailable,
                     Added_or_Reduced: 'Added',
                     Added_Type: ReceivingData.Payment_Type,
                     Added_By_User: null,   
                     Added_Approved_Status: true,
                     DateOf_Approved: new Date(),
                     Added_Approved_By: null,
                     PurposeOf_Reduce: '',
                     Order_Id: null,
                     Order_By: '',
                     Order_By_Person: '',
                     Region: Customer.Region,
                     Active_Status: true,
                     If_Deleted: false,
                  });
                  Create_VilfreshCreditHistory.save();
               }
               if (Referral !== null) {
                  ReferralPayment.ReferralPayment(Referral._id, return_response => { });
               }
               
               Customer.VilfreshMoney_Limit = NewWalletAmount;
               Customer.AvailableCredit_Limit = NewCreditAvailable;
               Customer.save( (err_2, result_2) => {
                  if (err_2) {
                     res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Update the Vilfresh Money!.", Error: err_1 }); 
                  } else {
                     res.status(200).send({ Http_Code: 200, Status: true, Message:'Added Money Successfully'});
                  }
               });
            } else {
               res.status(200).send({ Http_Code: 400, Status: false, Message: "No Modification on this Submit!" });
            }
         } else {
            res.status(200).send({ Http_Code: 400, Status: false, Message: "Unable to update Wallet for Deactivated Customer" });
         }
      }).catch( error => {
         res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Added the Vilfresh Money!.", Error: error });
      });
   }
};


// Vilfresh Money Transfer History
exports.VilfreshMoney_TransferHistory = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.User || ReceivingData.User === '') {
     res.status(417).send({ Http_Code: 417, Status: false, Message: "User Details can not be empty" });
   } else if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
      res.status(417).send({ Http_Code: 417, Status: false, Message: "Customer Details can not be empty" });
   } else {
      ReceivingData.User = mongoose.Types.ObjectId(ReceivingData.User);
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);

      User_Management.UserManagementSchema.findOne( {_id: ReceivingData.User, Active_Status: true, If_Deleted: false}, {}, {}).exec( (err, result) => {
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
                  VilfreshMoney_management.VilfreshMoneyHistorySchema
                  .aggregate([
                     { $match: FindQuery },
                     {
                        $lookup: {
                           from: "Customer_Managements",
                           let: { "customer": "$Customer" },
                           pipeline: [
                              { $match: { $expr: { $eq: ["$$customer", "$_id"] } } },
                              { $project: { "Customer_Name": 1 } }
                           ],
                           as: 'Customer'
                        }
                     },
                     { $unwind: { path: "$Customer", preserveNullAndEmptyArrays: true } },
                     { $addFields: { CustomerSort: { $ifNull: ["$Customer.Customer_Name", null] } } },
                     { $addFields: { AddedTypeSort: { $ifNull: ["$Added_Type", null] } } },
                     { $addFields: { CustomerSort: { $toLower: "$CustomerSort" } } },
                     { $addFields: { AddedTypeSort: { $toLower: "$AddedTypeSort" } } },
                     { $project: { Customer: 1,Previous_AvailableLimit:1, CustomerSort: 1, AddedTypeSort: 1, Added_Reference_Id: 1, Added_Type: 1, Previous_Limit: 1,PurposeOf_Reduce: 1, Available_Limit: 1, Amount: 1, Date: 1, Added_or_Reduced: 1, createdAt: 1 } },
                     { $sort: ShortOrder },
                     { $skip: Skip_Count },
                     { $limit: Limit_Count }
                  ]).exec(),
                  VilfreshMoney_management.VilfreshMoneyHistorySchema.countDocuments(FindQuery).exec()
               ]).then(result => {
                  res.status(200).send({ Status: true, Response: result[0], SubResponse: result[1] });
               }).catch(err => {
                  res.status(417).send({ Status: false, ErrorCode: 417, ErrorMessage: "Some error occurred while Find The VilFresh Money History!." });
               });
            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid User Details!" }); 
            }
         }
      });
   }
};