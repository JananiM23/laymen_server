module.exports = function (app){
    
    var Controller = require('../../mobile_api/controllers/purchaseOrder.controller');
    
    app.post('/APP_API/Purchase_Management/Create', Controller.PurchaseManagement_Create);
    app.post('/APP_API/Purchase_Management/VF_BasketList', Controller.PurchaseOrder_List);
};