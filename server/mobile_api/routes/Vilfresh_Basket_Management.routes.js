module.exports = function (app){
    
   var Controller = require('../controllers/Vilfresh_Basket_Management.controller');
   
   app.post('/APP_API/VilfreshBasket_Management/Vilfresh_BasketList', Controller.Vilfresh_BasketList);
   app.post('/APP_API/VilfreshBasket_Management/Vilfresh_Basket_Create', Controller.Vilfresh_Basket_Create);
   app.post('/APP_API/VilfreshBasket_Management/Config_Product_List', Controller.Config_Product_List);
   app.post('/APP_API/VilfreshBasket_Management/Customer_ProductRequest', Controller.Customer_ProductRequest);
   app.post('/APP_API/VilfreshBasket_Management/Cancel_BasketRequest', Controller.Cancel_BasketRequest);
   app.post('/APP_API/VilfreshBasket_Management/CustomerRequest_POStatus', Controller.CustomerRequest_POStatus);

};