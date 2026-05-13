const http = require('http');
http.get('http://65.0.104.9/stock/list?symbols=NIFTY,NIFTYBANK,NIFTYIT,NIFTYPHARMA,NIFTYAUTO&res=num', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
});
