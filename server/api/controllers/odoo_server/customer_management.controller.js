var Customer_Management = require('../../../mobile_api/models/customer_management.model');
var VilfreshMoney_management = require('../../../mobile_api/models/VilfreshMoney_management.model');



// Customer Management Update ---------------------------------------------
exports.CustomerStatus_Update = function (req, res) {
   var ReceivingData = req.body;

   if (!ReceivingData.customer || ReceivingData.customer === '') {
       res.status(400).send({ Status: false, Message: "customer Details can not be empty" });
   } else if (!ReceivingData.company || ReceivingData.company === '') {
       res.status(400).send({ Status: false, Message: "company Details can not be empty" });
   }  else if (!ReceivingData.Status || ReceivingData.Status === '') {
     res.status(400).send({ Status: false, Message: "Status can not be empty" });
   } else {
      Customer_Management.CustomerManagementSchema.findOne( { "CompanyId": ReceivingData.company, "OdooId": ReceivingData.customer }, {}, {}).exec(function (err, result) {
         if (err) {
            res.status(417).send({ Status: false, Message: "Some error occurred while find the Customer Status!.", Error: err });
         } else {
            if (result !== null) {
               if (ReceivingData.Status === 'Activated') {
                  result.Customer_Status = "Subscription_Activated";
                  result.save( (err_1, result_1) => {
                     if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while update the Customer Status!.", Error: err_1 });
                     } else {
                        res.status(200).send({ Status: true, Message: "Customer Status Successfully Updated" });
                     }
                  });
               } else if (ReceivingData.Status === 'DeActivated') {
                  result.Customer_Status = "Subscription_DeActivated";
                  if (result.VilfreshMoney_Limit > 0) {
                     const Create_VilfreshMoneyHistory = new VilfreshMoney_management.VilfreshMoneyHistorySchema({
                        Customer: result._id,
                        Amount: result.VilfreshMoney_Limit,
                        Date: new Date(),
                        Previous_Limit: result.VilfreshMoney_Limit,
                        Available_Limit: 0,
                        Added_or_Reduced: "Reduced",
                        Added_Type: "",
                        Added_Reference_Id: null,
                        Added_By_User: null,
                        CashFrom_DeliveryPerson: null,
                        Added_Approved_Status: null,
                        DateOf_Approved: new Date(),
                        Added_Approved_By: null,
                        PurposeOf_Reduce: "By_DeActive",
                        Order_Id: null,
                        Order_By: "",
                        Order_By_Person: "",
                        Region: result.Region,
                        Active_Status: true,
                        If_Deleted: false,
                     });
                     Create_VilfreshMoneyHistory.save();
                  }
                  result.VilfreshMoney_Limit = 0;
                  result.save( (err_1, result_1) => {
                     if (err_1) {
                        res.status(417).send({ Status: false, Message: "Some error occurred while update the Customer Status!.", Error: err_1 });
                     } else {
                        res.status(200).send({ Status: true, Message: "Customer Status Successfully Updated" });
                     }
                  });
               } else {
                  res.status(400).send({ Status: false, Message: "Invalid Status Key!" });
               }
            } else {
               res.status(400).send({ Status: false, Message: "Invalid customer details!" });
            }

            RegionManagement.RegionManagementSchema.findOne({ "OdooId": ReceivingData.OdooId }, {}, {}, function (err_1, result_1) {
                  if (err_1) {
                     res.status(417).send({ Status: false, Message: "Some error occurred while Find the Customer Status!.", Error: err_1 });
                  } else {
                     res.status(200).send({ Status: true, Response: result_1 });
                  }
            });
         }
      });
   }
};