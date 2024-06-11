var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// User Management Schema
var UserManagementSchema = mongoose.Schema({
    User_Name: { type: String, unique: true },
    Password: { type: String },
    Name: { type: String },
    Email: { type: String },
    CompanyId: {type: String},
    Region: { type: Schema.Types.ObjectId, ref: 'Region' },
    OdooId: {type: String},  
    User_Type: {type: String}, // Admin
    Phone: { type: String }, 
    Active_Status: { type : Boolean },
    If_Deleted: { type : Boolean },
    },
    { timestamps: true }
);

var VarUserManagementSchema = mongoose.model('User', UserManagementSchema, 'User_Managements');

// User LoginHistory Schema 
var LoginHistorySchema = mongoose.Schema({
   User: { type: Schema.Types.ObjectId, ref: 'User' },
   LoginToken: { type: String },
   Hash: { type: String },
   LastActive: { type: Date },
   LoginFrom: { type: String },
   Active_Status: { type : Boolean },
   If_Deleted: { type : Boolean },
   },
   { timestamps: true }
);

var VarLoginHistory = mongoose.model('Login_History', LoginHistorySchema, 'VilFresh_Login_History');

module.exports = {
   LoginHistorySchema : VarLoginHistory,
   UserManagementSchema:VarUserManagementSchema
};
