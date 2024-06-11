module.exports = function (app){
    
   var Controller = require('../../controllers/odoo_server/customer_management.controller');
   
   app.post('/API/OdooCustomer_Management/CustomerStatus_Update', Controller.CustomerStatus_Update);

};