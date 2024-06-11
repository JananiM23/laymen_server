var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var Vil_freshAppVersionSchema = mongoose.Schema({ 
    App_Version: {type: String},
    OS_Type: {type: String},
    Active_Status: { type: Boolean, required: true },
    If_Deleted: { type: Boolean, required: true },
},
{ timestamps: true }
);


var varVil_freshAppVersionSchema = mongoose.model('AppVersion', Vil_freshAppVersionSchema, 'Vil-fresh APPVersion');

var DeliveryPersonAppVersionSchema = mongoose.Schema({ 
    App_Version: {type: String},
    OS_Type: {type: String},
    Active_Status: { type: Boolean, required: true },
    If_Deleted: { type: Boolean, required: true },
},
{ timestamps: true }
);

var varDeliveryPersonAppVersionSchema = mongoose.model('DeliveryPerson-APPVersion', DeliveryPersonAppVersionSchema, 'DeliveryPerson-APPVersion');

module.exports = {
    Vil_freshAppVersionSchema: varVil_freshAppVersionSchema,
    DeliveryPersonAppVersionSchema: varDeliveryPersonAppVersionSchema
};