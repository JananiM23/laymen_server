var mongoose = require('mongoose');

// Delivery Line Schema
var Delivery_lineSchema = mongoose.Schema({
    Deliveryline_Name: { type: String, required : true },
    CreatedUser: {type: mongoose.Types.ObjectId, ref: 'User'},  
    Region: {type: mongoose.Types.ObjectId, ref: 'Region'}, 
    Session: {type: String, required : true},
    QueueLength: {type: Number},
    Active_Status: { type : Boolean, required : true },
    If_Deleted: { type : Boolean, required : true },
    },
    { timestamps: true }
);

var VarDelivery_lineSchema = mongoose.model('Delivery', Delivery_lineSchema, 'Delivery_Line');

module.exports = {
    Delivery_lineSchema : VarDelivery_lineSchema
};
