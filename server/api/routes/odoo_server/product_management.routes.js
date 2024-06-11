module.exports = function (app){
    
    var Controller = require('../../controllers/odoo_server/product_management.controller');
    
    app.post('/API/Product_Management/Create', Controller.ProductManagement_Create);    
    app.post('/API/Product_Management/Update', Controller.ProductManagement_Update);
    app.post('/API/Product_Management/Stock_Management_Create', Controller.Stock_Management_Create);
    app.post('/API/Product_Management/Stock_Update', Controller.StockManagement_Update);    

};