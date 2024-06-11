module.exports = function (app){
    
    var Controller = require('../controllers/app_version.controller');
    
    app.post('/APP_API/APPManagement/Version', Controller.APPVersion_Create);
    app.post('/APP_API/APPManagement/APPVersion_List', Controller.APPVersion_List);
    
    // DeliveryPerson APP Version ------------------------------------------
    app.post('/APP_API/APPManagement/DeliveryPerson_APPVersion_Create', Controller.DeliveryPerson_APPVersion_Create);
 };