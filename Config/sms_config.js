const axios = require('axios');
var LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage('./../scratch');
localStorage.clear();

exports.sendOTP = function (Mobile, OTP, callback) { 
   if (Mobile !== undefined && Mobile !== null && Mobile !== '' && OTP !== undefined && OTP !== null && OTP !== '' ) {

		var trigger = true;
		var Numbers = [];
		var MobileQueue = localStorage.getItem('MobileQueue'); // localstorage having mobile number value
		if (MobileQueue !== null) {
			Numbers = JSON.parse(MobileQueue);
			const Idx = Numbers.findIndex(obj => obj === Mobile);
			if (Idx < 0) {
				Numbers.push(Mobile);
				localStorage.setItem('MobileQueue', JSON.stringify(Numbers));
			} else {
				trigger = false;
			}
		} else {
			Numbers = [Mobile];
			localStorage.setItem('MobileQueue', JSON.stringify(Numbers));
		}

		if (trigger) {
			setTimeout(() => {
				var existingMobileQueue = localStorage.getItem('MobileQueue');
				if (existingMobileQueue !== null) {
					var existingNumbers = JSON.parse(existingMobileQueue);
					const eIdx = existingNumbers.findIndex(obj => obj === Mobile);
					if (eIdx >= 0) {
						existingNumbers.splice(eIdx, 1);
						localStorage.setItem('MobileQueue', JSON.stringify(existingNumbers));
					}
				}
			}, 30000);
			const params = new URLSearchParams();
			params.append('apikey', '');
			params.append('message', '');
			params.append('sender', '');
			params.append('numbers', Mobile);
	
			axios.post('https://api.textlocal.in/send/', params).then(function (response) {
				callback(null, response.data);
			 }).catch(function (error) {
				callback('Some Error for sending OTP SMS!, Error: ' + error, null);
			 });
		} else {
			callback('OTP SMS Already Sent Please wait some time!', null);

		}
   } else {
      callback('OTP send failed, purpose of invalid data {Mobile: ' + Mobile + ', OTP: ' + OTP + ' }', null);
   }
};
