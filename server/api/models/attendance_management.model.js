var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// DeliveryPerson Attendance Schema
var DeliveryPerson_AttendanceSchema = mongoose.Schema({
    DeliveryPersonId: {type: mongoose.Types.ObjectId, ref: 'DeliveryPerson'},
    Date: {type: Date},
    DeliveryLineId: {type: mongoose.Types.ObjectId, ref: 'Delivery'},
    DeliveryLineSession: {type: String}, // Morning, Evening, Both
    Session: {type: String},
    Morning: {type: Boolean},
    Evening: {type: Boolean},    
    MorningUpdatedBy: {type: mongoose.Types.ObjectId, ref: "User"},
    EveningUpdatedBy: {type: mongoose.Types.ObjectId, ref: "User"},
    Region: {type: mongoose.Types.ObjectId, ref: 'Region'},
    Active_Status: { type: Boolean, required: true },
    If_Deleted: { type: Boolean, required: true },
},
    { timestamps: true }
);
var VarDeliveryPerson_Attendance = mongoose.model('DeliveryPerson_Attendance', DeliveryPerson_AttendanceSchema, 'DeliveryPerson_Attendance');


// Attendance Management Schema
var AttendanceManagementSchema = mongoose.Schema({
    Date: {type: Date},
    LaterPersons: [{type: mongoose.Types.ObjectId, ref: 'DeliveryPerson'}],
    Session: {type: String}, // Morning, Evening
    ApprovedBy: {type: mongoose.Types.ObjectId, ref: "User"},
    Region:  {type: mongoose.Types.ObjectId, ref: 'Region'},
    Active_Status: { type: Boolean, required: true },
    If_Deleted: { type: Boolean, required: true },
},
    { timestamps: true }
);
var VarAttendance_Management = mongoose.model('Attendance_Management', AttendanceManagementSchema, 'Attendance_Management');


module.exports = {
    DeliveryPerson_AttendanceSchema: VarDeliveryPerson_Attendance,
    AttendanceManagementSchema : VarAttendance_Management
};