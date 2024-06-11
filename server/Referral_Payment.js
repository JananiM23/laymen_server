var VilfreshMoney_management = require('./mobile_api/models/VilfreshMoney_management.model');
var VilfreshCredit_management = require('./api/models/VilfreshCredit_management.model');
var Customer_Management = require('./mobile_api/models/customer_management.model');
var ReferralManagement = require('./mobile_api/models/ReferralManagement.model');

exports.ReferralPayment = function (ReferralId, callback) {
   ReferralManagement.ReferralManagementSchema.findOne({ _id: ReferralId, RewardCompleted: false })
   .exec((err, result) => {
      if (!err && result !== null) {
         Customer_Management.CustomerManagementSchema.findOne({ _id: result.Recommender, Active_Status: true }, {}, {})
         .exec( (err_1, result_1) => {
            if (!err_1 && result_1 !== null) {
               var ReferralAmount = 200;
               result_1.VilfreshMoney_Limit = parseFloat(result_1.VilfreshMoney_Limit);
               result_1.VilfreshCredit_Limit = parseFloat(result_1.VilfreshCredit_Limit);           
               result_1.AvailableCredit_Limit = parseFloat(result_1.AvailableCredit_Limit);

               var NewCreditAvailable = result_1.AvailableCredit_Limit;
               var NewWalletAmount = result_1.VilfreshMoney_Limit;
               var CreditPaidAmount = result_1.VilfreshCredit_Limit - result_1.AvailableCredit_Limit;
   
               if (ReferralAmount >= CreditPaidAmount) {
                  NewWalletAmount = NewWalletAmount + (ReferralAmount - CreditPaidAmount); 
                  NewCreditAvailable = NewCreditAvailable + CreditPaidAmount;
               } else if (ReferralAmount < CreditPaidAmount) {
                  NewCreditAvailable = NewCreditAvailable + ReferralAmount;
               }

               
            if (NewWalletAmount > result_1.VilfreshMoney_Limit) {
               const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                  Customer: result.Recommender,
                  Amount: NewWalletAmount - result_1.VilfreshMoney_Limit,
                  Date: new Date(),
                  Previous_Limit: result_1.VilfreshMoney_Limit,
                  Available_Limit: NewWalletAmount,
                  Added_or_Reduced: "Added",
                  Added_Type: 'Referral',
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
                  Region: result_1.Region,
                  Active_Status: true,
                  If_Deleted: false,
               });
               Create_VilfreshMoneyHistory.save();
            }
            if (NewCreditAvailable > result_1.AvailableCredit_Limit) {
               const Create_VilfreshCreditHistory = new VilfreshCredit_management.VilfreshCreditHistorySchema({
                  Customer: result.Recommender,
                  Date: new Date(),
                  Credit_Limit: result_1.VilfreshCredit_Limit,
                  Previous_AvailableLimit: result_1.AvailableCredit_Limit,
                  Available_Limit: NewCreditAvailable,
                  Added_or_Reduced: 'Added',
                  Added_Type: 'Referral',
                  Added_By_User: null,   
                  Added_Approved_Status: true,
                  DateOf_Approved: new Date(),
                  Added_Approved_By: null,
                  PurposeOf_Reduce: '',
                  Order_Id: null,
                  Order_By: '',
                  Order_By_Person: '',
                  Region: result_1.Region,
                  Active_Status: true,
                  If_Deleted: false,
               });
               Create_VilfreshCreditHistory.save();
            }
            result_1.VilfreshMoney_Limit = NewWalletAmount;
            result_1.AvailableCredit_Limit = NewCreditAvailable;
            result.RewardCompleted = true;
            Promise.all([
               result.save(),
               result_1.save()
            ]).then(Response => {
               callback('Success');
            }).catch(error => {
               callback('Referral Payment Failed');
            });
            } else {
               callback('Referral Payment Failed');
            }
         });
      } else {
         callback('Referral Payment Failed');
      }
   });
};