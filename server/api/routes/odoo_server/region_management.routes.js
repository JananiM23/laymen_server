module.exports = function (app){
    
    var Controller = require('../../controllers/odoo_server/region_management.controller');
    
    app.post('/API/Region_Management/Create', Controller.RegionManagement_Create);

    app.get('/APP_API/Region_Management/List', Controller.RegionManagements_List);
    app.post('/API/Region_Management/Edit', Controller.RegionManagement_Edit);
    app.post('/API/Region_Management/Update', Controller.RegionManagement_Update);
    app.post('/API/Region_Management/Delete', Controller.RegionManagement_Delete);

};