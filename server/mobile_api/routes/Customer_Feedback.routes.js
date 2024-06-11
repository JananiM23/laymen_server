module.exports = function (app){
    
    var Controller = require('../controllers/Customer_Feedback.controller');
    app.post('/APP_API/CustomerManagement/Customer_Feedback', Controller.Feedback_Created);
    app.post('/API/CustomerManagement/All_Feedback_List', Controller.All_Feedback_List);    
 };