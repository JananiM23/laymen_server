module.exports = function (app){

    var Controller = require('../../api/controllers/attendance_management.controller');
 
    app.post('/API/AttendanceManagement/Create', Controller.Attendance_Create); 
    app.post('/API/AttendanceManagement/DeliveryPerson_AttendanceList', Controller.DeliveryPerson_AttendanceList);
    app.post('/API/AttendanceManagement/MonthWise_Attendance_List', Controller.MonthWise_Attendance_List); 
    app.post('/API/AttendanceManagement/Attendance_SessionValidate', Controller.Attendance_SessionValidate);
    app.post('/API/AttendanceManagement/TodayPresent_DeliveryPersons', Controller.TodayPresent_DeliveryPersons);
    app.post('/API/AttendanceManagement/LaterDeliveryPersonAttendanceUpdate', Controller.LaterDeliveryPersonAttendanceUpdate );
    app.post('/API/AttendanceManagement/LaterAttendanceUpdate', Controller.LaterAttendanceUpdate );
 };