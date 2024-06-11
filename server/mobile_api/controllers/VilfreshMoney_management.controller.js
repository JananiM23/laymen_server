var VilfreshMoney_management = require('../models/VilfreshMoney_management.model');
var VilfreshCredit_management = require('../../api/models/VilfreshCredit_management.model');
var Customer_Management = require('../models/customer_management.model');
var ReferralManagement = require('../models/ReferralManagement.model');
var ReferralPayment = require('./../../Referral_Payment');
var mongoose = require('mongoose');
var moment = require('moment');


// Add Vilfresh Money ------------------------------------------ 
exports.Add_VilfreshMoney = function (req, res) {
   var ReceivingData = req.body;
   
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
       res.status(400).send({ Status: false, Message: "Customer Details can not be empty" });
   } else if (!ReceivingData.Amount || ReceivingData.Amount === '') {
       res.status(400).send({ Status: false, Message: "Amount can not be empty" });
   } else if (!ReceivingData.Reference_Id || ReceivingData.Reference_Id === '') {
       res.status(400).send({ Status: false, Message: "Reference Details can not be empty" });
   } else {
      ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);
      Customer_Management.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true }, {}, {}, function (err, result) {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Find the Customer !.", Error: err });
         } else {
           
            if (result !== null && result.IfApprovedBy_User === true) {
               ReceivingData.Amount = parseFloat(ReceivingData.Amount);
               result.VilfreshMoney_Limit = parseFloat(result.VilfreshMoney_Limit);
               result.VilfreshCredit_Limit = parseFloat(result.VilfreshCredit_Limit);           
               result.AvailableCredit_Limit = parseFloat(result.AvailableCredit_Limit);

               var NewCreditAvailable = result.AvailableCredit_Limit;
               var NewWalletAmount = result.VilfreshMoney_Limit;
               var CreditPaidAmount = result.VilfreshCredit_Limit - result.AvailableCredit_Limit;

               if (ReceivingData.Amount >= CreditPaidAmount) {
                  NewWalletAmount = NewWalletAmount + (ReceivingData.Amount - CreditPaidAmount); 
                  NewCreditAvailable = NewCreditAvailable + CreditPaidAmount;
               } else if (ReceivingData.Amount < CreditPaidAmount) {
                  NewCreditAvailable = NewCreditAvailable + ReceivingData.Amount;
               }

               if (NewWalletAmount > result.VilfreshMoney_Limit) {
                  const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                     Customer: ReceivingData.CustomerId,
                     Amount: NewWalletAmount - result.VilfreshMoney_Limit,
                     Date: new Date(),
                     Previous_Limit: result.VilfreshMoney_Limit,
                     Available_Limit: NewWalletAmount,
                     Added_or_Reduced: "Added",
                     Added_Type: "Online",
                     Added_Reference_Id: ReceivingData.Reference_Id,
                     Added_By_User: null,
                     CashFrom_DeliveryPerson: null,
                     Added_Approved_Status: true,
                     DateOf_Approved: new Date(),
                     Added_Approved_By: null,
                     PurposeOf_Reduce: "",
                     Order_Id: null,
                     Order_By: "",
                     Order_By_Person: "",
                     Region: result.Region,
                     Active_Status: true,
                     If_Deleted: false,
                  });
                  Create_VilfreshMoneyHistory.save();
               }
               if (NewCreditAvailable > result.AvailableCredit_Limit) {
                  const Create_VilfreshCreditHistory = new VilfreshCredit_management.VilfreshCreditHistorySchema({
                     Customer: ReceivingData.CustomerId,   
                     Date: new Date(),
                     Credit_Limit: result.VilfreshCredit_Limit,
                     Previous_AvailableLimit: result.AvailableCredit_Limit,
                     Available_Limit: NewCreditAvailable,
                     Added_or_Reduced: 'Added',
                     Added_Type: 'Online',
                     Added_By_User: null,   
                     Added_Approved_Status: true,
                     DateOf_Approved: new Date(),
                     Added_Approved_By: null,
                     PurposeOf_Reduce: '',
                     Order_Id: null,
                     Order_By: '',
                     Order_By_Person: '',
                     Region: result.Region,
                     Active_Status: true,
                     If_Deleted: false,
                  });
                  Create_VilfreshCreditHistory.save();
               }
               
               result.VilfreshMoney_Limit = NewWalletAmount;
               result.AvailableCredit_Limit = NewCreditAvailable;
               Promise.all([
                  ReferralManagement.ReferralManagementSchema.findOne({ Nominated: ReceivingData.CustomerId, RewardCompleted: false }).exec(),
                  result.save()
               ]).then( Response_1 => {
                  var Referral = Response_1[0];
                  var result_2 = Response_1[1];
                  if (Referral !== null) {
                     ReferralPayment.ReferralPayment(Referral._id, return_response => {});
                  }
                  result_2.VilfreshMoney_Limit = (result_2.VilfreshMoney_Limit - (parseFloat(result_2.VilfreshCredit_Limit) - parseFloat(result_2.AvailableCredit_Limit))).toFixed(2);
                  res.status(200).send({ Http_Code: 200, Status: true, Message:'Added Money Successfully', VilfreshMoney_Limit: result_2.VilfreshMoney_Limit });
               }).catch( error => {
                  res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Update the Vilfresh Money!.", Error: err_1 }); 
               });
            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details Or Unable to update Credit/Wallet for Deactivated Customer !" });
            }
         }
      });
   }
};


// Vilfresh Money Transfer History
exports.VilfreshMoney_TransferHistory = function (req, res) {
   var ReceivingData = req.body;
   if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
     res.status(417).send({ Http_Code: 417, Status: false, Message: "Customer Details can not be empty" });
   } else {
      VilfreshMoney_management.VilfreshMoneyHistorySchema
      .find({ Customer: mongoose.Types.ObjectId(ReceivingData.CustomerId), Active_Status: true, If_Deleted: false }, {}, { sort: {createdAt: -1}})
      .exec( (err, result) => {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while Find the Vilfresh Money History!.", Error: err });
         } else {
            if (result !== null) {
               const Return_Array = [];
               result.map(obj => {
                  const returnObj = {
                     Amount: obj.Amount,
                     Date: moment(new Date(obj.Date)).format("DD-MM-YYYY"),
                     Added_or_Reduced: obj.Added_or_Reduced,
                     Order_Key: 'Ord-001',
                     Added_Type: obj.Added_Type,
                     Added_Reference_Id: obj.Added_Reference_Id
                  };
                  Return_Array.push(returnObj);
               });
               res.status(200).send({ Http_Code: 200, Status: true, Response: Return_Array });
            } else {
               res.status(400).send({ Http_Code: 400, Status: false, Message: "Invalid Customer Details!" });
            }
         }
      });
   }
 };