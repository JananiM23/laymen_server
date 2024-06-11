module.exports = function (app){
    
   var Controller = require('../controllers/Vilfresh_Basket_Management.controller');
   
   app.post('/API/VilfreshBasket_Management/Vilfresh_BasketList', Controller.Vilfresh_BasketList);
   app.post('/API/VilfreshBasket_Management/Vilfresh_Basket_Create', Controller.Vilfresh_Basket_Create);
   app.post('/API/VilfreshBasket_Management/PurchaseOrder_History', Controller.PurchaseOrder_History);
   app.post('/API/VilfreshBasket_Management/PurchaseDate_Validation', Controller.PurchaseDate_Validation);   
   app.post('/API/VilfreshBasket_Management/Vilfresh_ProductList', Controller.Vilfresh_ProductList);
   app.post('/API/VilfreshBasket_Management/ExtraProductList', Controller.ExtraProductList);
   app.post('/API/VilfreshBasket_Management/ExtraProductAdd', Controller.ExtraProductAdd);

   app.post('/API/VilfreshBasket_Management/Vilfresh_Product_Config', Controller.Vilfresh_Product_Config);
   app.post('/API/VilfreshBasket_Management/Config_Product_List', Controller.Config_Product_List);
   app.post('/API/VilfreshBasket_Management/CustomerBasket_Requests_OnDate', Controller.CustomerBasket_Requests_OnDate);
   app.post('/API/VilfreshBasket_Management/Config_Dates', Controller.Config_Dates);
   app.post('/API/VilfreshBasket_Management/VBasketPOGenerate_Validate', Controller.VBasketPOGenerate_Validate);
   app.post('/API/VilfreshBasket_Management/VBasket_POGenerate', Controller.VBasket_POGenerate);


};