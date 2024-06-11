module.exports = function (app){
    
   var Controller = require('../controllers/customer_management.controller');
   app.post('/APP_API/CustomerManagement/OTP_Generator', Controller.OTP_Generator);
   app.post('/APP_API/CustomerManagement/Customer_MobileNo_Verify', Controller.Customer_MobileNo_Verify);
   app.post('/APP_API/CustomerManagement/Customer_status_verify', Controller.Customer_status_verify);
   app.post('/APP_API/CustomerManagement/Register', Controller.Customer_From_App);
   app.post('/APP_API/CustomerManagement/CustomerDetails_Edit', Controller.CustomerDetails_Edit); 
   app.post('/APP_API/CustomerManagement/Customer_Detail_Updated', Controller.Customer_Detail_Updated);
   app.post('/APP_API/CustomerManagement/Customer_details_Updated', Controller.Customer_details_Updated);
   app.post('/APP_API/CustomerManagement/Request_Sample', Controller.Request_Sample);
   app.post('/APP_API/CustomerManagement/Customer_Subscription', Controller.Customer_Subscription);
   app.post('/APP_API/CustomerManagement/CustomerSubscription_Update', Controller.CustomerSubscription_Update);
   app.post('/APP_API/CustomerManagement/CustomerSubscription_Pause', Controller.CustomerSubscription_Pause);
   app.post('/APP_API/CustomerManagement/CustomerSubscription_Resume', Controller.CustomerSubscription_Resume);
   app.post('/APP_API/CustomerManagement/Customer_Update_Set_Password', Controller.Customer_Update_Set_Password);
   app.post('/APP_API/CustomerManagement/MobileNumberChange_OTP', Controller.MobileNumberChange_OTP);
   app.post('/APP_API/CustomerManagement/MobileNumber_Update', Controller.MobileNumber_Update);

   app.post('/APP_API/CustomerManagement/Customer_Login', Controller.Customer_Login);
   app.post('/APP_API/CustomerManagement/Customer_Logout', Controller.Customer_LogOut);
   app.post('/APP_API/CustomerManagement/Forgot_OTP_Verify', Controller.Forgot_OTP_Verify);
   app.post('/APP_API/CustomerManagement/Image_Upload', Controller.Customer_Image_Upload);

   app.post('/APP_API/CustomerManagement/Daily_Subscription_Details', Controller.Daily_Subscription_Details);
   app.post('/APP_API/CustomerManagement/Daily_Subscription_Update', Controller.Daily_Subscription_Update);
   app.post('/APP_API/CustomerManagement/MilkProduct_Subscription', Controller.MilkProduct_Subscription);
	app.post('/APP_API/CustomerManagement/Direct_Sample', Controller.Direct_Sample);
   app.get('/APP_API/CustomerManagement/Direct_Sample_List', Controller.Direct_Sample_List);   
   app.post('/APP_API/CustomerManagement/QA_List', Controller.QA_List);
   app.post('/APP_API/CustomerManagement/Customer_QADetail_Update', Controller.Customer_QADetail_Update);
   app.post('/APP_API/CustomerManagement/Customer_From_AppRegister', Controller.Customer_From_AppRegister);
   

	app.post('/APP_API/CustomerManagement/Customer_DeviceReset', Controller.Customer_DeviceReset);

};