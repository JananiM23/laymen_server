var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var SupportManagementSchema = mongoose.Schema({
    CustomerId: { type: Schema.Types.ObjectId, ref: 'Customer_Management' },
    Support_key: { type: String },
    Support_Unique_key: { type: Number },
    Support_Title: {  type: Schema.Types.ObjectId, ref: 'SupportTitle' },
    Support_Status: { type: String }, // Open , Closed    
    Support_Details: [{
        Message_by: { type: String }, // User, Customer
        Message: { type: String },
        Date: { type: Date },
        User: { type: Schema.Types.ObjectId, ref: 'User' }
    }],
    Active_Status: { type: Boolean, required: true },
    If_Deleted: { type: Boolean, required: true },
},
    { timestamps: true }
);
var varSupportManagementSchema = mongoose.model('Support', SupportManagementSchema, 'SupportManagement');

var SupportTitleSchema = mongoose.Schema({
    Support_Title: { type: String },
    Support_Status: { type: String }, // Open , Closed
    Region: { type: Schema.Types.ObjectId, ref: 'Region' },
    Active_Status: { type: Boolean, required: true },
    If_Deleted: { type: Boolean, required: true },
},
    { timestamps: true }
);

var varSupportTitleSchema = mongoose.model('SupportTitle', SupportTitleSchema, 'SupportTitle');

module.exports = {
    SupportManagementSchema: varSupportManagementSchema,
    SupportTitleSchema : varSupportTitleSchema
};
