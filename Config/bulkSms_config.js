const axios = require('axios');

exports.sendBulkSMS = async (Mobile_Number) => {
    try {
        if (Mobile_Number) {
            let params = new URLSearchParams();
            for(let i = 0; i < Mobile_Number.length; i++) {
                let numbers = Mobile_Number[i];
                params.append('apikey', '');
                params.append('message', 'Hello customer, just a quick remainder!');
                params.append('mobile_number', numbers);
                params.append('sender', 'vilfreshh');
            }

            let textLocalResponse = await axios.post('https://api.textlocal.in/send/', params).then(response => response.data);
            return textLocalResponse;
        }
    } catch(err) {
        console.log(err);
        return err;
    }
}