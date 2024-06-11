module.exports = function (app){
    
    var Controller = require('../../mobile_api/controllers/product_management.controller');
    
    app.post('/APP_API/Product_Management/Product_list', Controller.ProductManagement_List);
    app.post('/APP_API/Product_Management/Farm_To_Home_List', Controller.Farm_To_Home_List);
    app.post('/APP_API/Product_Management/Factory_To_Home_List', Controller.Factory_To_Home_List);
    app.post('/APP_API/Product_Management/Home_To_Home_List', Controller.Home_To_Home_List);
    app.post('/APP_API/Product_Management/Added_to_MyCart', Controller.Products_Added_to_MyCart);
    app.post('/APP_API/Product_Management/MyCart_Details_Delete', Controller.MyCartDetails_Delete); 
    app.post('/APP_API/Product_Management/All_MyCart_List', Controller.All_MyCart_List); 
    app.post('/APP_API/Product_Management/MyCart_TotalAmount', Controller.MyCart_TotalAmount); 
};