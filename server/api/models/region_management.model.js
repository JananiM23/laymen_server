var mongoose = require('mongoose');

// Region Management Schema
var RegionManagementSchema = mongoose.Schema({
    Region_Name: { type: String, required : true },
    OdooId: {type: String , required: true},
    CompanyId: {type: String},        
    Active_Status: { type : Boolean, required : true },
    If_Deleted: { type : Boolean, required : true },
    },
    { timestamps: true }
);

var VarRegionManagementSchema = mongoose.model('Region', RegionManagementSchema, 'RegionManagement');

module.exports = {
    RegionManagementSchema : VarRegionManagementSchema
};
