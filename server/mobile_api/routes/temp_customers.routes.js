module.exports = function (app){
    
   var Controller = require('../controllers/temp_customers.controller');
   
   app.post('/APP_API/Device_Management/DeviceRegister', Controller.DeviceRegister);
   app.post('/APP_API/Device_Management/Device_BannersList', Controller.Device_BannersList);
   app.post('/APP_API/Device_Management/ProductManagement_List', Controller.ProductManagement_List);
   app.post('/APP_API/Device_Management/Farm_To_Home_List', Controller.Farm_To_Home_List);
   app.post('/APP_API/Device_Management/Factory_To_Home_List', Controller.Factory_To_Home_List);
   app.post('/APP_API/Device_Management/Home_To_Home_List', Controller.Home_To_Home_List);

	app.post('/APP_API/Device_Management/Products_Added_to_MyCart', Controller.Products_Added_to_MyCart);
   app.post('/APP_API/Device_Management/All_MyCart_List', Controller.All_MyCart_List);
   app.post('/APP_API/Device_Management/MyCartDetails_Delete', Controller.MyCartDetails_Delete);
	app.post('/APP_API/Device_Management/MyCart_TotalAmount', Controller.MyCart_TotalAmount);

};