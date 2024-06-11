var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var TempCustomers_Schema = mongoose.Schema({
   DeviceId: { type: String, require: true },
	Region: { type: Schema.Types.ObjectId, ref: 'Region' },
	Device_Type: {type: String}, // Android , IOS , TAB
   Active_Status: { type: Boolean },
   If_Deleted: { type: Boolean },
},
   { timestamps: true }
);
var varTemp_Customers = mongoose.model('Temp_Customers', TempCustomers_Schema, 'Temp_Customers');

var TempCartSchema = mongoose.Schema({
	ProductId: { type: Schema.Types.ObjectId, ref: "Products" },
	TempCustomer: {type: Schema.Types.ObjectId, ref: 'Temp_Customers'},  
	Date: { type: Date },
	Quantity: { type: Number},
	Active_Status: { type: Boolean },
	If_Deleted: { type: Boolean }
},
	{ timestamps: true }
);
var varTemp_Cart = mongoose.model('Temp_Cart', TempCartSchema, 'Temp_Cart');


module.exports = {
	TempCustomersSchema: varTemp_Customers,
	TempCartSchema: varTemp_Cart,
};