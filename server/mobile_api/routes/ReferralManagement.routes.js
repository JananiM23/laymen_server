module.exports = function (app){
    
   var Controller = require('../../mobile_api/controllers/ReferralManagement.controller');
   
   app.post('/APP_API/Referral_Management/CreateReferral', Controller.CreateReferral);

};