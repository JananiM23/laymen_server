var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var DeliveryPersonSchema = mongoose.Schema({
    Mobile_Number: { type: String },
    Password: { type: String },
    MobileVerify_OTP_No: { type: String },
    DeliveryPerson_Name: { type: String},
    Gender:{type: String},
    Email: { type: String },
    Religion: { type: String},
    Area: {type: String},
    Address: {type: String},
    LaterAttendance: {type: Boolean},
    CompanyId: {type: String},
    Alternate_Mobile_No: { type: String},
    DateOf_Birth: { type: Date},    
    Marital_Status: { type: Boolean},
    Driving_License_No: { type: String},
    Driving_License_ExpiryDate: {type: Date}, 
    Region: {type: Schema.Types.ObjectId, ref: 'Region'},
    DeliveryLine: {type: Schema.Types.ObjectId, ref: 'Delivery' },
    Session: {type: String},
    ApprovedBy_User: {type: Schema.Types.ObjectId, ref: 'User'},
    DeliveryPerson_Status: {type: String},
    Firebase_Token: {type: String},
    Device_Type: {type: String},
    Device_Id: {type: String},
    Pin: {type: String},
    OdooId: {type: String},
    Confirm_Pin: {type: String},
    Register_From:{type:String},
    Latitude: { type:String},
    Longitude: { type:String},
    Active_Status: { type: Boolean, required: true },
    If_Deleted: { type: Boolean, required: true },
},
    { timestamps: true }
);
var varDeliveryPersonSchema = mongoose.model('DeliveryPerson', DeliveryPersonSchema, 'DeliveryPerson_Managements');


var CollectionSchema = mongoose.Schema({
    CustomerID: {type: Schema.Types.ObjectId, ref: 'Customer'},
    DeliveryPersonId: {type: Schema.Types.ObjectId, ref: 'DeliveryPerson'},
    Collection_Amount: { type: Number },
    Region: {type: Schema.Types.ObjectId, ref: 'Region'},
    DeliveryLine: {type: Schema.Types.ObjectId, ref: 'Delivery' },
    AddedBy_User: {type: Schema.Types.ObjectId, ref: 'DeliveryPerson'},
    Collection_Status: {type: String}, // Approved, Rejected, Pending
    CollectionApprovedBy_User: {type: Schema.Types.ObjectId, ref: 'User'},
    Active_Status: { type: Boolean, required: true },
    If_Deleted: { type: Boolean, required: true },
},
    { timestamps: true }
);
var varCollectionSchema = mongoose.model('Collection', CollectionSchema, 'Collection_Managements');

var DeliveryPerson_LoginHistorySchema = mongoose.Schema({
    User: { type: Schema.Types.ObjectId, ref: 'DeliveryPerson' },   
    LastActive: { type: Date },  
    Active_Status: { type : Boolean },
    If_Deleted: { type : Boolean },
    },
    { timestamps: true }
 );

 var varDeliveryPerson_LoginHistorySchema = mongoose.model('DeliveryPerson_Login', DeliveryPerson_LoginHistorySchema, 'DeliveryPerson_loginHistory');
module.exports = {
    DeliveryPersonSchema: varDeliveryPersonSchema,
    CollectionSchema: varCollectionSchema,
    DeliveryPerson_LoginHistorySchema:varDeliveryPerson_LoginHistorySchema
};