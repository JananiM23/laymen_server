module.exports = function (app){
    
    var Controller = require('../../mobile_api/controllers/notification_management.controller');
    
 app.post('/APP_API/NotificationManagement/All_Notifications_List', Controller.All_Notifications_List);
 app.post('/APP_API/NotificationManagement/Notification_Viewed_Update', Controller.Notification_Viewed_Update);
 app.post('/APP_API/NotificationManagement/Viewed_Notifications_Delete', Controller.Viewed_Notifications_Delete);      
};