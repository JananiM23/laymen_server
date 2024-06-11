module.exports = function(app) {
   var Controller = require("../../api/controllers/customer_referral.controller");
 
   app.post("/API/Customer_Referral/Customer_Referral_List", Controller.Customer_Referral_List );

};
 