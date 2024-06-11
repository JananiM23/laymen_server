var Referral_Management = require('../../mobile_api/models/ReferralManagement.model');
var Customer_Management = require('../../mobile_api/models/customer_management.model');
var mongoose = require('mongoose');



// Create Referral ------------------------------------------ 
exports.CreateReferral = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.Recommender || ReceivingData.Recommender === '') {
      res.status(200).send({ Status: false, Message: "Recommender Customer Details can not be empty" });
   } else if (!ReceivingData.Nominated || ReceivingData.Nominated === '') {
      res.status(200).send({ Status: false, Message: "Nominated Customer Details can not be empty" });
   } else {
      ReceivingData.Recommender = mongoose.Types.ObjectId(ReceivingData.Recommender);
      ReceivingData.Nominated = mongoose.Types.ObjectId(ReceivingData.Nominated);
      const Create_ReferralManagement = new Referral_Management.ReferralManagementSchema({
         Recommender: ReceivingData.Recommender,
         Nominated:  ReceivingData.Nominated,
         RewardCompleted: false,
         Active_Status: true,
         If_Deleted: false
      });
      Create_ReferralManagement.save(function (err, result) {
         if (err) {
            res.status(417).send({ Http_Code: 417, Status: false, Message: "Some error occurred while Creating the Customer Referral!.", Error: err });
         } else { 
            res.status(200).send({ Http_Code: 200, Status: true, Message: 'Customer Referral Created', Response: result });
         }
      });
   }
};