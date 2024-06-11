module.exports = function (app){
    
    var Controller = require('../../api/controllers/user_management.controller');

    app.post('/API/User_Management/User_Login', Controller.VilFreshUser_Login);
    app.post('/API/User_Management/User_Logout', Controller.VilFreshUser_Logout);

    app.post('/API/User_Management/User_Create', Controller.VilFreshUser_Create);
    app.post('/API/User_Management/Users_List', Controller.Users_List);
    app.post('/API/User_Management/UserDetails_Delete', Controller.UserDetails_Delete);
    app.post('/API/User_Management/UserDetails_Update', Controller.UserDetails_Update);
    app.post('/API/User_Management/UserDetails_Edit', Controller.UserDetails_Edit);


    // Notification routes
    app.post('/API/User_Management/Notifications_List', Controller.All_Notifications_List);
    app.post('/API/User_Management/Notification_Counts', Controller.Notification_Counts);
    app.post('/API/User_Management/DeleteAllRead', Controller.DeleteAllReadNotifications);
    app.post('/API/User_Management/MarkAllAsRead', Controller.MarkAllAsReadNotifications);
    app.post('/API/User_Management/Read_Notification', Controller.Read_Notification);
    
    

 };