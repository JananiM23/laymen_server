var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var CustomerFeedbackSchema = mongoose.Schema({ 
    CustomerId: {type: Schema.Types.ObjectId, ref: 'Customer_Management'},
    Rating: {type: String},
    Message: {type: String},
    Voice_Message: {type: String},
    APP_Version: {type: String},
    Voice_File: {type: String},
    Active_Status: { type: Boolean, required: true },
    If_Deleted: { type: Boolean, required: true },
},
{ timestamps: true }
);


var varCustomerFeedbackSchema = mongoose.model('Feedback', CustomerFeedbackSchema, 'Customer_Feedback');
module.exports = {
    CustomerFeedbackSchema: varCustomerFeedbackSchema    
};