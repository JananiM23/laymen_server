module.exports = function (app){
    
    var Controller = require('../../mobile_api/controllers/banner_management.controller');

    app.post('/APP_API/BannerManagement/Register', Controller.Banner_Register);
    app.post('/APP_API/BannerManagement/Banner_List', Controller.AllBanner_List);
    app.post('/APP_API/BannerManagement/Banner_Update', Controller.Banner_Update);

    app.post('/APP_API/BannerManagement/AllBanner_List', Controller.Banner_List);
    app.post('/APP_API/BannerManagement/Banner_Delete', Controller.Banner_Delete);

    
    app.post('/API/BannerManagement/Banner_Active', Controller.Banner_Active);
    app.post('/API/BannerManagement/Banner_Inactive', Controller.Banner_Inactive);
  
 }; 