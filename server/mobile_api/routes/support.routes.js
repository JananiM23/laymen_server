module.exports = function (app){
    
    var Controller = require('../controllers/support.controller');
    
    
    app.post('/APP_API/SupportManagement/CustomerSupport_List', Controller.CustomerSupport_List);    
    app.post('/APP_API/SupportManagement/CustomerSupport_Detail', Controller.CustomerSupport_Detail);
    app.post('/APP_API/SupportManagement/CustomerSupport_Reply', Controller.CustomerSupport_Reply);
    app.post('/APP_API/SupportManagement/SupportTitle_List', Controller.SupportTitle_List);
    app.post('/APP_API/SupportManagement/SupportTitle_Detail', Controller.SupportTitle_Detail);
 };