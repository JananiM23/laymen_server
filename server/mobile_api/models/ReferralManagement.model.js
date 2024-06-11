var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var ReferralManagementSchema = mongoose.Schema({
   Recommender: { type: Schema.Types.ObjectId, ref: 'Customer_Management' },
   Nominated:  { type: Schema.Types.ObjectId, ref: 'Customer_Management' },
   RewardCompleted: { type: Boolean },
   Active_Status: { type: Boolean, required: true },
   If_Deleted: { type: Boolean, required: true },
},
    { timestamps: true }
);
var varReferralManagement = mongoose.model('Referral', ReferralManagementSchema, 'ReferralManagement');

module.exports = {
   ReferralManagementSchema: varReferralManagement
};
