var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var BannerManagementSchema = mongoose.Schema({ 
      
    Banner_file: {type: String},
    Title: {type: String},
    Description:{type: String},
    File_Name:{type: String},  
    User: { type: Schema.Types.ObjectId, ref: 'User' },
    Banner_Status:{type: String},
    Active_Status: { type: Boolean, required : true },
    If_Deleted: { type: Boolean, required : true },
    },
    { timestamps: true }
 );
 var varBannerManagementSchema = mongoose.model('Banner_Management', BannerManagementSchema, 'Banner_Managements');
 

 module.exports = {
    BannerManagementSchema : varBannerManagementSchema
 };