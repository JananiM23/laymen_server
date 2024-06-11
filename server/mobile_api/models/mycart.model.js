var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var MyCartSchema = mongoose.Schema({
    ProductId: { type: Schema.Types.ObjectId, ref: "Products" },
    CustomerId: {type: Schema.Types.ObjectId, ref: 'Customer_Management'},  
    Date: { type: Date },
    Quantity: { type: Number},
    Active_Status: { type: Boolean },
    If_Deleted: { type: Boolean }
},
    { timestamps: true }
);

var varMyCartSchema = mongoose.model('MyCart', MyCartSchema, 'MyCartManagement');

module.exports = {
    MyCartSchema: varMyCartSchema,
};